import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { publicApi } from '@/http';

const useNotifications = (userEmail) => {
  const [socket, setSocket] = useState(null);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  const socketRef = useRef(null);
  const [readNotifications, setReadNotifications] = useState(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const maxConnectionAttempts = 3;

  // Load read notifications from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedReadNotifications = localStorage.getItem('readNotifications');
      if (savedReadNotifications) {
        setReadNotifications(new Set(JSON.parse(savedReadNotifications)));
      }
    }
  }, []);

  // Check for existing notifications on mount
  useEffect(() => {
    if (userEmail) {
      publicApi.get('/api/v1/uploads/notification/check')
        .then(res => {
          if (res.data?.data?.hasNotifications) {
            const notifications = res.data?.data?.notifications;
            setNotificationData(notifications);
            
            // Check if there are unread notifications
            const savedReadNotifications = localStorage.getItem('readNotifications');
            const readSet = savedReadNotifications ? new Set(JSON.parse(savedReadNotifications)) : new Set();
            
            const hasUnreadNotifications = notifications.some(notification => !readSet.has(notification._id));
            setHasNotifications(hasUnreadNotifications);
          }
        })
        .catch(err => {
          console.log('Could not check notifications:', err);
        });
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;

    // Don't attempt connection if we've exceeded max attempts
    if (connectionAttempts >= maxConnectionAttempts) {
      console.log('🔔 Max connection attempts reached, skipping WebSocket connection');
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const socketUrl = backendUrl.replace('/api/v1', '');

    console.log('🔔 Attempting to connect to:', socketUrl);

    socketRef.current = io(socketUrl, {
      reconnectionAttempts: 2,
      reconnectionDelay: 2000,
      timeout: 8000,
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    socketRef.current.on('connect', () => {
      console.log('🔔 Connected to notification socket');
      setIsConnected(true);
      setConnectionAttempts(0); // Reset attempts on successful connection
      socketRef.current.emit('join-notification-room', userEmail);
    });

    socketRef.current.on('connect_error', (error) => {
      console.log('🔔 Connection error:', error.message);
      setIsConnected(false);
      setConnectionAttempts(prev => prev + 1);
      
      // If this is the last attempt, clean up and don't retry
      if (connectionAttempts + 1 >= maxConnectionAttempts) {
        console.log('🔔 Max connection attempts reached, giving up');
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      }
    });

    socketRef.current.on('new-notification', (notification) => {
      console.log('📨 Received new notification:', notification);
      // Add new notification to existing ones
      setNotificationData(prev => {
        const existing = prev || [];
        return [notification, ...existing];
      });
      setHasNotifications(true);
      
      // Show toast notification
      toast.success('New notification!', {
        description: `Your share code ${notification.accessCode} has been viewed!`,
        duration: 5000,
      });
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('🔔 Disconnected from notification socket:', reason);
      setIsConnected(false);
      
      // Only attempt reconnection if it wasn't a manual disconnect
      if (reason === 'io client disconnect') {
        setConnectionAttempts(prev => prev + 1);
      }
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('🔔 Reconnected to notification socket after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionAttempts(0);
      socketRef.current.emit('join-notification-room', userEmail);
    });

    socketRef.current.on('reconnect_failed', () => {
      console.log('🔔 Reconnection failed, giving up');
      setIsConnected(false);
      setConnectionAttempts(maxConnectionAttempts);
    });

    setSocket(socketRef.current);

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-notification-room', userEmail);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [userEmail, connectionAttempts]);

  const markAsRead = (notificationId) => {
    setReadNotifications(prev => {
      const newReadSet = new Set([...prev, notificationId]);
      // Save to localStorage
      localStorage.setItem('readNotifications', JSON.stringify([...newReadSet]));
      
      // Check if all notifications are now read
      if (notificationData && newReadSet.size >= notificationData.length) {
        setHasNotifications(false);
      }
      
      return newReadSet;
    });
  };

  const clearAllNotifications = () => {
    if (notificationData) {
      const allIds = notificationData.map(n => n._id);
      setReadNotifications(prev => {
        const newReadSet = new Set([...prev, ...allIds]);
        localStorage.setItem('readNotifications', JSON.stringify([...newReadSet]));
        return newReadSet;
      });
      setHasNotifications(false);
    }
  };

  const resetConnection = () => {
    setConnectionAttempts(0);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  };

  return {
    socket,
    hasNotifications,
    notificationData,
    markAsRead,
    clearAllNotifications,
    isConnected,
    connectionAttempts,
    maxConnectionAttempts,
    resetConnection
  };
};

export default useNotifications; 