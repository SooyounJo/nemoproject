"use client";

import React from "react";
import { io } from "socket.io-client";

export default function ControlPage() {
  const resetAll = () => {
    try {
      const base = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
      const s = io(base, { path: "/api/socketio", transports: ["websocket"] });
      const timeout = setTimeout(() => {
        try { s.disconnect(); } catch {}
      }, 2000);
      const onConnect = () => {
        try { s.emit("app:reset"); } catch {}
        setTimeout(() => { try { s.disconnect(); } catch {} }, 500);
      };
      s.on("connect", onConnect);
      s.on("connect_error", () => {
        // best-effort: try one-shot emit anyway
        try { s.emit("app:reset"); } catch {}
        try { s.disconnect(); } catch {}
        clearTimeout(timeout);
      });
    } catch {}
  };
  return (
    <div style={{ minHeight: "100vh", background: "#0b0d12", display: "grid", placeItems: "center", color: "#e5e7eb" }}>
      <div style={{ display: "grid", gap: 16, placeItems: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Controller</div>
        <button
          onClick={resetAll}
          style={{
            padding: "14px 18px",
            borderRadius: 14,
            border: "1px solid rgba(239,68,68,0.6)",
            background: "linear-gradient(180deg, rgba(239,68,68,0.95), rgba(185,28,28,0.95))",
            color: "#fff",
            boxShadow: "0 8px 22px rgba(239,68,68,0.35)",
            cursor: "pointer",
            letterSpacing: 0.3,
            fontWeight: 700,
          }}
        >
          전체 리셋 (모든 클라이언트 새로고침/인덱스)
        </button>
      </div>
    </div>
  );
}


