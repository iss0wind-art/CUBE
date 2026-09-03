#!/usr/bin/env python3
"""3D CUBE(Architect OS) 서빙 — 맘나스 127.0.0.1:3009 → cube3d.iss0wind.kr

빌드본(dist) 정적 서빙 + **핀 관문** + **터미널 웹소켓 중계**.

터미널이 왜 죽어 있었나 (2026-08-02 규명) — 3D 는 처음부터 same-origin 설계였다.
클라이언트(termClient.ts)가 `/ws/pty`·`/ws/portal` 로 붙고 **vite 개발 서버의 프록시**가
그걸 백엔드로 넘겨 줬다. 그래서 창 분리·다중 창이 잘 됐다. 그런데 서빙이 이 정적
서버로 바뀌면서 프록시가 사라졌고(여기엔 그런 코드가 없었다), 게다가 pty 포트가
3001 → 3021 로 옮겨 갔다(3001 은 BOQ_2 next-server 가 점유). 이중으로 어긋나 있었다.

그래서 vite proxy 가 하던 일을 여기서 한다 — 프레임을 해석하지 않는 **투명 터널**이다.
핸드셰이크를 그대로 넘기고 바이트만 흘린다(2D 큐브 /term-ws 와 같은 방식).

**핀 관문** [방부장 2026-08-02: "3d도 비번을 걸어줘"] — 터미널 중계는 사실상 셸 창구다.
인증 없이 인터넷에 열 수 없다. 2D 큐브와 **같은 핀 파일**을 읽으므로 비번이 하나로 통일된다.

실패 경로부터 정한다(지침: 게이트는 실패 경로부터 설계·검증):
  · 핀 파일이 없으면 → **아무도 못 들어온다**(열어두지 않는다).
  · 쿠키 위조 → HMAC 서명 검증 실패로 거부. 서명 열쇠는 기동 시 생성해 파일로 보관.
  · 연속 오답 → 잠금(무차별 대입 차단).
  · **중계는 관문 뒤에 둔다** — 정적 파일보다 먼저 검사한다. 우회로가 되면 안 된다.
"""
import hashlib
import hmac
import os
import secrets
import socket
import threading
import time
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(BASE, "dist")
PORT = 3009

PIN_FILE = os.environ.get("CUBE_PIN_FILE", "/home/nas01/.secrets/cube_pin")
SECRET_FILE = os.environ.get("CUBE3D_GATE_SECRET", "/home/nas01/.secrets/cube3d_gate_secret")
COOKIE = "cube3d_gate"
GATE_DAYS = 30
MAX_FAILS = 5
LOCK_SEC = 15 * 60

# 중계 대상 — vite.config.ts 의 proxy 와 같은 뜻. 포트는 환경으로 덮을 수 있다.
UPSTREAM = {
    "/ws/pty": ("127.0.0.1", int(os.environ.get("CUBE3D_PTY_PORT", "3021"))),
    "/ws/portal": ("127.0.0.1", int(os.environ.get("CUBE3D_PORTAL_PORT", "3003"))),
}

_fails = {}          # ponytail: 프로세스 메모리 — 재시작하면 풀린다. 영속 차단이 필요하면 파일로.


def _pin():
    """핀은 매 요청 읽는다 — 바꾸면 재시작 없이 반영된다. 없으면 문을 잠근다(안전 우선)."""
    try:
        with open(PIN_FILE, encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        print(f"[gate] 핀 파일이 없습니다: {PIN_FILE} — 아무도 못 들어옵니다", flush=True)
        return ""


def _secret():
    try:
        with open(SECRET_FILE, "rb") as f:
            v = f.read().strip()
            if v:
                return v
    except OSError:
        pass
    v = secrets.token_bytes(32)
    old = os.umask(0o077)
    try:
        with open(SECRET_FILE, "wb") as f:
            f.write(v)
    finally:
        os.umask(old)
    return v


def _sign(exp):
    return hmac.new(_secret(), exp.encode(), hashlib.sha256).hexdigest()[:32]


def _ticket():
    exp = str(int(time.time()) + GATE_DAYS * 86400)
    return f"{exp}.{_sign(exp)}"


def _ticket_ok(v):
    """서명과 만료를 둘 다 본다. 어느 하나라도 어긋나면 표가 아니다."""
    try:
        exp, sig = (v or "").split(".", 1)
    except ValueError:
        return False
    if not hmac.compare_digest(sig, _sign(exp)):
        return False
    try:
        return int(exp) > time.time()
    except ValueError:
        return False


GATE_HTML = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>3D 큐브 — 잠김</title>
<style>body{background:#0f1216;color:#e7ebf2;font-family:system-ui,sans-serif;display:flex;
align-items:center;justify-content:center;height:100vh;margin:0}
.b{background:#1d2129;border:1px solid #3a4250;border-radius:16px;padding:28px;width:320px;text-align:center}
h1{font-size:18px;margin:0 0 6px}p{color:#9aa4b2;font-size:13px;margin:0 0 16px}
input{width:100%;padding:10px;border-radius:8px;border:1px solid #3a4250;background:#12151b;
color:#e7ebf2;font-size:16px;text-align:center;letter-spacing:4px}
button{width:100%;margin-top:10px;padding:10px;border:0;border-radius:8px;background:#4ea1ff;
color:#08131f;font-weight:700;font-size:14px;cursor:pointer}
.m{color:#ff9f9f;font-size:12px;min-height:16px;margin-top:8px}</style></head><body>
<div class="b"><h1>🧊 3D 큐브</h1><p>비번을 넣어 주세요</p>
<input id="p" type="password" inputmode="numeric" autofocus>
<button id="g">들어가기</button><div class="m" id="m"></div></div>
<script>
const p=document.getElementById('p'),m=document.getElementById('m');
async function go(){m.textContent='';
 const r=await fetch('/__gate',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({pw:p.value})}).then(x=>x.json()).catch(()=>({ok:false,error:'연결 실패'}));
 if(r.ok){location.replace('/');return;} m.textContent=r.error||'다시 해 주세요'; p.value='';}
document.getElementById('g').onclick=go;
p.addEventListener('keydown',e=>{if(e.key==='Enter')go();});
</script></body></html>"""


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=DIST, **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def log_message(self, *a):
        pass

    # ── 관문 ────────────────────────────────────────────────
    def _gated(self):
        raw = self.headers.get("Cookie") or ""
        for part in raw.split(";"):
            k, _, v = part.strip().partition("=")
            if k == COOKIE:
                return _ticket_ok(v)
        return False

    def _client(self):
        return (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()

    def _deny(self):
        body = GATE_HTML.encode()
        self.send_response(401)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _open_gate(self):
        import json
        ip = self._client()
        until, n = _fails.get(ip, (0, 0))
        if time.time() < until:
            return self._json(429, {"ok": False, "error": "잠시 잠겼습니다. 조금 뒤에 다시."})
        try:
            length = int(self.headers.get("Content-Length") or 0)
            pw = (json.loads(self.rfile.read(min(length, 4096)).decode() or "{}").get("pw") or "").strip()
        except (ValueError, OSError):
            pw = ""
        real = _pin()
        if not real or not hmac.compare_digest(pw, real):
            n += 1
            _fails[ip] = (time.time() + LOCK_SEC, 0) if n >= MAX_FAILS else (0, n)
            return self._json(403, {"ok": False, "error": "비번이 다릅니다"})
        _fails.pop(ip, None)
        data = b'{"ok":true}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        안전 = " Secure;" if (self.headers.get("X-Forwarded-Proto") or "").lower() == "https" else ""
        self.send_header("Set-Cookie",
                         f"{COOKIE}={_ticket()}; Path=/; Max-Age={GATE_DAYS * 86400};"
                         f" HttpOnly;{안전} SameSite=Lax")
        self.end_headers()
        self.wfile.write(data)

    def _json(self, code, obj):
        import json
        data = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    # ── 웹소켓 투명 중계 (vite proxy 가 하던 일) ───────────────
    def _relay(self, host, port):
        try:
            up = socket.create_connection((host, port), timeout=10)
        except OSError as e:
            print(f"[ws] 업스트림 {host}:{port} 연결 실패: {e}", flush=True)
            self.send_response(502)
            self.end_headers()
            return
        try:
            head = [f"GET {self.path} HTTP/1.1", f"Host: {host}:{port}"]
            for k in ("Connection", "Upgrade", "Sec-WebSocket-Key", "Sec-WebSocket-Version",
                      "Sec-WebSocket-Protocol", "Sec-WebSocket-Extensions"):
                v = self.headers.get(k)
                if v:
                    head.append(f"{k}: {v}")
            up.sendall(("\r\n".join(head) + "\r\n\r\n").encode())
            down = self.connection

            def pump(a, b):
                try:
                    while True:
                        d = a.recv(65536)
                        if not d:
                            break
                        b.sendall(d)
                except OSError:
                    pass
                finally:
                    for s in (a, b):
                        try:
                            s.shutdown(socket.SHUT_RDWR)
                        except OSError:
                            pass

            t = threading.Thread(target=pump, args=(up, down), daemon=True)
            t.start()
            pump(down, up)
            t.join(timeout=5)
        finally:
            try:
                up.close()
            except OSError:
                pass
        self.close_connection = True

    def do_POST(self):
        if urllib.parse.urlparse(self.path).path == "/__gate":
            return self._open_gate()
        self.send_response(404)
        self.end_headers()

    def do_HEAD(self):
        # 관문은 GET만 막고 HEAD는 그냥 통과했다 — `curl -I` 로 200이 새던 구멍(G-2, 2026-09-03).
        if not self._gated():
            self.send_response(401)
            self.send_header("Content-Length", "0")
            return self.end_headers()
        return super().do_HEAD()

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        # 관문이 먼저다 — 중계도 정적도 표가 있어야 지나간다.
        if not self._gated():
            return self._deny()
        for pre, (host, port) in UPSTREAM.items():
            if path.startswith(pre):
                return self._relay(host, port)
        p = self.translate_path(self.path)
        if not os.path.exists(p) and not path.startswith("/assets"):
            self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    _secret()   # 서명 열쇠를 미리 세워 첫 요청이 느려지지 않게
    print(f"3D CUBE 서빙: http://127.0.0.1:{PORT} · 관문 on · 중계 {list(UPSTREAM)}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
