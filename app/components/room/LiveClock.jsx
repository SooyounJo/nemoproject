"use client";

import React, { useEffect, useState } from "react";

export default function LiveClock({ visible = true }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const pad2 = (n) => String(n).padStart(2, "0");
    const update = () => {
      const now = new Date();
      setTime(`${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 14,
        right: 16,
        zIndex: 80,
        padding: "6px 10px",
        borderRadius: 10,
        background: "rgba(17,19,24,0.45)",
        border: "1px solid rgba(255,255,255,0.14)",
        color: "#e5e7eb",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 14,
        letterSpacing: 0.5,
        backdropFilter: "blur(8px) saturate(1.02)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.30)",
        pointerEvents: "none",
      }}
      aria-label="현재 시간"
    >
      {time || "00:00"}
    </div>
  );
}


