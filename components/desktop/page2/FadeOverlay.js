"use client";

export default function FadeOverlay({ visible, duration = 600, zIndex = 4 }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#000",
        opacity: visible ? 1 : 0,
        transition: `opacity ${duration}ms ease`,
        pointerEvents: "none",
        zIndex,
      }}
    />
  );
}



