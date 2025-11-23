import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTvSocket } from "../../utils/socket/client";

const PLACEHOLDERS = [
  "/2d/nemo.png",
  "/2d/mesy/monocity.png",
  "/2d/mesy/monocity2.png",
  "/2d/mesy/monocity3.png",
];

export default function TvScreen() {
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
    const s = useTvSocket((u) => {
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
        backgroundColor: "#000",
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
  );
}


