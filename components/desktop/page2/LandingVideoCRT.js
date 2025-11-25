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
      <style
        dangerouslySetInnerHTML={{
          __html: `
          /* Ease-in, hold ~2s, ease-out */
          @keyframes imgEaseInHoldOut {
            0% { opacity: 0; animation-timing-function: ease-in; }
            22.2% { opacity: 1; }         /* ~0.8s of 3.6s */
            77.8% { opacity: 1; animation-timing-function: ease-out; } /* hold ~2.0s */
            100% { opacity: 0; }
          }
        `,
        }}
      />
      <div
        style={{
          position: "relative",
          // 이전 큰 사이즈에서 조금만 줄인 정도의 고정 크기
          width: 280,
          height: 280,
          background: "transparent",
        }}
      >
        <img
          src="/2d/nemo.png"
          alt="nemo"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "contrast(1.06) saturate(1.02)",
            animation: "imgEaseInHoldOut 3600ms linear forwards",
            display: "block",
          }}
          onAnimationEnd={() => {
            if (typeof onEnded === "function") onEnded();
          }}
        />
      </div>
    </div>
  );
}



