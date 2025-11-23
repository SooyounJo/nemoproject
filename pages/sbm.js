import React from "react";
import dynamic from "next/dynamic";

const BlidingScreen = dynamic(() => import("../components/bliding/BlidingScreen"), {
  ssr: false,
});

export default function SbmPage() {
  return <BlidingScreen />;
}


