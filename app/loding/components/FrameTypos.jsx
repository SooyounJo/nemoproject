"use client";

import { useMemo, useState, useEffect } from "react";

// 베이스 문장들: 휴식, 위로, 평온, 일상, 네모난/바쁜 도시를 담은 긴 영어 문장
const BASE_PHRASES = [
	"Dust settles between shadows, simple rest. Quiet windows hold the room while the square city moves in straight lines, neon and brakes and closing shops. Inside the frame, time folds down into one slow breath.",
	"Clouds whisper beside the night, warmth collecting on the glass. Far below, the city hurries in rectangles of light, each one a tiny room of stories. Here, stillness waits at the edge of your everyday noise.",
	"Soft light lingers over tired roofs, a pause stitched into concrete. The narrow window keeps your small rituals safe while trains, screens, and sirens race through the crowded grid outside.",
	"Between towers, the sky remembers how to be gentle. The room is nothing more than a square of air and dust, yet inside it, coffee cools, shoulders drop, and one person quietly chooses to rest.",
	"In this rectangular city, streets cross like ruled lines on paper. But the little window keeps a softer geometry: steam on the glass, a plant leaning toward morning, a breath that finally has enough space.",
];

export default function FrameTypos({ gather = false, explode = false, onPhaseChange }) {
	// 문장 목록은 한 번만 생성
	const phrases = useMemo(() => BASE_PHRASES, []);

	// 상 / 하 / 좌 / 우가 모두 같은 타이밍으로 타이핑/삭제되도록
	// 하나의 공유 루프를 사용한다.
	const [indices, setIndices] = useState({
		top: 0,
		bottom: 1,
		left: 2,
		right: 3,
	});
	const [phase, setPhase] = useState("typing"); // typing | pause | deleting
	const [charIndex, setCharIndex] = useState(0); // 현재 공통 글자 인덱스

	// 현재 사이클에서 네 문장의 최대 길이
	const maxLen = useMemo(() => {
		const safe = (i) => (phrases[i] || "").length;
		return Math.max(
			safe(indices.top),
			safe(indices.bottom),
			safe(indices.left),
			safe(indices.right),
			0,
		);
	}, [phrases, indices]);

	// 공유 타이핑 루프: 네 방향이 동시에 시작·종료하도록 제어
	useEffect(() => {
		if (!maxLen) return;
		let timer;

		if (phase === "typing") {
			if (charIndex < maxLen) {
				timer = setTimeout(() => setCharIndex((c) => c + 1), 55);
			} else {
				// 모두 다 쓴 뒤 잠시 유지
				timer = setTimeout(() => setPhase("pause"), 1200);
			}
		} else if (phase === "pause") {
			timer = setTimeout(() => setPhase("deleting"), 650);
		} else if (phase === "deleting") {
			if (charIndex > 0) {
				timer = setTimeout(() => setCharIndex((c) => c - 1), 35);
			} else {
				// 모두 지워진 뒤 새 문장 세트 선택
				timer = setTimeout(() => {
					setIndices((prev) => {
						const pickNew = (avoid) => {
							if (!phrases.length) return avoid || 0;
							let next = Math.floor(Math.random() * phrases.length);
							if (next === avoid) next = (next + 1) % phrases.length;
							return next;
						};
						return {
							top: pickNew(prev.top),
							bottom: pickNew(prev.bottom),
							left: pickNew(prev.left),
							right: pickNew(prev.right),
						};
					});
					setPhase("typing");
				}, 350);
			}
		}

		return () => {
			if (timer) clearTimeout(timer);
		};
	}, [phase, charIndex, maxLen, phrases.length]);

	// 외부로 현재 phase를 알림 → QR 코드 등과 동기화에 사용
	useEffect(() => {
		if (typeof onPhaseChange === "function") {
			onPhaseChange(phase);
		}
	}, [phase, onPhaseChange]);

	// 각 위치에 보여줄 텍스트 계산 (문장 길이에 맞게 잘라쓰기)
	const sliceText = (idx) => {
		const full = phrases[idx] || "";
		const visibleCount = Math.max(0, Math.min(full.length, charIndex));
		return full.slice(0, visibleCount);
	};

	const topText = sliceText(indices.top);
	const bottomText = sliceText(indices.bottom);
	const leftText = sliceText(indices.left);
	const rightText = sliceText(indices.right);

	// explode 시에는 부드럽게 페이드아웃
	const fadeStyle = explode
		? { opacity: 0, transition: "opacity 900ms ease" }
		: { opacity: 1, transition: "opacity 700ms ease" };

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 1,
				pointerEvents: "none",
			}}
		>
			{/* Top: 화면 상단 중앙에서 타이핑 */}
			<div
				style={{
					position: "absolute",
					top: 46,
					left: "50%",
					transform: "translateX(-50%)",
					// 문단이 자연스럽게 두 줄 정도로 보이도록 폭을 줄이고 줄바꿈 허용
					maxWidth: "62%",
					textAlign: "center",
					whiteSpace: "normal",
					lineHeight: 1.4,
					fontSize: 13,
					color: "rgba(235,237,242,0.92)",
					letterSpacing: 0.4,
					...fadeStyle,
				}}
			>
				{topText}
			</div>

			{/* Bottom: 화면 하단 중앙에서 타이핑 */}
			<div
				style={{
					position: "absolute",
					bottom: 46,
					left: "50%",
					transform: "translateX(-50%)",
					maxWidth: "62%",
					textAlign: "center",
					whiteSpace: "normal",
					lineHeight: 1.4,
					fontSize: 13,
					color: "rgba(235,237,242,0.9)",
					letterSpacing: 0.4,
					...fadeStyle,
				}}
			>
				{bottomText}
			</div>

			{/* Left: 세로 방향(위에서 아래로) 타이핑 */}
			<div
				style={{
					position: "absolute",
					top: "50%",
					// 화면 중앙 쪽으로 더 가깝게 이동 (퍼센트 기준)
					left: "23%",
					transform: "translateY(-50%)",
					height: "70%",
					overflow: "hidden",
					...fadeStyle,
				}}
			>
				<div
					style={{
						writingMode: "vertical-rl",
						textOrientation: "mixed",
						// 문장이 충분히 길 때 두 줄(두 세로 열)로 나뉘도록 줄바꿈 허용
						whiteSpace: "normal",
						lineHeight: 1.4,
						fontSize: 12,
						color: "rgba(235,237,242,0.86)",
						letterSpacing: 2,
					}}
				>
					{leftText}
				</div>
			</div>

			{/* Right: 세로 방향(위에서 아래로) 타이핑 */}
			<div
				style={{
					position: "absolute",
					top: "50%",
					// 화면 중앙 쪽으로 더 가깝게 이동 (퍼센트 기준)
					right: "23%",
					transform: "translateY(-50%)",
					height: "70%",
					overflow: "hidden",
					...fadeStyle,
				}}
			>
				<div
					style={{
						writingMode: "vertical-rl",
						textOrientation: "mixed",
						whiteSpace: "normal",
						lineHeight: 1.4,
						fontSize: 12,
						color: "rgba(235,237,242,0.86)",
						letterSpacing: 2,
					}}
				>
					{rightText}
				</div>
			</div>
		</div>
	);
}

