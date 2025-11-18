"use client";

export default function WindowsArrangeTransition({ windows, survivors, targets, start }) {
  const flingName = (i) => {
    const names = ["flingTR", "flingTL", "flingBR", "flingBL"];
    return names[i % names.length];
  };
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 7,
      }}
    >
      {windows.map((w, i) => {
        const isSurvivor = survivors.includes(i);
        const idx = survivors.indexOf(i);
        const tgt = targets[idx] || null;
        if (isSurvivor && tgt) {
          const from = {
            left: w.leftVw,
            top: w.topVh,
            width: w.widthVw,
            height: w.heightVh,
          };
          const to = {
            left: tgt.left,
            top: tgt.top,
            width: tgt.width,
            height: tgt.height,
          };
          return (
            <div
              key={`arr_${w.id}`}
              style={{
                position: "absolute",
                left: `${start ? to.left : from.left}vw`,
                top: `${start ? to.top : from.top}vh`,
                width: `${start ? to.width : from.width}vw`,
                height: `${start ? to.height : from.height}vh`,
                background: "#e7e9ee",
                border: "1px solid #9aa0aa",
                boxShadow: "0 8px 30px rgba(0,0,0,.35)",
                transition:
                  "left 900ms cubic-bezier(0.19,1,0.22,1), top 900ms cubic-bezier(0.19,1,0.22,1), width 900ms cubic-bezier(0.19,1,0.22,1), height 900ms cubic-bezier(0.19,1,0.22,1)",
              }}
            >
              <div
                style={{
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 8px",
                  background: "#c8ccd4",
                  borderBottom: "1px solid #9aa0aa",
                  color: "#222",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <span>{`window_${i + 1}`}</span>
                <span style={{ letterSpacing: 2, fontWeight: 700 }}>— □ ×</span>
              </div>
              <div style={{ position: "absolute", inset: "26px 0 0 0", background: "#f2f4f7" }} />
            </div>
          );
        }
        return (
          <div
            key={`fall_${w.id}`}
            style={{
              position: "absolute",
              left: `${w.leftVw}vw`,
              top: `${w.topVh}vh`,
              width: `${w.widthVw}vw`,
              height: `${w.heightVh}vh`,
              background: "#e7e9ee",
              border: "1px solid #9aa0aa",
              boxShadow: "0 8px 30px rgba(0,0,0,.35)",
              animation: `${flingName(i)} 700ms cubic-bezier(0.1,0.8,0.2,1) forwards`,
            }}
          >
            <div
              style={{
                height: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 8px",
                background: "#c8ccd4",
                borderBottom: "1px solid #9aa0aa",
                color: "#222",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span>{`window_${i + 1}`}</span>
              <span style={{ letterSpacing: 2, fontWeight: 700 }}>— □ ×</span>
            </div>
            <div style={{ position: "absolute", inset: "26px 0 0 0", background: "#f2f4f7" }} />
          </div>
        );
      })}
    </div>
  );
}


