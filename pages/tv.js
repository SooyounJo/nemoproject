import React from "react";
import dynamic from "next/dynamic";

const TvScreen = dynamic(() => import("../components/tv/TvScreen"), { ssr: false });

export default function TvPage() {
  return <TvScreen />;
}


