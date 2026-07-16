import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { clientFor } from '../lib/termClient';

interface TerminalViewProps {
  sessionId: string;
  accentColor: string;
  focused?: boolean;
  fontSize?: number;
}

// Renders one xterm.js terminal bound to a PTY session on the CUBE server.
// Recreated whenever sessionId changes; scrollback is replayed from the
// client-side buffer so swapping walls keeps history.
export default function TerminalView({
  sessionId,
  accentColor,
  focused = true,
  fontSize = 14
}: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize,
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

    // Replayed scrollback may contain TUI cursor positioning drawn for an
    // older grid (e.g. after a font-size change) — the cursor then sits one
    // row off. Jiggle the PTY size once so full-screen apps repaint fresh.
    if (replay) {
      setTimeout(() => {
        client.resize(sessionId, Math.max(2, term.cols - 1), term.rows);
        setTimeout(() => client.resize(sessionId, term.cols, term.rows), 80);
      }, 150);
    }

    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(container);

    // Keep wheel/touch events inside the terminal (the room camera would
    // otherwise zoom/rotate while scrolling terminal output).
    const stopWheel = (e: WheelEvent) => e.stopPropagation();
    const stopTouch = (e: TouchEvent) => e.stopPropagation();
    container.addEventListener('wheel', stopWheel);
    container.addEventListener('touchstart', stopTouch);
    container.addEventListener('touchmove', stopTouch);

    if (focused) term.focus();

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('wheel', stopWheel);
      container.removeEventListener('touchstart', stopTouch);
      container.removeEventListener('touchmove', stopTouch);
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
