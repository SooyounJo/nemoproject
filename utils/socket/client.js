// Simple client-side socket helpers for each namespace
import { io } from "socket.io-client";

const SOCKET_PATH = "/api/socketio";

export function connectNamespace(namespace) {
  const nsp = namespace.startsWith("/") ? namespace : `/${namespace}`;
  return io(nsp, { path: SOCKET_PATH });
}

export function useTvSocket(onImageSelected) {
  const socket = connectNamespace("/tv");
  socket.on("connect", () => {});
  if (onImageSelected) socket.on("imageSelected", onImageSelected);
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


