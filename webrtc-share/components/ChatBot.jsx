"use client"
import React, { useEffect, useRef, useState } from "react";

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

export default function ChatBot({ isOpen, onClose }) {
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
  const [sessionId] = useState(() => {
    // Generate UUID format session ID
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    return generateUUID();
  });

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
              <p className="text-amber-100 text-xs md:text-sm font-medium">Damp & Mould AI Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="group bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl w-10 h-10 md:w-12 md:h-12 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10 hover:scale-105 active:scale-95"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 text-white transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                      <div className="flex items-center mt-2 space-x-2">
                        <div className="px-3 py-1 md:px-4 md:py-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs md:text-sm font-bold">Karla</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
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
    </div>
  );
}