import { Server } from 'socket.io';
import pino from 'pino';
const logger = pino();

let io;
// Store online users with their details
const onlineUsers = new Map(); // socketId -> userData
const userSockets = new Map(); // userId -> socketId
const adminWaitingRooms = new Map(); // token -> socketId (admin waiting)

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
    transports: ['websocket', 'polling'],
    // --- PERFORMANCE OPTIMIZATION ---
    pingInterval: 10000, // 10s
    pingTimeout: 20000,  // 20s
    perMessageDeflate: true // compress signaling
  });
  return io;
};

export const setupSocketListeners = () => {
  if (!io) {
    throw new Error('Socket.io not initialized! Call initializeSocket first.');
  }

  io.on('connection', (socket) => {
    logger.info('User connected: ' + socket.id);

    // Handle user authentication and online status
    socket.on('user-authenticated', (userData) => {
      try {
        const { userId, email, role, company } = userData;
        
        // Store user connection
        onlineUsers.set(socket.id, {
          userId,
          email,
          role,
          company,
          socketId: socket.id,
          connectedAt: new Date(),
          lastActivity: new Date()
        });
        
        // Map userId to socketId for quick lookup
        userSockets.set(userId, socket.id);
        
        // Join superadmin room for online user updates
        if (role === 'superadmin') {
          socket.join('superadmin-room');
          // Send current online users to superadmin
          socket.emit('online-users-update', getOnlineUsersForSuperadmin());
        }
        
        // Notify superadmins about new online user
        socket.to('superadmin-room').emit('user-came-online', {
          userId,
          email,
          role,
          company,
          connectedAt: new Date()
        });
        
        logger.info(`User ${email} (${role}) connected and authenticated`);
      } catch (error) {
        logger.error('Error in user-authenticated:', error);
      }
    });

    // Handle user activity (heartbeat)
    socket.on('user-activity', (userId) => {
      try {
        const userData = onlineUsers.get(socket.id);
        if (userData && userData.userId === userId) {
          userData.lastActivity = new Date();
          onlineUsers.set(socket.id, userData);
        }
      } catch (error) {
        logger.error('Error in user-activity:', error);
      }
    });

    // Handle superadmin request for online users
    socket.on('get-online-users', (userData) => {
      try {
        const { role } = userData;
        if (role === 'superadmin') {
          socket.emit('online-users-update', getOnlineUsersForSuperadmin());
        }
      } catch (error) {
        logger.error('Error in get-online-users:', error);
      }
    });

    // Join room for WebRTC
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      logger.info(`User ${socket.id} joined room: ${roomId}`);
    });

    // Admin waiting for user
    socket.on('admin-waiting', (token) => {
      socket.join(`admin-${token}`);
      adminWaitingRooms.set(token, socket.id);
      logger.info(`Admin ${socket.id} waiting for token: ${token}`);
      logger.info(`Current admin waiting rooms:`, Array.from(adminWaitingRooms.entries()));
    });

    // User opened the link
    socket.on('user-opened-link', (roomId) => {
      logger.info(`User opened link for room: ${roomId}`);
      logger.info(`Current admin waiting rooms:`, Array.from(adminWaitingRooms.entries()));
      
      // Find admin waiting for this room and notify them
      let adminFound = false;
      for (const [token, adminSocketId] of adminWaitingRooms.entries()) {
        logger.info(`Checking token: ${token} against roomId: ${roomId}`);
        if (token === roomId) {
          const adminSocket = io.sockets.sockets.get(adminSocketId);
          if (adminSocket) {
            adminSocket.emit('user-joined-room', roomId);
            logger.info(`✅ Notified admin ${adminSocketId} that user opened room: ${roomId}`);
            adminFound = true;
          } else {
            logger.warn(`⚠️ Admin socket ${adminSocketId} not found for token: ${token}`);
          }
        }
      }
      
      if (!adminFound) {
        logger.warn(`⚠️ No admin found waiting for room: ${roomId}`);
      }
    });

    // User started session
    socket.on('user-started-session', (roomId) => {
      socket.to(`admin-${roomId}`).emit('user-started-session', roomId);
      logger.info(`User started session for room: ${roomId}`);
    });

    // Add new event for meeting data availability
    socket.on('meeting-data-available', (roomId, meetingData) => {
      socket.to(`admin-${roomId}`).emit('meeting-data-updated', meetingData);
      logger.info(`Meeting data available for room: ${roomId}`);
    });

    // Add new event for message settings update
    socket.on('message-settings-updated', (roomId, messageSettings) => {
      socket.to(`admin-${roomId}`).emit('message-settings-updated', messageSettings);
      logger.info(`Message settings updated for room: ${roomId}`);
    });

    // Notification system events
    socket.on('join-notification-room', (email) => {
      socket.join(`notifications-${email}`);
      logger.info(`User ${socket.id} joined notification room for: ${email}`);
    });

    socket.on('leave-notification-room', (email) => {
      socket.leave(`notifications-${email}`);
      logger.info(`User ${socket.id} left notification room for: ${email}`);
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

    // Mouse tracking events
    socket.on('mouse-event', (data) => {
      // Get the room ID from the socket's joined rooms
      const rooms = Array.from(socket.rooms);
      const roomId = rooms.find(room => room !== socket.id);
      
      if (roomId) {
        // Send mouse event to all other users in the same room
        socket.to(roomId).emit('mouse-event', data);
        logger.info(`Mouse event from ${socket.id} in room ${roomId}: ${data.type} at (${data.x}, ${data.y})`);
      }
    });

    // NEW: Dedicated camera control room events for better reliability
    socket.on('join-camera-room', (data) => {
      const { roomId, isAdmin } = data;
      logger.info(`Camera control socket ${socket.id} joining camera room: ${roomId}, isAdmin: ${isAdmin}`);
      
      socket.join(roomId);
      
      // Store socket info for camera control
      if (!socket.cameraRooms) {
        socket.cameraRooms = new Set();
      }
      socket.cameraRooms.add(roomId);
      
      // Store admin status for this socket
      socket.isAdmin = isAdmin;
      
      logger.info(`Camera control socket ${socket.id} joined room ${roomId} as ${isAdmin ? 'admin' : 'user'}`);
    });

    socket.on('camera-ready', (data) => {
      logger.info(`Camera ready signal received from ${socket.id} in room: ${data.roomId}`);
      
      // Forward camera ready signal to admin in the same room
      if (data.roomId) {
        socket.to(data.roomId).emit('camera-ready', {
          userId: socket.id,
          roomId: data.roomId,
          timestamp: Date.now()
        });
        logger.info(`Camera ready signal forwarded to room ${data.roomId}`);
      }
    });

    // Updated camera control events with proper routing
    socket.on('camera-zoom', (data) => {
      logger.info(`Camera zoom command received from ${socket.id}:`, data);
      logger.info(`Socket ${socket.id} isAdmin status:`, socket.isAdmin);
      
      // Get the room ID from the socket's joined rooms
      const rooms = Array.from(socket.rooms);
      const roomId = rooms.find(room => room !== socket.id);
      
      logger.info(`Socket ${socket.id} is in rooms:`, rooms);
      logger.info(`Selected room for camera zoom:`, roomId);
      
      if (roomId && socket.isAdmin) {
        // Only forward commands from admin to users
        logger.info(`Forwarding camera zoom command from admin ${socket.id} to room ${roomId}`);
        socket.to(roomId).emit('camera-zoom', data);
        logger.info(`Camera zoom command from admin ${socket.id} in room ${roomId}: ${data.direction}`);
      } else if (!socket.isAdmin) {
        logger.warn(`Camera zoom command from non-admin ${socket.id}, ignoring`);
      } else {
        logger.warn(`Camera zoom command from ${socket.id} but no room found`);
      }
    });

    socket.on('camera-torch', (data) => {
      logger.info(`Camera torch command received from ${socket.id}:`, data);
      logger.info(`Socket ${socket.id} isAdmin status:`, socket.isAdmin);
      
      // Get the room ID from the socket's joined rooms
      const rooms = Array.from(socket.rooms);
      const roomId = rooms.find(room => room !== socket.id);
      
      logger.info(`Socket ${socket.id} is in rooms:`, rooms);
      logger.info(`Selected room for camera torch:`, roomId);
      
      if (roomId && socket.isAdmin) {
        // Only forward commands from admin to users
        logger.info(`Forwarding camera torch command from admin ${socket.id} to room ${roomId}`);
        socket.to(roomId).emit('camera-torch', data);
        logger.info(`Camera torch command from admin ${socket.id} in room ${roomId}: ${data.enabled ? 'ON' : 'OFF'}`);
      } else if (!socket.isAdmin) {
        logger.warn(`Camera torch command from non-admin ${socket.id}, ignoring`);
      } else {
        logger.warn(`Camera torch command from ${socket.id} but no room found`);
      }
    });

    // NEW: Test ping-pong events for debugging socket communication
    socket.on('camera-ping', (data) => {
      logger.info(`Camera ping received from ${socket.id}:`, data);
      
      // Get the room ID from the socket's joined rooms
      const rooms = Array.from(socket.rooms);
      const roomId = rooms.find(room => room !== socket.id);
      
      if (roomId) {
        // Forward ping to other users in the room
        socket.to(roomId).emit('camera-ping', data);
        logger.info(`Camera ping forwarded from ${socket.id} to room ${roomId}`);
      }
    });

    socket.on('camera-pong', (data) => {
      logger.info(`Camera pong received from ${socket.id}:`, data);
      
      // Get the room ID from the socket's joined rooms
      const rooms = Array.from(socket.rooms);
      const roomId = rooms.find(room => room !== socket.id);
      
      if (roomId) {
        // Forward pong to other users in the room
        socket.to(roomId).emit('camera-pong', data);
        logger.info(`Camera pong forwarded from ${socket.id} to room ${roomId}`);
      }
    });

    // NEW: Test event handler for debugging
    socket.on('test-camera-socket', (data) => {
      logger.info(`Test camera socket event received from ${socket.id}:`, data);
      
      // Get the room ID from the socket's joined rooms
      const rooms = Array.from(socket.rooms);
      const roomId = rooms.find(room => room !== socket.id);
      
      logger.info(`Socket ${socket.id} is in rooms:`, rooms);
      logger.info(`Test event from room:`, roomId);
      
      // Send test response back
      socket.emit('test-camera-socket-response', {
        received: true,
        socketId: socket.id,
        roomId: roomId,
        timestamp: Date.now()
      });
    });

    socket.on('disconnect', () => {
      try {
        // Get user data before removing
        const userData = onlineUsers.get(socket.id);
        
        if (userData) {
          // Remove from online users
          onlineUsers.delete(socket.id);
          userSockets.delete(userData.userId);
          
          // Notify superadmins about user going offline
          socket.to('superadmin-room').emit('user-went-offline', {
            userId: userData.userId,
            email: userData.email,
            role: userData.role,
            company: userData.company,
            disconnectedAt: new Date()
          });
          
          logger.info(`User ${userData.email} (${userData.role}) disconnected`);
        }
        
        // Clean up admin waiting rooms
        for (const [token, adminSocketId] of adminWaitingRooms.entries()) {
          if (adminSocketId === socket.id) {
            adminWaitingRooms.delete(token);
            logger.info(`Admin ${socket.id} stopped waiting for token: ${token}`);
          }
        }
        
        logger.info('User disconnected: ' + socket.id);
      } catch (error) {
        logger.error('Error in disconnect handler:', error);
      }
    });
  });
};

// Function to get online users data for superadmins
export const getOnlineUsersForSuperadmin = () => {
  const onlineUsersList = Array.from(onlineUsers.values()).map(user => ({
    userId: user.userId,
    email: user.email,
    role: user.role,
    company: user.company,
    connectedAt: user.connectedAt,
    lastActivity: user.lastActivity,
    onlineDuration: Math.floor((Date.now() - user.connectedAt.getTime()) / 1000) // seconds
  }));
  
  return {
    totalOnline: onlineUsersList.length,
    users: onlineUsersList,
    timestamp: new Date()
  };
};

// Function to check if a specific user is online
export const isUserOnline = (userId) => {
  return userSockets.has(userId);
};

// Function to get online user count
export const getOnlineUserCount = () => {
  return onlineUsers.size;
};

// Function to get admin waiting rooms for debugging
export const getAdminWaitingRooms = () => {
  return Array.from(adminWaitingRooms.entries()).map(([token, socketId]) => ({
    token,
    adminSocketId: socketId,
    timestamp: new Date()
  }));
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export const sendNotification = (email, notificationData) => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  io.to(`notifications-${email}`).emit('new-notification', notificationData);
  logger.info(`Notification sent to user: ${email}`);
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
  SocketService,
  getOnlineUsersForSuperadmin,
  isUserOnline,
  getOnlineUserCount
};
