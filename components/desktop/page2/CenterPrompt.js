"use client";

export default function CenterPrompt({ visible, children }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 7,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderRadius: 12,
          background: "rgba(0,0,0,.7)",
          border: "1px solid rgba(255,255,255,.12)",
          color: "#e5e7eb",
          fontWeight: 700,
          letterSpacing: 0.2,
          boxShadow: "0 8px 30px rgba(0,0,0,.35)",
          animation: "promptFade 2000ms ease-in-out forwards",
        }}
      >
        {children}
      </div>
    </div>
  );
}


