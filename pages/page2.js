"use client";

import { useEffect, useRef, useState } from "react";

export default function Page2() {
  const [show, setShow] = useState(false);
  const vidRef = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setShow(true);
      const v = vidRef.current;
      if (v) {
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    }, 1000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
      }}
    >
      {/* Simple CRT/glitch styling */}
      <style
        // Using a style tag to define keyframes for the inline styles below
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes crtFlicker {
            0%, 97%, 100% { filter: brightness(1.0) contrast(1.06) saturate(1.02); }
            98% { filter: brightness(0.96) contrast(1.04) saturate(1.00); }
            99% { filter: brightness(1.06) contrast(1.10) saturate(1.06); }
          }
          @keyframes jitter {
            0% { transform: translate(0, 0); }
            10% { transform: translate(0.5px, 0); }
            20% { transform: translate(-0.6px, 0); }
            30% { transform: translate(0.4px, 0); }
            40% { transform: translate(-0.8px, 0); }
            50% { transform: translate(0.3px, 0); }
            60% { transform: translate(-0.4px, 0); }
            70% { transform: translate(0.6px, 0); }
            80% { transform: translate(-0.3px, 0); }
            90% { transform: translate(0.2px, 0); }
            100% { transform: translate(0, 0); }
          }
          @keyframes scanMove {
            0% { transform: translateY(-10%); }
            100% { transform: translateY(10%); }
          }
        `,
        }}
      />
      {show ? (
        <>
          <video
            ref={vidRef}
            src="/vid/nemo.mp4"
            playsInline
            muted
            controls={false}
            autoPlay
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "contrast(1.06) saturate(1.02)",
              animation: "crtFlicker 6s steps(2,end) infinite, jitter 2.2s steps(18,end) infinite",
            }}
            onError={() => {}}
          />
          {/* subtle scanlines */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "repeating-linear-gradient(to bottom, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px)",
              opacity: 0.12,
              mixBlendMode: "multiply",
              animation: "scanMove 6s linear infinite",
            }}
          />
          {/* vignette for old monitor feel */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.25) 100%)",
            }}
          />
        </>
      ) : null}
    </div>
  );
}


