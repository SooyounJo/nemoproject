"use client";

export default function WindowsArrangeGrid({
  windows,
  survivors,
  moods = [],
  moodIndex = 0,
  scrollPulseDir = null,
  scrollKey = 0,
  clarity = 0,
  cameraTargets = [],
  cameraImages = [],
}) {
  const chooseMesySrc = (w, i) => {
    const ww = parseFloat(w.widthVw ?? parseFloat(w.width || "0"));
    const hh = parseFloat(w.heightVh ?? parseFloat(w.height || "0"));
    if (!isFinite(ww) || !isFinite(hh) || ww <= 0 || hh <= 0) {
      const fallback = (i % 11) + 1;
      return `/2d/mesy/img${fallback}.png`;
    }
    const r = ww / hh;
    // Occasionally surface special city images
    if (i % 6 === 1) return "/2d/mesy/monocity.png";
    if (i % 6 === 5) return "/2d/mesy/monocity3.png";
    if (i % 6 === 4) return "/2d/mesy/monocity2.png";
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
  const choosePicsumSrc = (i) => {
    // use mood name as seed for consistency across 9 tiles
    const has = Array.isArray(moods) && moods.length > 0;
    if (!has) return null;
    const mood = moods[(moodIndex % moods.length + moods.length) % moods.length]?.name || "nemo";
    const seed = encodeURIComponent(`${mood}-${i}`);
    // fixed size; objectFit: cover handles crop
    return `https://picsum.photos/seed/${seed}/1200/800`;
  };
  const moodStyle = (() => {
    const m = Array.isArray(moods) && moods.length ? moods[(moodIndex % moods.length + moods.length) % moods.length] : null;
    return {
      overlay: m?.overlay || "rgba(0,0,0,0)",
      filter: m?.filter || "none",
    };
  })();
  const pulseAnim =
    scrollPulseDir === "up"
      ? "modalPulseUp 1200ms ease-in-out"
      : scrollPulseDir === "down"
      ? "modalPulseDown 1200ms ease-in-out"
      : "none";
  // Only render survivor windows (9개). If survivors 미지정, 첫 9개 사용
  const renderList = Array.isArray(survivors) && survivors.length
    ? survivors.map((idx) => windows[idx]).filter(Boolean).slice(0, 9)
    : windows.slice(0, 9);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        columnGap: 0,
        rowGap: 0,
        padding: 0,
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
            @keyframes modalPulseUp {
              0%   { transform: translateY(0%); }
              50%  { transform: translateY(-50%); }
              100% { transform: translateY(0%); }
            }
            @keyframes modalPulseDown {
              0%   { transform: translateY(0%); }
              50%  { transform: translateY(50%); }
              100% { transform: translateY(0%); }
            }
            @keyframes blurPulse {
              0%, 100% { filter: blur(0.08px); }
              50% { filter: blur(0.9px); }
            }
          `,
        }}
      />
      {renderList.map((w, i) => {
        const picsum = choosePicsumSrc(i);
        const camIdx = cameraTargets.includes(i) ? (i % Math.max(1, cameraImages.length)) : -1;
        const baseSrc = picsum || chooseMesySrc(w, i);
        const src = camIdx >= 0 && cameraImages[camIdx] ? cameraImages[camIdx] : baseSrc;
        const withScroll = i % 4 === 0; // 일부만 스크롤 효과
        const dur = 7 + (i % 4) * 1.4;
        const invert = (i % 2) === 1;
        const blurBase = 0.4;
        const blurNow = Math.max(0, blurBase * (1 - Math.max(0, Math.min(1, clarity))));
        const imgFilter = invert
          ? `blur(${blurNow}px) grayscale(1) invert(1) contrast(1.05)`
          : `blur(${blurNow}px) grayscale(1) contrast(1.05)`;
        return (
          <div
            key={`grid_${w.id}`}
            style={{
              background: "rgba(231,233,238,0.56)",
              border: "1px solid rgba(154,160,170,0.45)",
              boxShadow: "0 8px 30px rgba(0,0,0,.25)",
              backdropFilter: "blur(8px) saturate(1.2)",
              WebkitBackdropFilter: "blur(8px) saturate(1.2)",
              borderRadius: 10,
              pointerEvents: "none",
              boxSizing: "border-box",
              overflow: "hidden",
              display: "grid",
              gridTemplateRows: "26px 1fr",
            }}
          >
            <div
              style={{
                height: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 8px",
                background: "linear-gradient(to bottom, rgba(220,224,232,0.6), rgba(200,204,212,0.6))",
                borderBottom: "1px solid rgba(154,160,170,0.45)",
                color: "#222",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span>{`window_${i + 1}`}</span>
              <span style={{ letterSpacing: 2, fontWeight: 700 }}>— □ ×</span>
            </div>
            <div className="mono-halftone" style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", filter: moodStyle.filter }}>
              {/* mood overlay */}
              <div style={{ position: "absolute", inset: 0, background: moodStyle.overlay, mixBlendMode: "multiply", pointerEvents: "none", zIndex: 2 }} />
              {/* track for pulse scroll */}
              <div
                key={`${scrollKey}-${i}`}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: "200%",
                  animation: pulseAnim,
                }}
              >
                <div style={{ animation: `blurPulse ${1600 + (i % 4) * 260}ms ease-in-out infinite`, willChange: "filter" }}>
                  <img src={src} alt="" style={{ width: "100%", height: "50%", objectFit: "cover", display: "block", filter: imgFilter }} />
                  <img src={src} alt="" style={{ width: "100%", height: "50%", objectFit: "cover", display: "block", filter: imgFilter }} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


