"use client";

import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import GradientControl from "@/components/mobile/GradientControl";

export default function MobileController() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const socket = io({ path: "/api/socketio" });
    socketRef.current = socket;
    const onConnect = () => {
      setConnected(true);
      try { socket.emit("landingProceed", { source: "mobile" }); } catch {}
    };
    const onDisconnect = () => setConnected(false);
    const onNext = () => setStep((s) => Math.min(3, s + 1));
    const onPrev = () => setStep((s) => Math.max(0, s - 1));
    const onSetStep = (v) => setStep(() => Math.max(0, Math.min(3, Math.floor(v || 0))));
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("next", onNext);
    socket.on("prev", onPrev);
    socket.on("setStep", onSetStep);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("next", onNext);
      socket.off("prev", onPrev);
      socket.off("setStep", onSetStep);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);
  const emit = (event, payload) => socketRef.current && socketRef.current.emit(event, payload);

  return (
    <div
      style={{
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "#0b0d12",
        padding: 12,
        boxSizing: "border-box",
      }}
    >
      <div style={{ height: 8, color: connected ? "#10b981" : "#ef4444", fontSize: 12 }}>
        {connected ? "connected" : "disconnected"}
      </div>
      {step === 0 && (
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => emit("next")}
            style={{
              flex: 1,
              padding: "16px 18px",
              borderRadius: 12,
              border: "1px solid #23262d",
              background: "linear-gradient(180deg,#1a1f2e,#111318)",
              color: "#e5e7eb",
            }}
          >
            다음
          </button>
        </div>
      )}
      {step === 1 && (
        <>
          <GradientControl
            label="Light Path"
            colorA="#8b5cf6"
            colorB="#06b6d4"
            onChange={(v) => emit("progress", v)}
          />
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => emit("prev")}
              style={{
                flex: 1,
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid #23262d",
                background: "linear-gradient(180deg,#1a1f2e,#111318)",
                color: "#e5e7eb",
              }}
            >
              이전
            </button>
            <button
              onClick={() => emit("next")}
              style={{
                flex: 1,
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid #23262d",
                background: "linear-gradient(180deg,#1a1f2e,#111318)",
                color: "#e5e7eb",
              }}
            >
              다음
            </button>
          </div>
        </>
      )}
      {step >= 2 && (
        <>
          <GradientControl
            label="Images"
            colorA="#06b6d4"
            colorB="#8b5cf6"
            quantize={14}
            onChange={(v) => {
              const idx = Math.round(v * (14 - 1));
              emit("overlayIndex", idx);
            }}
          />
          <div style={{ display: "flex", gap: 12 }}>
            {step > 0 && (
              <button
                onClick={() => emit("prev")}
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid #23262d",
                  background: "linear-gradient(180deg,#1a1f2e,#111318)",
                  color: "#e5e7eb",
                }}
              >
                이전
              </button>
            )}
            {step < 3 && (
              <button
                onClick={() => emit("next")}
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid #23262d",
                  background: "linear-gradient(180deg,#1a1f2e,#111318)",
                  color: "#e5e7eb",
                }}
              >
                다음
              </button>
            )}
          </div>
          {step === 3 && (
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <input
                placeholder="힐링 키워드 입력"
                onChange={(e) => emit("healingText", e.target.value)}
                style={{
                  flex: 1,
                  background: "#0b0d12",
                  border: "1px solid #23262d",
                  color: "#e5e7eb",
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              />
              <button
                onClick={() => emit("healingText", "")}
                title="clear"
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #23262d",
                  background: "#111318",
                  color: "#e5e7eb",
                }}
              >
                Clear
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}



