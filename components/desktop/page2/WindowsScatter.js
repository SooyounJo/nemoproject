"use client";

export default function WindowsScatter({ windows, clarity = 0, cameraTargets = [], cameraImages = [] }) {
  const chooseMesySrc = (w, i) => {
    const ww = parseFloat(w.widthVw ?? parseFloat(w.width || "0"));
    const hh = parseFloat(w.heightVh ?? parseFloat(w.height || "0"));
    if (!isFinite(ww) || !isFinite(hh) || ww <= 0 || hh <= 0) {
      const fallback = (i % 11) + 1;
      return `/2d/mesy/img${fallback}.png`;
    }
    const r = ww / hh;
    // Occasionally show special city images regardless of ratio
    if (i % 6 === 1) return "/2d/mesy/monocity.png";
    if (i % 6 === 5) return "/2d/mesy/monocity3.png";
    if (i % 6 === 4) return "/2d/mesy/monocity2.png";
    // Distribute across 1..11 otherwise
    const wide = [2, 5, 8, 11];
    const tall = [3, 6, 9];
    const square = [1, 4, 7, 10];
    if (r >= 1.25) {
      const pick = wide[i % wide.length];
      return `/2d/mesy/img${pick}.png`;
    }
    if (r <= 0.8) {
      const pick = tall[i % tall.length];
      return `/2d/mesy/img${pick}.png`;
    }
    const pick = square[i % square.length];
    return `/2d/mesy/img${pick}.png`;
  };
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 6,
        perspective: "900px",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes modalScrollY {
              0%   { transform: translateY(0%); }
              100% { transform: translateY(-50%); }
            }
            @keyframes blurPulse {
              0%, 100% { filter: blur(0.1px); }
              50% { filter: blur(1.2px); }
            }
          `,
        }}
      />
      {windows.map((w, i) => {
        const camIdx = cameraTargets.includes(i) ? (i % Math.max(1, cameraImages.length)) : -1;
        const src = camIdx >= 0 && cameraImages[camIdx] ? cameraImages[camIdx] : chooseMesySrc(w, i);
        const withScroll = i % 3 === 0; // 일부 모달에만 스크롤 효과
        const dur = 6 + (i % 5) * 1.2;
        const invert = (i % 2) === 0; // 절반 정도는 컬러 반전
        const blurBase = 0.6;
        const blurNow = Math.max(0, blurBase * (1 - Math.max(0, Math.min(1, clarity))));
        const imgFilter = invert
          ? `blur(${blurNow}px) grayscale(1) invert(1) contrast(1.05)`
          : `blur(${blurNow}px) grayscale(1) contrast(1.05)`;
        // lens distortion: farther from center => slightly larger
        const cx = 50, cy = 50;
        const centerX = (w.leftVw || parseFloat(w.left)) + (w.widthVw || parseFloat(w.width)) / 2;
        const centerY = (w.topVh || parseFloat(w.top)) + (w.heightVh || parseFloat(w.height)) / 2;
        const dx = (centerX || 0) - cx;
        const dy = (centerY || 0) - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const norm = Math.max(0, Math.min(1, dist / 60)); // 0~1
        const lensScale = 1 + norm * 0.12;
        const pulseMs = 1800 + (i % 5) * 240;
        return (
          <div key={w.id} style={{ position: "absolute", zIndex: typeof w.z === "number" ? w.z : undefined, left: w.left, top: w.top, width: w.width, height: w.height, transform: `scale(${lensScale})`, transformOrigin: "center" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(231,233,238,0.56)",
                border: "1px solid rgba(154,160,170,0.45)",
                boxShadow: "0 8px 30px rgba(0,0,0,.25)",
                backdropFilter: "blur(8px) saturate(1.2)",
                WebkitBackdropFilter: "blur(8px) saturate(1.2)",
                borderRadius: 10,
                overflow: "hidden",
                animation: `${w.type} ${w.duration} ${w.timing} ${w.delay} infinite ${w.direction}`,
                transformOrigin: w.origin,
              }}
            >
              <div
                style={{
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 8px",
                  background: "linear-gradient(to bottom, rgba(220,224,232,0.6), rgba(200,204,212,0.6))",
                  borderBottom: "1px solid rgba(154,160,170,0.45)",
                  color: "#222",
                  fontSize: 12,
                  fontWeight: 700,
                  justifyContent: "space-between",
                }}
              >
                <span>{`window_${i + 1}`}</span>
                <span style={{ letterSpacing: 2, fontWeight: 700 }}>— □ ×</span>
              </div>
              {withScroll ? (
                <div className="mono-halftone" style={{ position: "absolute", inset: "26px 0 0 0", overflow: "hidden", display: "flex", alignItems: "flex-start", justifyContent: "center", animation: `blurPulse ${pulseMs}ms ease-in-out infinite`, willChange: "filter" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      /* let content define its own height; translateY percentages will be relative to this */
                      animation: `modalScrollY ${dur}s linear infinite alternate`,
                    }}
                  >
                    <img src={src} alt="" style={{ width: "100%", height: "auto", objectFit: "contain", objectPosition: "top center", display: "block", filter: imgFilter }} />
                    <img src={src} alt="" style={{ width: "100%", height: "auto", objectFit: "contain", objectPosition: "top center", display: "block", filter: imgFilter }} />
                  </div>
                </div>
              ) : (
                <div className="mono-halftone" style={{ position: "absolute", inset: "26px 0 0 0", overflow: "hidden", display: "flex", alignItems: "flex-start", justifyContent: "center", animation: `blurPulse ${pulseMs}ms ease-in-out infinite`, willChange: "filter" }}>
                  <img src={src} alt="" style={{ width: "100%", height: "auto", objectFit: "contain", objectPosition: "top center", filter: imgFilter }} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


