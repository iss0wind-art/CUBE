// WebSocket client for the CUBE PTY server.
// Keeps a per-session output buffer so terminals can replay scrollback
// when they are re-mounted (e.g. when swapping the main wall session).

export interface SessionInfo {
  id: string;
  cwd: string;
  createdAt: number;
}

export interface ServerMessage {
  type: 'output' | 'exit' | 'created' | 'sessions';
  id?: string;
  data?: string;
  exitCode?: number;
  cwd?: string;
  sessions?: SessionInfo[];
}

type Listener = (msg: ServerMessage) => void;

const SERVER_URL = `ws://${window.location.hostname}:3001`;
const MAX_BUFFER_CHARS = 200_000;

class TermClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private pendingMessages: string[] = [];
  private buffers = new Map<string, string>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect() {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) return;

    this.ws = new WebSocket(SERVER_URL);

    this.ws.onopen = () => {
      const queued = [...this.pendingMessages];
      this.pendingMessages = [];
      queued.forEach((payload) => this.ws?.send(payload));
    };

    this.ws.onmessage = (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === 'output' && msg.id && msg.data) {
        const prev = this.buffers.get(msg.id) || '';
        const next = (prev + msg.data).slice(-MAX_BUFFER_CHARS);
        this.buffers.set(msg.id, next);
      }
      if (msg.type === 'exit' && msg.id) {
        this.buffers.delete(msg.id);
      }

      this.listeners.forEach((fn) => fn(msg));
    };

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(), 2000);
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  private send(msg: Record<string, unknown>) {
    const payload = JSON.stringify(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.pendingMessages = [...this.pendingMessages, payload];
      this.connect();
    }
  }

  create(id: string, cwd?: string) {
    this.send({ type: 'create', id, cwd });
  }

  input(id: string, data: string) {
    this.send({ type: 'input', id, data });
  }

  resize(id: string, cols: number, rows: number) {
    this.send({ type: 'resize', id, cols, rows });
  }

  kill(id: string) {
    this.send({ type: 'kill', id });
  }

  getBuffer(id: string): string {
    return this.buffers.get(id) || '';
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const termClient = new TermClient();
