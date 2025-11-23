"use client";

export default function BackgroundVideo() {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 0,
				opacity: 0.35,
				pointerEvents: "none",
			}}
		>
			<video
				src="/nemo.mp4"
				style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
				autoPlay
				loop
				muted
				playsInline
			/>
		</div>
	);
}


