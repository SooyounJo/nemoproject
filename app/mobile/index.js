"use client";

import { useEffect } from "react";
import ThreeBackground from "../components/common/ThreeBackground";
import ScrollInteraction from "../components/common/ScrollInteraction";
import IntroSequence from "../(main)/components/IntroSequence";
import TopQuestion from "../components/common/TopQuestion";
import SelectButton from "../components/common/SelectButton";
import SelectionFlashOverlay from "../components/common/SelectionFlashOverlay";
import FinalScreen from "../components/FinalScreen";
import useMobileSocket from "./logic/useMobileSocket";

export default function MobileScreen() {
	useMobileSocket();

	// Lock page scroll and fit exact viewport on real mobile
	useEffect(() => {
		const html = document.documentElement;
		const body = document.body;
		const prev = {
			hOverflow: html.style.overflow,
			bOverflow: body.style.overflow,
			hHeight: html.style.height,
			bHeight: body.style.height,
			hOverscroll: html.style.overscrollBehavior,
			bOverscroll: body.style.overscrollBehavior,
		};
		html.style.overflow = "hidden";
		body.style.overflow = "hidden";
		html.style.height = "100%";
		body.style.height = "100%";
		html.style.overscrollBehavior = "none";
		body.style.overscrollBehavior = "none";
		return () => {
			html.style.overflow = prev.hOverflow;
			body.style.overflow = prev.bOverflow;
			html.style.height = prev.hHeight;
			body.style.height = prev.bHeight;
			html.style.overscrollBehavior = prev.hOverscroll;
			body.style.overscrollBehavior = prev.bOverscroll;
		};
	}, []);

	return (
		<main
			className="w-full"
			style={{
				position: "relative",
				width: "100vw",
				height: "100dvh",
				minHeight: "100dvh",
				overflow: "hidden",
				touchAction: "none",
			}}
		>
			<ThreeBackground />
			<IntroSequence />
			<SelectButton />
			<ScrollInteraction />
			<TopQuestion />
			<SelectionFlashOverlay />
			<FinalScreen />
			{/* Color tuning UI removed for production */}
		</main>
	);
}


