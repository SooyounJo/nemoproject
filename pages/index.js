"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { io } from "socket.io-client";
import QRCode from "qrcode";
import FrameTypos from "../app/loding/components/FrameTypos";
import Head from "next/head";

export default function Index() {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [fading, setFading] = useState(false);
  const [fxGather, setFxGather] = useState(false);
  const [fxExplode, setFxExplode] = useState(false);
  // fresh session token each time index loads (prevents stale mobile from advancing)
  const sessionToken = useMemo(() => {
    const r = Math.random().toString(36).slice(2, 10);
    try { sessionStorage.setItem("nemo_session_token", r); } catch {}
    return r;
  }, []);

  useEffect(() => {
    // generate QR for /mobile on same host (socket path shared)
    const href = typeof window !== "undefined"
      ? `${window.location.origin}/mobile?session=${encodeURIComponent(sessionToken)}`
      : `/mobile?session=${encodeURIComponent(sessionToken)}`;
    QRCode.toDataURL(href, { margin: 1, scale: 6, color: { dark: "#e5e7eb", light: "#000000" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [sessionToken]);

  useEffect(() => {
    // Only auto-advance when a mobile client connects via QR (emits landingProceed)
    const socket = io({ path: "/api/socketio", transports: ["websocket"] });
    const onProceed = (payload) => {
      try {
        const msgSession = payload && typeof payload.session === "string" ? payload.session : "";
        // proceed ONLY if it matches our current QR session
        if (msgSession && msgSession === sessionToken) {
          handleStart();
        }
      } catch {}
    };
    const onReset = () => {
      try {
        setFading(false); setFxGather(false); setFxExplode(false);
      } catch {}
    };
    socket.on("landingProceed", onProceed);
    socket.on("app:reset", onReset);
    return () => {
      socket.off("landingProceed", onProceed);
      socket.off("app:reset", onReset);
      socket.disconnect();
    };
  }, [sessionToken]);

  const handleStart = useCallback(() => {
    if (fading) return;
    // sequence: gather -> explode -> blackout -> navigate
    setFxGather(true);
    setTimeout(() => setFxExplode(true), 800);
    setTimeout(() => setFading(true), 1650);
    setTimeout(() => router.push("/page2"), 2400);
  }, [fading, router]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "#0b0d12",
        overflow: "hidden",
      }}
    >
      <Head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </Head>

      {/* Loading background video (like /loding) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          // 배경 영상이 연하게 보이지 않도록 완전 불투명
          opacity: 1,
          pointerEvents: "none",
        }}
      >
        <video
          src="/nemo.mp4"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            // 살짝 확대해서 모서리까지 꽉 차게
            transform: "scale(1.06)",
            transformOrigin: "center center",
          }}
          autoPlay
          loop
          muted
          playsInline
        />
      </div>

      {/* Window-frame flowing typos */}
      <FrameTypos gather={fxGather} explode={fxExplode} />

      {/* QR center - glassy modal style (only QR) */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 3,
          opacity: fading ? 0 : 1,
          transition: "opacity 900ms ease",
        }}
      >
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Open mobile control"
            width={140}
            height={140}
            style={{ display: "block" }}
          />
        ) : null}
        </div>

      {/* Bottom-right glass nav */}
      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: 16,
          zIndex: 4,
          display: "flex",
          gap: 8,
          padding: "6px 8px",
          borderRadius: 12,
          background: "rgba(17,19,24,0.35)",
          border: "1px solid rgba(255,255,255,0.16)",
          backdropFilter: "blur(10px) saturate(1.02)",
        }}
      >
        <button
          onClick={handleStart}
          style={{
            // Hide the visual "Next" button; flow and socket-based start remain
            display: "none",
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(17,19,24,0.35)",
            color: "#e5e7eb",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          다음
        </button>
      </div>

      {/* Sound opt-in (UI hidden per design; logic kept for potential future use) */}

      {/* Fade-to-black overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#000",
          pointerEvents: "none",
          opacity: fading ? 1 : 0,
          transition: "opacity 900ms ease",
        }}
      />
    </div>
  );
}


