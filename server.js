// server.js
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socket",
  });

  // Mapa za praćenje aktivnih sesija: childId -> sessionData
  const activeSessions = new Map();
  const socketToChild = new Map();

  // Čišćenje starih sesija (TTL: 2 sata) - Profesionalno rešenje za "igrice od juče"
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [childId, session] of activeSessions.entries()) {
      const lastUpdate = session.lastUpdate ? new Date(session.lastUpdate).getTime() : 0;
      if (now - lastUpdate > 2 * 60 * 60 * 1000) {
        activeSessions.delete(childId);
        cleaned++;
      }
    }
    if (cleaned > 0) console.log(`🧹 Routine cleanup: Removed ${cleaned} stale sessions`);
  }, 15 * 60 * 1000); // Provera svakih 15 minuta

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Roditelj/Terapeut se prijavljuje da prati dete
    socket.on("monitor:child", (childId) => {
      const normalizedChildId = parseInt(childId);
      const roomName = `child:${normalizedChildId}`;
      socket.join(roomName);
      console.log(`👁️ Monitor joined room: ${roomName}`);

      // Sinhronizacija: Ako već postoji aktivna sesija, pošalji je odmah
      if (activeSessions.has(normalizedChildId)) {
        const session = activeSessions.get(normalizedChildId);
        socket.emit("game:update", {
          ...session,
          isSync: true,
          timestamp: new Date().toISOString()
        });
        console.log(`🔄 Synced active session for child ${normalizedChildId} to monitor ${socket.id}`);
      }

      socket.emit("monitor:joined", { childId: normalizedChildId, room: roomName });
    });

    socket.on("monitor:leave", (childId) => {
      const roomName = `child:${childId}`;
      socket.leave(roomName);
      console.log(`👁️ Monitor left room: ${roomName}`);
    });

    socket.on("game:start", (data) => {
      const childId = parseInt(data.childId);
      const roomName = `child:${childId}`;

      socketToChild.set(socket.id, childId);

      const update = {
        childId: childId,
        activityId: data.activityId,
        gameType: data.gameType,
        event: "started",
        data: {
          score: 0,
          level: data.level || 1,
          correctCount: 0,
          incorrectCount: 0,
          ...data
        },
        timestamp: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      };

      activeSessions.set(childId, update);
      io.to(roomName).emit("game:update", update);
      console.log(`🎮 Game started: ${data.gameType} for child ${childId}`);
    });

    socket.on("game:progress", (data) => {
      const childId = parseInt(data.childId);
      const roomName = `child:${childId}`;
      const now = new Date().toISOString();

      const update = { ...data, timestamp: now };
      socketToChild.set(socket.id, childId);

      if (activeSessions.has(childId)) {
        const session = activeSessions.get(childId);
        const updatedSession = {
          ...session,
          gameType: data.gameType || session.gameType,
          data: {
            ...session.data,
            ...data.data
          },
          lastUpdate: now
        };
        activeSessions.set(childId, updatedSession);
      } else {
        activeSessions.set(childId, {
          ...data,
          event: "progress",
          lastUpdate: now
        });
      }

      io.to(roomName).emit("game:update", update);
    });

    socket.on("game:complete", (data) => {
      const childId = parseInt(data.childId);
      const roomName = `child:${childId}`;

      activeSessions.delete(childId);
      socketToChild.delete(socket.id);

      io.to(roomName).emit("game:update", {
        ...data,
        event: "completed",
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Game completed for child ${childId}`);
    });

    socket.on("disconnect", () => {
      if (socketToChild.has(socket.id)) {
        const childId = socketToChild.get(socket.id);
        const roomName = `child:${childId}`;

        io.to(roomName).emit("game:update", {
          childId,
          event: "completed",
          timestamp: new Date().toISOString(),
          reason: "disconnect"
        });

        activeSessions.delete(childId);
        socketToChild.delete(socket.id);
        console.log(`🧹 Cleaned up session for child ${childId} on disconnect`);
      } else {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      }
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server running on path /api/socket`);
  });
});
