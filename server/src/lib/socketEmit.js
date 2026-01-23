import { io as ioClient } from "socket.io-client";

let socket = null;

// Get Socket.IO server URL from environment
const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL || "http://localhost:3001";

function getSocket() {
  if (!socket) {
    socket = ioClient(SOCKET_SERVER_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => {
      console.log("[SocketEmit] Connected to Socket.IO server:", socket.id, "at", SOCKET_SERVER_URL);
    });

    socket.on("disconnect", () => {
      console.log("[SocketEmit] Disconnected from Socket.IO server");
    });

    socket.on("connect_error", (err) => {
      console.error("[SocketEmit] Connection error:", err.message);
    });
  }
  return socket;
}

export function emitSeatUpdate({ seatId, status, bookingId, holdUntil }) {
  try {
    const client = getSocket();
    
    if (!client || !client.connected) {
      console.warn("[SocketEmit] Socket not connected, queuing emit...");
      // Queue the emit for when connection is restored
      client.once("connect", () => {
        client.emit("seat:update", {
          seatId,
          status, // AVAILABLE | HELD | BOOKED
          bookingId: bookingId || null,
          holdUntil: holdUntil || null,
          ts: Date.now(),
        });
      });
      return;
    }

    client.emit("seat:update", {
      seatId,
      status, // AVAILABLE | HELD | BOOKED
      bookingId: bookingId || null,
      holdUntil: holdUntil || null,
      ts: Date.now(),
    });

    console.log("[SocketEmit] Emitted seat:update", { seatId, status });
  } catch (err) {
    console.error("[SocketEmit] Error emitting seat update:", err);
  }
}
