"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function FinalScreen() {
  const [show, setShow] = useState(false);
  const [finalUrl, setFinalUrl] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    function onFinal() {
      setShow(true);
      // start a 20s idle timer for auto reset (mobile visual only)
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // soft reset of UI hints
        setShow(false);
      }, 20000);
    }
    window.addEventListener("bg-gradient:final", onFinal);
    return () => {
      window.removeEventListener("bg-gradient:final", onFinal);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // listen for server-broadcast final image (from desktop)
  useEffect(() => {
    const s = io("/mobile", { path: "/api/socketio" });
    const onImg = (u) => {
      if (typeof u === "string" && u.startsWith("/genimg/")) setFinalUrl(u);
    };
    s.on("finalImage", onImg);
    return () => { s.off("finalImage", onImg); try { s.disconnect(); } catch {} };
  }, []);

  const fileName = useMemo(() => {
    try { return finalUrl.split("/").pop() || "nemo.png"; } catch { return "nemo.png"; }
  }, [finalUrl]);

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="flex flex-col items-center text-center px-4">
        <Image
          src="/nemo.png"
          alt="Nemo"
          width={200}
          height={200}
          priority
          className="fade-in-1s -mt-6 mb-2"
        />
        <p className="fade-in-1s text-white/90 text-[14px] sm:text-[14px] leading-snug max-w-[34ch] whitespace-pre-line break-keep" style={{ textWrap: "balance" }}>
          창문에 들어나는 당신의 틈을 보며 휴식을 느끼세요
        </p>
        {finalUrl ? (
          <div className="mt-4 flex items-center gap-8">
            <img src={finalUrl} alt="final" width={120} height={120} style={{ borderRadius: 10, objectFit: "cover" }} />
            <a
              href={finalUrl}
              download={fileName}
              className="rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2 text-sm text-white hover:bg-white/20 active:scale-[0.98] transition"
            >
              이미지 저장
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

