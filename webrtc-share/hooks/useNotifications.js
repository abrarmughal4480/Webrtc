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

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const socketUrl = backendUrl.replace('/api/v1', '');

    socketRef.current = io(socketUrl, {
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('🔔 Connected to notification socket');
      socketRef.current.emit('join-notification-room', userEmail);
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

    socketRef.current.on('disconnect', () => {
      console.log('🔔 Disconnected from notification socket');
    });

    setSocket(socketRef.current);

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-notification-room', userEmail);
        socketRef.current.disconnect();
      }
    };
  }, [userEmail]);

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
    // You can add API call here to mark as read on backend if needed
  };

  return {
    socket,
    hasNotifications,
    notificationData,
    markAsRead,
    readNotifications,
  };
};

export default useNotifications; 