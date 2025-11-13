// Next.js (pages router) Socket.IO server
import { Server } from "socket.io";

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
      cors: { origin: "*", methods: ["GET", "POST"] },
    });
    res.socket.server.io = io;

    io.on("connection", (socket) => {
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
    });
  }
  res.end();
}


