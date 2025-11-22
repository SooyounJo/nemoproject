"use client";

import React, { useRef, useState } from "react";

export default function GradientControl({ label, onChange, quantize = null, colorA = "#8b5cf6", colorB = "#06b6d4" }) {
  const ref = useRef(null);
  const [value, setValue] = useState(0.5);
  const handle = (clientX) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let v = (clientX - r.left) / Math.max(1, r.width);
    v = Math.max(0, Math.min(1, v));
    if (typeof quantize === "number" && quantize > 1) {
      const step = Math.round(v * (quantize - 1));
      v = step / (quantize - 1);
    }
    setValue(v);
    onChange && onChange(v);
  };
  return (
    <div
      ref={ref}
      onPointerDown={(e) => {
        if (e.target && typeof e.target.setPointerCapture === "function") {
          e.target.setPointerCapture(e.pointerId);
        }
        handle(e.clientX);
      }}
      onPointerMove={(e) => {
        if ((e.buttons & 1) === 1) handle(e.clientX);
      }}
      style={{
        position: "relative",
        height: 100,
        borderRadius: 14,
        border: "1px solid #23262d",
        background: `linear-gradient(90deg, ${colorA}, ${colorB})`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.35)), radial-gradient(ellipse at center, rgba(255,255,255,.12), rgba(255,255,255,0))",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `calc(${(value * 100).toFixed(2)}% - 10px)`,
          width: 20,
          background: "rgba(255,255,255,.9)",
          boxShadow: "0 0 18px rgba(255,255,255,.6)",
          borderRadius: 6,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "absolute", top: 8, left: 12, color: "#e5e7eb", fontSize: 12 }}>{label}</div>
      <div style={{ position: "absolute", bottom: 8, right: 12, color: "#e5e7eb", fontSize: 12 }}>
        {value.toFixed(3)}
      </div>
    </div>
  );
}



