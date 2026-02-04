// lib/socket.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export interface GameUpdate {
  childId: number;
  activityId: number;
  gameType: 'shape_matching' | 'memory' | 'coloring';
  event: 'started' | 'progress' | 'completed' | 'shape_placed' | 'card_flipped' | 'color_applied';
  data: any;
  timestamp: string;
}

export interface ActiveSession {
  childId: number;
  activityId: number;
  startedAt: string;
  gameType: string;
}

let io: SocketIOServer | null = null;

export const initSocketServer = (httpServer: HTTPServer) => {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socket',
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Roditelj/Terapeut se prijavljuje da prati dete
    socket.on('monitor:child', (childId: number) => {
      const roomName = `child:${childId}`;
      socket.join(roomName);
      console.log(`👁️ Monitor joined room: ${roomName}`);
      
      socket.emit('monitor:joined', { childId, room: roomName });
    });

    // Roditelj prestaje da prati dete
    socket.on('monitor:leave', (childId: number) => {
      const roomName = `child:${childId}`;
      socket.leave(roomName);
      console.log(`👁️ Monitor left room: ${roomName}`);
    });

    // Dete započinje igru
    socket.on('game:start', (data: { childId: number; activityId: number; gameType: string }) => {
      const roomName = `child:${data.childId}`;
      
      const update: GameUpdate = {
        childId: data.childId,
        activityId: data.activityId,
        gameType: data.gameType as any,
        event: 'started',
        data: {
          startedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      // Pošalji svim monitorima ovog deteta
      io?.to(roomName).emit('game:update', update);
      console.log(`🎮 Game started in room ${roomName}:`, update);
    });

    // Real-time progres igre
    socket.on('game:progress', (data: GameUpdate) => {
      const roomName = `child:${data.childId}`;
      
      const update: GameUpdate = {
        ...data,
        timestamp: new Date().toISOString(),
      };

      io?.to(roomName).emit('game:update', update);
      console.log(`📊 Game progress in room ${roomName}:`, update.event);
    });

    // Igra završena
    socket.on('game:complete', (data: GameUpdate) => {
      const roomName = `child:${data.childId}`;
      
      const update: GameUpdate = {
        ...data,
        event: 'completed',
        timestamp: new Date().toISOString(),
      };

      io?.to(roomName).emit('game:update', update);
      console.log(`✅ Game completed in room ${roomName}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getSocketServer = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};