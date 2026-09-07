/**
 * PTY 관문 자체 점검 (본영-지시-0003 공사5)
 * 실행: node server/selfcheck.mjs      (cube3d-pty 가 떠 있어야 한다)
 * 하나라도 깨지면 0 아닌 코드로 죽는다.
 */
import { WebSocket } from 'ws';
import assert from 'assert';
import fs from 'fs';
import os from 'os';

const PORT = process.env.CUBE3D_PTY_PORT || 3021;
const TOKEN_FILE = process.env.CUBE3D_PTY_TOKEN_FILE || '/home/nas01/.secrets/cube3d_pty_token';
const tok = fs.readFileSync(TOKEN_FILE, 'utf8').trim();

const connect = (headers, onOpen) => new Promise((res) => {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/`, { headers });
  const out = { closeCode: null, created: [] };
  ws.on('open', () => onOpen?.(ws));
  ws.on('message', (raw) => {
    try { const m = JSON.parse(String(raw)); if (m.type === 'created') out.created.push(m.cwd); } catch {}
  });
  ws.on('close', (c) => { out.closeCode = c; res(out); });
  ws.on('error', () => {});
  setTimeout(() => { try { ws.close(); } catch {} }, 2200);
});

// 1) 토큰 없으면 거절
assert.strictEqual((await connect({})).closeCode, 4001, '무토큰인데 안 끊겼다');
// 2) 틀린 토큰도 거절
assert.strictEqual((await connect({ 'X-Cube3d-Token': 'wrong' })).closeCode, 4001, '오답토큰인데 안 끊겼다');
// 3) 맞는 토큰이면 통과 + cwd 감옥이 작동
const ok = await connect({ 'X-Cube3d-Token': tok }, (ws) => {
  ws.send(JSON.stringify({ type: 'create', id: 'selfcheck', cwd: '/etc' }));
  setTimeout(() => ws.send(JSON.stringify({ type: 'kill', id: 'selfcheck' })), 900);
});
assert.notStrictEqual(ok.closeCode, 4001, '정답토큰인데 끊겼다');
assert.deepStrictEqual(ok.created, [os.homedir()], `감옥 밖 cwd 가 통과했다: ${ok.created}`);

// 4) /health 는 토큰 없으면 셸·세션을 안 준다
const bare = await (await fetch(`http://127.0.0.1:${PORT}/health`)).json();
assert.ok(!('shell' in bare), '/health 가 무인증으로 셸 경로를 뱉는다');

console.log('✅ PTY 관문 점검 4항 통과');
