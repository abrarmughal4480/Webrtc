"use client"
import React, { useEffect, useRef, useState } from "react";
import { getChatSessions, saveChatSession, getChatSession, deleteChatSession, updateChatSessionTitle, updateMessageFeedback } from '../http/chatHttp.js';
import { useUser } from '../provider/UserProvider.js';
import { toast } from "sonner";
import { createPortal } from 'react-dom';
import { registerResidentRequest, loginRequest, verifyRequest } from '../http/authHttp.js';
import { X, Loader2 } from 'lucide-react';

// Enhanced markdown parser for comprehensive formatting
const parseMarkdown = (text) => {
  if (!text) return text;
  
  // Convert #### headings to <h4>text</h4>
  text = text.replace(/^####\s+(.+)$/gm, '<h4 class="text-lg font-semibold text-gray-800 mb-2">$1</h4>');
  
  // Convert ### headings to <h3>text</h3>
  text = text.replace(/^###\s+(.+)$/gm, '<h3 class="text-xl font-bold text-gray-900 mb-3">$1</h3>');
  
  // Convert ## headings to <h2>text</h2>
  text = text.replace(/^##\s+(.+)$/gm, '<h2 class="text-2xl font-bold text-gray-900 mb-4">$1</h2>');
  
  // Convert # headings to <h1>text</h1>
  text = text.replace(/^#\s+(.+)$/gm, '<h1 class="text-3xl font-bold text-gray-900 mb-5">$1</h1>');
  
  // Convert **text** to <strong>text</strong>
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  
  // Convert *text* to <em>text</em>
  text = text.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  
  // Convert `code` to <code>code</code>
  text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
  
  // Convert \n to <br> for line breaks
  text = text.replace(/\n/g, '<br>');
  
  return text;
};

// AI Title Generator - Creates smart titles for chat sessions
const generateAITitle = (message) => {
  console.log('🎯 [generateAITitle] Input message:', message);
  if (!message || typeof message !== 'string') {
    console.log('🎯 [generateAITitle] Invalid message, returning default');
    return 'New Chat';
  }
  
  const text = message.toLowerCase().trim();
  
  // List of greeting words/phrases that should not get titles
  const greetingWords = [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    'how are you', 'how do you do', 'nice to meet you', 'pleasure to meet you',
    'greetings', 'salutations', 'what\'s up', 'sup', 'yo', 'good day',
    'morning', 'afternoon', 'evening', 'night', 'good night', 'bye',
    'goodbye', 'see you', 'take care', 'have a good day', 'have a nice day',
    'thanks', 'thank you', 'appreciate it', 'thanks a lot', 'thank you so much'
  ];
  
  // Check if message is just a greeting
  const isGreeting = greetingWords.some(greeting => 
    text.includes(greeting) || text === greeting
  );
  
  if (isGreeting) {
    return 'New Chat';
  }
  
  // Extract key words for title generation
  const words = text.split(' ').filter(word => word.length > 2);
  
  if (words.length === 0) return 'New Chat';
  
  // Create a smart title based on the message content
  let title = '';
  
  // Check for specific topics
  if (text.includes('damp') || text.includes('mould') || text.includes('mold')) {
    title = 'Damp & Mould Discussion';
  } else if (text.includes('problem') || text.includes('issue') || text.includes('help')) {
    title = 'Problem Discussion';
  } else if (text.includes('question') || text.includes('ask') || text.includes('what') || text.includes('how') || text.includes('why')) {
    title = 'Question & Answer';
  } else if (text.includes('advice') || text.includes('suggestion') || text.includes('recommend')) {
    title = 'Advice & Recommendations';
  } else if (text.includes('treatment') || text.includes('solution') || text.includes('fix')) {
    title = 'Treatment & Solutions';
  } else if (text.includes('prevention') || text.includes('prevent') || text.includes('avoid')) {
    title = 'Prevention Tips';
  } else if (text.includes('symptom') || text.includes('sign') || text.includes('indicator')) {
    title = 'Symptoms & Signs';
  } else if (text.includes('cause') || text.includes('reason') || text.includes('why')) {
    title = 'Causes & Reasons';
  } else if (text.includes('test') || text.includes('check') || text.includes('inspect')) {
    title = 'Testing & Inspection';
  } else if (text.includes('professional') || text.includes('expert') || text.includes('specialist')) {
    title = 'Professional Advice';
  } else {
    // Generate a generic title from the first few meaningful words
    const meaningfulWords = words.slice(0, 3).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    );
    title = meaningfulWords.join(' ') + ' Discussion';
  }
  
  // Limit title length
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }
  
  console.log('🎯 [generateAITitle] Generated title:', title);
  return title;
};

// Check if message is a greeting
const isGreetingMessage = (message) => {
  if (!message || typeof message !== 'string') return true;
  
  const text = message.toLowerCase().trim();
  
  const greetingWords = [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    'how are you', 'how do you do', 'nice to meet you', 'pleasure to meet you',
    'greetings', 'salutations', 'what\'s up', 'sup', 'yo', 'good day',
    'morning', 'afternoon', 'evening', 'night', 'good night', 'bye',
    'goodbye', 'see you', 'take care', 'have a good day', 'have a nice day',
    'thanks', 'thank you', 'appreciate it', 'thanks a lot', 'thank you so much'
  ];
  
  return greetingWords.some(greeting => 
    text.includes(greeting) || text === greeting
  );
};

export default function ChatBot({ isOpen, onClose, selectedChat }) {
  const { isAuth, loadMe, user } = useUser();
  console.log('🔍 [ChatBot] Component rendered with:', { isAuth, user });
  
  // Helper function to safely access localStorage
  const safeLocalStorage = {
    getItem: (key) => {
      if (typeof window !== 'undefined') {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.error('Error accessing localStorage:', error);
          return null;
        }
      }
      return null;
    },
    setItem: (key, value) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('Error setting localStorage:', error);
        }
      }
    },
    removeItem: (key) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing from localStorage:', error);
        }
      }
    }
  };
  
  const textareaRef = useRef(null);
  const saveInProgressRef = useRef(false);
  const messagesEndRef = useRef(null);
  const canvasRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Ask me anything about damp and mould",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [n8nChatInstance, setN8nChatInstance] = useState(null);
  // Generate proper UUID v4 format session ID - Safe for SSR
  const generateUUID = () => {
    // Check if we're in the browser environment
    if (typeof window !== 'undefined') {
      const crypto = window.crypto || window.msCrypto;
      if (crypto && crypto.getRandomValues) {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        array[6] = (array[6] & 0x0f) | 0x40;
        array[8] = (array[8] & 0x3f) | 0x80;
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      }
    }
    
    // Fallback for SSR or when crypto is not available
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const [sessionId, setSessionId] = useState('temp-session-id');

  // Initialize session ID on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSessionId(generateUUID());
    }
  }, []);

  // Chat history state
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Edit state
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  
  // New chat confirmation dialog state
  const [showNewChatConfirmation, setShowNewChatConfirmation] = useState(false);
  
  // Pending chat save state
  const [pendingChatSave, setPendingChatSave] = useState(null);

  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);

  // Save Chat popup state
  const [showSaveChatPopup, setShowSaveChatPopup] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(true);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isAuthInProgress, setIsAuthInProgress] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [otpBlocks, setOtpBlocks] = useState(['', '', '', '']);
  const otpInputRefs = useRef([]);

  // Manual migration function for debugging
  const triggerMigration = async () => {
    console.log('🔧 Manual migration triggered');
    const localChats = JSON.parse(safeLocalStorage.getItem('localChatHistory') || '[]');
    console.log('📥 Current localStorage chats:', localChats);
    
    if (localChats.length === 0) {
      alert('No chats found in localStorage to migrate');
      return;
    }
    
    // Test the saveChatSession function first
    try {
      console.log('🧪 Testing saveChatSession function...');
      const testResponse = await saveChatSession({
        sessionId: generateUUID(),
        title: 'Test Migration Chat',
        preview: 'Test preview',
        messages: [{ id: '1', type: 'user', text: 'Test message', timestamp: new Date() }]
      });
      console.log('🧪 Test saveChatSession response:', testResponse);
      console.log('🧪 Response type:', typeof testResponse);
      console.log('🧪 Response keys:', Object.keys(testResponse || {}));
    } catch (error) {
      console.error('🧪 Test saveChatSession error:', error);
    }
    
    // Call the migration function directly
    const migrateLocalStorageChats = async () => {
      if (isAuth && !isMigrating) {
        try {
          setIsMigrating(true);
          console.log('🔄 Checking for localStorage chats to migrate...');
          
          // Get localStorage chats
          const localChats = JSON.parse(localStorage.getItem('localChatHistory') || '[]');
          console.log('📥 localStorage chats found:', localChats);
          
          if (localChats.length === 0) {
            console.log('ℹ️ No localStorage chats to migrate');
            setIsMigrating(false);
            return;
          }
          
          console.log(`📥 Found ${localChats.length} localStorage chats to migrate`);
          
          let migratedCount = 0;
          let failedCount = 0;
          
          // Migrate each chat to database
          for (const localChat of localChats) {
            try {
              console.log(`🔄 Migrating chat: ${localChat.title}`);
              console.log('📤 Chat data to migrate:', localChat);
              
              // Generate a new session ID to avoid conflicts
              const newSessionId = generateUUID();
              console.log('🆔 New session ID generated:', newSessionId);
              
              // Save chat to backend with new session ID
              const response = await saveChatSession({
                sessionId: newSessionId,
                title: localChat.title,
                preview: localChat.preview,
                messages: localChat.messages
              });
              
              console.log('📥 saveChatSession response:', response);
              
              if (response && response.success) {
                console.log(`✅ Successfully migrated: ${localChat.title}`);
                migratedCount++;
              } else {
                console.log(`❌ Failed to migrate: ${localChat.title}`, response);
                failedCount++;
              }
            } catch (error) {
              console.error(`❌ Error migrating chat ${localChat.title}:`, error);
              failedCount++;
            }
          }
          
          // Clear localStorage after migration attempt
          if (migratedCount > 0) {
            localStorage.removeItem('localChatHistory');
            console.log(`✅ Migration complete: ${migratedCount} chats migrated, ${failedCount} failed`);
            
            // Show success message to user
            if (migratedCount > 0) {
              toast.success("you previous chat are saved");
            }
            
            // Reload chat history to show migrated chats
            setTimeout(() => {
              loadChatHistory();
            }, 500);
          } else if (failedCount > 0) {
            console.log(`❌ Migration failed for all ${failedCount} chats`);
            alert('Failed to migrate chats to cloud. They will remain in local storage.');
          }
          
        } catch (error) {
          console.error('❌ Error during localStorage migration:', error);
        } finally {
          setIsMigrating(false);
        }
      } else {
        console.log('❌ Cannot migrate: isAuth =', isAuth, 'isMigrating =', isMigrating);
        alert('Cannot migrate: User not authenticated or migration already in progress');
      }
    };
    
    await migrateLocalStorageChats();
  };

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    
    // Using LangChain API for chatbot functionality
    console.log('Using LangChain API for chatbot functionality');
    
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
    console.log('🔄 [ChatBot] useEffect triggered for chat history load:', { isOpen, isAuth });
    if (isOpen && isAuth) {
      console.log('🔄 [ChatBot] Loading chat history...');
      loadChatHistory();
    } else {
      console.log('🔄 [ChatBot] Skipping chat history load:', { isOpen, isAuth });
    }
  }, [isOpen, isAuth]);

  // Handle selected chat changes
  useEffect(() => {
    if (selectedChat && isOpen) {
      loadSelectedChat(selectedChat.sessionId);
    }
  }, [selectedChat, isOpen]);

  // Handle pending chat save after successful login
  useEffect(() => {
    const savePendingChat = async () => {
      if (isAuth && pendingChatSave && isOpen) {
        try {
          console.log('🔄 Saving pending chat after successful login...');
          
          // Use the stored chat data instead of current state
          const response = await saveChatSession({
            sessionId: pendingChatSave.sessionId,
            title: pendingChatSave.title,
            preview: pendingChatSave.preview,
            messages: pendingChatSave.messages
          });
          
          if (response) {
            console.log('✅ Pending chat saved successfully after login');
            
            // Reload chat history to show the saved chat
            setTimeout(() => {
              loadChatHistory();
            }, 500);
            
            // Clear pending save and proceed with new chat
            setPendingChatSave(null);
            proceedWithNewChat();
          } else {
            console.log('ℹ️ Pending chat save failed');
            setPendingChatSave(null);
          }
        } catch (error) {
          console.error('❌ Error saving pending chat after login:', error);
          setPendingChatSave(null);
        }
      }
    };

    // Add a small delay to ensure login process is complete
    const timeoutId = setTimeout(savePendingChat, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [isAuth]); // Only trigger when authentication state changes

  // Migrate localStorage chats to database when user logs in
  useEffect(() => {
    const migrateLocalStorageChats = async () => {
      console.log('🔄 Migration useEffect triggered - isAuth:', isAuth, 'isOpen:', isOpen, 'isMigrating:', isMigrating);
      
      if (isAuth && isOpen && !isMigrating) {
        try {
          setIsMigrating(true);
          console.log('🔄 Checking for localStorage chats to migrate...');
          
          // Get localStorage chats
          const localChats = JSON.parse(localStorage.getItem('localChatHistory') || '[]');
          console.log('📥 localStorage chats found:', localChats);
          
          if (localChats.length === 0) {
            console.log('ℹ️ No localStorage chats to migrate');
            setIsMigrating(false);
            return;
          }
          
          console.log(`📥 Found ${localChats.length} localStorage chats to migrate`);
          
          let migratedCount = 0;
          let failedCount = 0;
          
          // Migrate each chat to database
          for (const localChat of localChats) {
            try {
              console.log(`🔄 Migrating chat: ${localChat.title}`);
              console.log('📤 Chat data to migrate:', localChat);
              
              // Generate a new session ID to avoid conflicts
              const newSessionId = generateUUID();
              console.log('🆔 New session ID generated:', newSessionId);
              
              // Save chat to backend with new session ID
              const response = await saveChatSession({
                sessionId: newSessionId,
                title: localChat.title,
                preview: localChat.preview,
                messages: localChat.messages
              });
              
              console.log('📥 saveChatSession response:', response);
              
              if (response && response.success) {
                console.log(`✅ Successfully migrated: ${localChat.title}`);
                migratedCount++;
              } else {
                console.log(`❌ Failed to migrate: ${localChat.title}`, response);
                failedCount++;
              }
            } catch (error) {
              console.error(`❌ Error migrating chat ${localChat.title}:`, error);
              failedCount++;
            }
          }
          
          // Clear localStorage after migration attempt
          if (migratedCount > 0) {
            localStorage.removeItem('localChatHistory');
            console.log(`✅ Migration complete: ${migratedCount} chats migrated, ${failedCount} failed`);
            
            // Show success message to user
            if (migratedCount > 0) {
                 toast.success("you previous chat are saved");
            }
            
            // Reload chat history to show migrated chats
            setTimeout(() => {
              loadChatHistory();
            }, 500);
          } else if (failedCount > 0) {
            console.log(`❌ Migration failed for all ${failedCount} chats`);
            alert('Failed to migrate chats to cloud. They will remain in local storage.');
          }
          
        } catch (error) {
          console.error('❌ Error during localStorage migration:', error);
        } finally {
          setIsMigrating(false);
        }
      }
    };

    // Add a delay to ensure login process is complete and after pending chat save
    const timeoutId = setTimeout(migrateLocalStorageChats, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [isAuth, isOpen]); // Trigger when authentication state or chat open state changes

  // Header Neural Network Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    
    // Only add event listener if we're in the browser
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', resizeCanvas);
    }

    // Node class for neural network
    class Node {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.radius = Math.random() * 1.5 + 0.8;
        this.connections = [];
        this.pulse = Math.random() * Math.PI * 2;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.pulse += 0.06;

        // Bounce off edges
        if (this.x <= 0 || this.x >= canvas.width) this.vx *= -1;
        if (this.y <= 0 || this.y >= canvas.height) this.vy *= -1;

        // Keep within bounds
        this.x = Math.max(0, Math.min(canvas.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height, this.y));
      }

      draw() {
        const alpha = 0.6 + 0.4 * Math.sin(this.pulse);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
        
        // Enhanced glow effect
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Create nodes
    const nodes = [];
    const nodeCount = Math.min(40, Math.floor((canvas.width * canvas.height) / 20000));
    
    for (let i = 0; i < nodeCount; i++) {
      nodes.push(new Node(
        Math.random() * canvas.width,
        Math.random() * canvas.height
      ));
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw nodes
      nodes.forEach(node => {
        node.update();
        node.draw();
      });

      // Draw connections
      nodes.forEach((node, i) => {
        nodes.slice(i + 1).forEach(otherNode => {
          const distance = Math.sqrt(
            Math.pow(node.x - otherNode.x, 2) + 
            Math.pow(node.y - otherNode.y, 2)
          );
          
          if (distance < 120) {
            const alpha = Math.max(0, 0.8 - distance / 120);
            const pulseEffect = Math.sin(Date.now() * 0.002 + i * 0.1) * 0.2 + 0.8;
            
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3 * pulseEffect})`;
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Enhanced glow to connections
            ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
            ctx.shadowBlur = 5;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', resizeCanvas);
      }
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // Load chat history from backend and localStorage
  const loadChatHistory = async () => {
    try {
      console.log('🔄 [loadChatHistory] Loading chat history...');
      console.log('🔄 [loadChatHistory] isAuth:', isAuth);
      setIsLoadingHistory(true);
      
      let allChats = [];
      
      if (isAuth) {
        // Load from backend for authenticated users
        try {
          console.log('🌐 [loadChatHistory] Making backend request for chat sessions...');
          const response = await getChatSessions();
          console.log('📥 [loadChatHistory] Chat history response:', response);
          
          if (response && response.message && response.message.chatSessions) {
            console.log('✅ [loadChatHistory] Chat sessions found:', response.message.chatSessions.length);
            
            // Convert timestamp strings to Date objects
            const backendSessions = response.message.chatSessions.map(session => ({
              ...session,
              timestamp: new Date(session.timestamp),
              isLocalStorage: false
            }));
            
            allChats = [...backendSessions];
            console.log('✅ [loadChatHistory] Backend sessions processed:', backendSessions.length);
          } else {
            console.log('ℹ️ [loadChatHistory] No chat sessions in response or empty data');
          }
        } catch (error) {
          console.error('❌ [loadChatHistory] Error loading backend chat history:', error);
          console.error('❌ [loadChatHistory] Error details:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
          });
        }
      } else {
        console.log('ℹ️ [loadChatHistory] User not authenticated, skipping backend request');
      }
      
      // Load from localStorage for all users
      try {
        const localChats = JSON.parse(localStorage.getItem('localChatHistory') || '[]');
        console.log('📥 [loadChatHistory] LocalStorage chats found:', localChats.length);
        
        // Convert timestamp strings to Date objects
        const formattedLocalChats = localChats.map(chat => ({
          ...chat,
          timestamp: new Date(chat.timestamp),
          isLocalStorage: true
        }));
        
        // Combine backend and localStorage chats, with localStorage chats first
        allChats = [...formattedLocalChats, ...allChats];
        console.log('✅ [loadChatHistory] Combined chats:', allChats.length);
      } catch (error) {
        console.error('❌ [loadChatHistory] Error loading localStorage chat history:', error);
      }
      
      // Sort by timestamp (newest first)
      allChats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setChatHistory(allChats);
      console.log('✅ [loadChatHistory] Total chats loaded:', allChats.length);
      
    } catch (error) {
      console.error('❌ [loadChatHistory] Error loading chat history:', error);
      setChatHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load specific chat session
  const loadSelectedChat = async (sessionId) => {
    try {
      // Reset save flag when loading a chat
      saveInProgressRef.current = false;
      
      // First check if it's a localStorage chat
      const localChats = JSON.parse(localStorage.getItem('localChatHistory') || '[]');
      const localChat = localChats.find(chat => chat.sessionId === sessionId);
      
      if (localChat) {
        // Load from localStorage
        console.log('📥 Loading chat from localStorage:', sessionId);
        const messagesWithDates = localChat.messages.map(message => ({
          ...message,
          timestamp: new Date(message.timestamp)
        }));
        setMessages(messagesWithDates);
        setSessionId(sessionId);
        return;
      }
      
      // If not found in localStorage, try backend (for authenticated users)
      if (isAuth) {
        const response = await getChatSession(sessionId);
        if (response.success && response.message && response.message.chatSession) {
          // Convert message timestamps to Date objects
          const messagesWithDates = response.message.chatSession.messages.map(message => ({
            ...message,
            timestamp: new Date(message.timestamp)
          }));
          setMessages(messagesWithDates);
          setSessionId(sessionId);
          return;
        }
      }
      
      // If not found anywhere, fallback to default message
      console.error('Chat session not found:', sessionId);
      setMessages([
        {
          id: 1,
          type: 'bot',
          text: "Ask me anything about damp and mould",
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error('Error loading chat session:', error);
      // Fallback to default message if session not found
      setMessages([
        {
          id: 1,
          type: 'bot',
          text: "Ask me anything about damp and mould",
          timestamp: new Date()
        }
      ]);
    }
  };

  // Save chat session to backend
  const saveChatToBackend = async (title, preview) => {
    try {
      console.log('💾 [saveChatToBackend] Saving chat session...', { sessionId, title, preview, messageCount: messages.length });
      console.log('💾 [saveChatToBackend] User authenticated:', isAuth);
      
      // Check if user is authenticated before attempting to save
      if (!isAuth) {
        console.log('ℹ️ [saveChatToBackend] User not authenticated, cannot save chat session');
        return false;
      }
      
      // Get current messages state with proper structure
      const currentMessages = messages.map(msg => ({
        id: msg.id,
        type: msg.type,
        text: msg.text,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
      }));
      
      console.log('💾 [saveChatToBackend] Sending data to backend:', {
        sessionId,
        title,
        preview,
        messageCount: currentMessages.length
      });
      
      const response = await saveChatSession({
        sessionId,
        title,
        preview,
        messages: currentMessages
      });
      console.log('✅ [saveChatToBackend] Chat session saved successfully:', response);
      
      // Show success message
      toast.success('Chat saved successfully!');
      
      // Reload chat history after saving
      setTimeout(() => {
        loadChatHistory();
      }, 500);
      
      return true;
    } catch (error) {
      console.error('❌ [saveChatToBackend] Error saving chat session:', error);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        console.log('ℹ️ [saveChatToBackend] User not authenticated, chat will not be saved');
        toast.error('Please log in to save your chat');
        return false;
      } else if (error.response?.status === 500) {
        console.error('❌ [saveChatToBackend] Server error while saving chat session');
        console.log('ℹ️ [saveChatToBackend] Chat will continue working but may not be saved to history');
        toast.error('Server error while saving chat. Please try again later.');
        return false;
      } else if (error.response?.status === 400) {
        console.error('❌ [saveChatToBackend] Bad request while saving chat session');
        toast.error('Invalid request. Please try again.');
        return false;
      } else {
        console.error('❌ [saveChatToBackend] Unknown error while saving chat session:', error.message);
        toast.error('Failed to save chat. Please try again.');
        return false;
      }
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

  const handleFeedback = async (messageId, type) => {
    console.log(`Feedback for message ${messageId}: ${type}`);
    
    // Update the message to show filled state immediately
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, feedback: type }
        : msg
    ));
    
    // Save feedback to backend if user is authenticated and session exists
    if (isAuth && sessionId) {
      try {
        await updateMessageFeedback(sessionId, messageId, type);
        console.log('✅ Feedback saved to backend');
      } catch (error) {
        console.error('❌ Error saving feedback to backend:', error);
        // Revert the feedback state if save failed
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, feedback: null }
            : msg
        ));
      }
    }
  };

  const startNewChat = () => {
    // Check if there are meaningful messages (more than just the initial bot message)
    const hasUserMessages = messages.some(msg => msg.type === 'user');
    
    if (hasUserMessages) {
      // If user is logged in, save chat directly and start new chat
      if (isAuth) {
        handleSaveCurrentChatDirectly();
      } else {
        // If user is not logged in, show confirmation dialog
        setShowNewChatConfirmation(true);
      }
    } else {
      // No user messages, proceed directly with new chat
      proceedWithNewChat();
    }
  };

  const proceedWithNewChat = () => {
    // Clear messages and set new session
    setMessages([
      {
        id: 1,
        type: 'bot',
        text: "Ask me anything about damp and mould",
        timestamp: new Date()
      }
    ]);
    
    // Generate new session ID safely
    if (typeof window !== 'undefined') {
      setSessionId(generateUUID());
    } else {
      setSessionId('temp-session-id');
    }
    
    setInputMessage('');
    setIsLoading(false);
    setIsTyping(false);
    setShowChatHistory(false);
    setShowNewChatConfirmation(false);
    saveInProgressRef.current = false; // Reset save flag for new chat
    
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
    // Reload chat history when opening modal (now works for all users)
    loadChatHistory();
  };

  const handleCloseChatHistory = () => {
    setShowChatHistory(false);
  };

  const handleLoginClick = () => {
    // Show the save chat popup
    setShowSaveChatPopup(true);
    setIsSignupMode(true);
    setSignupEmail('');
    setSignupPassword('');
  };

  const handleSignup = async () => {
    if (!signupEmail || !signupPassword) {
      toast.error('Please fill in all fields.');
      return;
    }
    
    if (signupPassword && signupPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    
    setIsSignupLoading(true);
    setIsAuthInProgress(true);
    try {
      await registerResidentRequest({ email: signupEmail, password: signupPassword });
      toast.success('Account created successfully! Your chat will be saved.');
      setShowSaveChatPopup(false);
      
      // Reload user data to update authentication state
      await loadMe();
      
      // Wait a bit to ensure authentication state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Save the current chat after successful signup
      await handleSaveCurrentChatDirectly(true);
      
      // Open chat history popup after successful signup
      setTimeout(() => {
        setShowChatHistory(true);
      }, 1000);
    } catch (error) {
      toast.error('Signup failed. Please try again.');
    } finally {
      setIsSignupLoading(false);
      setIsAuthInProgress(false);
    }
  };

  const handleLogin = async () => {
    if (!signupEmail || !signupPassword) {
      toast.error('Please fill in all fields.');
      return;
    }
    
    setIsLoginLoading(true);
    try {
      await loginRequest({ email: signupEmail, password: signupPassword });
      toast.success('OTP sent to your email. Please check and enter the code.');
      setShowOTPInput(true);
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleOTPVerification = async () => {
    if (!otpCode) {
      toast.error('Please enter the OTP code.');
      return;
    }
    
    setIsOtpLoading(true);
    setIsAuthInProgress(true);
    try {
      await verifyRequest({ OTP: otpCode });
                toast.success('Login successful! Your chat will be saved.');
          setShowSaveChatPopup(false);
          setShowOTPInput(false);
          setOtpCode('');
          setOtpBlocks(['', '', '', '']);
      
      // Reload user data to update authentication state
      await loadMe();
      
      // Wait a bit to ensure authentication state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Save the current chat after successful login
      await handleSaveCurrentChatDirectly(true);
      
      // Open chat history popup after successful login
      setTimeout(() => {
        setShowChatHistory(true);
      }, 1000);
    } catch (error) {
      toast.error('OTP verification failed. Please try again.');
    } finally {
      setIsOtpLoading(false);
      setIsAuthInProgress(false);
    }
  };

  const closeSaveChatPopup = () => {
    setShowSaveChatPopup(false);
    setShowOTPInput(false);
    setSignupEmail('');
    setSignupPassword('');
    setConfirmPassword('');
    setOtpCode('');
    setOtpBlocks(['', '', '', '']);
  };

  const handleOtpBlockChange = (index, value) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newBlocks = [...otpBlocks];
    newBlocks[index] = value;
    setOtpBlocks(newBlocks);
    
    // Update the combined OTP code
    const combinedOtp = newBlocks.join('');
    setOtpCode(combinedOtp);
    
    // Auto-focus next input if value is entered
    if (value && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otpBlocks[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    
    // Handle Enter key
    if (e.key === 'Enter') {
      const combinedOtp = otpBlocks.join('');
      if (combinedOtp.length === 4) {
        handleOTPVerification();
      }
    }
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

  // Handle edit chat title
  const handleEditChat = (chat) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  // Save edited title
  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    
    try {
      const chatToEdit = chatHistory.find(chat => chat.id === editingChatId);
      if (!chatToEdit) return;
      
      // Check if it's a localStorage chat
      if (chatToEdit.isLocalStorage) {
        // Update in localStorage
        const localChats = JSON.parse(localStorage.getItem('localChatHistory') || '[]');
        const updatedLocalChats = localChats.map(chat => 
          chat.sessionId === chatToEdit.sessionId 
            ? { ...chat, title: editTitle.trim() }
            : chat
        );
        localStorage.setItem('localChatHistory', JSON.stringify(updatedLocalChats));
        
        console.log('✏️ Chat title updated in localStorage:', chatToEdit.sessionId);
      } else {
        // Update in backend (for authenticated users)
        if (isAuth) {
          await updateChatSessionTitle(chatToEdit.sessionId, editTitle.trim());
        }
      }
      
      // Update local state
      setChatHistory(prev => prev.map(chat => 
        chat.id === editingChatId 
          ? { ...chat, title: editTitle.trim() }
          : chat
      ));
      
      setEditingChatId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Error updating chat title:', error);
      alert('Failed to update chat title. Please try again.');
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingChatId(null);
    setEditTitle('');
  };

  // Handle delete chat
  const handleDeleteChat = async (chat) => {
    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Check if it's a localStorage chat
      if (chat.isLocalStorage) {
        // Delete from localStorage
        const localChats = JSON.parse(localStorage.getItem('localChatHistory') || '[]');
        const updatedLocalChats = localChats.filter(c => c.sessionId !== chat.sessionId);
        localStorage.setItem('localChatHistory', JSON.stringify(updatedLocalChats));
        
        console.log('🗑️ Chat deleted from localStorage:', chat.sessionId);
      } else {
        // Delete from backend (for authenticated users)
        if (isAuth) {
          await deleteChatSession(chat.sessionId);
        }
      }
      
      // Remove from local state
      setChatHistory(prev => prev.filter(c => c.id !== chat.id));
      
      // If this was the currently selected chat, start a new chat
      if (sessionId === chat.sessionId) {
        startNewChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  // Handle saving current chat from confirmation dialog
  const handleSaveCurrentChat = async () => {
    // Generate title and preview from first user message
    const firstUserMessage = messages.find(msg => msg.type === 'user');
    const title = firstUserMessage ? generateAITitle(firstUserMessage.text) : 'New Chat';
    const preview = firstUserMessage ? firstUserMessage.text : '';
    
    // Check if user is authenticated
    if (!isAuth) {
      // Save chat to localStorage for logged-out users
      try {
        const chatData = {
          id: Date.now(),
          sessionId,
          title,
          preview,
          messages: messages.map(msg => ({
            id: msg.id,
            type: msg.type,
            text: msg.text,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
          })),
          timestamp: new Date().toISOString(),
          isLocalStorage: true // Flag to identify localStorage chats
        };
        
        // Get existing localStorage chats
        const existingChats = JSON.parse(localStorage.getItem('localChatHistory') || '[]');
        
        // Add new chat to localStorage
        const updatedChats = [chatData, ...existingChats];
        localStorage.setItem('localChatHistory', JSON.stringify(updatedChats));
        
        console.log('💾 Chat saved to localStorage successfully');
        
        // Close the confirmation dialog
        setShowNewChatConfirmation(false);
        
        // Show sign-in popup instead of alert
        setShowSaveChatPopup(true);
        setIsSignupMode(false);
        setSignupEmail('');
        setSignupPassword('');
        setConfirmPassword('');
        
        return;
      } catch (error) {
        console.error('Error saving chat to localStorage:', error);
        alert('Failed to save chat to local storage. Please try again.');
        return;
      }
    }

    // User is already authenticated, save immediately
    try {
      const success = await saveChatToBackend(title, preview);
      if (success) {
        // Show success message or just proceed with new chat
        proceedWithNewChat();
      } else {
        // If save failed, still allow user to proceed or cancel
        alert('Failed to save chat. You can still proceed with new chat or cancel to continue current chat.');
      }
    } catch (error) {
      console.error('Error saving current chat:', error);
      alert('Failed to save chat. You can still proceed with new chat or cancel to continue current chat.');
    }
  };

  // Handle saving current chat directly for logged-in users
  const handleSaveCurrentChatDirectly = async (preventPopup = false) => {
    try {
      // Check if user is authenticated
      if (!isAuth) {
        if (preventPopup) {
          console.log('ℹ️ User not authenticated, but popup prevented - skipping save');
          return;
        }
        console.log('ℹ️ User not authenticated, showing save chat popup');
        // Show the save chat popup instead of trying to save directly
        setShowSaveChatPopup(true);
        setIsSignupMode(true);
        setSignupEmail('');
        setSignupPassword('');
        setConfirmPassword('');
        return;
      }

      // Check if this chat has already been saved to localStorage
      const existingChats = JSON.parse(localStorage.getItem('localChatHistory') || '[]');
      const chatAlreadySaved = existingChats.some(chat => chat.sessionId === sessionId);
      
      if (chatAlreadySaved) {
        console.log('ℹ️ Chat already saved to localStorage, skipping duplicate save');
        // Proceed with new chat since the chat is already saved
        proceedWithNewChat();
        return;
      }

      // Generate title from first user message
      const firstUserMessage = messages.find(msg => msg.type === 'user');
      const title = firstUserMessage ? generateAITitle(firstUserMessage.text) : 'New Chat';
      const preview = firstUserMessage ? firstUserMessage.text : '';
      
      const success = await saveChatToBackend(title, preview);
      if (success) {
        // Proceed with new chat after successful save
        proceedWithNewChat();
      } else {
        // If save failed, ask user what to do
        const shouldContinue = confirm('Failed to save chat. Do you want to continue with new chat anyway?');
        if (shouldContinue) {
          proceedWithNewChat();
        }
      }
    } catch (error) {
      console.error('Error saving current chat:', error);
      const shouldContinue = confirm('Failed to save chat. Do you want to continue with new chat anyway?');
      if (shouldContinue) {
        proceedWithNewChat();
      }
    }
  };

  // Handle closing new chat confirmation dialog
  const handleCloseNewChatConfirmation = () => {
    setShowNewChatConfirmation(false);
  };

  const formatDate = (date) => {
    // Convert string to Date object if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Unknown date';
    }
    
    const now = new Date();
    
    // Compare dates by day (ignoring time)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const chatDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    
    // Calculate difference in days
    const diffTime = today - chatDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    // Format time as HH:MM
    const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (diffDays === 0) return `Today at ${timeString}`;
    if (diffDays === 1) return `Yesterday at ${timeString}`;
    if (diffDays < 7) return `${diffDays} days ago at ${timeString}`;
    return `${dateObj.toLocaleDateString()} at ${timeString}`;
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

    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      // Auto focus after sending message
      setTimeout(() => {
        textareaRef.current.focus();
      }, 100);
    }

    try {
      // NEW: LangChain API call
      console.log('🤖 Making API call to LangChain chatbot...');
      
      const apiUrl = "/api/karla";
      console.log('API URL:', apiUrl);
      
      // Use the same payload format for compatibility
      const payload = {
        action: "sendMessage",
        sessionId: sessionId,
        chatInput: currentMessage
      };

      try {
        console.log('📤 Sending payload:', payload);
        console.log('🌐 Making request to:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        console.log(`📥 Response status: ${response.status}`);
        console.log(`🔗 Response URL: ${response.url}`);

        if (response.ok) {
          let data;
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const textResponse = await response.text();
            data = { response: textResponse };
          }
          
          console.log('📥 Response data:', data);
          
          const botMessage = {
            id: Date.now() + 1,
            type: 'bot',
            text: data.output || data.response || data.message || data.text || "Thank you for your message. I'm here to help you with any questions you may have.",
            timestamp: new Date()
          };
          
          setMessages(prev => {
            const updatedMessages = [...prev, botMessage];
            
            // Save chat session only after successful AI response AND if user is authenticated
            if (isAuth && !saveInProgressRef.current && !isAuthInProgress) {
              saveInProgressRef.current = true;
              
              // Find the first non-greeting message to use as title
              let title = 'New Chat'; // Default title
              if (prev.length === 1) {
                // This is the first user message, check if it's a greeting
                if (!isGreetingMessage(currentMessage)) {
                  title = generateAITitle(currentMessage);
                }
              } else {
                // Check if we haven't set a title yet and this message is not a greeting
                const allUserMessages = updatedMessages.filter(msg => msg.type === 'user');
                const nonGreetingMessages = allUserMessages.filter(msg => !isGreetingMessage(msg.text));
                
                if (nonGreetingMessages.length > 0) {
                  // Use the first non-greeting message for title
                  title = generateAITitle(nonGreetingMessages[0].text);
                }
              }
              
              const preview = currentMessage;
              
              console.log('💾 [sendMessage] Saving chat with title:', title);
              
              // Save chat immediately after successful response with updated messages
              setTimeout(() => {
                // Use the updated messages for saving
                const messagesToSave = updatedMessages.map(msg => ({
                  id: msg.id,
                  type: msg.type,
                  text: msg.text,
                  timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
                }));
                
                saveChatSession({
                  sessionId,
                  title,
                  preview,
                  messages: messagesToSave
                }).then(response => {
                  console.log('✅ Chat saved successfully after AI response:', response);
                  saveInProgressRef.current = false;
                  // Reload chat history after saving
                  setTimeout(() => {
                    loadChatHistory();
                  }, 500);
                }).catch(err => {
                  console.log('ℹ️ Chat save failed but conversation continues:', err.message);
                  saveInProgressRef.current = false;
                });
              }, 100);
            } else if (!isAuth) {
              // User is not authenticated, save to localStorage instead
              try {
                const firstUserMessage = updatedMessages.find(msg => msg.type === 'user');
                const title = firstUserMessage ? generateAITitle(firstUserMessage.text) : 'New Chat';
                const preview = firstUserMessage ? firstUserMessage.text : '';
                
                const chatData = {
                  id: Date.now(),
                  sessionId,
                  title,
                  preview,
                  messages: updatedMessages.map(msg => ({
                    id: msg.id,
                    type: msg.type,
                    text: msg.text,
                    timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
                  })),
                  timestamp: new Date().toISOString(),
                  isLocalStorage: true
                };
                
                // Get existing localStorage chats
                const existingChats = JSON.parse(localStorage.getItem('localChatHistory') || '[]');
                
                // Remove any existing chat with the same sessionId
                const filteredChats = existingChats.filter(chat => chat.sessionId !== sessionId);
                
                // Add updated chat to localStorage
                const updatedChats = [chatData, ...filteredChats];
                localStorage.setItem('localChatHistory', JSON.stringify(updatedChats));
                
                console.log('💾 Chat saved to localStorage successfully');
              } catch (error) {
                console.error('Error saving chat to localStorage:', error);
              }
            }
            
            return updatedMessages;
          });
          
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
          console.error(`❌ Request failed with status ${response.status}:`, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      } catch (error) {
        console.error('❌ Request failed:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
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

  // OLD N8N WEBHOOK CODE - COMMENTED FOR FUTURE USE
  /*
  const sendMessageN8N = async () => {
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
      
      const webhookUrl = "https://videodesk.app.n8n.cloud/webhook/f9a9e234-7014-4936-8e9d-8d8540156afb/chat";
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
          
          setMessages(prev => {
            const updatedMessages = [...prev, botMessage];
            
            // Save chat session only after successful AI response AND if user is authenticated
            if (isAuth && !saveInProgressRef.current && !isAuthInProgress) {
              saveInProgressRef.current = true;
              
              // Find the first non-greeting message to use as title
              let title = 'New Chat'; // Default title
              if (prev.length === 1) {
                // This is the first user message, check if it's a greeting
                if (!isGreetingMessage(currentMessage)) {
                  title = generateAITitle(currentMessage);
                }
              } else {
                // Check if we haven't set a title yet and this message is not a greeting
                const allUserMessages = updatedMessages.filter(msg => msg.type === 'user');
                const nonGreetingMessages = allUserMessages.filter(msg => !isGreetingMessage(msg.text));
                
                if (nonGreetingMessages.length > 0) {
                  // Use the first non-greeting message for title
                  title = generateAITitle(nonGreetingMessages[0].text);
                }
              }
              
              const preview = currentMessage;
              
              console.log('💾 [sendMessage] Saving chat with title:', title);
              
              // Save chat immediately after successful response with updated messages
              setTimeout(() => {
                // Use the updated messages for saving
                const messagesToSave = updatedMessages.map(msg => ({
                  id: msg.id,
                  type: msg.type,
                  text: msg.text,
                  timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
                }));
                
                saveChatSession({
                  sessionId,
                  title,
                  preview,
                  messages: messagesToSave
                }).then(response => {
                  console.log('✅ Chat saved successfully after AI response:', response);
                  saveInProgressRef.current = false;
                  // Reload chat history after saving
                  setTimeout(() => {
                    loadChatHistory();
                  }, 500);
                }).catch(err => {
                  console.log('ℹ️ Chat save failed but conversation continues:', err.message);
                  saveInProgressRef.current = false;
                });
              }, 100);
            } else if (!isAuth) {
              // User is not authenticated, save to localStorage instead
              try {
                const firstUserMessage = updatedMessages.find(msg => msg.type === 'user');
                const title = firstUserMessage ? generateAITitle(firstUserMessage.text) : 'New Chat';
                const preview = firstUserMessage ? firstUserMessage.text : '';
                
                const chatData = {
                  id: Date.now(),
                  sessionId,
                  title,
                  preview,
                  messages: updatedMessages.map(msg => ({
                    id: msg.id,
                    type: msg.type,
                    text: msg.text,
                    timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
                  })),
                  timestamp: new Date().toISOString(),
                  isLocalStorage: true
                };
                
                // Get existing localStorage chats
                const existingChats = JSON.parse(localStorage.getItem('localChatHistory') || '[]');
                
                // Remove any existing chat with the same sessionId
                const filteredChats = existingChats.filter(chat => chat.sessionId !== sessionId);
                
                // Add updated chat to localStorage
                const updatedChats = [chatData, ...filteredChats];
                localStorage.setItem('localChatHistory', JSON.stringify(updatedChats));
                
                console.log('💾 Chat saved to localStorage successfully');
              } catch (error) {
                console.error('Error saving chat to localStorage:', error);
              }
            }
            
            return updatedMessages;
          });
          
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
  */

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 z-50 flex flex-col animate-in fade-in duration-300">
      {/* Enhanced Header with Glass Effect - Mobile Optimized */}
      <div className="relative bg-gradient-to-br from-[#9452FF] via-[#8a42fc] to-[#7c3aed] text-white shadow-2xl overflow-hidden">
        {/* Header Neural Network Canvas Background */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-30"
          style={{ zIndex: 1 }}
        />
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
        <div className="relative p-2 sm:p-3 md:p-6 flex items-center justify-between z-10">
          {/* Left side - Title and subtitle */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 flex-1 min-w-0">
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg md:text-2xl font-bold tracking-tight drop-shadow-sm">D&M AI</h1>
              <p className="text-purple-100 text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-none">
                {selectedChat ? `Continuing: ${selectedChat.title}` : 'Damp & Mould AI Assistant'}
              </p>
            </div>
          </div>
          
          {/* Right side - Action buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 flex-shrink-0">
            {/* User Email Display - shown only for authenticated users on desktop */}
            {isAuth && user && (
              <div className="hidden md:block bg-white/10 backdrop-blur-sm rounded-lg md:rounded-xl px-2 md:px-4 py-1.5 md:py-3 border border-white/10 max-w-[140px] md:max-w-[200px] overflow-hidden">
                <span className="text-white text-xs md:text-sm font-medium truncate block w-full">
                  {user.email}
                </span>
              </div>
            )}
            
            {/* Saved Chats button - shown only for authenticated users */}
            {isAuth && (
              <button
                onClick={handleShowChatHistory}
                className="group bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl px-2 sm:px-3 md:px-4 py-2 md:py-3 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10 hover:scale-105 active:scale-95 shadow-lg"
                title="Saved Chats"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 text-white sm:mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-white text-xs md:text-sm font-medium hidden sm:block">Saved Chats</span>
              </button>
            )}
            
            {/* Save Chat button - shown only for non-authenticated users */}
            {!isAuth && (
              <button
                onClick={handleLoginClick}
                className="group bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl px-2 sm:px-3 md:px-4 py-2 md:py-3 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10 hover:scale-105 active:scale-95 shadow-lg"
                title="Save Chat to Cloud"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 text-white sm:mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="text-white text-xs md:text-sm font-medium hidden sm:block">Save Chat</span>
              </button>
            )}
            
            {/* New Chat button */}
            <button
              onClick={startNewChat}
              className="group bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl px-2 sm:px-3 md:px-4 py-2 md:py-3 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10 hover:scale-105 active:scale-95 shadow-lg"
              title="Start New Chat"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5 text-white sm:mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
                <span className="text-white text-xs md:text-sm font-medium hidden sm:block">New Chat</span>
            </button>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="group bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10 hover:scale-105 active:scale-95 shadow-lg"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
       
       {/* Enhanced Chat Container */}
       <div className="flex-1 relative overflow-y-auto pb-24 md:pb-32">
         <div className="max-w-4xl mx-auto w-full px-4 md:px-4 lg:px-6 py-4 md:py-4 lg:py-8">
           <div className="space-y-4 md:space-y-4 lg:space-y-6">
             {messages.map((message, index) => (
               <div key={message.id} className={`group animate-in slide-in-from-bottom-2 duration-500 ${message.type === 'user' ? 'flex justify-end' : 'flex justify-start'}`} style={{ animationDelay: `${index * 100}ms` }}>
                 {message.type === 'user' ? (
                   <div className="max-w-[85%] md:max-w-[80%] relative">
                     <div className="bg-orange-500 text-white px-4 md:px-6 py-3 md:py-4 rounded-2xl md:rounded-3xl rounded-br-lg shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 relative group">
                       <p className="text-sm md:text-base leading-relaxed font-medium">{message.text}</p>
                       <div className="absolute inset-0 bg-orange-400/20 rounded-2xl md:rounded-3xl rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
                       <div className="bg-gradient-to-br from-[#9452FF] via-[#8a42fc] to-[#7c3aed] text-white rounded-2xl md:rounded-3xl rounded-bl-lg p-4 md:p-6 shadow-xl shadow-[#9452FF]/25 border border-[#8a42fc]/50 hover:shadow-2xl hover:shadow-[#9452FF]/30 transition-all duration-300 backdrop-blur-sm">
                         <div className="text-white text-sm md:text-base leading-relaxed">
                           <div 
                             className="whitespace-pre-wrap"
                             dangerouslySetInnerHTML={{ __html: parseMarkdown(message.text) }}
                           />
                         </div>
                         
                         <button
                           onClick={() => copyToClipboard(message.text)}
                           className="absolute top-2 md:top-4 right-2 md:right-4 opacity-0 group-hover:opacity-100 bg-[#8a42fc]/20 hover:bg-[#8a42fc]/30 rounded-lg p-1.5 md:p-2 transition-all duration-200 hover:scale-105"
                           title="Copy message"
                         >
                           <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                           </svg>
                         </button>
                       </div>
                      
                      {/* Feedback buttons, time, and AI name all on one line */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleFeedback(message.id, 'thumbsUp')}
                            className={`p-2 rounded-lg transition-colors duration-200 ${
                              message.feedback === 'thumbsUp' 
                                ? 'text-green-600 bg-green-50' 
                                : 'text-slate-500 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title="Helpful"
                          >
                            <svg className="w-5 h-5" fill={message.feedback === 'thumbsUp' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleFeedback(message.id, 'thumbsDown')}
                            className={`p-2 rounded-lg transition-colors duration-200 ${
                              message.feedback === 'thumbsDown' 
                                ? 'text-red-600 bg-red-50' 
                                : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title="Not helpful"
                          >
                            <svg className="w-5 h-5" fill={message.feedback === 'thumbsDown' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" style={{ transform: 'rotate(180deg)' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatMessageTime(message.timestamp)}
                          </span>
                          <div className="px-3 py-1 md:px-4 md:py-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs md:text-sm font-bold">D&M AI</span>
                          </div>
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
                  <div className="bg-gradient-to-br from-[#9452FF] via-[#8a42fc] to-[#7c3aed] rounded-2xl md:rounded-3xl rounded-bl-lg p-4 md:p-6 shadow-2xl shadow-[#9452FF]/40 border border-[#8a42fc]/50 backdrop-blur-sm">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-[#9452FF] via-[#8a42fc] to-[#7c3aed] rounded-full animate-bounce shadow-lg shadow-[#9452FF]/50"></div>
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-[#9452FF] via-[#8a42fc] to-[#7c3aed] rounded-full animate-bounce shadow-lg shadow-[#9452FF]/50" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-[#9452FF] via-[#8a42fc] to-[#7c3aed] rounded-full animate-bounce shadow-lg shadow-[#9452FF]/50" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                                             <span className="text-white text-xs md:text-sm font-bold">D&M AI is thinking...</span>
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
      <div className="fixed bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full px-4 md:px-6">
        <div className="relative max-w-4xl mx-auto">
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
                                     placeholder="Ask D&M AI anything about damp & mould..."
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
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#9452FF] to-[#7c3aed] rounded-full animate-pulse"></div>
                )}
              </div>
              <button 
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="group bg-gradient-to-r from-[#9452FF] to-[#8a42fc] hover:from-[#8a42fc] hover:to-[#7c3aed] disabled:from-slate-300 disabled:to-slate-300 text-white p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg shadow-[#9452FF]/25 hover:shadow-xl hover:shadow-[#9452FF]/30 hover:scale-105 active:scale-105 disabled:shadow-none disabled:scale-100"
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
             <div className="min-w-[0] max-w-[95vw] w-full sm:w-[400px] lg:w-[450px] bg-white rounded-3xl shadow-2xl pointer-events-auto flex flex-col mx-2 sm:mx-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-[#9452FF] to-[#8a42fc] text-white p-6 sm:p-8 m-0">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold">Saved Chats</h2>
                    <p className="text-sm opacity-90">
                      {isAuth 
                        ? 'Select a previous chat or start new conversation' 
                        : 'Your local chats (login to sync with cloud)'
                      }
                    </p>
                    {isMigrating && (
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs opacity-90">Migrating chats to cloud...</span>
                      </div>
                    )}
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
                  className="w-full bg-gradient-to-r from-[#9452FF] to-[#8a42fc] hover:from-[#8a42fc] hover:to-[#7c3aed] text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-lg">Start New Chat</span>
                </button>

                {/* Chat History List */}
                                <div className="space-y-1">
                  <div className="flex items-center space-x-2 mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Saved Chats</h3>
                  </div>
                  
                  {isLoadingHistory ? (
                    <div className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-[#9452FF] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Loading chat history...</p>
                    </div>
                  ) : (
                                         <div className="border border-gray-200 rounded-lg overflow-hidden">
                                               {chatHistory.map((chat, index) => (
                          <div
                            key={chat.id}
                            className={`w-full p-3 hover:bg-gray-50 transition-colors group ${
                              index !== chatHistory.length - 1 ? 'border-b border-gray-200' : ''
                            }`}
                          >
                            {editingChatId === chat.id ? (
                              // Edit mode
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-[#9452FF] rounded-full flex-shrink-0"></div>
                                                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#9452FF]"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveEdit();
                                      } else if (e.key === 'Escape') {
                                        handleCancelEdit();
                                      }
                                    }}
                                    autoFocus
                                  />
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={handleSaveEdit}
                                    className="p-1 text-green-500 hover:text-green-600"
                                    title="Save"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-1 text-gray-500 hover:text-gray-600"
                                    title="Cancel"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Normal mode
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => handleSelectChat(chat)}
                                  className="flex-1 text-left flex items-center space-x-3 min-w-0"
                                >
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    chat.isLocalStorage ? 'bg-blue-500' : 'bg-amber-500'
                                  }`}></div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 group-hover:text-[#7c3aed] transition-colors truncate">
                                      {chat.title}
                                    </h4>
                                    <p className="text-xs text-gray-500 font-normal">
                                      {formatDate(chat.timestamp)}
                                    </p>
                                    {chat.isLocalStorage && (
                                      <p className="text-xs text-blue-600 font-medium">Local Storage</p>
                                    )}
                                  </div>
                                </button>
                                <div className="flex items-center space-x-2 ml-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditChat(chat);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors rounded"
                                    title="Edit chat"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteChat(chat);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
                                    title="Delete chat"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                     </div>
                  )}
                </div>

                                {/* No chats message */}
                {chatHistory.length === 0 && !isLoadingHistory && (
                  <div className="text-center py-12 text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-xl font-medium text-gray-700 mb-2">No previous chats</p>
                    <p className="text-sm text-gray-500">
                      {isAuth 
                        ? 'Start your first conversation with D&M AI' 
                        : 'Start a conversation and save it locally'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* New Chat Confirmation Modal */}
      {showNewChatConfirmation && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] pointer-events-none"></div>
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="min-w-[0] max-w-[95vw] w-full sm:w-[400px] lg:w-[450px] bg-white rounded-3xl shadow-2xl pointer-events-auto flex flex-col mx-2 sm:mx-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-[#9452FF] to-[#8a42fc] text-white p-6 sm:p-8 m-0">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold">Start New Chat?</h2>
                    <p className="text-sm opacity-90">This action will clear your current conversation</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseNewChatConfirmation}
                  className="bg-white/10 hover:bg-white/20 text-white transition-all p-3 rounded-full shadow-lg hover:scale-105 active:scale-95"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="w-full bg-white p-6 sm:p-8 flex flex-col gap-6 pointer-events-auto">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#9452FF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#9452FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Are you sure you want to leave <br />your existing chat?</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Starting a new chat will clear your current conversation. If you haven't saved this chat, it will be lost.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Save Chat Button - shown for both authenticated and non-authenticated users */}
                  <button
                    onClick={handleSaveCurrentChat}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>{isAuth ? 'Save Chat' : 'Save Chat'}</span>
                  </button>

                  {/* Continue Without Saving Button */}
                  <button
                    onClick={proceedWithNewChat}
                    className="w-full bg-gradient-to-r from-[#9452FF] to-[#8a42fc] hover:from-[#8a42fc] hover:to-[#7c3aed] text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Continue Without Saving</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Save Chat Popup Modal */}
      {showSaveChatPopup && typeof window !== 'undefined' && createPortal(
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] pointer-events-auto"></div>
          {/* Centered signup modal */}
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="min-w-[0] max-w-[95vw] w-full sm:w-[400px] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col mx-2 sm:mx-0">
              {/* Purple header strip above modal */}
                                                <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
                     <div className="flex-1 flex items-center justify-center">
                       <div className="text-base sm:text-lg font-bold text-center leading-snug px-2">
                         {isSignupMode ? (
                           <>
                             Save Chat
                           </>
                         ) : (
                           <>
                             Log in
                           </>
                         )}
                       </div>
                     </div>
                <button
                  onClick={closeSaveChatPopup}
                  className="absolute top-2 right-2 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-200"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="w-full bg-white rounded-b-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 flex flex-col items-center gap-3 pointer-events-auto">
                {!showOTPInput ? (
                  <>
                    <div className="text-gray-500 text-xs sm:text-sm text-center mb-2">
                      {isSignupMode ? 'Enter your email and a password to save your chat.' : 'Log in to save your chat.'}
                    </div>
                    <div className="w-full flex flex-col gap-2">
                      <label className="text-xs font-semibold text-gray-600 ml-1">Email<span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={e => setSignupEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm"
                        placeholder="Enter your email"
                        required
                      />
                      <label className="text-xs font-semibold text-gray-600 ml-1 mt-2">Password<span className="text-red-500">*</span></label>
                      <input
                        type="password"
                        value={signupPassword}
                        onChange={e => setSignupPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                        placeholder="Enter password"
                        required
                      />
                      {isSignupMode && signupPassword && (
                        <>
                          <label className="text-xs font-semibold text-gray-600 ml-1 mt-2">Confirm Password<span className="text-red-500">*</span></label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                            placeholder="Confirm password"
                            required
                          />
                        </>
                      )}
                    </div>
                    <div className="flex gap-2 w-full justify-center mt-2">
                      <button
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-full transition-all w-full flex items-center justify-center"
                        onClick={isSignupMode ? handleSignup : handleLogin}
                        disabled={isSignupLoading || isLoginLoading}
                      >
                        {isSignupLoading || isLoginLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {isSignupMode ? 'Creating Account...' : 'Sending OTP...'}
                          </>
                        ) : (
                          isSignupMode ? 'Create Account' : 'Send OTP'
                        )}
                      </button>
                    </div>
                    
                   
                    <div className="text-center mt-2">
                      <button
                        onClick={() => setIsSignupMode(!isSignupMode)}
                        className="text-purple-600 hover:text-purple-700 text-sm underline"
                      >
                        {isSignupMode ? 'Already got an account? Log in' : 'Not got an account? Sign up'}
                      </button>
                      {/* Required field indicator */}
                      <div className="text-center mt-1">
                        <p className="text-xs text-gray-500">
                          <span className="text-red-500">*</span>required
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-gray-500 text-xs sm:text-sm text-center mb-2">
                      Enter the OTP code sent to your email to complete login.
                    </div>
                    <div className="w-full flex flex-col gap-2">
                      <label className="text-xs font-semibold text-gray-600 ml-1">OTP Code</label>
                      <div className="flex gap-2 justify-center">
                        {otpBlocks.map((block, index) => (
                          <input
                            key={index}
                            ref={el => otpInputRefs.current[index] = el}
                            type="text"
                            value={block}
                            onChange={e => handleOtpBlockChange(index, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(index, e)}
                            className="w-12 h-12 text-center text-lg font-mono border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                            placeholder=""
                            maxLength="1"
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 w-full justify-center mt-2">
                      <button
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-full transition-all w-full flex items-center justify-center"
                        onClick={handleOTPVerification}
                        disabled={isOtpLoading}
                      >
                        {isOtpLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          'Verify OTP'
                        )}
                      </button>
                    </div>
                    <div className="text-center mt-2">
                      <button
                        onClick={() => {
                          setShowOTPInput(false);
                          setOtpCode('');
                          setOtpBlocks(['', '', '', '']);
                        }}
                        className="text-purple-600 hover:text-purple-700 text-sm underline"
                      >
                        Back to login
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}