"use client";

import BackgroundVideo from "./ui/BackgroundVideo";
import FrameTypos from "./ui/FrameTypos";
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
			{/* QR center */}
			<div
				style={{
					position: "absolute",
					top: "30%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					zIndex: 3,
					opacity: fading ? 0 : 1,
					transition: "opacity 900ms ease",
				}}
			>
				<QRModal qrDataUrl={qrDataUrl} />
			</div>
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


