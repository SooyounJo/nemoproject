let nemoMainAudio = null;
let nemoAudioBootstrapped = false;

function rampVolumeGlobal(audio, target, ms) {
  if (!audio) return;
  const steps = Math.max(1, Math.floor(ms / 50));
  const start = audio.volume;
  const delta = target - start;
  let i = 0;
  const id = setInterval(() => {
    i += 1;
    const t = i / steps;
    audio.volume = Math.max(0, Math.min(1, start + delta * t));
    if (i >= steps) clearInterval(id);
  }, 50);
}

export function ensureGlobalAudio() {
  if (typeof window === "undefined") return;

  // Reuse single Audio instance per browser context
  if (!nemoMainAudio) {
    try {
      nemoMainAudio = new Audio("/mmusic/main.mp3");
      nemoMainAudio.loop = true;
      nemoMainAudio.volume = 0;
    } catch {
      return;
    }
  }

  try {
    nemoMainAudio
      .play()
      .then(() => {
        rampVolumeGlobal(nemoMainAudio, 0.5, 1200);
      })
      .catch(() => {
        // Autoplay 정책에 막힌 경우: 첫 포인터 제스처에서 한 번 더 시도
        if (!nemoAudioBootstrapped) {
          nemoAudioBootstrapped = true;
          const handler = () => {
            if (!nemoMainAudio) return;
            nemoMainAudio
              .play()
              .then(() => {
                rampVolumeGlobal(nemoMainAudio, 0.5, 800);
              })
              .catch(() => {});
            window.removeEventListener("pointerdown", handler);
          };
          window.addEventListener("pointerdown", handler, { once: true });
        }
      });
  } catch {}
}


