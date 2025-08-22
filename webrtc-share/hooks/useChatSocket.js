import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useUser } from '@/provider/UserProvider';

const useChatSocket = (ticketId) => {
  const { user } = useUser();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connectionError, setConnectionError] = useState(null);

  // Local storage key for this ticket
  const storageKey = ticketId ? `chat_messages_${ticketId}` : null;

  // Save messages to local storage
  const saveMessagesToStorage = useCallback((messagesToSave) => {
    if (!storageKey) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('❌ Error saving messages to storage:', error);
    }
  }, [storageKey]);

  // Custom setMessages that automatically saves to local storage
  const setMessagesWithStorage = useCallback((newMessages) => {
    setMessages(newMessages);
    saveMessagesToStorage(newMessages);
  }, [saveMessagesToStorage]);

  // Load messages from local storage
  const loadMessagesFromStorage = useCallback(() => {
    if (!storageKey) return [];
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && stored !== 'null' && stored !== 'undefined') {
        const parsed = JSON.parse(stored);
        // Ensure parsed data is an array before mapping
        if (Array.isArray(parsed)) {
          // Convert timestamp strings back to Date objects
          return parsed.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        }
      }
    } catch (error) {
      console.error('❌ Error loading messages from storage:', error);
    }
    return [];
  }, [storageKey]);

  // Clear messages for a specific ticket
  const clearTicketMessages = useCallback(() => {
    if (!storageKey) return;
    
    try {
      localStorage.removeItem(storageKey);
      setMessages([]);
      console.log('🗑️ Cleared messages for ticket:', ticketId);
    } catch (error) {
      console.error('❌ Error clearing messages:', error);
    }
  }, [storageKey, ticketId]);

  // Export messages for backup
  const exportMessages = useCallback(() => {
    if (!storageKey || messages.length === 0) return null;
    
    try {
      const exportData = {
        ticketId,
        exportDate: new Date().toISOString(),
        messageCount: messages.length,
        messages: messages
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_backup_${ticketId}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('📤 Exported', messages.length, 'messages for ticket:', ticketId);
      return true;
    } catch (error) {
      console.error('❌ Error exporting messages:', error);
      return false;
    }
  }, [storageKey, messages, ticketId]);

  // Initialize socket connection
  const connectSocket = useCallback(() => {
    if (!user || !ticketId || socketRef.current) return; // Prevent multiple connections

    try {
      console.log('🔌 Initializing chat socket connection...');
      
      // Create socket connection
      socketRef.current = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
        transports: ['websocket', 'polling'],
        withCredentials: true,
        autoConnect: false, // Don't auto-connect, we'll do it manually
        forceNew: false, // Reuse existing connection if possible
        timeout: 20000
      });

      const socket = socketRef.current;

      // Connection events
      socket.on('connect', () => {
        console.log('🟢 Chat socket connected:', socket.id);
        setIsConnected(true);
        setConnectionError(null);

        // Join ticket chat room
        socket.emit('join-ticket-chat', {
          ticketId,
          userId: user._id,
          userEmail: user.email,
          userRole: user.role,
          ticketInfo: { title: `Ticket ${ticketId}` }
        });
      });

      // Connect manually
      socket.connect();

      socket.on('disconnect', () => {
        console.log('🔴 Chat socket disconnected');
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Chat socket connection error:', error);
        setConnectionError('Failed to connect to chat server');
        setIsConnected(false);
      });

      // Chat events
      socket.on('ticket-chat-joined', (data) => {
        console.log('✅ Joined ticket chat:', data);
        // Don't add system message - just log it
      });

      socket.on('new-ticket-message', (messageData) => {
        console.log('📨 New message received:', messageData);
        
        // Check if message already exists to prevent duplicates
        setMessagesWithStorage(prev => {
          const messageExists = prev.some(msg => msg.id === messageData.id);
          if (messageExists) {
            console.log('⚠️ Message already exists, skipping duplicate:', messageData.id);
            return prev;
          }
          
          const newMessage = {
            id: messageData.id,
            text: messageData.message,
            sender: messageData.senderRole === 'admin' || messageData.senderRole === 'superadmin' ? 'admin' : 'user',
            timestamp: new Date(messageData.timestamp),
            senderId: messageData.senderId,
            senderEmail: messageData.senderEmail,
            senderRole: messageData.senderRole
          };
          
          console.log('✅ Adding new message to storage:', newMessage);
          return [...prev, newMessage];
        });

        // Dispatch global event for background message receiving (only when component is not mounted)
        if (!document.querySelector('[data-chat-open="true"]')) {
          window.dispatchEvent(new CustomEvent('new-chat-message', {
            detail: {
              ticketId: messageData.ticketId,
              message: messageData
            }
          }));
        }
      });



      socket.on('user-joined-ticket', (data) => {
        console.log('👤 User joined ticket:', data);
        // Don't add system message - just log it
      });

      socket.on('user-left-ticket', (data) => {
        console.log('👤 User left ticket:', data);
        // Don't add system message - just log it
      });

      socket.on('user-disconnected', (data) => {
        console.log('👤 User disconnected:', data);
        // Don't add system message - just log it
      });

      socket.on('ticket-info', (data) => {
        console.log('📋 Ticket info received:', data);
        setOnlineUsers(data.users);
      });

      socket.on('chat-error', (error) => {
        console.error('❌ Chat error:', error);
        setConnectionError(error.message);
      });

    } catch (error) {
      console.error('❌ Error setting up chat socket:', error);
      setConnectionError('Failed to initialize chat connection');
    }
  }, [user, ticketId]);

  // Disconnect socket
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting chat socket...');
      
      try {
        // Leave ticket chat
        if (isConnected && ticketId && user?._id) {
          socketRef.current.emit('leave-ticket-chat', {
            ticketId,
            userId: user._id
          });
        }

        // Remove all event listeners
        socketRef.current.removeAllListeners();
        
        // Disconnect socket
        socketRef.current.disconnect();
        socketRef.current = null;
        
        // Reset state
        setIsConnected(false);
        setMessages([]);
        setOnlineUsers([]);
        setConnectionError(null);
        
        console.log('✅ Chat socket disconnected and cleaned up');
      } catch (error) {
        console.error('❌ Error during socket cleanup:', error);
      }
    }
  }, [isConnected, ticketId, user?._id]);

  // Send message
  const sendMessage = useCallback((message) => {
    if (!socketRef.current || !isConnected || !ticketId || !user) {
      console.error('❌ Cannot send message: socket not ready');
      return false;
    }

    try {
      socketRef.current.emit('send-ticket-message', {
        ticketId,
        message,
        senderId: user._id,
        senderEmail: user.email,
        senderRole: user.role
      });
      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return false;
    }
  }, [socketRef, isConnected, ticketId, user]);



  // Mark message as read
  const markMessageAsRead = useCallback((messageId) => {
    if (!socketRef.current || !isConnected || !ticketId || !user) return;

    socketRef.current.emit('mark-message-read', {
      ticketId,
      messageId,
      userId: user._id,
      userEmail: user.email
    });
  }, [socketRef, isConnected, ticketId, user]);

  // Get ticket info (admin only)
  const getTicketInfo = useCallback(() => {
    if (!socketRef.current || !isConnected || !ticketId || !user) return;

    if (user.role === 'admin' || user.role === 'superadmin') {
      socketRef.current.emit('get-ticket-info', { ticketId });
    }
  }, [socketRef, isConnected, ticketId, user]);

  // Send activity heartbeat
  const sendActivity = useCallback(() => {
    if (!socketRef.current || !isConnected || !ticketId) return;

    socketRef.current.emit('chat-activity', { ticketId });
  }, [socketRef, isConnected, ticketId]);

  // Connect on mount
  useEffect(() => {
    if (user && ticketId) {
      console.log('🔄 Setting up chat socket for ticket:', ticketId);
      
      // Load existing messages from local storage
      const storedMessages = loadMessagesFromStorage();
      if (storedMessages.length > 0) {
        console.log('📚 Loaded', storedMessages.length, 'messages from local storage');
        setMessages(storedMessages);
      }
      
      connectSocket();
    }

    // Don't disconnect on unmount - keep connection alive for background message receiving
    // return () => {
    //   console.log('🧹 Cleaning up chat socket on unmount');
    //   disconnectSocket();
    // };
  }, [user?._id, ticketId, loadMessagesFromStorage]); // Only depend on user ID and ticket ID, not the functions

  // Activity heartbeat
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(sendActivity, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [isConnected, sendActivity]);

  // Prevent rapid reconnections
  useEffect(() => {
    if (!isConnected && socketRef.current) {
      const timeout = setTimeout(() => {
        if (socketRef.current && !isConnected) {
          console.log('🔄 Attempting to reconnect...');
          socketRef.current.connect();
        }
      }, 2000); // Wait 2 seconds before reconnecting

      return () => clearTimeout(timeout);
    }
  }, [isConnected]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        // Trigger scroll to bottom (this will be handled by the component)
        window.dispatchEvent(new CustomEvent('scroll-to-bottom'));
      }
    }
  }, [messages]);

  // Global message listener for background message receiving
  useEffect(() => {
    const handleGlobalMessage = (event) => {
      if (event.detail && event.detail.ticketId === ticketId) {
        const newMessage = event.detail.message;
        console.log('📨 Global message received for ticket:', ticketId, newMessage);
        
        // Check if message already exists to prevent duplicates
        setMessagesWithStorage(prev => {
          const messageExists = prev.some(msg => msg.id === newMessage.id);
          if (messageExists) {
            console.log('⚠️ Global message already exists, skipping duplicate:', newMessage.id);
            return prev;
          }
          
          const messageToAdd = {
            id: newMessage.id,
            text: newMessage.message,
            sender: newMessage.senderRole === 'admin' || newMessage.senderRole === 'superadmin' ? 'admin' : 'user',
            timestamp: new Date(newMessage.timestamp),
            senderId: newMessage.senderId,
            senderEmail: newMessage.senderEmail,
            senderRole: newMessage.senderRole
          };
          
          console.log('✅ Adding global message to storage:', messageToAdd);
          return [...prev, messageToAdd];
        });
      }
    };

    // Listen for global message events
    window.addEventListener('new-chat-message', handleGlobalMessage);
    
    return () => {
      window.removeEventListener('new-chat-message', handleGlobalMessage);
    };
  }, [ticketId, setMessagesWithStorage]);

  return {
    // Connection state
    isConnected,
    connectionError,
    
    // Messages
    messages,
    setMessages: setMessagesWithStorage,
    
    // Online users
    onlineUsers,
    
    // Actions
    sendMessage,
    markMessageAsRead,
    getTicketInfo,
    clearTicketMessages,
    exportMessages,
    
    // Connection management
    connectSocket,
    disconnectSocket
  };
};

export default useChatSocket;
