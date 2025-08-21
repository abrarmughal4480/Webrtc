"use client"
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, User, Shield, Clock, MessageCircle } from 'lucide-react';

const AdminChatScreen = ({ isOpen, onClose, ticketInfo }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm here to help you with your support ticket. How can I assist you today?",
      sender: 'admin',
      timestamp: new Date(Date.now() - 60000)
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    // Simulate admin response
    setTimeout(() => {
      const adminMessage = {
        id: Date.now() + 1,
        text: "Thank you for your message. I'll review your ticket and get back to you shortly.",
        sender: 'admin',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, adminMessage]);
      setIsTyping(false);
    }, 2000);
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
    <div className="fixed inset-0 bg-white z-50">
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3">
              <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
              <div>
                <h2 className="text-lg md:text-xl font-semibold">Admin Chat</h2>
                <p className="text-purple-100 text-xs md:text-sm">Get help with your support ticket</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 md:p-2 hover:bg-purple-500 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Ticket Info Bar */}
        {ticketInfo && (
          <div className="bg-gray-50 border-b border-gray-200 p-3 md:p-4">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-purple-600 rounded-full"></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 text-sm md:text-base truncate">Ticket #{ticketInfo._id?.slice(-6) || 'N/A'}</h3>
                <p className="text-xs md:text-sm text-gray-600 truncate">{ticketInfo.subject || 'Support Request'}</p>
              </div>
              <div className="flex items-center space-x-1 md:space-x-2 text-xs text-gray-500 flex-shrink-0">
                <Clock className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{ticketInfo.createdAt ? new Date(ticketInfo.createdAt).toLocaleDateString() : 'N/A'}</span>
                <span className="sm:hidden">{ticketInfo.createdAt ? new Date(ticketInfo.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 relative overflow-y-auto pb-20 md:pb-32">
          <div className="max-w-4xl mx-auto w-full px-3 md:px-4 lg:px-6 py-3 md:py-4 lg:py-8">
            <div className="space-y-3 md:space-y-4 lg:space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`group animate-in slide-in-from-bottom-2 duration-500 ${
                    message.sender === 'user' ? 'flex justify-end' : 'flex justify-start'
                  }`}
                >
                  {message.sender === 'user' ? (
                    <div className="max-w-[75%] sm:max-w-[70%] md:max-w-[60%] lg:max-w-[55%] relative">
                      <div className="bg-orange-500 text-white px-3 py-2.5 md:px-4 md:py-3 lg:px-6 lg:py-4 rounded-2xl md:rounded-3xl rounded-br-lg shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 relative group">
                        <p className="text-sm md:text-base leading-relaxed font-medium">{message.text}</p>
                        <div className="absolute inset-0 bg-orange-400/20 rounded-2xl md:rounded-3xl rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <div className="flex justify-end mt-1.5 md:mt-2">
                        <span className="text-xs text-gray-500 px-1.5 md:px-2">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[85%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[65%] w-full">
                      <div className="group relative">
                        <div className="bg-gradient-to-br from-[#9452FF] via-[#8a42fc] to-[#7c3aed] text-white rounded-2xl md:rounded-3xl rounded-bl-lg p-3 md:p-4 lg:p-6 shadow-xl shadow-[#9452FF]/25 border border-[#8a42fc]/50 hover:shadow-2xl hover:shadow-[#9452FF]/30 transition-all duration-300 backdrop-blur-sm">
                          <div className="text-white text-sm md:text-base leading-relaxed">
                            <p className="whitespace-pre-wrap">{message.text}</p>
                          </div>
                        </div>
                        
                        {/* Time and Admin badge */}
                        <div className="flex items-center justify-end mt-1.5 md:mt-2">
                          <div className="flex items-center space-x-1.5 md:space-x-2">
                            <span className="text-xs text-gray-500">
                              {formatTime(message.timestamp)}
                            </span>
                            <div className="px-2 py-0.5 md:px-3 md:py-1 lg:px-4 lg:py-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs md:text-sm font-bold">Admin</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                  <div className="max-w-[85%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[65%] w-full">
                    <div className="bg-gradient-to-br from-[#9452FF] via-[#8a42fc] to-[#7c3aed] rounded-2xl md:rounded-3xl rounded-bl-lg p-3 md:p-4 lg:p-6 shadow-2xl shadow-[#9452FF]/40 border border-[#8a42fc]/50 backdrop-blur-sm">
                      <div className="flex items-center space-x-2 md:space-x-3">
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 md:w-2 md:h-2 lg:w-3 lg:h-3 bg-gradient-to-r from-[#9452FF] via-[#8a42fc] to-[#7c3aed] rounded-full animate-bounce shadow-lg shadow-[#9452FF]/50"></div>
                          <div className="w-1.5 h-1.5 md:w-2 md:h-2 lg:w-3 lg:h-3 bg-gradient-to-r from-[#9452FF] via-[#8a42fc] to-[#7c3aed] rounded-full animate-bounce shadow-lg shadow-[#9452FF]/50" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-1.5 h-1.5 md:w-2 md:h-2 lg:w-3 lg:h-3 bg-gradient-to-r from-[#9452FF] via-[#8a42fc] to-[#7c3aed] rounded-full animate-bounce shadow-lg shadow-[#9452FF]/50" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-white text-xs md:text-sm">Admin is typing...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Floating Input Section */}
        <div className="fixed bottom-0 left-0 right-0 p-3 md:p-4">
          <div className="max-w-4xl mx-auto w-full px-3 md:px-4">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white text-sm md:text-base"
                  rows="1"
                />
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="w-10 h-10 md:w-12 md:h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChatScreen;
