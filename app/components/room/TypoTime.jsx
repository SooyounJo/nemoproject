"use client";

export default function TypoTime({ visible, highlightIndex = 0 }) {
  if (!visible) return null;

  const items = [
    { key: "dawn", label: "새벽" },
    { key: "day", label: "낮" },
    { key: "afternoon", label: "오후" },
    { key: "sunset", label: "노을" },
    { key: "night", label: "밤" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        left: 22,
        top: 80,
        zIndex: 8,
        pointerEvents: "none",
        display: "grid",
        gap: 6,
      }}
    >
      {items.map((o, i) => {
        const active = i === highlightIndex;
        return (
          <div
            key={o.key}
            style={{
              fontWeight: active ? 900 : 700,
              fontSize: active ? 18 : 15,
              color: active ? "#fff" : "#cbd5e1",
              opacity: active ? 1 : 0.8,
              letterSpacing: 0.2,
              transition:
                "transform 160ms ease, opacity 160ms ease, color 160ms ease",
              transform: active ? "translateX(2px)" : "translateX(0px)",
            }}
          >
            {o.label}
          </div>
        );
      })}
    </div>
  );
}



