"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const mainAudioRef = useRef(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    // generate QR for /mobile on same host (socket path shared)
    const href = typeof window !== "undefined" ? `${window.location.origin}/mobile` : "/mobile";
    QRCode.toDataURL(href, { margin: 1, scale: 6, color: { dark: "#e5e7eb", light: "#000000" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, []);

  function rampVolume(audio, target, ms) {
    if (!audio) return;
    const steps = Math.max(1, Math.floor(ms / 50));
    const start = audio.volume;
    const delta = target - start;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      const t = i / steps;
      audio.volume = Math.max(0, Math.min(1, start + delta * t));
      if (i >= steps) clearInterval(id);
    }, 50);
  }

  useEffect(() => {
    // boot background main music at landing
    try {
      const a = new Audio("/mmusic/main.mp3");
      a.loop = true;
      a.volume = 0;
      mainAudioRef.current = a;
      // respect saved mute
      let wantMute = false;
      try { wantMute = localStorage.getItem("nemo_audio_muted") === "1"; } catch {}
      setMuted(wantMute);
      if (wantMute) {
        // don't start playback if muted
        a.pause();
      } else {
        a.play().then(() => {
          rampVolume(a, 0.5, 1200);
        }).catch(() => setNeedsTap(true));
      }
    } catch {}
  }, []);

  const enableAudio = () => {
    try {
      const a = mainAudioRef.current || new Audio("/mmusic/main.mp3");
      mainAudioRef.current = a;
      a.loop = true;
      if (a.paused) a.play().catch(() => {});
      rampVolume(a, 0.5, 800);
      setNeedsTap(false);
    } catch {}
  };

  const toggleMute = () => {
    try {
      const a = mainAudioRef.current;
      if (!a) return;
      if (muted) {
        // unmute and resume
        if (a.paused) a.play().catch(() => {});
        rampVolume(a, 0.5, 300);
        setMuted(false);
        try { localStorage.setItem("nemo_audio_muted", "0"); } catch {}
      } else {
        // mute
        rampVolume(a, 0.0, 200);
        setTimeout(() => { try { a.pause(); } catch {} }, 220);
        setMuted(true);
        try { localStorage.setItem("nemo_audio_muted", "1"); } catch {}
      }
    } catch {}
  };

  useEffect(() => {
    // Only auto-advance when a mobile client connects via QR (emits landingProceed)
    const socket = io({ path: "/api/socketio", transports: ["websocket"] });
    const onProceed = () => { handleStart(); };
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
  }, []);

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
      onPointerDown={needsTap ? enableAudio : undefined}
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
          onClick={toggleMute}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.14)",
            background: muted ? "rgba(120,25,25,0.35)" : "rgba(17,19,24,0.35)",
            color: "#e5e7eb",
            cursor: "pointer",
          }}
          title={muted ? "음악 켜기" : "음악 끄기"}
        >
          {muted ? "음악 켜기" : "음악 끄기"}
        </button>
        <button
          onClick={handleStart}
          style={{
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


