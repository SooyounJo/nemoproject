"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function useMobileSocket() {
	const sockRef = useRef(null);
	useEffect(() => {
		const s = io("/mobile", { path: "/api/socketio" });
		sockRef.current = s;

		function onProgress(e) {
			try {
				const v = typeof e?.detail === "number" ? e.detail : 0;
				s.emit("progress", Math.max(0, Math.min(1, v)));
			} catch {}
		}
		window.addEventListener("bg-gradient:progress", onProgress);

		return () => {
			window.removeEventListener("bg-gradient:progress", onProgress);
			try { s.disconnect(); } catch {}
			sockRef.current = null;
		};
	}, []);
	return sockRef;
}


