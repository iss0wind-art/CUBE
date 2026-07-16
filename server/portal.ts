// Portal server: dimensional gateway to REMOTE hosts. Spawns `ssh <host>`
// inside a PTY so interactive prompts (passwords, host keys) flow straight
// into the wall terminal. Runs as its own process so local sessions on the
// PTY server (:3001) are never disturbed.
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as pty from '@lydell/node-pty';
import os from 'os';
import fs from 'fs';
import path from 'path';

const PORT = Number(process.env.CUBE_PORTAL_PORT || 3003);
const SSH_BIN = process.env.CUBE_SSH_BIN || 'ssh.exe';

interface Session {
  id: string;
  term: pty.IPty;
  host: string;
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
  Array.from(sessions.values()).map(({ id, host, createdAt }) => ({ id, cwd: host, createdAt }));

const createSession = (id: string, host: string): Session => {
  const existing = sessions.get(id);
  if (existing) return existing;

  const term = pty.spawn(SSH_BIN, [host], {
    name: 'xterm-256color',
    cols: 100,
    rows: 30,
    cwd: os.homedir(),
    env: process.env as Record<string, string>
  });

  const session: Session = { id, term, host, createdAt: Date.now() };
  sessions.set(id, session);

  term.onData((data) => broadcast({ type: 'output', id, data }));
  term.onExit(({ exitCode }) => {
    sessions.delete(id);
    broadcast({ type: 'exit', id, exitCode });
  });

  broadcast({ type: 'created', id, cwd: host });
  return session;
};

const app = express();
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, ssh: SSH_BIN, sessions: sessionList() });
});

// Host entries from ~/.ssh/config (wildcards skipped)
app.get('/profiles', (_req, res) => {
  const configPath = path.join(os.homedir(), '.ssh', 'config');
  const hosts: string[] = [];
  try {
    if (fs.existsSync(configPath)) {
      for (const line of fs.readFileSync(configPath, 'utf8').split('\n')) {
        const match = line.match(/^\s*Host\s+(.+)$/i);
        if (match) {
          match[1]
            .trim()
            .split(/\s+/)
            .filter((h) => h && !h.includes('*') && !h.includes('?'))
            .forEach((h) => hosts.push(h));
        }
      }
    }
  } catch {
    // unreadable config -> empty list
  }
  res.json({ hosts });
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
          if (typeof msg.host === 'string' && msg.host.trim()) {
            createSession(msg.id, msg.host.trim());
          }
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
      console.error(`[cube-portal] error handling ${msg.type}:`, err);
    }
  });

  ws.on('close', () => sockets.delete(ws));
});

server.listen(PORT, () => {
  console.log(`[cube-portal] gateway ready on http://localhost:${PORT} (ssh: ${SSH_BIN})`);
});
