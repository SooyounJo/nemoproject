"use client";

import { useEffect, useRef, useState } from "react";

export default function TypingNemo() {
	const fullTitle = "NEMO";
	const [txt, setTxt] = useState("");
	const full = "나만의 힐링 window를 제작해보세요";
	const modeRef = useRef("typing");
	const idxRef = useRef(0);
	const timerRef = useRef(null);

	useEffect(() => {
		const step = () => {
			const mode = modeRef.current;
			if (mode === "typing") {
				idxRef.current += 1;
				const n = Math.min(full.length, idxRef.current);
				setTxt(full.slice(0, n));
				if (n === full.length) {
					modeRef.current = "pause";
					timerRef.current = setTimeout(step, 1200);
					return;
				}
				timerRef.current = setTimeout(step, 180);
			} else if (mode === "deleting") {
				idxRef.current -= 1;
				const n = Math.max(0, idxRef.current);
				setTxt(full.slice(0, n));
				if (n === 0) {
					modeRef.current = "typing";
					timerRef.current = setTimeout(step, 650);
					return;
				}
				timerRef.current = setTimeout(step, 110);
			} else {
				modeRef.current = "deleting";
				timerRef.current = setTimeout(step, 100);
			}
		};
		timerRef.current = setTimeout(step, 250);
		return () => timerRef.current && clearTimeout(timerRef.current);
	}, []);

	return (
		<div
			style={{
				position: "absolute",
				top: 96,
				left: 60,
				zIndex: 4,
				pointerEvents: "none",
				display: "grid",
				gap: 6,
				color: "#e5e7eb",
				fontFamily:
					'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					fontWeight: 800,
					letterSpacing: 10,
					fontSize: 68,
					textTransform: "uppercase",
					textShadow: "0 3px 24px rgba(0,0,0,.45)",
				}}
			>
				{fullTitle}
			</div>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 6,
					fontWeight: 600,
					letterSpacing: 0.3,
					fontSize: 14,
					textShadow: "0 2px 18px rgba(0,0,0,.35)",
				}}
			>
				<span>{txt}</span>
				<span
					aria-hidden="true"
					style={{
						width: 8,
						height: 14,
						background: "#e5e7eb",
						opacity: 0.9,
						display: "inline-block",
						animation: "caretBlink 1s step-end infinite",
					}}
				/>
				<style>{`@keyframes caretBlink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
			</div>
		</div>
	);
}


