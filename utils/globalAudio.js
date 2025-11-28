// Global background audio shared across all pages (index, page2, room, etc.)
// Designed to work with both Pages Router and App Router by persisting in window scope.

// Use a unique property on window to store the audio instance
// so it survives Next.js router transitions (which are client-side).
const KEY_AUDIO = "__NEMO_GLOBAL_AUDIO__";
const KEY_BOOTSTRAPPED = "__NEMO_AUDIO_BOOTSTRAPPED__";

/**
 * Ramps volume exponentially to target over ms duration.
 * Returns a promise that resolves when ramp is complete.
 */
export function rampVolumeGlobal(audio, target, ms) {
  if (!audio) return Promise.resolve();
  // cancel any ongoing ramp
  if (audio._rampTimer) {
    clearTimeout(audio._rampTimer);
    audio._rampTimer = null;
  }
  return new Promise((resolve) => {
    const start = audio.volume;
    const startTime = performance.now();
    
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / ms);
      // simple linear interpolation for safety, or can use exponential
      const nextVolume = start + (target - start) * progress;
      audio.volume = Math.max(0, Math.min(1, nextVolume));

      if (progress < 1) {
        audio._rampTimer = requestAnimationFrame(step);
      } else {
        audio.volume = target;
        audio._rampTimer = null;
        resolve();
      }
    }
    audio._rampTimer = requestAnimationFrame(step);
  });
}

/**
 * Ensures the global background audio is created and playing.
 * Can be called safely from multiple pages' useEffect.
 */
export function ensureGlobalAudio() {
  if (typeof window === "undefined") return;

  // 1. Create or retrieve audio instance
  if (!window[KEY_AUDIO]) {
    const audio = new Audio("/mmusic/main.mp3");
    audio.loop = true;
    audio.volume = 0; // start silent, fade in
    // Keep playing even if navigated
    audio.preload = "auto";
    window[KEY_AUDIO] = audio;
    
    // Try to recover play state if browser blocked it initially
    // (Users usually interact with the page early on)
    const tryPlay = () => {
      if (audio.paused) {
        audio.play().catch(() => {
          // still blocked, wait for interaction
        });
      }
    };
    document.addEventListener("click", tryPlay, { once: true });
    document.addEventListener("touchstart", tryPlay, { once: true });
    document.addEventListener("keydown", tryPlay, { once: true });
  }

  const audio = window[KEY_AUDIO];

  // 2. Mark as bootstrapped (user entered the app flow)
  window[KEY_BOOTSTRAPPED] = true;

  // 3. Ensure playing
  if (audio.paused) {
    audio.play().then(() => {
      // fade in to 0.5 if started from silence
      if (audio.volume < 0.05) {
        rampVolumeGlobal(audio, 0.5, 2000);
      }
    }).catch((e) => {
      console.warn("Global audio autoplay blocked, waiting for interaction", e);
    });
  } else {
    // If already playing but volume low (maybe from a fade out?), fade in
    if (audio.volume < 0.5) {
      rampVolumeGlobal(audio, 0.5, 1500);
    }
  }
}

/**
 * Optional: Stop or fade out global audio (e.g. if leaving the experience)
 */
export function fadeOutGlobalAudio() {
  if (typeof window === "undefined") return;
  const audio = window[KEY_AUDIO];
  if (audio && !audio.paused) {
    rampVolumeGlobal(audio, 0, 1500).then(() => {
      audio.pause();
    });
  }
}
