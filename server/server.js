const { createServer } = require("http");
const { Server } = require("socket.io");
const httpProxy = require("http-proxy");

const NEXT_SERVER = "http://localhost:3000";
const SOCKET_PORT = 3001;

// Create proxy to Next.js server
const proxy = httpProxy.createProxyServer({
  target: NEXT_SERVER,
  ws: true,
});

const httpServer = createServer((req, res) => {
  // Proxy HTTP requests to Next.js server
  proxy.web(req, res, (err) => {
    if (err) {
      console.error("Proxy error:", err);
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end("Bad Gateway - Next.js server not running on port 3000");
    }
  });
});

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

global.io = io;

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Join event room for receiving seat updates
  socket.on("join:event", ({ eventId }) => {
    socket.join(`event:${eventId}`);
    console.log(`Socket ${socket.id} joined event:${eventId}`);
  });

  // Leave event room
  socket.on("leave:event", ({ eventId }) => {
    socket.leave(`event:${eventId}`);
    console.log(`Socket ${socket.id} left event:${eventId}`);
  });

  // Receive seat:update from API server and broadcast to ALL clients
  socket.on("seat:update", (data) => {
    console.log(`[Socket] Received seat:update from API:`, data);
    // Broadcast to ALL clients including sender
    io.emit("seat:update", data);
  });

  // Broadcast seat hold to all clients
  socket.on("seat:hold", (data) => {
    console.log(`[Socket] Seat hold:`, data);
    io.emit("seat:update", {
      seatId: data.seatId,
      status: "HOLD",
      bookingId: data.bookingId,
      userId: data.userId,
      holdUntil: data.holdUntil,
      ts: Date.now(),
    });
  });

  // Broadcast seat booking to all clients
  socket.on("seat:book", (data) => {
    console.log(`[Socket] Seat booked:`, data);
    io.emit("seat:update", {
      seatId: data.seatId,
      status: "BOOKED",
      bookingId: data.bookingId,
      userId: data.userId,
      ts: Date.now(),
    });
  });

  // Broadcast seat release to all clients
  socket.on("seat:release", (data) => {
    console.log(`[Socket] Seat released:`, data);
    io.emit("seat:update", {
      seatId: data.seatId,
      status: "AVAILABLE",
      ts: Date.now(),
    });
  });

  // Handle multiple seats update
  socket.on("seats:bulk-update", (data) => {
    console.log(`[Socket] Bulk seats update:`, data);
    if (data.seats && Array.isArray(data.seats)) {
      data.seats.forEach((seat) => {
        io.emit("seat:update", {
          seatId: seat.seatId,
          status: seat.status,
          bookingId: data.bookingId,
          userId: data.userId,
          ts: Date.now(),
        });
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

httpServer.listen(SOCKET_PORT, () =>
  console.log(`Socket.IO server running on http://localhost:${SOCKET_PORT}`)
);

console.log(`Proxying HTTP requests to Next.js at ${NEXT_SERVER}`);
