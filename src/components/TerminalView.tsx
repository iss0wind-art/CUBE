import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { termClient } from '../lib/termClient';

interface TerminalViewProps {
  sessionId: string;
  accentColor: string;
}

// Renders one xterm.js terminal bound to a PTY session on the CUBE server.
// Recreated whenever sessionId changes; scrollback is replayed from the
// client-side buffer so swapping walls keeps history.
export default function TerminalView({ sessionId, accentColor }: TerminalViewProps) {
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

    termClient.create(sessionId);

    const replay = termClient.getBuffer(sessionId);
    if (replay) term.write(replay);

    const offData = term.onData((data) => termClient.input(sessionId, data));
    const offServer = termClient.on((msg) => {
      if (msg.type === 'output' && msg.id === sessionId && msg.data) {
        term.write(msg.data);
      }
      if (msg.type === 'exit' && msg.id === sessionId) {
        term.write(`\r\n\x1b[31m[SESSION TERMINATED: exit ${msg.exitCode}]\x1b[0m\r\n`);
      }
    });

    const syncSize = () => {
      fit.fit();
      termClient.resize(sessionId, term.cols, term.rows);
    };
    syncSize();

    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(container);

    // Keep wheel events inside the terminal (the room zooms on wheel otherwise).
    const stopWheel = (e: WheelEvent) => e.stopPropagation();
    container.addEventListener('wheel', stopWheel);

    term.focus();

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
