"use client"
import React, { useEffect, useRef, useState } from "react";
import { getChatSessions, saveChatSession, getChatSession, deleteChatSession } from '../http/chatHttp.js';

// Simple markdown parser for basic formatting
const parseMarkdown = (text) => {
  if (!text) return text;
  
  // Convert **text** to <strong>text</strong>
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *text* to <em>text</em>
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert \n to <br> for line breaks
  text = text.replace(/\n/g, '<br>');
  
  return text;
};

export default function ChatBot({ isOpen, onClose, selectedChat }) {
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Hello! I'm Karla, your Damp and Mould AI Assistant. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [n8nChatInstance, setN8nChatInstance] = useState(null);
  const [sessionId, setSessionId] = useState(() => {
    // Generate proper UUID v4 format session ID
    const generateUUID = () => {
      const crypto = window.crypto || window.msCrypto;
      if (crypto && crypto.getRandomValues) {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        array[6] = (array[6] & 0x0f) | 0x40;
        array[8] = (array[8] & 0x3f) | 0x80;
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      } else {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
    };
    return generateUUID();
  });

  // Chat history state
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    
    // Disable n8n chat library for now and use direct API calls
    console.log('Using direct API calls to webhook');
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 300);
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Load chat history when component opens
  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen]);

  // Handle selected chat changes
  useEffect(() => {
    if (selectedChat && isOpen) {
      loadSelectedChat(selectedChat.sessionId);
    }
  }, [selectedChat, isOpen]);

  // Load chat history from backend
  const loadChatHistory = async () => {
    try {
      console.log('🔄 Loading chat history...');
      setIsLoadingHistory(true);
      const response = await getChatSessions();
      console.log('📥 Chat history response:', response);
      
      if (response && response.data && response.data.chatSessions) {
        console.log('✅ Chat sessions found:', response.data.chatSessions.length);
        
        // Convert timestamp strings to Date objects
        const formattedSessions = response.data.chatSessions.map(session => ({
          ...session,
          timestamp: new Date(session.timestamp)
        }));
        
        setChatHistory(formattedSessions);
      } else {
        console.log('ℹ️ No chat sessions found or invalid response');
        setChatHistory([]);
      }
    } catch (error) {
      console.error('❌ Error loading chat history:', error);
      // If user is not logged in, use empty array
      setChatHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load specific chat session
  const loadSelectedChat = async (sessionId) => {
    try {
      const response = await getChatSession(sessionId);
      if (response.success && response.data.chatSession) {
        // Convert message timestamps to Date objects
        const messagesWithDates = response.data.chatSession.messages.map(message => ({
          ...message,
          timestamp: new Date(message.timestamp)
        }));
        setMessages(messagesWithDates);
        setSessionId(sessionId);
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
      // Fallback to default message if session not found
      setMessages([
        {
          id: 1,
          type: 'bot',
          text: "Hello! I'm Karla, your Damp and Mould AI Assistant. How can I help you today?",
          timestamp: new Date()
        }
      ]);
    }
  };

  // Save chat session to backend
  const saveChatToBackend = async (title, preview) => {
    try {
      console.log('💾 Saving chat session...', { sessionId, title, preview, messageCount: messages.length });
      const response = await saveChatSession({
        sessionId,
        title,
        preview,
        messages
      });
      console.log('✅ Chat session saved successfully:', response);
      
      // Reload chat history after saving
      setTimeout(() => {
        loadChatHistory();
      }, 500);
    } catch (error) {
      console.error('❌ Error saving chat session:', error);
      // Continue without saving if user is not logged in
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const startNewChat = () => {
    // Generate new session ID with proper UUID v4 format
    const generateUUID = () => {
      const crypto = window.crypto || window.msCrypto;
      if (crypto && crypto.getRandomValues) {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        array[6] = (array[6] & 0x0f) | 0x40;
        array[8] = (array[8] & 0x3f) | 0x80;
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      } else {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
    };
    
    // Clear messages and set new session
    setMessages([
      {
        id: 1,
        type: 'bot',
        text: "Hello! I'm Karla, your Damp and Mould AI Assistant. How can I help you today?",
        timestamp: new Date()
      }
    ]);
    setSessionId(generateUUID());
    setInputMessage('');
    setIsLoading(false);
    setIsTyping(false);
    setShowChatHistory(false);
    
    // Focus on textarea after reset
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  const handleShowChatHistory = () => {
    console.log('📋 Opening chat history...');
    setShowChatHistory(true);
    // Reload chat history when opening modal
    loadChatHistory();
  };

  const handleCloseChatHistory = () => {
    setShowChatHistory(false);
  };

  const handleSelectChat = (chat) => {
    loadSelectedChat(chat.sessionId);
    setShowChatHistory(false);
    
    // Focus on textarea after loading chat
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  const formatDate = (date) => {
    // Convert string to Date object if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Unknown date';
    }
    
    const now = new Date();
    const diffTime = Math.abs(now - dateObj);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return dateObj.toLocaleDateString();
  };

  const formatMessageTime = (timestamp) => {
    // Convert string to Date object if needed
    const dateObj = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    
    // Check if date is valid
    if (!dateObj || isNaN(dateObj.getTime())) {
      return '--:--';
    }
    
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const currentMessage = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Auto-save chat session after user message
    if (messages.length === 1) { // First user message
      const title = currentMessage.length > 50 ? currentMessage.substring(0, 50) + '...' : currentMessage;
      const preview = currentMessage;
      saveChatToBackend(title, preview);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      // Auto focus after sending message
      setTimeout(() => {
        textareaRef.current.focus();
      }, 100);
    }

    try {
      // Direct API call to webhook
      console.log('Making direct API call to webhook...');
      
      const webhookUrl = "https://mannanr.app.n8n.cloud/webhook/a889d2ae-2159-402f-b326-5f61e90f602e/chat";
      console.log('Webhook URL:', webhookUrl);
      
      // Use the correct payload format as specified
      const payload = {
        action: "sendMessage",
        sessionId: sessionId,
        chatInput: currentMessage
      };

      try {
        console.log('Sending payload:', payload);
        console.log('Making request to:', webhookUrl);
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        console.log(`Response status: ${response.status}`);
        console.log(`Response URL: ${response.url}`);

        if (response.ok) {
          let data;
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const textResponse = await response.text();
            data = { response: textResponse };
          }
          
          console.log('Response data:', data);
          
          const botMessage = {
            id: Date.now() + 1,
            type: 'bot',
            text: data.output || data.response || data.message || data.text || "Thank you for your message. I'm here to help you with any questions you may have.",
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, botMessage]);
          setIsLoading(false);
          setIsTyping(false);
          
          // Update chat session with new messages
          if (messages.length > 0) {
            const title = messages[1]?.text?.length > 50 ? messages[1].text.substring(0, 50) + '...' : messages[1]?.text || 'New Chat';
            const preview = messages[1]?.text || 'New conversation with Karla';
            saveChatToBackend(title, preview);
          }
          
          // Auto focus after receiving response
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }, 200);
        } else {
          const errorText = await response.text();
          console.error(`Request failed with status ${response.status}:`, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      } catch (error) {
        console.error('Request failed:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // More specific error handling
      let errorMessage = "I'm sorry, I'm having trouble connecting right now. Please try again later.";
      
      if (error.message.includes('HTTP 500')) {
        errorMessage = "The AI service is temporarily unavailable. Please try again in a moment.";
      } else if (error.message.includes('HTTP 404')) {
        errorMessage = "The chat service endpoint was not found. Please contact support.";
      } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
        errorMessage = "Network connection issue. Please check your internet connection and try again.";
      }
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: errorMessage,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
      setIsTyping(false);
      
      // Auto focus after error response
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 200);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 z-50 flex flex-col animate-in fade-in duration-300">
      {/* Enhanced Header with Glass Effect */}
      <div className="relative bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
        <div className="relative p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div>
              <h1 className="text-lg md:text-2xl font-bold tracking-tight drop-shadow-sm">Karla</h1>
              <p className="text-amber-100 text-xs md:text-sm font-medium">
                {selectedChat ? `Continuing: ${selectedChat.title}` : 'Damp & Mould AI Assistant'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3">
            <button
              onClick={handleShowChatHistory}
              className="group bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10 hover:scale-105 active:scale-95 shadow-lg"
              title="Chat History"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5 text-white mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-white text-xs md:text-sm font-medium hidden md:block">History</span>
            </button>
            <button
              onClick={startNewChat}
              className="group bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10 hover:scale-105 active:scale-95 shadow-lg"
              title="Start New Chat"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5 text-white mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-white text-xs md:text-sm font-medium hidden md:block">New Chat</span>
            </button>
            <button
              onClick={onClose}
              className="group bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl w-10 h-10 md:w-12 md:h-12 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10 hover:scale-105 active:scale-95 shadow-lg"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6 text-white transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Enhanced Chat Container */}
      <div className="flex-1 relative overflow-y-auto pb-24 md:pb-32">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
          <div className="space-y-4 md:space-y-6">
            {messages.map((message, index) => (
              <div key={message.id} className={`group animate-in slide-in-from-bottom-2 duration-500 ${message.type === 'user' ? 'flex justify-end' : 'flex justify-start'}`} style={{ animationDelay: `${index * 100}ms` }}>
                {message.type === 'user' ? (
                  <div className="max-w-[85%] md:max-w-[80%] relative">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 md:px-6 py-3 md:py-4 rounded-2xl md:rounded-3xl rounded-br-lg shadow-xl shadow-amber-500/25 hover:shadow-2xl hover:shadow-amber-500/30 transition-all duration-300 relative group">
                      <p className="text-sm md:text-base leading-relaxed font-medium">{message.text}</p>
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-orange-400/20 rounded-2xl md:rounded-3xl rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <span className="text-xs text-gray-500 px-2">
                        {formatMessageTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[90%] md:max-w-[85%] w-full">
                    <div className="group relative">
                      <div className="bg-white rounded-2xl md:rounded-3xl rounded-bl-lg p-4 md:p-6 shadow-xl shadow-slate-200/50 border border-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 backdrop-blur-sm">
                        <div className="text-slate-800 text-sm md:text-base leading-relaxed">
                          <div 
                            className="whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.text) }}
                          />
                        </div>
                        <button
                          onClick={() => copyToClipboard(message.text)}
                          className="absolute top-2 md:top-4 right-2 md:right-4 opacity-0 group-hover:opacity-100 bg-slate-100 hover:bg-slate-200 rounded-lg p-1.5 md:p-2 transition-all duration-200 hover:scale-105"
                          title="Copy message"
                        >
                          <svg className="w-3 h-3 md:w-4 md:h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center justify-end mt-2 space-x-2">
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(message.timestamp)}
                        </span>
                        <div className="px-3 py-1 md:px-4 md:py-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs md:text-sm font-bold">Karla</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {(isLoading || isTyping) && (
              <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                <div className="max-w-[90%] md:max-w-[85%] w-full">
                  <div className="bg-white rounded-2xl md:rounded-3xl rounded-bl-lg p-4 md:p-6 shadow-xl shadow-slate-200/50 border border-slate-200/50 backdrop-blur-sm">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-bounce shadow-sm"></div>
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-slate-500 text-xs md:text-sm font-medium">Karla is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Enhanced Floating Input with Glass Effect */}
      <div className="fixed bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-4xl px-4 md:px-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white to-white rounded-2xl md:rounded-3xl shadow-2xl shadow-slate-300/50 backdrop-blur-xl border border-white/50"></div>
          <div className="relative bg-white/90 rounded-2xl md:rounded-3xl shadow-2xl backdrop-blur-xl border border-slate-200/50 p-2 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-end space-x-3 md:space-x-4 px-4 md:px-6 py-3 md:py-4">
              <div className="flex-1 min-w-0 relative">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    adjustTextareaHeight();
                  }}
                  placeholder="Ask Karla anything about damp & mould..."
                  className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-500 text-sm md:text-base resize-none font-medium leading-relaxed"
                  rows="1"
                  style={{ minHeight: '24px', maxHeight: '120px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={isLoading}
                />
                {inputMessage && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <button 
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="group bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-300 disabled:to-slate-300 text-white p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-105 active:scale-95 disabled:shadow-none disabled:scale-100"
              >
                {isLoading ? (
                  <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat History Modal */}
      {showChatHistory && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] pointer-events-none"></div>
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="min-w-[0] max-w-[95vw] w-full sm:w-[700px] lg:w-[800px] bg-white rounded-3xl shadow-2xl pointer-events-auto flex flex-col mx-2 sm:mx-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 sm:p-8 m-0">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold">Chat History</h2>
                    <p className="text-sm opacity-90">Select a previous chat or start new conversation</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseChatHistory}
                  className="bg-white/10 hover:bg-white/20 text-white transition-all p-3 rounded-full shadow-lg hover:scale-105 active:scale-95"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="w-full bg-white p-6 sm:p-8 flex flex-col gap-6 pointer-events-auto max-h-[70vh] overflow-y-auto">
                
                {/* New Chat Button */}
                <button
                  onClick={startNewChat}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-lg">Start New Chat</span>
                </button>

                {/* Chat History List */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 mb-4">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-700">Recent Chats</h3>
                  </div>
                  
                  {isLoadingHistory ? (
                    <div className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Loading chat history...</p>
                    </div>
                  ) : (
                                        chatHistory.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => handleSelectChat(chat)}
                        className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 transition-all group shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                              <h4 className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors truncate">
                                {chat.title}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                              {chat.preview}
                            </p>
                          </div>
                          <div className="text-xs text-gray-400 ml-3 flex-shrink-0 bg-gray-100 px-2 py-1 rounded-full">
                            {formatDate(chat.timestamp)}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* No chats message */}
                {chatHistory.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-xl font-medium text-gray-700 mb-2">No previous chats</p>
                    <p className="text-sm text-gray-500">Start your first conversation with Karla</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}