import React, { useEffect, useMemo, useState } from "react";
import { useSbmSocket } from "../../utils/socket/client";

const PLACEHOLDERS = [
  "/2d/nemo.png",
  "/2d/mesy/monocity.png",
  "/2d/mesy/monocity2.png",
  "/2d/mesy/monocity3.png",
];

export default function BlidingScreen() {
  const [url, setUrl] = useState("");
  const fallback = useMemo(() => {
    const seed = Math.floor(Math.random() * PLACEHOLDERS.length);
    return PLACEHOLDERS[seed];
  }, []);

  useEffect(() => {
    const last = typeof window !== "undefined" ? localStorage.getItem("nemo_last_image") : null;
    if (last) setUrl(last);
  }, []);

  useEffect(() => {
    const s = useSbmSocket((u) => {
      if (typeof u === "string" && u) {
        setUrl(u);
        try {
          localStorage.setItem("nemo_last_image", u);
        } catch {}
      }
    });
    return () => {
      try {
        s.disconnect();
      } catch {}
    };
  }, []);

  const display = url || fallback;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(80% 80% at 50% 50%, rgba(255,255,255,0.08), rgba(0,0,0,0.9))",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          width: "78vw",
          height: "78vh",
          backdropFilter: "blur(10px)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.035)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={display}
          alt="selected"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            filter: "grayscale(0.1) contrast(1.05)",
          }}
        />
      </div>
    </div>
  );
}


