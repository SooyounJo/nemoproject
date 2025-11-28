"use client";

import React, { useEffect, useState } from "react";

export default function ScrollNudge() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onNudge = () => {
      setShow(true);
      const id = setTimeout(() => setShow(false), 4000);
      return () => clearTimeout(id);
    };
    window.addEventListener("nudge:scroll", onNudge);
    return () => window.removeEventListener("nudge:scroll", onNudge);
  }, []);
  if (!show) return null;
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes fingerUpDown {
            0%   { transform: translateY(0); opacity: 0.95; }
            25%  { transform: translateY(-10px); opacity: 1; }
            50%  { transform: translateY(0); opacity: 0.95; }
            75%  { transform: translateY(10px); opacity: 1; }
            100% { transform: translateY(0); opacity: 0.95; }
          }
        `,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "18vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              color: "rgba(229,231,235,0.95)",
              fontSize: 14,
              textShadow: "0 2px 8px rgba(0,0,0,0.45)",
            }}
          >
            위·아래로 스크롤해 보세요
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: "rgba(255,255,255,0.9)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              animation: "fingerUpDown 1.2s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </>
  );
}


