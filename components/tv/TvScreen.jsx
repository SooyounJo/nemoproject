import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTvSocket } from "../../utils/socket/client";
import ThreeBackground from "../../app/components/common/ThreeBackground";

export default function TvScreen() {
  const [url, setUrl] = useState("");
  const [fade, setFade] = useState(false);
  const [tint, setTint] = useState(null); // {color, opacity}
  const [audioReady, setAudioReady] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const mainAudioRef = useRef(null);
  const fxAudioRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const MUSIC_LIST = useMemo(
    () => [
      "/mmusic/ambi1.mp3","/mmusic/ambi2.mp3","/mmusic/ambi3.mp3","/mmusic/ambi4.mp3","/mmusic/ambi5.mp3","/mmusic/ambi6.mp3","/mmusic/ambi7.mp3","/mmusic/ambi8.mp3","/mmusic/ambi9.mp3","/mmusic/ambi10.mp3",
      "/mmusic/soft1.mp3","/mmusic/soft2.mp3","/mmusic/soft3.mp3","/mmusic/soft4.mp3","/mmusic/soft5.mp3","/mmusic/soft6.mp3","/mmusic/soft7.mp3",
    ],
    []
  );

  useEffect(() => {
    // Start fully black; do not restore any previous image
    setUrl("");
    // boot background main music
    try {
      const a = new Audio("/mmusic/main.mp3");
      a.loop = true;
      a.volume = 0;
      mainAudioRef.current = a;
      a.play().then(() => {
        setAudioReady(true);
        rampVolume(a, 0.5, 1200);
      }).catch(() => {
        // Autoplay blocked: silently wait for first pointer to enable without visible UI
        setNeedsTap(true);
      });
      const onFirstPointer = () => {
        if (!needsTap) return;
        try {
          a.play().then(() => {
            setAudioReady(true);
            rampVolume(a, 0.5, 800);
            setNeedsTap(false);
          }).catch(() => {});
        } catch {}
      };
      window.addEventListener("pointerdown", onFirstPointer, { once: true });
      return () => window.removeEventListener("pointerdown", onFirstPointer);
    } catch {}
  }, []);

  function rampVolume(audio, target, ms) {
    if (!audio) return;
    const steps = Math.max(1, Math.floor(ms / 50));
    const start = audio.volume;
    const delta = target - start;
    let i = 0;
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    fadeTimerRef.current = setInterval(() => {
      i += 1;
      const t = i / steps;
      const v = start + delta * t;
      audio.volume = Math.max(0, Math.min(1, v));
      if (i >= steps) {
        clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
        audio.volume = Math.max(0, Math.min(1, target));
      }
    }, 50);
  }

  function playRandomFx() {
    try {
      if (!audioReady) return;
      const candidates = MUSIC_LIST;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      // crossfade: main -> down, fx -> up
      const main = mainAudioRef.current;
      if (main) rampVolume(main, 0.0, 1500);
      if (fxAudioRef.current) {
        try { fxAudioRef.current.pause(); } catch {}
        fxAudioRef.current = null;
      }
      const fx = new Audio(pick);
      fx.volume = 0;
      fxAudioRef.current = fx;
      fx.play().then(() => {
        rampVolume(fx, 1.0, 2000);
      }).catch(() => {});
      fx.onended = () => {
        // return to main loop
        if (main) {
          main.play().catch(() => {});
          rampVolume(main, 0.5, 1500);
        }
      };
    } catch {}
  }

  useEffect(() => {
    const s = useTvSocket((u) => {
      if (typeof u === "string" && u) {
        let path = u;
        // tolerate bare "5-3.png"
        if (!path.startsWith("/genimg/") && /^[1-9]-\d+\.png$/i.test(path)) {
          path = `/genimg/${path}`;
        }
        // tolerate folder style "/genimg/3/3-2.png" -> "/genimg/3-2.png"
        const m = path.match(/^\/genimg\/([1-5])\/(\d+)-(\d+)\.png$/);
        if (m && m[1] === m[2]) {
          path = `/genimg/${m[1]}-${m[3]}.png`;
        }
        // allow /genimg/* and /weather/*.png
        if (!/^\/genimg\/[1-5]-\d+\.png$/.test(path) && !/^\/weather\/[a-z0-9_-]+\.png$/i.test(path)) return;
        try { console.log("[tv] tvShow/imageSelected ->", path); } catch {}
        setFade(false);
        setUrl(path);
        // reset tint unless a new one is provided after
        setTint(null);
        // slower fade-in
        setTimeout(() => setFade(true), 80);
        // trigger dramatic fx music
        playRandomFx();
      }
    });
    try {
      s.emit("tvHello", { ts: Date.now() });
    } catch {}
    // clear handler: return to black and resume main music
    try {
      s.on("tvClear", () => {
        setFade(false);
        setUrl("");
        setTint(null);
        const main = mainAudioRef.current;
        if (fxAudioRef.current) {
          try { fxAudioRef.current.pause(); } catch {}
          fxAudioRef.current = null;
        }
        if (main) {
          main.play().catch(() => {});
          rampVolume(main, 0.5, 800);
        }
      });
    } catch {}
    // Fallback: also accept imageSelected only if it points to /genimg/*
    try {
      s.on("imageSelected", (u) => {
        if (typeof u !== "string" || (!u.startsWith("/genimg/") && !u.startsWith("/weather/"))) return;
        setFade(false);
        setUrl(u);
        setTint(null);
        setTimeout(() => setFade(true), 30);
      });
    } catch {}
    try {
      s.on("tvFilter", (payload) => {
        const color = payload && typeof payload.color === "string" ? payload.color : null;
        const opacity = Math.max(0, Math.min(1, Number(payload?.opacity ?? 0.1)));
        if (color) setTint({ color, opacity });
      });
    } catch {}
    return () => {
      try {
        s.disconnect();
      } catch {}
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      try { if (mainAudioRef.current) mainAudioRef.current.pause(); } catch {}
      try { if (fxAudioRef.current) fxAudioRef.current.pause(); } catch {}
    };
  }, []);

  const onEnableAudio = () => {
    try {
      // try to resume Web Audio context if present (satisfy iOS)
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        ctx.resume().catch(() => {});
        // close immediately to avoid keeping an extra context open
        setTimeout(() => { try { ctx.close(); } catch {} }, 250);
      }
    } catch {}
    try {
      const a = mainAudioRef.current || new Audio("/mmusic/main.mp3");
      mainAudioRef.current = a;
      a.loop = true;
      if (a.paused) a.play().catch(() => {});
      rampVolume(a, 0.5, 800);
      setAudioReady(true);
      setNeedsTap(false);
    } catch {}
  };

  const display = url || "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onPointerDown={needsTap ? onEnableAudio : undefined}
    >
      {/* exact mobile gradient background (Three.js shader), fades out when image appears */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          opacity: display ? 0 : 1,
          transition: "opacity 800ms ease",
          pointerEvents: "none",
        }}
      >
        <ThreeBackground />
      </div>
      {display ? (
        <>
          {/* image with subtle wobble */}
          <img
            src={display}
            alt="selected"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "contrast(1.04) saturate(1.03)",
              opacity: fade ? 1 : 0,
              transition: "opacity 1800ms ease",
              animation: "tvWobble 6s ease-in-out infinite",
            }}
          />
          {/* very light mood tint overlay (10%) */}
          {tint && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: tint.color,
                opacity: tint.opacity,
                mixBlendMode: "soft-light",
                pointerEvents: "none",
              }}
            />
          )}
          {/* lofi particles */}
          <div style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
            opacity: 0.18,
            mixBlendMode: "screen",
          }}>
            {[...Array(10)].map((_, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${Math.random()*100}%`,
                top: `${Math.random()*100}%`,
                width: 2 + Math.random()*3,
                height: 2 + Math.random()*3,
                borderRadius: 999,
                background: "rgba(255,255,255,0.9)",
                filter: "blur(1.2px)",
                animation: `floatUp ${8 + Math.random()*10}s linear ${Math.random()*4}s infinite`,
              }}/>
            ))}
          </div>
          {/* CSS keyframes */}
          <style>{`
            @keyframes floatUp {
              0% { transform: translateY(0px); opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { transform: translateY(-120vh); opacity: 0; }
            }
            @keyframes tvWobble {
              0% { transform: translate3d(0,0,0) scale(1.005); }
              50% { transform: translate3d(0,0,0) scale(1.01); }
              100% { transform: translate3d(0,0,0) scale(1.005); }
            }
          `}</style>
        </>
      ) : null}
      {/* No visible sound activation UI; pointer enables silently */}
    </div>
  );
}


