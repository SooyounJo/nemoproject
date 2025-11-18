"use client";

export default function WindowsScatter({ windows }) {
  const chooseMesySrc = (w, i) => {
    const ww = parseFloat(w.widthVw ?? parseFloat(w.width || "0"));
    const hh = parseFloat(w.heightVh ?? parseFloat(w.height || "0"));
    if (!isFinite(ww) || !isFinite(hh) || ww <= 0 || hh <= 0) {
      const fallback = (i % 11) + 1;
      return `/2d/mesy/img${fallback}.png`;
    }
    const r = ww / hh;
    // Distribute across 1..11
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
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes modalScrollY {
              0%   { transform: translateY(0%); }
              100% { transform: translateY(-50%); }
            }
          `,
        }}
      />
      {windows.map((w, i) => {
        const src = chooseMesySrc(w, i);
        const withScroll = i % 3 === 0; // 일부 모달에만 스크롤 효과
        const dur = 6 + (i % 5) * 1.2;
        return (
          <div
            key={w.id}
            style={{
              position: "absolute",
              left: w.left,
              top: w.top,
              width: w.width,
              height: w.height,
              background: "#e7e9ee",
              border: "1px solid #9aa0aa",
              boxShadow: "0 8px 30px rgba(0,0,0,.35)",
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
                background: "#c8ccd4",
                borderBottom: "1px solid #9aa0aa",
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
              <div style={{ position: "absolute", inset: "26px 0 0 0", overflow: "hidden" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    right: 0,
                    height: "200%",
                    animation: `modalScrollY ${dur}s linear infinite alternate`,
                  }}
                >
                  <img src={src} alt="" style={{ width: "100%", height: "50%", objectFit: "cover", display: "block" }} />
                  <img src={src} alt="" style={{ width: "100%", height: "50%", objectFit: "cover", display: "block" }} />
                </div>
              </div>
            ) : (
              <div style={{ position: "absolute", inset: "26px 0 0 0", overflow: "hidden" }}>
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


