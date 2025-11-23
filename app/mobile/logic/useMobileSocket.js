"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function useMobileSocket() {
	const sockRef = useRef(null);
	useEffect(() => {
		const s = io("/mobile", { path: "/api/socketio" });
		sockRef.current = s;
		return () => {
			s.disconnect();
			sockRef.current = null;
		};
	}, []);
	return sockRef;
}


