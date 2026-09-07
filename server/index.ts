import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as pty from '@lydell/node-pty';
import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const PORT = Number(process.env.CUBE_SERVER_PORT || 3001);
// 루프백만 듣는다 — 이 머신은 공인 IP가 NIC에 직결(enp4s0)이고 여기엔 인증이 없다.
// 바깥에서 오는 길은 serve.py(:3009) 관문의 /ws/pty 중계 하나뿐이며 그쪽은 127.0.0.1로 붙는다.
const HOST = process.env.CUBE_SERVER_HOST || '127.0.0.1';
const SHELL = process.env.CUBE_SHELL || 'powershell.exe';

interface Session {
  id: string;
  term: pty.IPty;
  cwd: string;
  createdAt: number;
}

// [2026-09-07 본영-지시-0003 공사5] 이 서버는 셸을 띄운다. 종전엔 인증이 전무했고
// 127.0.0.1 바인딩만이 유일한 방벽이었다 — 로컬 SSRF 하나면 끝난다.
// 앞단 serve.py(:3009)가 관문 통과 후 X-Cube3d-Token 을 실어 준다. 없으면 거절한다.
const TOKEN_FILE = process.env.CUBE3D_PTY_TOKEN_FILE || '/home/nas01/.secrets/cube3d_pty_token';

/** 토큰은 매 연결 읽는다 — 바꾸면 재시작 없이 반영된다. 없으면 만든다(0600). */
const readToken = (): string => {
  try {
    const t = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    if (t) return t;
  } catch { /* 아래에서 만든다 */ }
  const t = crypto.randomBytes(32).toString('base64url');
  fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
  fs.writeFileSync(TOKEN_FILE, t, { mode: 0o600 });
  return t;
};

const sameToken = (given: string | null): boolean => {
  const real = readToken();
  if (!real || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(real);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// 작업터 감옥 — cwd 는 사용자 입력이었고 아무 데나 열렸다.
const WORK_ROOTS = (process.env.CUBE3D_WORK_ROOTS || `${os.homedir()}/projects:${os.homedir()}`)
  .split(':').filter(Boolean).map((r) => path.resolve(r));

/** 감옥 밖이면 홈으로 되돌린다. 심링크까지 푼 실경로로 판정한다. */
const jailCwd = (cwd?: string): string => {
  const home = os.homedir();
  if (!cwd) return home;
  let real: string;
  try { real = fs.realpathSync(path.resolve(cwd)); } catch { return home; }
  const ok = WORK_ROOTS.some((root) => real === root || real.startsWith(root + path.sep));
  if (!ok) console.warn(`[cube-server] 감옥 밖 cwd 거절: ${cwd}`);
  return ok ? real : home;
};

const sessions = new Map<string, Session>();
const sockets = new Set<WebSocket>();

const broadcast = (msg: Record<string, unknown>) => {
  const payload = JSON.stringify(msg);
  sockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
};

const sessionList = () =>
  Array.from(sessions.values()).map(({ id, cwd, createdAt }) => ({ id, cwd, createdAt }));

const createSession = (id: string, cwd?: string): Session => {
  const existing = sessions.get(id);
  if (existing) return existing;

  const resolvedCwd = jailCwd(cwd);
  const term = pty.spawn(SHELL, [], {
    name: 'xterm-256color',
    cols: 100,
    rows: 30,
    cwd: resolvedCwd,
    env: process.env as Record<string, string>,
  });

  const session: Session = { id, term, cwd: resolvedCwd, createdAt: Date.now() };
  sessions.set(id, session);

  term.onData((data) => broadcast({ type: 'output', id, data }));
  term.onExit(({ exitCode }) => {
    sessions.delete(id);
    broadcast({ type: 'exit', id, exitCode });
  });

  broadcast({ type: 'created', id, cwd: resolvedCwd });
  return session;
};

const app = express();
app.get('/health', (req, res) => {
  // 살아있는지만 무인증으로 답한다. 셸 경로·세션 cwd 는 토큰이 있어야 준다.
  const given = (req.headers['x-cube3d-token'] as string | undefined) ?? null;
  if (!sameToken(given)) { res.json({ ok: true }); return; }
  res.json({ ok: true, shell: SHELL, sessions: sessionList() });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const given =
    (req.headers['x-cube3d-token'] as string | undefined) ??
    new URL(req.url ?? '/', 'http://x').searchParams.get('t');
  if (!sameToken(given ?? null)) { ws.close(4001, 'bad token'); return; }
  sockets.add(ws);
  ws.send(JSON.stringify({ type: 'sessions', sessions: sessionList() }));

  ws.on('message', (raw) => {
    let msg: Record<string, any>;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    try {
      switch (msg.type) {
        case 'create':
          createSession(msg.id, msg.cwd);
          break;
        case 'input':
          sessions.get(msg.id)?.term.write(msg.data);
          break;
        case 'resize':
          if (msg.cols > 0 && msg.rows > 0) {
            sessions.get(msg.id)?.term.resize(msg.cols, msg.rows);
          }
          break;
        case 'kill':
          sessions.get(msg.id)?.term.kill();
          break;
      }
    } catch (err) {
      console.error(`[cube-server] error handling ${msg.type}:`, err);
    }
  });

  ws.on('close', () => sockets.delete(ws));
});

server.listen(PORT, HOST, () => {
  console.log(`[cube-server] PTY server ready on http://${HOST}:${PORT} (shell: ${SHELL})`);
});
