"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function useMobileSocket() {
	const sockRef = useRef(null);
	const firedRef = useRef(false);
	const lockedRef = useRef(false);
	const MAX_PER_SET = { 1: 16, 2: 13, 3: 18, 4: 10, 5: 27 };
	useEffect(() => {
		const s = io("/mobile", { path: "/api/socketio" });
		sockRef.current = s;
		// Notify desktop landing to auto proceed when mobile connects (QR flow)
		try {
			s.on("connect", () => {
				try { s.emit("landingProceed"); } catch {}
			});
		} catch {}

		function onProgress(e) {
			try {
				const v = typeof e?.detail === "number" ? e.detail : 0;
				if (lockedRef.current) return;
				s.emit("progress", Math.max(0, Math.min(1, v)));
				// On first scroll/progress, trigger a single "next" for desktop
				if (!firedRef.current && v > 0) {
					firedRef.current = true;
					s.emit("next");
				}
			} catch {}
		}
		window.addEventListener("bg-gradient:progress", onProgress);
		// Sync scroll activation and selection lock
		const onEnable = () => {
			try {
				lockedRef.current = false;
				window.dispatchEvent(new CustomEvent("bg-gradient:enable-scroll"));
			} catch {}
		};
		const onDisable = () => {
			try {
				window.dispatchEvent(new CustomEvent("bg-gradient:disable-scroll"));
			} catch {}
		};
		const onMoodSelect = () => {
			lockedRef.current = true;
			try {
				window.dispatchEvent(new CustomEvent("bg-gradient:disable-scroll"));
			} catch {}
		};
		// Fallback: if final is reached but server aggregation didn't emit, push a random valid genimg
		const onFinal = () => {
			try {
				const n = Math.floor(Math.random() * 5) + 1;
				const max = MAX_PER_SET[n] || 10;
				const k = Math.floor(Math.random() * max) + 1;
				const url = `/genimg/${n}-${k}.png`;
				s.emit("tvShow", url);
			} catch {}
		};
		s.on("moodScroll:enable", onEnable);
		s.on("moodScroll:disable", onDisable);
		s.on("moodSelect", onMoodSelect);
		// Also unlock locally when UI dispatches enable-scroll for later stages
		const localEnable = () => { lockedRef.current = false; };
		window.addEventListener("bg-gradient:enable-scroll", localEnable);
		window.addEventListener("bg-gradient:final", onFinal);

		return () => {
			window.removeEventListener("bg-gradient:progress", onProgress);
			window.removeEventListener("bg-gradient:enable-scroll", localEnable);
			window.removeEventListener("bg-gradient:final", onFinal);
			s.off("moodScroll:enable", onEnable);
			s.off("moodScroll:disable", onDisable);
			s.off("moodSelect", onMoodSelect);
			try { s.disconnect(); } catch {}
			sockRef.current = null;
		};
	}, []);
	return sockRef;
}


