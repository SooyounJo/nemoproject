"use client";

export default function BackgroundVideo() {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 0,
				// 배경 영상이 연하게 보이지 않도록 완전 불투명
				opacity: 1,
				pointerEvents: "none",
			}}
		>
			<video
				src="/nemo.mp4"
				style={{
					width: "100%",
					height: "100%",
					objectFit: "cover",
					display: "block",
					// 살짝 확대해서 모서리까지 꽉 차게
					transform: "scale(1.06)",
					transformOrigin: "center center",
				}}
				autoPlay
				loop
				muted
				playsInline
			/>
		</div>
	);
}


