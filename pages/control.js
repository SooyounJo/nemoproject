"use client";

import React from "react";
import { io } from "socket.io-client";

export default function ControlPage() {
  const resetAll = () => {
    try {
      const s = io({ path: "/api/socketio" });
      s.emit("app:reset");
      setTimeout(() => s.disconnect(), 400);
    } catch {}
  };
  return (
    <div style={{ minHeight: "100vh", background: "#0b0d12", display: "grid", placeItems: "center", color: "#e5e7eb" }}>
      <div style={{ display: "grid", gap: 16, placeItems: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Controller</div>
        <button
          onClick={resetAll}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(17,19,24,0.35)",
            backdropFilter: "blur(10px)",
            color: "#e5e7eb",
            cursor: "pointer",
          }}
        >
          전체 리셋 (모든 클라이언트 인덱스로)
        </button>
      </div>
    </div>
  );
}


