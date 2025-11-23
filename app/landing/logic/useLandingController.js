"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import QRCode from "qrcode";

export default function useLandingController() {
	const [qrDataUrl, setQrDataUrl] = useState("");
	const [fading, setFading] = useState(false);
	const [fxGather, setFxGather] = useState(false);
	const [fxExplode, setFxExplode] = useState(false);
	const routerRef = useRef(null);

	// QR generate for /mobile
	useEffect(() => {
		const href = typeof window !== "undefined" ? `${window.location.origin}/mobile` : "/mobile";
		QRCode.toDataURL(href, { margin: 1, scale: 6, color: { dark: "#e5e7eb", light: "#000000" } })
			.then(setQrDataUrl)
			.catch(() => setQrDataUrl(""));
	}, []);

	// Optional: listen for mobile-trigger to auto proceed
	useEffect(() => {
		const socket = io({ path: "/api/socketio" });
		const onProceed = () => {
			handleStart();
		};
		socket.on("landingProceed", onProceed);
		return () => {
			socket.off("landingProceed", onProceed);
			socket.disconnect();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleStart = useCallback(() => {
		if (fading) return;
		setFxGather(true);
		setTimeout(() => setFxExplode(true), 800);
		setTimeout(() => setFading(true), 1650);
		setTimeout(() => {
			try {
				const next = routerRef.current;
				if (next) next();
			} catch {}
		}, 2400);
	}, [fading]);

	const setNavigate = useCallback((cb) => {
		routerRef.current = cb;
	}, []);

	return { qrDataUrl, fading, fxGather, fxExplode, handleStart, setNavigate };
}


