"use client";

// QR 이미지만 렌더링하고, 위치/배경 스타일은 부모에서 제어한다.
export default function QRModal({ qrDataUrl }) {
	if (!qrDataUrl) return null;
	return (
		<img
			src={qrDataUrl}
			alt="Open mobile control"
			width={140}
			height={140}
			style={{ display: "block" }}
		/>
	);
}


