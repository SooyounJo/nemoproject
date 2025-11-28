"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function useMobileSocket() {
	const sockRef = useRef(null);
	const firedRef = useRef(false);
	const lockedRef = useRef(false);
	const MAX_PER_SET = { 1: 16, 2: 13, 3: 18, 4: 10, 5: 27 };
	useEffect(() => {
		const base = (typeof window !== "undefined" && window.__NEMO_SOCKET_URL__) || process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
		const s = io(base ? `${base}/mobile` : "/mobile", { path: "/api/socketio", transports: ["websocket"] });
		sockRef.current = s;
		// Notify desktop landing to auto proceed when mobile connects (QR flow)
		try {
			// read session token from URL (?session=...)
			const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
			const session = sp.get("session") || "";
			s.on("connect", () => {
				// Only notify if this page was opened via QR with a valid session param
				if (session) {
					try { s.emit("landingProceed", { session }); } catch {}
				}
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
		// Mobile reload sync
		const emitReload = () => { try { s.emit("sync:reload"); } catch {} };
		window.addEventListener("beforeunload", emitReload);
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") emitReload();
		});
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
		// Ownership control
		s.on("control:granted", () => { lockedRef.current = false; });
		s.on("control:revoked", () => { lockedRef.current = true; });
		// Forced kick/reload scheduling
		const scheduleReload = (ms) => {
			const dur = Math.max(0, Number(ms || 20000));
			try {
				// hard disconnect immediately to avoid accidental reconnection
				s.disconnect();
				sockRef.current = null;
			} catch {}
			setTimeout(() => {
				try { window.location.reload(); } catch {}
			}, dur);
		};
		// Auto refresh mobile 20s after app reset (fallback)
		s.on("app:reset", () => {
			scheduleReload(20000);
		});
		// Explicit kick from desktop when final page reached
		s.on("mobile:kick", (delayMs) => {
			scheduleReload(typeof delayMs === "number" ? delayMs : 20000);
		});
		// Gentle scroll nudge overlay trigger
		s.on("mobile:nudge:scroll", () => {
			try { window.dispatchEvent(new CustomEvent("nudge:scroll")); } catch {}
		});
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
			s.off("control:granted");
			s.off("control:revoked");
			s.off("app:reset");
			s.off("mobile:kick");
			s.off("mobile:nudge:scroll");
			window.removeEventListener("beforeunload", emitReload);
			try { s.disconnect(); } catch {}
			sockRef.current = null;
		};
	}, []);
	return sockRef;
}


