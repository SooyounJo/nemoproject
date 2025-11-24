"use client";

export default function TypoWeather({ visible, highlightIndex = 0, timeSlot = "day" }) {
  if (!visible) return null;
  const base = [
    { key: "clear",  label: "맑은 하늘" },
    { key: "cloudy", label: "구름낀 하늘" },
    { key: "rainy",  label: "비오는 하늘" },
    { key: "snowy",  label: "눈오는 하늘" },
    { key: "foggy",  label: "안개낀 마을" },
    { key: "stormy", label: "바람 휘몰아치는 하늘" },
  ];
  const byTime = (s) => {
    switch (timeSlot) {
      case "night": return s.replace("하늘", "밤하늘");
      case "sunset": return s.replace("하늘", "노을 하늘");
      case "dawn": return s.replace("하늘", "새벽 하늘");
      default: return s;
    }
  };
  const items = base.map((o) => ({ ...o, label: byTime(o.label) }));
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
              transition: "transform 160ms ease, opacity 160ms ease, color 160ms ease",
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


