import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useUser } from '@/provider/UserProvider';
import { getChatHistory } from '@/http/chatHttp';


const useChatSocket = (ticketId) => {
  const { user } = useUser();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connectionError, setConnectionError] = useState(null);


  const setMessagesWithStorage = useCallback((newMessages) => {
    setMessages(newMessages);
    console.log('💾 Messages updated locally, database saving handled by backend');
  }, []);

  // Load messages from database
  const loadMessagesFromDatabase = useCallback(async () => {
    if (!ticketId || !user?._id) return [];

    try {
      console.log('📚 Loading chat history from database for ticket:', ticketId);
      const response = await getChatHistory(ticketId, user._id);
      
      if (response.success && response.data.messages) {
        console.log('✅ Loaded', response.data.messages.length, 'messages from database');
        
        // Convert database messages to local format (filter out welcome messages)
        const formattedMessages = response.data.messages
          .filter(msg => !msg.messageId.startsWith('welcome')) // Don't load welcome messages from DB
          .map(msg => ({
            id: msg.messageId,
            text: msg.message || '',
            sender: msg.senderRole === 'admin' || msg.senderRole === 'superadmin' ? 'admin' : 'user',
            timestamp: new Date(msg.timestamp),
            senderId: msg.senderId,
            senderEmail: msg.senderEmail,
            senderRole: msg.senderRole,
            media: msg.media ? {
              type: msg.media.type,
              name: msg.media.name,
              size: msg.media.size,
              mimeType: msg.media.mimeType,
              localStorageKey: msg.media.localStorageKey,
              // Load media from local storage if available
              localUrl: msg.media.localStorageKey ? localStorage.getItem(msg.media.localStorageKey) : null
            } : null,
            isRead: msg.isRead,
            readAt: msg.readAt
          }));
        
        return formattedMessages;
      }
    } catch (error) {
      console.error('❌ Error loading messages from database:', error);
    }
    return [];
  }, [ticketId, user?._id]);



  // Clear messages for a specific ticket (local state only)
  const clearTicketMessages = useCallback(() => {
    setMessages([]);
    console.log('🗑️ Cleared local messages for ticket:', ticketId);
  }, [ticketId]);

  // Export messages to JSON file
  const exportMessages = useCallback(() => {
    if (messages.length === 0) {
      alert('No messages to export');
      return;
    }

    try {
      const exportData = {
        ticketId,
        exportDate: new Date().toISOString(),
        totalMessages: messages.length,
        messages: messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          timestamp: msg.timestamp.toISOString(),
          media: msg.media ? {
            type: msg.media.type,
            name: msg.media.name,
            size: msg.media.size
          } : null
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-export-${ticketId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('📤 Exported', messages.length, 'messages to JSON file');
    } catch (error) {
      console.error('❌ Error exporting messages:', error);
      alert('Failed to export messages');
    }
  }, [messages, ticketId]);



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
        timeout: 20000,
        // --- LARGE FILE HANDLING ---
        maxHttpBufferSize: 50 * 1024 * 1024, // 50MB buffer
        maxPayload: 50 * 1024 * 1024, // 50MB max payload
        // --- CONNECTION STABILITY ---
        connectTimeout: 45000, // 45s connection timeout
        upgradeTimeout: 10000, // 10s upgrade timeout
        // --- HEARTBEAT OPTIMIZATION ---
        heartbeatTimeout: 60000, // 60s heartbeat timeout
        heartbeatInterval: 25000 // 25s heartbeat interval
      });

      const socket = socketRef.current;

      // Connection events
      socket.on('connect', () => {
        console.log('🟢 Chat socket connected:', socket.id);
        setIsConnected(true);
        setConnectionError(null);

        // Make socket available globally for components to listen to events
        window.chatSocket = socket;

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

      socket.on('disconnect', (reason) => {
        console.log('🔴 Chat socket disconnected:', reason);
        setIsConnected(false);
        
        // Clear global socket reference
        if (window.chatSocket === socket) {
          window.chatSocket = null;
        }
        
        // Auto-reconnect for certain disconnect reasons
        if (reason === 'io server disconnect' || reason === 'transport close') {
          console.log('🔄 Attempting to reconnect...');
          setTimeout(() => {
            if (socketRef.current) {
              socketRef.current.connect();
            }
          }, 1000);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Chat socket connection error:', error);
        setConnectionError('Failed to connect to chat server');
        setIsConnected(false);
      });

      socket.on('error', (error) => {
        console.error('❌ Chat socket error:', error);
        setConnectionError('Socket error occurred');
      });

      // Chat events
      socket.on('ticket-chat-joined', (data) => {
        console.log('✅ Joined ticket chat:', data);
        // Don't add system message - just log it
      });

      // Chat events
      socket.on('new-ticket-message', (messageData) => {
        console.log('📨 [useChatSocket] New message received:', {
          id: messageData.id,
          message: messageData.message,
          hasMedia: !!messageData.media,
          mediaType: messageData.media?.type,
          senderRole: messageData.senderRole
        });

        // Check if message already exists to prevent duplicates
        setMessagesWithStorage(prev => {
          const messageExists = prev.some(msg => msg.id === messageData.id);
          if (messageExists) {
            console.log('⚠️ [useChatSocket] Message already exists, skipping duplicate:', messageData.id);
            return prev;
          }

          // Also check for messages with the same content and timestamp to prevent duplicates
          const duplicateContent = prev.some(msg =>
            msg.text === messageData.message &&
            Math.abs(new Date(msg.timestamp).getTime() - new Date(messageData.timestamp).getTime()) < 1000 &&
            msg.media?.name === messageData.media?.name
          );

          if (duplicateContent) {
            console.log('⚠️ [useChatSocket] Duplicate content message, skipping:', messageData.message);
            return prev;
          }

          const newMessage = {
            id: messageData.id,
            text: messageData.message || '', // Handle empty message for media-only
            sender: messageData.senderRole === 'admin' || messageData.senderRole === 'superadmin' ? 'admin' : 'user',
            timestamp: new Date(messageData.timestamp),
            senderId: messageData.senderId,
            senderEmail: messageData.senderEmail,
            senderRole: messageData.senderRole,
            // Add media support with file data
            media: messageData.media ? {
              type: messageData.media.type,
              name: messageData.media.name,
              size: messageData.media.size,
              mimeType: messageData.media.mimeType,
              // Use the file data from server for display
              localUrl: messageData.media.data || messageData.media.url || null,
              url: messageData.media.url || null,
              data: messageData.media.data || null,
              uploadId: messageData.media.uploadId || null,
              isLocal: false // This is a server message
            } : null
          };

          console.log('✅ [useChatSocket] Adding new message to storage:', {
            id: newMessage.id,
            hasText: !!newMessage.text,
            hasMedia: !!newMessage.media,
            mediaHasData: !!newMessage.media?.data,
            mediaHasLocalUrl: !!newMessage.media?.localUrl
          });

          return [...prev, newMessage];
        });

        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('new-ticket-message', { detail: messageData }));

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

      // Add media upload acknowledgment handler
      socket.on('media-upload-acknowledged', (data) => {
        console.log('📤 [useChatSocket] Media upload acknowledged by server:', data);
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('media-upload-acknowledged', { detail: data }));
      });

      // Add media upload success handler
      socket.on('media-upload-success', (data) => {
        console.log('✅ Media upload successful:', data);
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('media-upload-success', { detail: data }));
      });

      // Add chat error handler
      socket.on('chat-error', (error) => {
        console.error('❌ Chat error:', error);
        setConnectionError(error.message);
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

        // Clear global socket reference
        if (window.chatSocket === socketRef.current) {
          window.chatSocket = null;
        }

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

  // Send media message
  const sendMediaMessage = useCallback((mediaData) => {
    console.log('📤 [useChatSocket] Attempting to send media:', {
      fileName: mediaData.fileName,
      fileType: mediaData.fileType,
      fileSize: mediaData.fileSize,
      hasFileData: !!mediaData.fileData
    });
    console.log('📤 [useChatSocket] Socket state:', {
      hasSocket: !!socketRef.current,
      isConnected,
      hasTicketId: !!ticketId,
      hasUser: !!user
    });

    if (!socketRef.current || !isConnected || !ticketId || !user) {
      console.error('❌ [useChatSocket] Cannot send media: socket not ready');
      return false;
    }

    try {
      const payload = {
        ticketId,
        fileName: mediaData.fileName,
        fileType: mediaData.fileType,
        fileSize: mediaData.fileSize,
        fileData: mediaData.fileData, // Send the actual file data
        senderId: user._id,
        senderEmail: user.email,
        senderRole: user.role
      };

      console.log('📤 [useChatSocket] Emitting upload-media with payload size:', payload.fileData?.length || 0);
      socketRef.current.emit('upload-media', payload);

      console.log('✅ [useChatSocket] Media upload event emitted successfully');
      return true;
    } catch (error) {
      console.error('❌ [useChatSocket] Error sending media:', error);
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

      // Load existing messages from database only
      const loadMessages = async () => {
        try {
          const dbMessages = await loadMessagesFromDatabase();
          if (dbMessages.length > 0) {
            console.log('📚 Loaded', dbMessages.length, 'messages from database');
            setMessages(dbMessages);
          } else {
            console.log('📚 No messages found in database for ticket:', ticketId);
          }
        } catch (error) {
          console.error('❌ Error loading messages from database:', error);
        }
      };

      loadMessages();
      connectSocket();
    }

    // Don't disconnect on unmount - keep connection alive for background message receiving
    // return () => {
    //   console.log('🧹 Cleaning up chat socket on unmount');
    //   disconnectSocket();
    // };
  }, [user?._id, ticketId, loadMessagesFromDatabase]); // Only depend on user ID and ticket ID, not the functions

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
            senderRole: newMessage.senderRole,
            // Add media support with file data
            media: newMessage.media ? {
              ...newMessage.media,
              // Use the file data from server for display
              localUrl: newMessage.media.data || newMessage.media.url || null
            } : null
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
    sendMediaMessage,
    markMessageAsRead,
    getTicketInfo,
    clearTicketMessages,
    exportMessages,
    connectSocket,
    disconnectSocket,
    loadMessagesFromDatabase
  };
};

export default useChatSocket;
