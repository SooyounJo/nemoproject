"use client";

export default function QRModal({ qrDataUrl }) {
	if (!qrDataUrl) return null;
	return (
		<div
			style={{
				position: "absolute",
				bottom: 80,
				left: 60,
				transform: "none",
				display: "grid",
				placeItems: "center",
				padding: 12,
				borderRadius: 16,
				background: "rgba(17,19,24,.72)",
				border: "none",
				backdropFilter: "blur(8px)",
				boxShadow: "0 12px 40px rgba(0,0,0,.35)",
				zIndex: 3,
			}}
		>
			<img
				src={qrDataUrl}
				alt="Open mobile control"
				width={140}
				height={140}
				style={{ display: "block", borderRadius: 10 }}
			/>
		</div>
	);
}


