"use client";

import BackgroundVideo from "./ui/BackgroundVideo";
import FrameTypos from "./ui/FrameTypos";
import TypingNemo from "./ui/TypingNemo";
import QRModal from "./ui/QRModal";
import DebugNextButton from "./ui/DebugNextButton";
import useLandingController from "./logic/useLandingController";
import Head from "next/head";
import { useRouter } from "next/navigation";

export default function LandingScreen() {
	const { qrDataUrl, fading, fxGather, fxExplode, handleStart, setNavigate } = useLandingController();
	const router = useRouter();
	// hand navigation callback to controller
	setNavigate(() => () => router.push("/page2"));
	return (
		<main
			style={{
				minHeight: "100vh",
				width: "100%",
				position: "relative",
				background: "#0b0d12",
				overflow: "hidden",
			}}
		>
			<Head>
				<link
					rel="stylesheet"
					href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
				/>
			</Head>
			<BackgroundVideo />
			<FrameTypos gather={fxGather} explode={fxExplode} />
			<TypingNemo />
			<QRModal qrDataUrl={qrDataUrl} />
			<DebugNextButton onClick={handleStart} />
			{/* blackout */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: "#000",
					pointerEvents: "none",
					opacity: fading ? 1 : 0,
					transition: "opacity 900ms ease",
				}}
			/>
		</main>
	);
}


