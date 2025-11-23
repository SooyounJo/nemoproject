"use client";

import ThreeBackground from "../components/common/ThreeBackground";
import ScrollInteraction from "../components/common/ScrollInteraction";
import IntroSequence from "../(main)/components/IntroSequence";
import TopQuestion from "../components/common/TopQuestion";
import SelectButton from "../components/common/SelectButton";
import SelectionFlashOverlay from "../components/common/SelectionFlashOverlay";
import FinalScreen from "../components/FinalScreen";
import LevaGradientModal from "../components/common/LevaGradientModal";
import useMobileSocket from "./logic/useMobileSocket";

export default function MobileScreen() {
	useMobileSocket();
	return (
		<main className="min-h-screen w-full" style={{ position: "relative" }}>
			<ThreeBackground />
			<IntroSequence />
			<SelectButton />
			<ScrollInteraction />
			<TopQuestion />
			<SelectionFlashOverlay />
			<FinalScreen />
			<LevaGradientModal />
		</main>
	);
}


