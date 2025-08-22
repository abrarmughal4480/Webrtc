"use client"
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, User, Shield, Clock, MessageCircle, Wifi, WifiOff } from 'lucide-react';
import { useUser } from '@/provider/UserProvider';
import useChatSocket from '@/hooks/useChatSocket';

const AdminChatScreen = ({ isOpen, onClose, ticketInfo }) => {
  const { user } = useUser();
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Use WebSocket chat hook
  const {
    isConnected,
    connectionError,
    messages,
    setMessages,
    onlineUsers,
    sendMessage,
    markMessageAsRead,
    getTicketInfo,
    clearTicketMessages,
    exportMessages
  } = useChatSocket(ticketInfo?._id);

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
      allMessages: messages
    });
  }, [messages]);

  // Initialize messages based on auto-detected user role - ONLY ONCE
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

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // If not connected, queue the message locally
    if (!isConnected) {
      const offlineMessage = {
        id: `offline_${Date.now()}`,
        text: newMessage.trim(),
        sender: userRole === 'admin' ? 'admin' : 'user',
        timestamp: new Date(),
        isOffline: true,
        pending: true
      };
      
      setMessages(prev => [...prev, offlineMessage]);
      setNewMessage('');
      
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

    const success = sendMessage(newMessage.trim());
    if (success) {
      setNewMessage('');
      
      if (inputRef.current) {
        inputRef.current.style.height = '24px';
        // Auto focus after sending message
        setTimeout(() => {
          inputRef.current.focus();
        }, 100);
      }

      // No auto-response - let admins respond manually
    }
  };

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
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`group animate-in slide-in-from-bottom-2 duration-500 ${
                    // For admin view: admin messages on right (like their own), client messages on left
                    // For client view: client messages on right (like their own), admin messages on left
                    (userRole === 'admin' && message.sender === 'admin') || 
                    (userRole === 'client' && message.sender === 'user') 
                      ? 'flex justify-end' : 'flex justify-start'
                  }`}
                >
                  {(userRole === 'admin' && message.sender === 'admin') || 
                   (userRole === 'client' && message.sender === 'user') ? (
                    // Current user's messages on the right (admin's own messages or client's own messages)
                    <div className="flex justify-end">
                      <div className={`px-3 py-2.5 md:px-4 md:py-3 lg:px-5 lg:py-3 rounded-2xl md:rounded-3xl rounded-br-lg shadow-xl transition-all duration-300 relative group max-w-[80%] ${
                        userRole === 'admin' 
                          ? 'bg-purple-600 text-white shadow-purple-600/25 hover:shadow-2xl hover:shadow-purple-600/30' 
                          : 'bg-purple-600 text-white shadow-purple-600/25 hover:shadow-2xl hover:shadow-purple-600/30'
                      }`}>
                        <p className="text-base md:text-base leading-relaxed font-medium text-left">
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
                        {message.isOffline && (
                          <div className="text-xs text-purple-200 mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Offline
                          </div>
                        )}
                        <div className="absolute inset-0 bg-purple-500/20 rounded-2xl md:rounded-3xl rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <div className="flex justify-end mt-2 md:mt-2 ml-2">
                        <span className="text-sm text-gray-500">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // Other person's messages on the left
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-800 px-3 py-2.5 md:px-4 md:py-3 lg:px-5 lg:py-3 rounded-2xl md:rounded-3xl rounded-bl-lg shadow-xl shadow-gray-200/25 border border-gray-200 hover:shadow-2xl hover:shadow-gray-200/30 transition-all duration-300 relative group max-w-[80%]">
                        <p className="text-base md:text-base leading-relaxed text-left">
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
                      </div>
                      
                      {/* Time */}
                      <div className="flex items-center mt-2 md:mt-2 ml-2">
                        <span className="text-sm text-gray-500">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}



              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Enhanced Floating Input with Glass Effect */}
        <div className="fixed bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full px-4 md:px-6">
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white to-white rounded-2xl md:rounded-3xl shadow-2xl shadow-slate-300/50 backdrop-blur-xl border border-white/50"></div>
            <div className="relative bg-white/90 rounded-2xl md:rounded-3xl shadow-2xl backdrop-blur-xl border border-slate-200/50 p-2 hover:shadow-3xl transition-all duration-300">
              <div className="flex items-end space-x-3 md:space-x-4 px-4 md:px-6 py-3 md:py-4">
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
                                      disabled={!newMessage.trim() || !isConnected}
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
    </div>
  );
};

export default AdminChatScreen;
