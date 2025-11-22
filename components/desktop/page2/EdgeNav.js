"use client";

export default function EdgeNav({ onPrev, onNext }) {
  return (
    <>
      <button
        onClick={onPrev}
        style={{
          position: "absolute",
          left: 8,
          top: "50%",
          transform: "translateY(-50%)",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #2a2f3a",
          background: "rgba(17,19,24,.8)",
          color: "#e5e7eb",
          cursor: "pointer",
          zIndex: 8,
        }}
        aria-label="Previous"
        title="Previous"
      >
        이전
      </button>
      <button
        onClick={onNext}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #2a2f3a",
          background: "rgba(17,19,24,.8)",
          color: "#e5e7eb",
          cursor: "pointer",
          zIndex: 8,
        }}
        aria-label="Next"
        title="Next"
      >
        다음
      </button>
    </>
  );
}



