import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { clientFor } from '../lib/termClient';

interface TerminalViewProps {
  sessionId: string;
  accentColor: string;
  focused?: boolean;
}

// Renders one xterm.js terminal bound to a PTY session on the CUBE server.
// Recreated whenever sessionId changes; scrollback is replayed from the
// client-side buffer so swapping walls keeps history.
export default function TerminalView({ sessionId, accentColor, focused = true }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#0c0c0c',
        foreground: '#e4e4e4',
        cursor: accentColor,
        selectionBackground: 'rgba(255, 255, 255, 0.25)',
      },
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    fit.fit();

    const client = clientFor(sessionId);
    // SSH sessions are created by the portal flow (they need a host);
    // local sessions can be (re)created idempotently here.
    if (!sessionId.startsWith('SSH_')) client.create(sessionId);

    const replay = client.getBuffer(sessionId);
    if (replay) term.write(replay);

    const offData = term.onData((data) => client.input(sessionId, data));
    const offServer = client.on((msg) => {
      if (msg.type === 'output' && msg.id === sessionId && msg.data) {
        term.write(msg.data);
      }
      if (msg.type === 'exit' && msg.id === sessionId) {
        term.write(`\r\n\x1b[31m[SESSION TERMINATED: exit ${msg.exitCode}]\x1b[0m\r\n`);
      }
    });

    const syncSize = () => {
      fit.fit();
      client.resize(sessionId, term.cols, term.rows);
    };
    syncSize();

    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(container);

    // Keep wheel events inside the terminal (the room zooms on wheel otherwise).
    const stopWheel = (e: WheelEvent) => e.stopPropagation();
    container.addEventListener('wheel', stopWheel);

    if (focused) term.focus();

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('wheel', stopWheel);
      offData.dispose();
      offServer();
      term.dispose();
    };
  }, [sessionId, accentColor]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      onMouseDown={(e) => {
        // Left click focuses the terminal without side effects; middle-button
        // must pass through so camera rotation works even over the terminal.
        // Click events are allowed to bubble so clicking the main screen
        // aligns the camera (handled by the wall's click handler).
        if (e.button === 0) e.stopPropagation();
      }}
    />
  );
}
