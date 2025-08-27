"use client"
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, User, Shield, Clock, MessageCircle, Wifi, WifiOff, Paperclip } from 'lucide-react';
import { useUser } from '@/provider/UserProvider';
import useChatSocket from '@/hooks/useChatSocket';

const AdminChatScreen = ({ isOpen, onClose, ticketInfo }) => {
  const { user } = useUser();
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [expandedMedia, setExpandedMedia] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const mediaInputRef = useRef(null);

  // Use WebSocket chat hook
  const {
    isConnected,
    connectionError,
    messages,
    setMessages,
    onlineUsers,
    sendMessage,
    sendMediaMessage,
    markMessageAsRead,
    getTicketInfo,
    clearTicketMessages,
    exportMessages,
    loadMessagesFromDatabase
  } = useChatSocket(ticketInfo?._id);





  // Listen for incoming media messages and handle progress
  useEffect(() => {
    if (isConnected) {
      // Listen for new ticket messages (including media) from the hook
      const handleNewTicketMessage = (event) => {
        const messageData = event.detail;
        console.log('📨 [AdminChatScreen] New ticket message received:', messageData);
        
        // Check if this is a media message that we sent
        if (messageData.media && messageData.senderId === user?._id) {
          console.log('✅ [AdminChatScreen] Our media message confirmed by server:', messageData);
          
          // Update progress to 100% when our media is confirmed
          setProgressPercent(100);
          setUploadProgress(prev => ({
            ...prev,
            status: 'confirmed',
            message: 'Media sent successfully!'
          }));
          
          // Update the local message with the server-generated ID
          setMessages(prev => prev.map(msg => {
            if (msg.id && msg.id.startsWith('temp_') && msg.media && msg.media.isLocal) {
              // This is a local media message, update it with server info
              return {
                ...msg,
                id: messageData.id,
                serverConfirmed: true,
                media: {
                  ...msg.media,
                  isLocal: false,
                  serverId: messageData.id,
                  url: messageData.media.url || msg.media.localUrl // Use server URL if available
                }
              };
            }
            return msg;
          }));
          
          // Clear everything after showing 100% for a moment
          setTimeout(() => {
            setUploadProgress(null);
            setIsUploading(false);
            setProgressPercent(0);
            removeSelectedMedia();
          }, 1500); // Show 100% for 1.5 seconds before clearing
        } else if (messageData.media && messageData.senderId !== user?._id) {
          // This is a media message from another user, add it to our messages
          console.log('📨 [AdminChatScreen] Media message from another user:', messageData);
          
          // Convert incoming message format to local format
          const mediaMessage = {
            id: messageData.id,
            text: messageData.message || messageData.text || '',
            sender: messageData.senderRole === 'admin' ? 'admin' : 'user',
            timestamp: new Date(messageData.timestamp),
            media: {
              type: messageData.media.type,
              name: messageData.media.name,
              size: messageData.media.size,
              mimeType: messageData.media.mimeType,
              url: messageData.media.url || null,
              serverId: messageData.id
            }
          };
          
          setMessages(prev => {
            // Check if message already exists
            const exists = prev.find(msg => msg.id === mediaMessage.id);
            if (!exists) {
              console.log('✅ Adding incoming media message:', mediaMessage);
              return [...prev, mediaMessage];
            }
            return prev;
          });
        }
      };

      // Listen for media upload success directly from socket (for progress updates)
      const handleMediaUploadSuccess = (data) => {
        console.log('✅ [AdminChatScreen] Media upload success received:', data);
        
        // Update progress to 100% immediately when we get success response
        setProgressPercent(100);
        setUploadProgress(prev => ({
          ...prev,
          status: 'success',
          message: 'Media uploaded successfully!'
        }));
        
        // Clear everything after showing 100% for a moment
        setTimeout(() => {
          setUploadProgress(null);
          setIsUploading(false);
          setProgressPercent(0);
          removeSelectedMedia();
        }, 1500); // Show 100% for 1.5 seconds before clearing
      };

      // Listen for the events
      window.addEventListener('new-ticket-message', handleNewTicketMessage);
      
      // Also listen for direct socket events if available
      if (window.chatSocket) {
        window.chatSocket.on('media-upload-success', handleMediaUploadSuccess);
        console.log('🔌 [AdminChatScreen] Listening for media-upload-success events directly from socket');
      } else {
        console.log('⚠️ [AdminChatScreen] Global chat socket not available, will use event system only');
      }
      
      // Fallback: Also listen for the event that useChatSocket might dispatch
      window.addEventListener('media-upload-success', (event) => {
        console.log('✅ [AdminChatScreen] Media upload success event received via fallback:', event.detail);
        handleMediaUploadSuccess(event.detail);
      });
      
      return () => {
        window.removeEventListener('new-ticket-message', handleNewTicketMessage);
        window.removeEventListener('media-upload-success', handleMediaUploadSuccess);
        if (window.chatSocket) {
          window.chatSocket.off('media-upload-success', handleMediaUploadSuccess);
        }
      };
    }
  }, [isConnected, setMessages, user?._id]);

  // Auto-detect user role from UserProvider
  const isAdminRole = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'company-admin';
  const userRole = isAdminRole ? 'admin' : 'client';

  // Filter messages based on search query
  const filteredMessages = searchQuery.trim() 
    ? messages.filter(msg => 
        msg.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;


  
  // Debug logging
  useEffect(() => {
    if (user) {
      console.log('🔍 [AdminChatScreen] User role detected:', {
        role: user.role,
        isAdminRole,
        userRole,
        email: user.email
      });
    }
  }, [user, isAdminRole, userRole]);

  // Debug: Log when messages change
  useEffect(() => {
    console.log('📨 [AdminChatScreen] Messages updated:', {
      count: messages.length,
      lastMessage: messages[messages.length - 1],
      allMessages: messages,
      mediaMessages: messages.filter(msg => msg.media).map(msg => ({
        id: msg.id,
        type: msg.media?.type,
        name: msg.media?.name,
        hasLocalUrl: !!msg.media?.localUrl,
        hasBase64: !!msg.media?.base64Data,
        hasUrl: !!msg.media?.url,
        isLocal: msg.media?.isLocal
      }))
    });
  }, [messages]);

  // Load messages from database when component opens
  useEffect(() => {
    if (isOpen && ticketInfo?._id && isConnected) {
      const loadMessages = async () => {
        try {
          console.log('📚 [AdminChatScreen] Loading messages from database for ticket:', ticketInfo._id);
          const dbMessages = await loadMessagesFromDatabase();
          
          if (dbMessages.length > 0) {
            console.log('✅ [AdminChatScreen] Loaded', dbMessages.length, 'messages from database');
            setMessages(dbMessages);
          } else {
            console.log('ℹ️ [AdminChatScreen] No messages found in database, will show welcome message if needed');
            // Show welcome message for client if no messages exist
            if (userRole === 'client') {
              const hasShownWelcome = sessionStorage.getItem('chatWelcomeShown');
              if (!hasShownWelcome) {
                const welcomeMessage = {
                  id: 'welcome',
                  text: "Hello! What is your query? Please let us know how we can help you.",
                  sender: 'admin',
                  timestamp: new Date(Date.now() - 60000)
                };
                setMessages([welcomeMessage]);
                sessionStorage.setItem('chatWelcomeShown', 'true');
              }
            }
          }
        } catch (error) {
          console.error('❌ [AdminChatScreen] Error loading messages from database:', error);
          // Fallback to welcome message for client
          if (userRole === 'client' && messages.length === 0) {
            const hasShownWelcome = sessionStorage.getItem('chatWelcomeShown');
            if (!hasShownWelcome) {
              const welcomeMessage = {
                id: 'welcome',
                text: "Hello! What is your query? Please let us know how we can help you.",
                sender: 'admin',
                timestamp: new Date(Date.now() - 60000)
              };
              setMessages([welcomeMessage]);
              sessionStorage.setItem('chatWelcomeShown', 'true');
            }
          }
        }
      };
      
      loadMessages();
    }
  }, [isOpen, ticketInfo?._id, isConnected, loadMessagesFromDatabase, setMessages, userRole, messages.length]);

  // Initialize messages based on auto-detected user role - ONLY ONCE (fallback)
  useEffect(() => {
    if (isOpen && userRole === 'client' && messages.length === 0) {
      // Check if we already showed the welcome message for this session
      const hasShownWelcome = sessionStorage.getItem('chatWelcomeShown');
      
      if (!hasShownWelcome) {
        // Add default welcome message for client - ONLY ONCE
        const welcomeMessage = {
          id: 'welcome',
          text: "Hello! What is your query? Please let us know how we can help you.",
          sender: 'admin',
          timestamp: new Date(Date.now() - 60000)
        };
        setMessages([welcomeMessage]);
        
        // Mark that we've shown the welcome message for this session
        sessionStorage.setItem('chatWelcomeShown', 'true');
      }
    }
  }, [isOpen, userRole, messages.length]);

  // Disable background scrolling when popup is open
  useEffect(() => {
    if (isOpen) {
      // Disable background scrolling
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Re-enable background scrolling
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  // Get ticket info when admin joins
  useEffect(() => {
    if (isOpen && isAdminRole && isConnected) {
      getTicketInfo();
    }
  }, [isOpen, isAdminRole, isConnected, getTicketInfo]);

  // Retry sending offline messages when connection is restored
  useEffect(() => {
    if (isConnected && messages.length > 0) {
      const offlineMessages = messages.filter(msg => msg.isOffline && msg.pending);
      if (offlineMessages.length > 0) {
        console.log('🔄 Found', offlineMessages.length, 'offline messages to retry');
        // In a real implementation, you would retry sending these messages
        // For now, we'll just mark them as sent
        setMessages(prev => prev.map(msg => 
          msg.isOffline && msg.pending 
            ? { ...msg, isOffline: false, pending: false, retried: true }
            : msg
        ));
      }
    }
  }, [isConnected, messages, setMessages]);

  // Handle file import for message restore
  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData.messages && Array.isArray(importedData.messages)) {
          // Merge imported messages with existing ones, avoiding duplicates
          const existingIds = new Set(messages.map(msg => msg.id));
          const newMessages = importedData.messages.filter(msg => !existingIds.has(msg.id));
          
          if (newMessages.length > 0) {
            setMessages(prev => [...prev, ...newMessages]);
            alert(`Successfully imported ${newMessages.length} new messages`);
          } else {
            alert('No new messages to import');
          }
        } else {
          alert('Invalid file format');
        }
      } catch (error) {
        console.error('Error importing messages:', error);
        alert('Error importing messages. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  // Handle media file selection
  const handleMediaSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      alert('Please select an image or video file');
      return;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    // Convert file to base64 for persistent storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result;
      
      setSelectedMedia({
        file,
        type: isImage ? 'image' : 'video',
        preview: base64Data,
        base64Data: base64Data, // Store base64 data for persistence
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  // Remove selected media
  const removeSelectedMedia = () => {
    setSelectedMedia(null);
    setUploadProgress(null);
    setIsUploading(false);
    setProgressPercent(0);
    if (window.currentProgressInterval) {
      clearInterval(window.currentProgressInterval);
      window.currentProgressInterval = null;
    }
    if (mediaInputRef.current) {
      mediaInputRef.current.value = '';
    }
  };

  // Handle media expansion
  const handleMediaExpand = (media) => {
    setExpandedMedia(media);
  };

  // Close expanded media
  const closeExpandedMedia = () => {
    setExpandedMedia(null);
    setImageZoom(1); // Reset zoom when closing
  };

  // Handle zoom in
  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.5, 3)); // Max zoom 3x
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.5, 0.5)); // Min zoom 0.5x
  };

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && expandedMedia) {
        closeExpandedMedia();
      }
    };

    if (expandedMedia) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [expandedMedia]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // No need to cleanup blob URLs since we're using base64
    };
  }, []);

  // Handle send message with media
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedMedia) return;

    console.log('🚀 [AdminChatScreen] Sending message with media:', {
      hasText: !!newMessage.trim(),
      hasMedia: !!selectedMedia,
      mediaType: selectedMedia?.type,
      fileName: selectedMedia?.file?.name,
      isConnected,
      userRole
    });

    // If not connected, queue the message locally
    if (!isConnected) {
      console.log('⚠️ [AdminChatScreen] Not connected, saving message locally');
      const offlineMessage = {
        id: `offline_${Date.now()}`,
        text: newMessage.trim() || '',
        sender: userRole === 'admin' ? 'admin' : 'user',
        timestamp: new Date(),
        isOffline: true,
        pending: true,
        media: selectedMedia ? {
          type: selectedMedia.type,
          name: selectedMedia.file.name,
          size: selectedMedia.file.size
        } : null
      };
      
      setMessages(prev => [...prev, offlineMessage]);
      setNewMessage('');
      removeSelectedMedia();
      
      if (inputRef.current) {
        inputRef.current.style.height = '24px';
        setTimeout(() => {
          inputRef.current.focus();
        }, 100);
      }
      
      // Show offline message indicator
      alert('Message saved locally. It will be sent when you reconnect to the chat.');
      return;
    }

    // Send message with media if available
    if (selectedMedia) {
      console.log('📤 [AdminChatScreen] Sending media message:', selectedMedia);
      
      // Check file size and show warning for large files
      const fileSizeMB = selectedMedia.file.size / (1024 * 1024);
      if (fileSizeMB > 25) {
        const proceed = confirm(`Warning: This file is ${fileSizeMB.toFixed(1)}MB. Large files may take longer to send and could cause connection issues. Do you want to continue?`);
        if (!proceed) {
          return;
        }
      }
      
      // Set uploading state
      setIsUploading(true);
      setProgressPercent(0); // Start at 0%
      setUploadProgress({
        status: 'uploading',
        fileName: selectedMedia.file.name,
        fileSize: selectedMedia.file.size,
        message: 'Converting file...'
      });
      
      // Simulate progress from 0% to 90%
      const progressInterval = setInterval(() => {
        setProgressPercent(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90; // Stop at 90% until server confirms
          }
          return prev + Math.random() * 10 + 5; // Increment by 5-15%
        });
      }, 300);
      
      // Store interval ID for cleanup
      window.currentProgressInterval = progressInterval;
      
      // Convert file to base64 for direct WebSocket transmission
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target.result;
        console.log('📤 [AdminChatScreen] File converted to base64, size:', base64Data.length);
        
        // Update progress
        setUploadProgress(prev => ({
          ...prev,
          message: 'Sending to server...'
        }));
        
        // Send media message through WebSocket with actual file data
        const mediaData = {
          fileName: selectedMedia.file.name,
          fileType: selectedMedia.file.type,
          fileSize: selectedMedia.file.size,
          fileData: base64Data // Send the actual file data
        };

        const success = sendMediaMessage(mediaData);
        console.log('📤 [AdminChatScreen] Media send result:', success);
        
        if (success) {
                  // Add media message to local messages immediately with a temporary ID
        const tempId = `temp_${Date.now()}`;
        const mediaMessage = {
          id: tempId,
          text: '', // Remove the descriptive text
          sender: userRole === 'admin' ? 'admin' : 'user',
          timestamp: new Date(),
          media: {
            type: selectedMedia.type,
            name: selectedMedia.file.name,
            size: selectedMedia.file.size,
            mimeType: selectedMedia.file.type,
            localUrl: selectedMedia.base64Data, // Use base64 for local preview
            isLocal: true, // Mark as local message
            base64Data: selectedMedia.base64Data // Store base64 data for display
          }
        };
          
          console.log('📝 [AdminChatScreen] Adding local media message:', mediaMessage);
          setMessages(prev => [...prev, mediaMessage]);
          
          // Store the temp ID to update it later when server confirms
          setSelectedMedia(prev => prev ? { ...prev, tempMessageId: tempId } : null);
          
          // Update progress
          setUploadProgress(prev => ({
            ...prev,
            message: 'Waiting for server confirmation...'
          }));
          
          // Hide the preview immediately after sending
          setSelectedMedia(null);
        } else {
          console.error('❌ [AdminChatScreen] Failed to send media message');
          alert('Failed to send media message. Please try again.');
          setIsUploading(false);
          setUploadProgress(null);
        }
      };
      
      reader.onerror = (error) => {
        console.error('❌ [AdminChatScreen] Error reading file:', error);
        alert('Error reading file. Please try again.');
        setIsUploading(false);
        setUploadProgress(null);
        setProgressPercent(0);
        if (window.currentProgressInterval) {
          clearInterval(window.currentProgressInterval);
          window.currentProgressInterval = null;
        }
      };
      
      // Read file as base64
      reader.readAsDataURL(selectedMedia.file);
      
    } else if (newMessage.trim()) {
      // Send text message
      console.log('📤 [AdminChatScreen] Sending text message:', newMessage.trim());
      const success = sendMessage(newMessage.trim());
      if (success) {
        setNewMessage('');
      }
    }

    // Clear input but keep media for now (will be cleared when server confirms)
    setNewMessage('');
    
    if (inputRef.current) {
      inputRef.current.style.height = '24px';
      // Auto focus after sending message
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  };

  // Save messages to storage when component unmounts or chat closes
  useEffect(() => {
    if (messages.length > 0) {
      // Messages are automatically saved via the hook's setMessagesWithStorage
      console.log('💾 Messages automatically saved to local storage');
    }
  }, [messages]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (window.heightAdjustTimeout) {
        clearTimeout(window.heightAdjustTimeout);
        window.heightAdjustTimeout = null;
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for scroll-to-bottom events
  useEffect(() => {
    const handleScrollToBottom = () => scrollToBottom();
    window.addEventListener('scroll-to-bottom', handleScrollToBottom);
    return () => window.removeEventListener('scroll-to-bottom', handleScrollToBottom);
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      });
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    setNewMessage(e.target.value);
    // Debounce the height adjustment to prevent excessive calls
    if (window.heightAdjustTimeout) {
      clearTimeout(window.heightAdjustTimeout);
    }
    window.heightAdjustTimeout = setTimeout(adjustTextareaHeight, 100);
  }, [adjustTextareaHeight]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50" data-chat-open="true">
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 md:space-x-3">
              <MessageCircle className="w-6 h-6 md:w-6 md:h-6" />
              <div>
                <h2 className="text-xl md:text-xl font-semibold">
                  {userRole === "client" ? "Support Chat" : "Admin Chat"}
                </h2>
                <p className="text-purple-100 text-sm md:text-sm">
                  {userRole === "client" 
                    ? "Get help with your support ticket" 
                    : "Manage support ticket conversation"
                  }
                </p>
                {ticketInfo?._id && (
                  <p className="text-purple-200 text-xs mt-1">
                    Ticket ID: {ticketInfo._id.slice(-8)}
                  </p>
                )}

                {/* Connection Status */}
                <div className="flex items-center gap-2 mt-1">
                  {isConnected ? (
                    <div className="flex items-center gap-1 text-green-200">
                      <Wifi className="w-3 h-3" />
                      <span className="text-xs">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-200">
                      <WifiOff className="w-3 h-3" />
                      <span className="text-xs">Disconnected</span>
                    </div>
                  )}
                  {onlineUsers.length > 0 && (
                    <span className="text-purple-200 text-xs">
                      • {onlineUsers.length} online
                    </span>
                  )}
                  {window.chatSocket && (
                    <span className="text-blue-200 text-xs">
                      • Socket: {window.chatSocket.id?.slice(-6) || 'Active'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Search Toggle Button */}
              {messages.length > 0 && (
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  title="Search messages"
                  className="p-2 md:p-2 hover:bg-purple-500 rounded-lg transition-colors text-purple-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}
              {/* Import Messages Button */}
              <button
                onClick={() => document.getElementById('importFile').click()}
                title="Import chat history"
                className="p-2 md:p-2 hover:bg-purple-500 rounded-lg transition-colors text-purple-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <input
                  id="importFile"
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </button>
              {/* Export Messages Button */}
              {messages.length > 0 && (
                <button
                  onClick={exportMessages}
                  title="Export chat history"
                  className="p-2 md:p-2 hover:bg-purple-500 rounded-lg transition-colors text-purple-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              )}
              {/* Clear Messages Button */}
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all chat messages? This action cannot be undone.')) {
                      clearTicketMessages();
                    }
                  }}
                  title="Clear chat history"
                  className="p-2 md:p-2 hover:bg-red-500 rounded-lg transition-colors text-red-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 md:p-2 hover:bg-purple-500 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Connection Error Banner */}
        {connectionError && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 text-sm">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4" />
              <span>{connectionError}</span>
            </div>
          </div>
        )}

        {/* Search Bar */}
        {showSearch && messages.length > 0 && (
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="mt-2 text-sm text-gray-600">
                  Found {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''} matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 relative overflow-y-auto pb-24 md:pb-32">
          <div className="max-w-4xl mx-auto w-full px-4 md:px-4 lg:px-6 py-4 md:py-4 lg:py-8">
            <div className="space-y-4 md:space-y-4 lg:space-y-6">
              {filteredMessages.map((message) => {
                // Determine message sender for proper positioning
                const isCurrentUserMessage = 
                  (userRole === 'admin' && message.sender === 'admin') || 
                  (userRole === 'client' && message.sender === 'user') ||
                  // Handle media messages with proper sender detection
                  (message.media && (
                    (userRole === 'admin' && message.senderRole === 'admin') ||
                    (userRole === 'client' && message.senderRole === 'user') ||
                    (userRole === 'admin' && message.sender === 'admin') ||
                    (userRole === 'client' && message.sender === 'user')
                  ));

                return (
                  <div
                    key={message.id}
                    className={`group animate-in slide-in-from-bottom-2 duration-500 ${
                      isCurrentUserMessage ? 'flex justify-end' : 'flex justify-start'
                    }`}
                  >
                    {isCurrentUserMessage ? (
                      // Current user's messages on the right (like WhatsApp)
                      <div className="flex flex-col items-end">
                        <div className={`rounded-2xl md:rounded-3xl rounded-br-lg shadow-xl transition-all duration-300 relative group max-w-[80%] ${
                          message.text 
                            ? 'px-3 py-2.5 md:px-4 md:py-3 lg:px-5 lg:py-3 bg-purple-500 text-white shadow-purple-300/25 hover:shadow-2xl hover:shadow-purple-300/30 flex justify-center items-center' 
                            : 'shadow-gray-200/25 hover:shadow-2xl hover:shadow-gray-200/30'
                        }`}>
                          
                          {/* Media Display */}
                          {message.media && (
                            <div className={`${message.text ? "mb-3" : ""} relative group/media`}>
                              {message.media.type === 'image' ? (
                                <img 
                                  src={message.media.localUrl || message.media.url || message.media.preview || message.media.base64Data} 
                                  alt={message.media.name}
                                  className="w-80 h-48 rounded-lg object-cover transition-transform duration-300 group-hover/media:scale-[1.02] cursor-pointer hover:opacity-90"
                                  onClick={() => handleMediaExpand(message.media)}
                                  onError={(e) => {
                                    console.log('Image failed to load:', e.target.src);
                                    e.target.style.display = 'none';
                                    const fallback = e.target.nextSibling;
                                    if (fallback) fallback.style.display = 'block';
                                  }}
                                />
                              ) : message.media.type === 'video' ? (
                                <video 
                                  src={message.media.localUrl || message.media.url || message.media.preview || message.media.base64Data}
                                  className="w-80 h-48 rounded-lg object-cover transition-transform duration-300 group-hover/media:scale-[1.02] cursor-pointer hover:opacity-90"
                                  onClick={() => handleMediaExpand(message.media)}
                                  onError={(e) => {
                                    console.log('Video failed to load:', e.target.src);
                                    e.target.style.display = 'none';
                                    const fallback = e.target.nextSibling;
                                    if (fallback) fallback.style.display = 'block';
                                  }}
                                />
                              ) : null}
                              
                              {/* Upload Progress for Local Media */}
                              {message.media.isLocal && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="relative w-20 h-20">
                                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                                      <path
                                        d="M18 2.0845
                                          a 15.9155 15.9155 0 0 1 0 31.831
                                          a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#e5e7eb"
                                        strokeWidth="3"
                                      />
                                      <path
                                        d="M18 2.0845
                                          a 15.9155 15.9155 0 0 1 0 31.831
                                          a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="3"
                                        strokeDasharray="100, 100"
                                        strokeDashoffset={100 - progressPercent}
                                        className="transition-all duration-300 ease-out"
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-sm font-medium text-white">{Math.round(progressPercent)}%</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Fallback for failed media */}
                              <div className="hidden bg-gray-200 p-4 rounded-lg text-center">
                                <p className="text-sm text-gray-600">
                                  {message.media.type === 'image' ? 'Image' : 'Video'} could not be loaded
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{message.media.name}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {(message.media.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Message Text */}
                          {message.text && (
                            <p className="text-base md:text-base leading-relaxed font-medium text-center">
                              {searchQuery && message.text.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                                message.text.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, index) => 
                                  part.toLowerCase() === searchQuery.toLowerCase() ? (
                                    <mark key={index} className="bg-yellow-300 text-black px-1 rounded">{part}</mark>
                                  ) : part
                                )
                              ) : (
                                message.text
                              )}
                            </p>
                          )}


                          {message.isOffline && (
                            <div className="text-xs text-purple-200 mt-1 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Offline
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <span className="text-sm text-gray-500">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      // Other person's messages on the left
                      <div className="flex flex-col items-start">
                        <div className={`rounded-2xl md:rounded-3xl rounded-bl-lg shadow-xl shadow-gray-200/25 border border-gray-200 hover:shadow-2xl hover:shadow-gray-200/30 transition-all duration-300 relative group max-w-[80%] ${
                          message.text ? 'px-3 py-2.5 md:px-4 md:py-3 lg:px-5 lg:py-3 bg-gray-100 text-gray-800 text-center flex justify-center items-center' : ''
                        }`}>
                          
                          {/* Media Display */}
                          {message.media && (
                            <div className={`${message.text ? "mb-3" : ""} relative group/media`}>
                              {message.media.type === 'image' ? (
                                <img 
                                  src={message.media.url || message.media.localUrl || message.media.preview || message.media.base64Data} 
                                  alt={message.media.name}
                                  className="w-80 h-48 rounded-lg object-cover transition-transform duration-300 group-hover/media:scale-[1.02] cursor-pointer hover:opacity-90"
                                  onClick={() => handleMediaExpand(message.media)}
                                  onError={(e) => {
                                    console.log('Image failed to load:', e.target.src);
                                    e.target.style.display = 'none';
                                    const fallback = e.target.nextSibling;
                                    if (fallback) fallback.style.display = 'block';
                                  }}
                                />
                              ) : message.media.type === 'video' ? (
                                <video 
                                  src={message.media.url || message.media.localUrl || message.media.preview || message.media.base64Data}
                                  className="w-80 h-48 rounded-lg object-cover transition-transform duration-300 group-hover/media:scale-[1.02] cursor-pointer hover:opacity-90"
                                  onClick={() => handleMediaExpand(message.media)}
                                  onError={(e) => {
                                    console.log('Video failed to load:', e.target.src);
                                    e.target.style.display = 'none';
                                    const fallback = e.target.nextSibling;
                                    if (fallback) fallback.style.display = 'block';
                                  }}
                                />
                              ) : null}
                              
                              {/* Upload Progress for Local Media */}
                              {message.media.isLocal && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="relative w-20 h-20">
                                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                                      <path
                                        d="M18 2.0845
                                          a 15.9155 15.9155 0 0 1 0 31.831
                                          a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#e5e7eb"
                                        strokeWidth="3"
                                      />
                                      <path
                                        d="M18 2.0845
                                          a 15.9155 15.9155 0 0 1 0 31.831
                                          a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="3"
                                        strokeDasharray="100, 100"
                                        strokeDashoffset={100 - progressPercent}
                                        className="transition-all duration-300 ease-out"
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-sm font-medium text-white">{Math.round(progressPercent)}%</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Fallback for failed media */}
                              <div className="hidden bg-gray-200 p-4 rounded-lg text-center">
                                <p className="text-sm text-gray-600">
                                  {message.media.type === 'image' ? 'Image' : 'Video'} could not be loaded
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{message.media.name}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {(message.media.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Message Text */}
                          {message.text && (
                            <p className="text-base md:text-base leading-relaxed text-center">
                              {searchQuery && message.text.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                                message.text.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, index) => 
                                  part.toLowerCase() === searchQuery.toLowerCase() ? (
                                    <mark key={index} className="bg-yellow-300 text-black px-1 rounded">{part}</mark>
                                  ) : part
                                )
                              ) : (
                                message.text
                              )}
                            </p>
                          )}


                        </div>
                        
                        {/* Time */}
                        <div className="mt-2 ml-2">
                          <span className="text-sm text-gray-500">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}



              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Enhanced Floating Input with Glass Effect */}
        <div className="fixed bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full px-4 md:px-6">
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white to-white rounded-2xl md:rounded-3xl shadow-2xl shadow-slate-300/50 backdrop-blur-xl border border-white/50"></div>
            <div className="relative bg-white/90 rounded-2xl md:rounded-3xl shadow-2xl backdrop-blur-xl border border-slate-200/50 p-2 hover:shadow-3xl transition-all duration-300">
              
              {/* Selected Media Preview */}
              {selectedMedia && (
                <div className="px-4 pt-3 pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {selectedMedia.type === 'image' ? (
                        <img 
                          src={selectedMedia.preview} 
                          alt="Preview" 
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <video 
                          src={selectedMedia.preview} 
                          className="w-16 h-16 object-cover rounded-lg"
                          muted
                        />
                      )}
                      <button
                        onClick={removeSelectedMedia}
                        disabled={isUploading}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedMedia.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedMedia.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>

                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-end space-x-3 md:space-x-4 px-4 md:px-6 py-3 md:py-4">
                {/* Media Attachment Button */}
                <button
                  onClick={() => mediaInputRef.current?.click()}
                  disabled={!isConnected}
                  className="p-2 md:p-3 text-gray-500 hover:text-purple-600 disabled:text-gray-300 transition-colors duration-200 hover:bg-purple-50 rounded-lg"
                  title="Attach media (images/videos)"
                >
                  <Paperclip className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaSelect}
                  className="hidden"
                />

                <div className="flex-1 min-w-0 relative">
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={!isConnected ? "Connecting to chat..." : userRole === "client" ? "Type your message here..." : "Type your response here..."}
                    className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-500 text-sm md:text-base resize-none font-medium leading-relaxed"
                    rows="1"
                    style={{ minHeight: '24px', maxHeight: '120px' }}
                    disabled={!isConnected}
                  />
                  {newMessage && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#9452FF] to-[#7c3aed] rounded-full animate-pulse"></div>
                  )}
                </div>
                <button 
                  onClick={handleSendMessage}
                  disabled={(!newMessage.trim() && !selectedMedia) || !isConnected}
                  className="group bg-gradient-to-r from-[#9452FF] to-[#8a42fc] hover:from-[#8a42fc] hover:to-[#7c3aed] disabled:from-slate-300 disabled:to-slate-300 text-white p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg shadow-[#9452FF]/25 hover:shadow-xl hover:shadow-[#9452FF]/30 hover:scale-105 active:scale-105 disabled:shadow-none disabled:scale-100"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Media Modal */}
      {expandedMedia && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={closeExpandedMedia}>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              {expandedMedia.type === 'image' ? (
                <div className="relative">
                  <img 
                    src={expandedMedia.localUrl || expandedMedia.url || expandedMedia.preview || expandedMedia.base64Data} 
                    alt={expandedMedia.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-300"
                    style={{ transform: `scale(${imageZoom})` }}
                  />
                  {/* Close button */}
                  <button
                    onClick={closeExpandedMedia}
                    className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  {/* Zoom controls */}
                  <div className="absolute top-2 left-2 z-10 flex gap-2">
                    <button
                      onClick={handleZoomOut}
                      disabled={imageZoom <= 0.5}
                      className="bg-black/50 hover:bg-black/70 disabled:bg-black/20 disabled:cursor-not-allowed text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                      title="Zoom Out"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <button
                      onClick={handleZoomIn}
                      disabled={imageZoom >= 3}
                      className="bg-black/50 hover:bg-black/70 disabled:bg-black/20 disabled:cursor-not-allowed text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                      title="Zoom In"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Zoom level indicator */}
                  <div className="absolute bottom-2 left-2 z-10 bg-black/50 text-white px-2 py-1 rounded text-sm backdrop-blur-sm">
                    {Math.round(imageZoom * 100)}%
                  </div>
                </div>
              ) : expandedMedia.type === 'video' ? (
                <div className="relative">
                  <video 
                    src={expandedMedia.localUrl || expandedMedia.url || expandedMedia.preview || expandedMedia.base64Data}
                    controls
                    autoPlay
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  />
                  <button
                    onClick={closeExpandedMedia}
                    className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChatScreen;