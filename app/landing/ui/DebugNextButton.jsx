"use client";

export default function DebugNextButton({ onClick }) {
	return (
		<button
			onClick={onClick}
			style={{
				display: "none",
				position: "absolute",
				right: 22,
				bottom: 22,
				zIndex: 3,
				padding: "10px 12px",
				borderRadius: 10,
				border: "1px solid #2a2f3a",
				background: "#111318",
				color: "#e5e7eb",
				fontWeight: 600,
				letterSpacing: 0.2,
				cursor: "pointer",
			}}
		>
			다음
		</button>
	);
}


