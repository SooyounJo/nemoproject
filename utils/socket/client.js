// Simple client-side socket helpers for each namespace
import { io } from "socket.io-client";

const SOCKET_PATH = "/api/socketio";

export function connectNamespace(namespace) {
  const nsp = namespace.startsWith("/") ? namespace : `/${namespace}`;
  // Prefer explicit base URL in production (Render/HTTPS), fallback to same-origin
  const base =
    (typeof window !== "undefined" && window.__NEMO_SOCKET_URL__) ||
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const url = base ? `${base}${nsp}` : nsp;
  const s = io(url, {
    path: SOCKET_PATH,
    transports: ["websocket"], // avoid long-polling issues behind proxies
    upgrade: true,
    withCredentials: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  });
  try {
    s.on("connect", () => console.log(`[sock] connect ${nsp} id=${s.id}`));
    s.on("disconnect", (reason) => console.log(`[sock] disconnect ${nsp} reason=${reason}`));
    s.on("connect_error", (err) => console.log(`[sock] error ${nsp}`, err?.message || err));
  } catch {}
  return s;
}

export function useTvSocket(onImageSelected) {
  const socket = connectNamespace("/tv");
  socket.on("connect", () => {});
  if (onImageSelected) {
    socket.on("imageSelected", onImageSelected);
    // Also accept tvShow for direct TV display
    socket.on("tvShow", onImageSelected);
  }
  return socket;
}

export function useSbmSocket(onImageSelected) {
  const socket = connectNamespace("/sbm");
  socket.on("connect", () => {});
  if (onImageSelected) socket.on("imageSelected", onImageSelected);
  return socket;
}

export function useDesktopSocket() {
  return connectNamespace("/desktop");
}

export function useMobileSocket() {
  return connectNamespace("/mobile");
}


