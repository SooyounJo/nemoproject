"use client";

import "../styles/globals.css";
import { useEffect } from "react";
import { ensureGlobalAudio } from "@/utils/globalAudio";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    try {
      const navs = performance && performance.getEntriesByType ? performance.getEntriesByType("navigation") : [];
      const nav = navs && navs[0];
      const isReload =
        (nav && nav.type === "reload") ||
        (performance && performance.navigation && performance.navigation.type === 1);
      if (isReload) {
        const path = window.location.pathname || "/";
        // On reload, force desktop back to index; leave TV/SBM as-is
        if (path !== "/" && path !== "/tv" && path !== "/sbm") {
          window.location.replace("/");
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Start or resume global background BGM for the entire app
    ensureGlobalAudio();
  }, []);

  return <Component {...pageProps} />;
}



