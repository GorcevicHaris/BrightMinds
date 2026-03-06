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
  // Mapa za praćenje koji soket pripada kojem detetu: socketId -> childId
  const socketToChild = new Map();

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Roditelj/Terapeut se prijavljuje da prati dete
    socket.on("monitor:child", (childId) => {
      const normalizedChildId = parseInt(childId);
      const roomName = `child:${normalizedChildId}`;
      socket.join(roomName);
      console.log(`👁️ Monitor joined room: ${roomName}`);

      // Ako već postoji aktivna sesija za ovo dete, pošalji je monitoru odmah
      if (activeSessions.has(normalizedChildId)) {
        const session = activeSessions.get(normalizedChildId);
        socket.emit("game:update", {
          ...session,
          event: "started", // Tretiraj kao start da bi monitor inicijalizovao UI
          isSync: true      // Oznaka da je ovo sinhronizacija
        });
        console.log(`🔄 Synced active session for child ${normalizedChildId} to monitor ${socket.id}`);
      }

      socket.emit("monitor:joined", { childId: normalizedChildId, room: roomName });
    });

    // Roditelj prestaje da prati dete
    socket.on("monitor:leave", (childId) => {
      const roomName = `child:${childId}`;
      socket.leave(roomName);
      console.log(`👁️ Monitor left room: ${roomName}`);
    });

    // Dete započinje igru
    socket.on("game:start", (data) => {
      const childId = parseInt(data.childId);
      const roomName = `child:${childId}`;

      // Poveži ovaj soket sa ovim detetom za kasnije čišćenje
      socketToChild.set(socket.id, childId);

      const update = {
        childId: childId,
        activityId: data.activityId,
        gameType: data.gameType,
        event: "started",
        data: {
          startedAt: new Date().toISOString(),
          score: 0,
          level: data.level || 1,
          ...data
        },
        timestamp: new Date().toISOString(),
      };

      // Sačuvaj sesiju
      activeSessions.set(childId, update);
      console.log(`💾 Session saved for child ${childId}. Total sessions: ${activeSessions.size}`);

      io.to(roomName).emit("game:update", update);
      console.log(`🎮 Game started in room ${roomName}`);
    });

    // Real-time progres igre
    socket.on("game:progress", (data) => {
      const childId = parseInt(data.childId);
      const roomName = `child:${childId}`;
      const update = { ...data, timestamp: new Date().toISOString() };

      // Osiguraj da imamo mapiranje
      socketToChild.set(socket.id, childId);

      // Ažuriraj sačuvanu sesiju
      if (activeSessions.has(childId)) {
        const session = activeSessions.get(childId);
        const updatedSession = {
          ...session,
          data: {
            ...session.data,
            ...data.data
          },
          lastUpdate: update.timestamp
        };
        activeSessions.set(childId, updatedSession);
      } else {
        // Ako monitor uđe a sesija nije sačuvana (npr. server restart), kreiraj je iz progresa
        console.log(`⚠️ Progress received for child ${childId} but no active session. Creating one...`);
        activeSessions.set(childId, {
          ...data,
          event: "started",
          lastUpdate: update.timestamp
        });
      }

      io.to(roomName).emit("game:update", update);
    });

    // Igra završena
    socket.on("game:complete", (data) => {
      const childId = parseInt(data.childId);
      const roomName = `child:${childId}`;
      const update = {
        ...data,
        event: "completed",
        timestamp: new Date().toISOString(),
      };

      // Ukloni sesiju i mapiranje
      activeSessions.delete(childId);
      socketToChild.delete(socket.id);
      console.log(`🗑️ Session deleted for child ${childId}`);

      io.to(roomName).emit("game:update", update);
      console.log(`✅ Game completed in room ${roomName}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);

      // Ako je ovo bio soket od deteta koje je bilo u igri, obavesti monitore
      if (socketToChild.has(socket.id)) {
        const childId = socketToChild.get(socket.id);
        const roomName = `child:${childId}`;

        console.log(`🧹 Cleaning up session for child ${childId} due to disconnect`);

        // Obavesti monitor da je dete izašlo
        io.to(roomName).emit("game:update", {
          childId,
          event: "completed", // Tretiramo diskonekciju kao kraj igre
          timestamp: new Date().toISOString(),
          reason: "disconnect"
        });

        // Očisti mape
        activeSessions.delete(childId);
        socketToChild.delete(socket.id);
      }
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server running on path /api/socket`);
  });
});
