"use client";

export default function LandingVideoCRT({ visible, videoRef, onEnded }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "90vw",
          height: "90vh",
        }}
      >
        <video
          ref={videoRef}
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
            objectFit: "contain",
            filter: "contrast(1.06) saturate(1.02)",
            animation: "crtFlicker 6s steps(2,end) infinite, jitter 2.2s steps(18,end) infinite",
          }}
          onError={() => {}}
          onEnded={onEnded}
        />
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.25) 100%)",
          }}
        />
      </div>
    </div>
  );
}


