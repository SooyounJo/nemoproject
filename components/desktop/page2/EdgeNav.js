"use client";

export default function EdgeNav({ onPrev, onNext }) {
  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 12,
        display: "flex",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 12,
        background: "rgba(17,19,24,0.35)",
        border: "1px solid rgba(255,255,255,0.16)",
        backdropFilter: "blur(10px) saturate(1.02)",
        WebkitBackdropFilter: "blur(10px) saturate(1.02)",
      }}
    >
      <button
        onClick={onNext}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(17,19,24,0.35)",
          color: "#e5e7eb",
          cursor: "pointer",
          display: "none",
        }}
        aria-label="Next"
        title="Next"
      >
        다음
      </button>
    </div>
  );
}



