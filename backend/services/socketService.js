import { Server } from 'socket.io';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        'https://videodesk.vercel.app',
        'http://localhost:3000'
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  return io;
};

export const setupSocketListeners = () => {
  if (!io) {
    throw new Error('Socket.io not initialized! Call initializeSocket first.');
  }

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room for WebRTC
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
    });

    // Admin waiting for user
    socket.on('admin-waiting', (token) => {
      socket.join(`admin-${token}`);
      console.log(`Admin ${socket.id} waiting for token: ${token}`);
    });

    // User opened the link
    socket.on('user-opened-link', (roomId) => {
      socket.to(`admin-${roomId}`).emit('user-joined-room', roomId);
      console.log(`User opened link for room: ${roomId}`);
    });

    // User started session
    socket.on('user-started-session', (roomId) => {
      socket.to(`admin-${roomId}`).emit('user-started-session', roomId);
      console.log(`User started session for room: ${roomId}`);
    });

    // Add new event for meeting data availability
    socket.on('meeting-data-available', (roomId, meetingData) => {
      socket.to(`admin-${roomId}`).emit('meeting-data-updated', meetingData);
      console.log(`Meeting data available for room: ${roomId}`);
    });

    // Add new event for message settings update
    socket.on('message-settings-updated', (roomId, messageSettings) => {
      socket.to(`admin-${roomId}`).emit('message-settings-updated', messageSettings);
      console.log(`Message settings updated for room: ${roomId}`);
    });

    // WebRTC signaling
    socket.on('offer', (offer, roomId) => {
      socket.to(roomId).emit('offer', offer);
    });

    socket.on('answer', (answer, roomId) => {
      socket.to(roomId).emit('answer', answer);
    });

    socket.on('ice-candidate', (candidate, roomId) => {
      socket.to(roomId).emit('ice-candidate', candidate);
    });

    socket.on('user-disconnected', (roomId) => {
      socket.to(roomId).emit('user-disconnected');
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Export as class for compatibility with existing imports
export class SocketService {
  constructor(server) {
    this.io = initializeSocket(server);
  }

  setupSocketListeners() {
    return setupSocketListeners();
  }

  getIO() {
    return getIO();
  }

  static initializeSocket = initializeSocket;
  static setupSocketListeners = setupSocketListeners;
  static getIO = getIO;
}

// Default export for flexibility
export default {
  initializeSocket,
  setupSocketListeners,
  getIO,
  SocketService
};
