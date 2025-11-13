"use client";

import React, { useState, useMemo } from "react";
import Home from "@/components/desktop/home/home";
import Room from "@/components/desktop/room/room";

export default function Page() {
  const [active, setActive] = useState<1 | 2 | 3>(1);

  const TopBar = useMemo(() => {
    const btnStyle: React.CSSProperties = {
      padding: "8px 14px",
      borderRadius: 8,
      border: "1px solid #23262d",
      background: "#111318",
      color: "#e5e7eb",
      cursor: "pointer",
      fontWeight: 600,
    };
    const gap = 8;
    return (
      <div
        style={{
          position: "fixed",
          top: 10,
          left: 0,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap,
          zIndex: 40,
          pointerEvents: "none",
        }}
      >
        <button style={{ ...btnStyle, pointerEvents: "auto", opacity: active === 1 ? 1 : 0.8 }} onClick={() => setActive(1)}>
          1
        </button>
        <button style={{ ...btnStyle, pointerEvents: "auto", opacity: active === 2 ? 1 : 0.8 }} onClick={() => setActive(2)}>
          2
        </button>
        <button style={{ ...btnStyle, pointerEvents: "auto", opacity: active === 3 ? 1 : 0.8 }} onClick={() => setActive(3)}>
          3
        </button>
      </div>
    );
  }, [active]);

  return (
    <>
      {TopBar}
      {active === 1 && <Home />}
      {active === 2 && <Room />}
      {active === 3 && (
        <div
          style={{
            width: "100%",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#e5e7eb",
            background: "#0f1115",
          }}
        >
          3번 화면 (준비 중)
        </div>
      )}
    </>
  );
}
