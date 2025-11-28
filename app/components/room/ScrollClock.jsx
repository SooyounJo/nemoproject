"use client";

import React, { useEffect, useMemo, useState } from "react";

// Displays a textual HH:mm clock mapped from a 0..1 progress to 05:00..23:00
export default function ScrollClock({ visible = true, progress = 0 }) {
  const [text, setText] = useState("05:00");

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const fmt = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  const minutes = useMemo(() => {
    const p = clamp01(typeof progress === "number" ? progress : 0);
    const start = 5 * 60;   // 05:00
    const span = 18 * 60;   // to 23:00 (18h)
    return Math.round(start + span * p);
  }, [progress]);

  useEffect(() => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    setText(fmt(h, m));
  }, [minutes]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 14,
        right: 16,
        zIndex: 80,
        color: "#e5e7eb",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 14,
        letterSpacing: 0.5,
        pointerEvents: "none",
      }}
      aria-label="스크롤 시간"
    >
      {text}
    </div>
  );
}


