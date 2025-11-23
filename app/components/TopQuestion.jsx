"use client";

import { useEffect, useRef, useState } from "react";

export default function TopQuestion() {
  const [show, setShow] = useState(false);
  // Start with the former 3rd question as the first
  const [text, setText] = useState("이 느껴지는 무드를 찾아보세요");
  const [stage, setStage] = useState(1);
  const currentStageRef = useRef(1);
  const finalizedRef = useRef(false); // prevent re-show after final

  useEffect(() => {
    // keep ref in sync to avoid stale closure in event handlers
    currentStageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    // New flow: initial background logic should be "stage3" random calm palette
    window.dispatchEvent(new CustomEvent("bg-gradient:stage3"));
    function onProgress(e) {
      if (finalizedRef.current) return; // do not show again after final
      const v = (e).detail;
      if (typeof v === "number" && v > 0.001) setShow(true);
    }
    function onSelect() {
      // change text after flash finishes (~1100ms) and show again
      setShow(false);
      setTimeout(() => {
        const s = currentStageRef.current;
        if (s === 1) {
          // move to stage 2 question (unchanged)
          setText("하루 중 어떤 시간에 휴식이 필요하신가요?");
          setShow(true);
          setStage(2);
          currentStageRef.current = 2;
          window.dispatchEvent(new CustomEvent("bg-gradient:stage2"));
          // ensure scroll interaction is enabled again for stage 2
          window.dispatchEvent(new CustomEvent("bg-gradient:enable-scroll"));
        } else if (s === 2) {
          // move to stage 3 question (formerly stage 1)
          setText("창밖에 어떤 빛이 보였으면 좋겠나요?");
          setShow(true);
          setStage(3);
          currentStageRef.current = 3;
          // switch background logic to base (formerly stage1)
          window.dispatchEvent(new CustomEvent("bg-gradient:stage1"));
        } else if (s === 3) {
          // final confirm on stage 3: show final screen (no scroll)
          setShow(false);
          finalizedRef.current = true;
          window.dispatchEvent(new CustomEvent("bg-gradient:disable-scroll"));
          window.dispatchEvent(new CustomEvent("bg-gradient:final"));
        } else {
          setShow(true);
        }
      }, 1100);
    }
    function onFinal() {
      finalizedRef.current = true;
      setShow(false);
    }
    window.addEventListener("bg-gradient:progress", onProgress);
    window.addEventListener("bg-gradient:select", onSelect);
    window.addEventListener("bg-gradient:final", onFinal);
    return () => {
      window.removeEventListener("bg-gradient:progress", onProgress);
      window.removeEventListener("bg-gradient:select", onSelect);
      window.removeEventListener("bg-gradient:final", onFinal);
    };
  }, []);

  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      <div className="rounded-full bg-white/10 border border-white/25 text-white/95 px-5 py-2 text-sm backdrop-blur-md fade-in-1s text-center whitespace-nowrap">
        {text}
      </div>
    </div>
  );
}


