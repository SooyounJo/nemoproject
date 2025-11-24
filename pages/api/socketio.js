// Next.js (pages router) Socket.IO server
import { Server } from "socket.io";
import { buildUrlForSelection } from "../../lib/mood-select";

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
      cors: { origin: "*", methods: ["GET", "POST"] },
    });
    res.socket.server.io = io;

    // Valid image counts per time set 1..5
    const MAX_PER_SET = { 1: 16, 2: 13, 3: 18, 4: 10, 5: 27 };
    const normalizeGenimg = (uIn) => {
      let u = typeof uIn === "string" ? uIn : "";
      if (!u) return "";
      // Accept bare "3-2.png"
      const bare = u.match(/^([1-5])-(\d+)\.png$/);
      if (bare) {
        const n = Number(bare[1]);
        const max = MAX_PER_SET[n] || 10;
        const k = Math.max(1, Math.min(max, Number(bare[2] || 1)));
        return `/genimg/${n}-${k}.png`;
      }
      // Accept folder style "/genimg/3/3-2.png"
      const folder = u.match(/^\/genimg\/([1-5])\/\1-(\d+)\.png$/);
      if (folder) {
        const n = Number(folder[1]);
        const max = MAX_PER_SET[n] || 10;
        const k = Math.max(1, Math.min(max, Number(folder[2] || 1)));
        return `/genimg/${n}-${k}.png`;
      }
      // Accept flat style "/genimg/3-2.png" (clamp k)
      const flat = u.match(/^\/genimg\/([1-5])-(\d+)\.png$/);
      if (flat) {
        const n = Number(flat[1]);
        const max = MAX_PER_SET[n] || 10;
        const k = Math.max(1, Math.min(max, Number(flat[2] || 1)));
        return `/genimg/${n}-${k}.png`;
      }
      return "";
    };
    // Accumulate 3 selections; emit when complete
    const selection = { time: null, mood: null, weather: null };
    const resetSelection = () => { selection.time = null; selection.mood = null; selection.weather = null; };
    const maybeEmitTv = () => {
      if (selection.time && selection.mood && selection.weather) {
        let url = buildUrlForSelection(selection.time, selection.mood, selection.weather);
        url = normalizeGenimg(url);
        if (!url) return;
        try { io.of("/tv").emit("tvShow", url); io.of("/mobile").emit("finalImage", url); } catch {}
      }
    };

    io.on("connection", (socket) => {
      try { console.log("[sock] root connect", socket.id); } catch {}
      // Landing proceed trigger (e.g., mobile connected/scanned)
      socket.on("landingProceed", (payload) => {
        io.emit("landingProceed", { ts: Date.now(), ...(payload || {}) });
      });
      // Global reset: send all clients back to index
      socket.on("app:reset", () => {
        try {
          io.emit("app:reset");
        } catch {}
      });
      socket.on("sel:reset", resetSelection);
      socket.on("sel:time", (v) => { selection.time = v; maybeEmitTv(); });
      socket.on("sel:mood", (v) => { selection.mood = v; maybeEmitTv(); });
      socket.on("sel:weather", (v) => { selection.weather = v; maybeEmitTv(); });
      socket.on("next", () => {
        io.emit("next");
      });
      socket.on("prev", () => {
        io.emit("prev");
      });
      socket.on("progress", (value) => {
        io.emit("progress", typeof value === "number" ? value : 0);
      });
      socket.on("setStep", (value) => {
        io.emit("setStep", typeof value === "number" ? value : 0);
      });
      socket.on("overlayOpacity", (value) => {
        io.emit("overlayOpacity", typeof value === "number" ? value : 0);
      });
      socket.on("overlayIndex", (value) => {
        // Expect 0-based integer index
        const v = typeof value === "number" ? Math.floor(value) : 0;
        io.emit("overlayIndex", v);
      });
      socket.on("healingText", (value) => {
        const text = typeof value === "string" ? value : "";
        io.emit("healingText", text);
      });
      // TV: show a specific image URL (e.g., from /genimg/{1-9}/{n}-{k}.png)
      socket.on("tvShow", (url) => {
        let u = normalizeGenimg(url);
        if (!u) {
          const n = Math.floor(Math.random() * 5) + 1;
          const max = MAX_PER_SET[n] || 10;
          const k = Math.floor(Math.random() * max) + 1;
          u = `/genimg/${n}-${k}.png`;
        }
        try { console.log("[tvShow] ->", u); } catch {}
        try {
          io.of("/tv").emit("tvShow", u);
          io.of("/mobile").emit("finalImage", u);
        } catch {}
      });
      // Synchronized scroll enable/disable and selection lock for mood step
      socket.on("moodScroll:enable", () => io.emit("moodScroll:enable"));
      socket.on("moodScroll:disable", () => io.emit("moodScroll:disable"));
      socket.on("moodSelect", () => io.emit("moodSelect"));
      // Generated image tiling instructions for bliding page
      socket.on("genImage", (payload) => {
        // payload: { url: string, cols?: number, rows?: number, delayMs?: number }
        const url = payload && typeof payload.url === "string" ? payload.url : "";
        if (!url) return;
        const cols = Math.max(1, Math.min(64, Number(payload?.cols ?? 12)));
        const rows = Math.max(1, Math.min(64, Number(payload?.rows ?? 12)));
        const delayMs = Math.max(0, Math.min(2000, Number(payload?.delayMs ?? 40)));
        io.emit("genImage", { url, cols, rows, delayMs });
      });
      socket.on("genClear", () => {
        io.emit("genClear");
      });
      // bridge: selected image from desktop/room → tv & sbm (normalize path)
      socket.on("imageSelected", (url) => {
        const normalized = normalizeGenimg(url);
        const safeUrl = normalized || (typeof url === "string" ? url : "");
        if (!safeUrl) return;
        try {
          io.of("/tv").emit("imageSelected", safeUrl);
          io.of("/sbm").emit("imageSelected", safeUrl);
          io.of("/mobile").emit("finalImage", safeUrl);
        } catch {}
      });
    });

    // Namespaced channels to avoid cross-talk between mobile and desktop
    const bindNamespace = (nsp) => {
      nsp.on("connection", (socket) => {
        socket.on("landingProceed", (payload) => {
          nsp.emit("landingProceed", { ts: Date.now(), ...(payload || {}) });
        });
        socket.on("app:reset", () => {
          try { io.emit("app:reset"); } catch {}
        });
        socket.on("sel:reset", resetSelection);
        socket.on("sel:time", (v) => { selection.time = v; maybeEmitTv(); });
        socket.on("sel:mood", (v) => { selection.mood = v; maybeEmitTv(); });
        socket.on("sel:weather", (v) => { selection.weather = v; maybeEmitTv(); });
        socket.on("next", () => nsp.emit("next"));
        socket.on("prev", () => nsp.emit("prev"));
        socket.on("progress", (value) => nsp.emit("progress", typeof value === "number" ? value : 0));
        socket.on("setStep", (value) => nsp.emit("setStep", typeof value === "number" ? value : 0));
        socket.on("overlayOpacity", (value) =>
          nsp.emit("overlayOpacity", typeof value === "number" ? value : 0)
        );
        socket.on("overlayIndex", (value) => {
          const v = typeof value === "number" ? Math.floor(value) : 0;
          nsp.emit("overlayIndex", v);
        });
        socket.on("healingText", (value) => {
          const text = typeof value === "string" ? value : "";
          nsp.emit("healingText", text);
        });
        socket.on("tvShow", (url) => {
          let u = normalizeGenimg(url);
          if (!u) {
            const n = Math.floor(Math.random() * 5) + 1;
            const max = MAX_PER_SET[n] || 10;
            const k = Math.floor(Math.random() * max) + 1;
            u = `/genimg/${n}-${k}.png`;
          }
          try { console.log(`[tvShow ${nsp.name}] ->`, u); } catch {}
          try {
            io.of("/tv").emit("tvShow", u);
            io.of("/mobile").emit("finalImage", u);
          } catch {}
        });
        // Namespaced versions as well
        socket.on("moodScroll:enable", () => nsp.emit("moodScroll:enable"));
        socket.on("moodScroll:disable", () => nsp.emit("moodScroll:disable"));
        socket.on("moodSelect", () => nsp.emit("moodSelect"));
        socket.on("genImage", (payload) => {
          const url = payload && typeof payload.url === "string" ? payload.url : "";
          if (!url) return;
          const cols = Math.max(1, Math.min(64, Number(payload?.cols ?? 12)));
          const rows = Math.max(1, Math.min(64, Number(payload?.rows ?? 12)));
          const delayMs = Math.max(0, Math.min(2000, Number(payload?.delayMs ?? 40)));
          nsp.emit("genImage", { url, cols, rows, delayMs });
        });
        socket.on("genClear", () => nsp.emit("genClear"));
        socket.on("imageSelected", (url) => {
          const normalized = normalizeGenimg(url);
          const safeUrl = normalized || (typeof url === "string" ? url : "");
          if (!safeUrl) return;
          try { console.log(`[imageSelected ${nsp.name}] ->`, safeUrl); } catch {}
          try {
            nsp.emit("imageSelected", safeUrl);
            if (nsp.name !== "/mobile") {
              io.of("/mobile").emit("finalImage", safeUrl);
            }
          } catch {}
        });
      });
    };
    bindNamespace(res.socket.server.io.of("/mobile"));
    bindNamespace(res.socket.server.io.of("/desktop"));
    bindNamespace(res.socket.server.io.of("/tv"));
    bindNamespace(res.socket.server.io.of("/sbm"));
    // Cross-namespace relay: /mobile → /desktop for control events
    try {
      const mobileNsp = res.socket.server.io.of("/mobile");
      const desktopNsp = res.socket.server.io.of("/desktop");
      mobileNsp.on("connection", (socket) => {
        socket.on("next", () => desktopNsp.emit("next"));
        socket.on("prev", () => desktopNsp.emit("prev"));
        socket.on("setStep", (value) =>
          desktopNsp.emit("setStep", typeof value === "number" ? value : 0)
        );
        socket.on("progress", (value) =>
          desktopNsp.emit("progress", typeof value === "number" ? value : 0)
        );
        socket.on("overlayOpacity", (value) =>
          desktopNsp.emit("overlayOpacity", typeof value === "number" ? value : 0)
        );
        socket.on("overlayIndex", (value) => {
          const v = typeof value === "number" ? Math.floor(value) : 0;
          desktopNsp.emit("overlayIndex", v);
        });
      });
    } catch {}
  }
  res.end();
}


