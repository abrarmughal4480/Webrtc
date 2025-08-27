import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useOnlineUsers = (userRole, userId, userEmail, userCompany) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [totalOnline, setTotalOnline] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const socketRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  useEffect(() => {
    // Only connect if user is authenticated
    if (!userId || !userEmail || !userRole) {
      return;
    }

    // Initialize socket connection
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected for online users tracking');
      
      // Authenticate user with socket
      socket.emit('user-authenticated', {
        userId,
        email: userEmail,
        role: userRole,
        company: userCompany
      });

      // Request online users if superadmin
      if (userRole === 'superadmin') {
        socket.emit('get-online-users', { role: userRole });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected from online users tracking');
    });

    // Online users events (only for superadmins)
    if (userRole === 'superadmin') {
      socket.on('online-users-update', (data) => {
        setOnlineUsers(data.users || []);
        setTotalOnline(data.totalOnline || 0);
        setLastUpdate(data.timestamp ? new Date(data.timestamp) : new Date());
      });

      socket.on('user-came-online', (userData) => {
        setOnlineUsers(prev => {
          // Check if user is already in the list
          const existingUser = prev.find(user => user.userId === userData.userId);
          if (existingUser) {
            return prev;
          }
          return [...prev, {
            ...userData,
            onlineDuration: 0
          }];
        });
        setTotalOnline(prev => prev + 1);
      });

      socket.on('user-went-offline', (userData) => {
        setOnlineUsers(prev => prev.filter(user => user.userId !== userData.userId));
        setTotalOnline(prev => Math.max(0, prev - 1));
      });
    }

    // Error handling
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Setup heartbeat for user activity
    if (userId) {
      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.connected) {
          socket.emit('user-activity', userId);
        }
      }, 30000); // Send activity every 30 seconds
    }

    // Cleanup function
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userId, userEmail, userRole, userCompany]);

  // Function to manually refresh online users (for superadmins)
  const refreshOnlineUsers = () => {
    if (socketRef.current && userRole === 'superadmin') {
      socketRef.current.emit('get-online-users', { role: userRole });
    }
  };

  // Function to get user's online status
  const isUserOnline = (targetUserId) => {
    return onlineUsers.some(user => user.userId === targetUserId);
  };

  // Function to get user's online duration
  const getUserOnlineDuration = (targetUserId) => {
    const user = onlineUsers.find(user => user.userId === targetUserId);
    if (user) {
      const now = new Date();
      const connectedAt = new Date(user.connectedAt);
      return Math.floor((now - connectedAt) / 1000); // seconds
    }
    return 0;
  };

  // Function to get users by role
  const getUsersByRole = (role) => {
    return onlineUsers.filter(user => user.role === role);
  };

  // Function to get users by company
  const getUsersByCompany = (company) => {
    return onlineUsers.filter(user => user.company === company);
  };

  // Function to get recently connected users (last 5 minutes)
  const getRecentlyConnectedUsers = () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return onlineUsers.filter(user => new Date(user.connectedAt) > fiveMinutesAgo);
  };

  // Function to get inactive users (no activity in last 5 minutes)
  const getInactiveUsers = () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return onlineUsers.filter(user => new Date(user.lastActivity) < fiveMinutesAgo);
  };

  return {
    onlineUsers,
    totalOnline,
    isConnected,
    lastUpdate,
    refreshOnlineUsers,
    isUserOnline,
    getUserOnlineDuration,
    getUsersByRole,
    getUsersByCompany,
    getRecentlyConnectedUsers,
    getInactiveUsers
  };
};
