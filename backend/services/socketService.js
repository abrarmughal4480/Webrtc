import { Server } from 'socket.io';
import pino from 'pino';
const logger = pino();

let io;
// Store online users with their details
const onlineUsers = new Map(); // socketId -> userData
const userSockets = new Map(); // userId -> socketId
const adminWaitingRooms = new Map(); // token -> socketId (admin waiting)

// Chat system storage
const chatConnections = new Map(); // socketId -> userData
const ticketRooms = new Map(); // ticketId -> Set of socketIds
const userTicketMap = new Map(); // userId -> ticketId
const adminConnections = new Map(); // socketId -> adminData

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
    perMessageDeflate: true, // compress signaling
    // --- LARGE FILE HANDLING ---
    maxHttpBufferSize: 50 * 1024 * 1024, // 50MB buffer for large files
    maxPayload: 50 * 1024 * 1024, // 50MB max payload
    // --- CONNECTION STABILITY ---
    connectTimeout: 45000, // 45s connection timeout
    upgradeTimeout: 10000, // 10s upgrade timeout
    allowUpgrades: true,
    // --- HEARTBEAT OPTIMIZATION ---
    heartbeatTimeout: 60000, // 60s heartbeat timeout
    heartbeatInterval: 25000 // 25s heartbeat interval
  });
  return io;
};

export const setupSocketListeners = () => {
  if (!io) {
    throw new Error('Socket.io not initialized! Call initializeSocket first.');
  }

  io.on('connection', (socket) => {
    // logger.info('User connected: ' + socket.id);

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
      // logger.info(`User ${socket.id} joined notification room for: ${email}`);
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
      
      // Get the room ID from the socket's joined rooms
      const rooms = Array.from(socket.rooms);
      const roomId = rooms.find(room => room !== socket.id);
      
      logger.info(`Socket ${socket.id} is in rooms:`, rooms);
      logger.info(`Selected room for camera zoom:`, roomId);
      
      if (roomId && socket.isAdmin) {
        // Only forward commands from admin to users
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
      
      // Get the room ID from the socket's joined rooms
      const rooms = Array.from(socket.rooms);
      const roomId = rooms.find(room => room !== socket.id);
      
      logger.info(`Socket ${socket.id} is in rooms:`, rooms);
      logger.info(`Selected room for camera torch:`, roomId);
      
      if (roomId && socket.isAdmin) {
        // Only forward commands from admin to users
        socket.to(roomId).emit('camera-torch', data);
        logger.info(`Camera torch command from admin ${socket.id} in room ${roomId}: ${data.enabled ? 'ON' : 'OFF'}`);
      } else if (!socket.isAdmin) {
        logger.warn(`Camera torch command from non-admin ${socket.id}, ignoring`);
      } else {
        logger.warn(`Camera torch command from ${socket.id} but no room found`);
      }
    });

    // ===== CHAT SYSTEM EVENTS =====
    
    // Handle user joining a ticket chat
    socket.on('join-ticket-chat', (data) => {
      try {
        const { ticketId, userId, userEmail, userRole, ticketInfo } = data;
        
        // Store connection info
        chatConnections.set(socket.id, {
          userId,
          userEmail,
          userRole,
          ticketId,
          socketId: socket.id,
          connectedAt: new Date(),
          lastActivity: new Date()
        });

        // Map user to ticket
        userTicketMap.set(userId, ticketId);

        // Create or join ticket room
        if (!ticketRooms.has(ticketId)) {
          ticketRooms.set(ticketId, new Set());
        }
        ticketRooms.get(ticketId).add(socket.id);
        socket.join(`ticket-${ticketId}`);

        // If user is admin/superadmin, store admin connection
        if (userRole === 'admin' || userRole === 'superadmin') {
          adminConnections.set(socket.id, {
            userId,
            userEmail,
            userRole,
            ticketId,
            socketId: socket.id
          });
        }

        // Notify others in the ticket room that someone joined
        socket.to(`ticket-${ticketId}`).emit('user-joined-ticket', {
          userId,
          userEmail,
          userRole,
          ticketId,
          timestamp: new Date()
        });

        // Send current ticket info to the user
        socket.emit('ticket-chat-joined', {
          ticketId,
          message: `Joined ticket chat for: ${ticketInfo?.title || ticketId}`,
          timestamp: new Date()
        });

        logger.info(`User ${userEmail} (${userRole}) joined ticket chat: ${ticketId}`);
      } catch (error) {
        logger.error('Error in join-ticket-chat:', error);
        socket.emit('chat-error', { message: 'Failed to join ticket chat' });
      }
    });

    // Handle sending messages in ticket chat
    socket.on('send-ticket-message', async (data) => {
      try {
        const { ticketId, message, senderId, senderEmail, senderRole, media } = data;
        
        // Validate that user is in the ticket room
        const userData = chatConnections.get(socket.id);
        if (!userData || userData.ticketId !== ticketId) {
          socket.emit('chat-error', { message: 'Not authorized to send message in this ticket' });
          return;
        }

        // Create message object with unique ID
        const messageObj = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${socket.id.slice(-6)}`,
          ticketId,
          message,
          senderId,
          senderEmail,
          senderRole,
          timestamp: new Date(),
          socketId: socket.id,
          media: media || null // Include media data if present
        };

        // Log message details
        const mediaInfo = media ? ` with ${media.type} (${media.name})` : '';
        logger.info(`Message sent in ticket ${ticketId} by ${senderEmail} (${senderRole}): ${message}${mediaInfo}`);
        
        // Additional logging for media messages
        if (media) {
          console.log(`📤 [SocketService] Text message with media:`, {
            ticketId,
            senderEmail,
            senderRole,
            message,
            mediaType: media.type,
            mediaName: media.name,
            mediaSize: media.size
          });
        }

        // Save message to database
        try {
          const SupportTicket = (await import('../models/supportTicket.js')).default;
          const ticket = await SupportTicket.findById(ticketId);
          
          if (ticket) {
            if (!ticket.chatMessages) {
              ticket.chatMessages = [];
            }
            
            // Add message to ticket's chat messages
            ticket.chatMessages.push({
              messageId: messageObj.id,
              message: messageObj.message,
              senderId: messageObj.senderId,
              senderEmail: messageObj.senderEmail,
              senderRole: messageObj.senderRole,
              timestamp: messageObj.timestamp,
              media: messageObj.media
            });
            
            await ticket.save();
            console.log('✅ [SocketService] Message saved to database:', messageObj.id);
          } else {
            console.warn('⚠️ [SocketService] Ticket not found for database save:', ticketId);
          }
        } catch (dbError) {
          console.error('❌ [SocketService] Database save error:', dbError);
          // Continue with broadcasting even if DB save fails
        }

        // Broadcast message to all users in the ticket room
        io.to(`ticket-${ticketId}`).emit('new-ticket-message', messageObj);

        // Update last activity
        userData.lastActivity = new Date();
        chatConnections.set(socket.id, userData);

      } catch (error) {
        logger.error('Error in send-ticket-message:', error);
        socket.emit('chat-error', { message: 'Failed to send message' });
      }
    });

    // Handle media file upload for chat
    socket.on('upload-media', async (data) => {
      try {
        console.log('📤 [SocketService] upload-media event received with data:', {
          ticketId: data.ticketId,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize,
          hasFileData: !!data.fileData,
          fileDataLength: data.fileData?.length || 0,
          senderId: data.senderId,
          senderEmail: data.senderEmail,
          senderRole: data.senderRole
        });

        const { ticketId, fileName, fileType, fileSize, fileData, senderId, senderEmail, senderRole } = data;
        
        // Validate that user is in the ticket room
        const userData = chatConnections.get(socket.id);
        if (!userData || userData.ticketId !== ticketId) {
          console.error('❌ [SocketService] User not authorized to upload media in ticket:', {
            socketId: socket.id,
            userTicketId: userData?.ticketId,
            requestedTicketId: ticketId
          });
          socket.emit('chat-error', { message: 'Not authorized to upload media in this ticket' });
          return;
        }

        // Validate file size (max 50MB)
        if (fileSize > 50 * 1024 * 1024) {
          console.error('❌ [SocketService] File too large:', {
            fileName,
            fileSize,
            maxSize: 50 * 1024 * 1024
          });
          socket.emit('chat-error', { message: 'File size must be less than 50MB' });
          return;
        }

        // Validate file type
        const isImage = fileType.startsWith('image/');
        const isVideo = fileType.startsWith('video/');
        if (!isImage && !isVideo) {
          console.error('❌ [SocketService] Invalid file type:', {
            fileName,
            fileType,
            isImage,
            isVideo
          });
          socket.emit('chat-error', { message: 'Only image and video files are allowed' });
          return;
        }

        // Validate file data
        if (!fileData) {
          console.error('❌ [SocketService] No file data provided:', {
            fileName,
            fileType,
            fileSize
          });
          socket.emit('chat-error', { message: 'No file data provided' });
          return;
        }

        console.log(`📤 [SocketService] Media validation passed: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)}MB), type: ${fileType}, data size: ${fileData.length}`);

        // For large files, send acknowledgment first to prevent timeout
        if (fileSize > 25 * 1024 * 1024) { // Files larger than 25MB
          console.log('📤 [SocketService] Large file detected, sending acknowledgment first');
          socket.emit('media-upload-acknowledged', {
            fileName,
            fileSize,
            status: 'processing'
          });
        }

        // Create media message object with the actual file data
        const mediaMessage = {
          id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${socket.id.slice(-6)}`,
          ticketId,
          message: '', // Remove descriptive text - only show media
          senderId,
          senderEmail,
          senderRole,
          timestamp: new Date(),
          socketId: socket.id,
          media: {
            type: isImage ? 'image' : 'video',
            name: fileName,
            size: fileSize,
            mimeType: fileType,
            data: fileData, // Include the actual file data for device-to-device sharing
            uploadId: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
        };

        // Log media upload details
        logger.info(`Media shared in ticket ${ticketId} by ${senderEmail} (${senderRole}): ${fileName} (${fileType}, ${(fileSize / 1024 / 1024).toFixed(2)}MB) - Device to device sharing`);
        
        // Log additional details for debugging
        console.log(`📤 [SocketService] Media message created:`, {
          id: mediaMessage.id,
          type: mediaMessage.media.type,
          name: mediaMessage.media.name,
          size: mediaMessage.media.size,
          mimeType: mediaMessage.media.mimeType,
          hasData: !!mediaMessage.media.data,
          dataLength: mediaMessage.media.data?.length || 0
        });

        // Check if ticket room exists
        if (!ticketRooms.has(ticketId)) {
          console.error('❌ [SocketService] Ticket room not found:', ticketId);
          socket.emit('chat-error', { message: 'Ticket room not found' });
          return;
        }

        // Get users in ticket room
        const usersInTicket = ticketRooms.get(ticketId);
        console.log(`📤 [SocketService] Broadcasting to ${usersInTicket.size} users in ticket ${ticketId}`);

        // Save media message to database
        try {
          const SupportTicket = (await import('../models/supportTicket.js')).default;
          const ticket = await SupportTicket.findById(ticketId);
          
          if (ticket) {
            if (!ticket.chatMessages) {
              ticket.chatMessages = [];
            }
            
            // Add media message to ticket's chat messages
            ticket.chatMessages.push({
              messageId: mediaMessage.id,
              message: mediaMessage.message,
              senderId: mediaMessage.senderId,
              senderEmail: mediaMessage.senderEmail,
              senderRole: mediaMessage.senderRole,
              timestamp: mediaMessage.timestamp,
              media: {
                type: mediaMessage.media.type,
                name: mediaMessage.media.name,
                size: mediaMessage.media.size,
                mimeType: mediaMessage.media.mimeType,
                localStorageKey: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              }
            });
            
            await ticket.save();
            console.log('✅ [SocketService] Media message saved to database:', mediaMessage.id);
          } else {
            console.warn('⚠️ [SocketService] Ticket not found for database save:', ticketId);
          }
        } catch (dbError) {
          console.error('❌ [SocketService] Database save error for media:', dbError);
          // Continue with broadcasting even if DB save fails
        }

        // Broadcast media message to all users in the ticket room
        io.to(`ticket-${ticketId}`).emit('new-ticket-message', mediaMessage);

        // Update last activity
        userData.lastActivity = new Date();
        chatConnections.set(socket.id, userData);

        // Send upload success confirmation
        const successResponse = {
          messageId: mediaMessage.id,
          uploadId: mediaMessage.media.uploadId,
          fileName: fileName,
          fileType: fileType,
          fileSize: fileSize
        };
        
        console.log('✅ [SocketService] Sending upload success response:', successResponse);
        socket.emit('media-upload-success', successResponse);

        console.log(`✅ [SocketService] Media message broadcasted successfully to ticket ${ticketId}`);

      } catch (error) {
        logger.error('Error in upload-media:', error);
        console.error('❌ [SocketService] Error in upload-media:', error);
        console.error('❌ [SocketService] Error stack:', error.stack);
        socket.emit('chat-error', { message: 'Failed to upload media' });
      }
    });



    // Handle user leaving ticket chat
    socket.on('leave-ticket-chat', (data) => {
      try {
        const { ticketId, userId } = data;
        const userData = chatConnections.get(socket.id);
        
        if (userData && userData.ticketId === ticketId) {
          // Remove from ticket room
          if (ticketRooms.has(ticketId)) {
            ticketRooms.get(ticketId).delete(socket.id);
            
            // If room is empty, remove it
            if (ticketRooms.get(ticketId).size === 0) {
              ticketRooms.delete(ticketId);
            }
          }

          // Remove from user ticket map
          userTicketMap.delete(userId);

          // Remove admin connection if applicable
          if (adminConnections.has(socket.id)) {
            adminConnections.delete(socket.id);
          }

          // Notify others that user left
          socket.to(`ticket-${ticketId}`).emit('user-left-ticket', {
            ticketId,
            userId,
            userEmail: userData.userEmail,
            userRole: userData.userRole,
            timestamp: new Date()
          });

          logger.info(`User ${userData.userEmail} left ticket chat: ${ticketId}`);
        }
      } catch (error) {
        logger.error('Error in leave-ticket-chat:', error);
      }
    });

    // Handle user activity (heartbeat)
    socket.on('chat-activity', (data) => {
      try {
        const { ticketId } = data;
        const userData = chatConnections.get(socket.id);
        
        if (userData && userData.ticketId === ticketId) {
          userData.lastActivity = new Date();
          chatConnections.set(socket.id, userData);
        }
      } catch (error) {
        logger.error('Error in chat-activity:', error);
      }
    });

    // Handle admin requesting ticket info
    socket.on('get-ticket-info', (data) => {
      try {
        const { ticketId } = data;
        const userData = chatConnections.get(socket.id);
        
        if (userData && (userData.userRole === 'admin' || userData.userRole === 'superadmin')) {
          // Get all users in this ticket
          const usersInTicket = Array.from(chatConnections.values())
            .filter(conn => conn.ticketId === ticketId)
            .map(conn => ({
              userId: conn.userId,
              userEmail: conn.userEmail,
              userRole: conn.userRole,
              connectedAt: conn.connectedAt,
              lastActivity: conn.lastActivity
            }));

          socket.emit('ticket-info', {
            ticketId,
            users: usersInTicket,
            totalUsers: usersInTicket.length,
            timestamp: new Date()
          });
        }
      } catch (error) {
        logger.error('Error in get-ticket-info:', error);
      }
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
        
        // logger.info('User disconnected: ' + socket.id);
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

// ===== CHAT SYSTEM UTILITY FUNCTIONS =====

export const getTicketUsers = (ticketId) => {
  if (!ticketRooms.has(ticketId)) return [];
  
  return Array.from(ticketRooms.get(ticketId))
    .map(socketId => chatConnections.get(socketId))
    .filter(Boolean);
};

export const isUserInTicket = (userId, ticketId) => {
  return userTicketMap.get(userId) === ticketId;
};

export const getActiveTickets = () => {
  return Array.from(ticketRooms.keys());
};

export const getChatStats = () => {
  return {
    totalConnections: chatConnections.size,
    activeTickets: ticketRooms.size,
    adminConnections: adminConnections.size,
    timestamp: new Date()
  };
};

export const sendSystemMessage = (ticketId, message, systemData = {}) => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }

  const systemMessage = {
    id: `system-${Date.now()}`,
    ticketId,
    message,
    senderId: 'system',
    senderEmail: 'system',
    senderRole: 'system',
    timestamp: new Date(),
    isSystemMessage: true,
    ...systemData
  };

  io.to(`ticket-${ticketId}`).emit('new-ticket-message', systemMessage);
  logger.info(`System message sent to ticket ${ticketId}: ${message}`);
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
