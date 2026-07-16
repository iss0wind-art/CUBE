import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as pty from '@lydell/node-pty';
import os from 'os';

const PORT = Number(process.env.CUBE_SERVER_PORT || 3001);
const SHELL = process.env.CUBE_SHELL || 'powershell.exe';

interface Session {
  id: string;
  term: pty.IPty;
  cwd: string;
  createdAt: number;
}

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

  const resolvedCwd = cwd || os.homedir();
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
app.get('/health', (_req, res) => {
  res.json({ ok: true, shell: SHELL, sessions: sessionList() });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
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

server.listen(PORT, () => {
  console.log(`[cube-server] PTY server ready on http://localhost:${PORT} (shell: ${SHELL})`);
});
