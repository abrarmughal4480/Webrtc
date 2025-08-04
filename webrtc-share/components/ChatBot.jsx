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
  const [chatHistory, setChatHistory] = useState([
    {
      id: '1',
      title: 'Damp and Mould Issues',
      preview: 'How to identify and fix damp problems in bathroom and kitchen areas...',
      timestamp: new Date('2024-01-15T10:30:00'),
      sessionId: 'session-1'
    },
    {
      id: '2', 
      title: 'Landlord Responsibilities',
      preview: 'What are my landlord\'s obligations for repairs and maintenance...',
      timestamp: new Date('2024-01-14T15:45:00'),
      sessionId: 'session-2'
    },
    {
      id: '3',
      title: 'Emergency Repairs',
      preview: 'Urgent repair procedures and emergency contacts for water leaks...',
      timestamp: new Date('2024-01-13T09:20:00'),
      sessionId: 'session-3'
    },
    {
      id: '4',
      title: 'Tenant Rights',
      preview: 'Understanding your rights as a tenant and legal protections...',
      timestamp: new Date('2024-01-12T14:15:00'),
      sessionId: 'session-4'
    },
    {
      id: '5',
      title: 'Prevention Tips',
      preview: 'How to prevent damp and mould through proper ventilation...',
      timestamp: new Date('2024-01-11T11:00:00'),
      sessionId: 'session-5'
    },
    {
      id: '6',
      title: 'Mould Removal Guide',
      preview: 'Step-by-step guide to safely remove mould from walls and ceilings...',
      timestamp: new Date('2024-01-10T16:20:00'),
      sessionId: 'session-6'
    },
    {
      id: '7',
      title: 'Ventilation Solutions',
      preview: 'Best practices for improving home ventilation and air circulation...',
      timestamp: new Date('2024-01-09T13:45:00'),
      sessionId: 'session-7'
    },
    {
      id: '8',
      title: 'Insurance Claims',
      preview: 'How to file insurance claims for water damage and mould issues...',
      timestamp: new Date('2024-01-08T11:30:00'),
      sessionId: 'session-8'
    },
    {
      id: '9',
      title: 'Professional Help',
      preview: 'When to call professionals for damp and mould assessment...',
      timestamp: new Date('2024-01-07T14:15:00'),
      sessionId: 'session-9'
    },
    {
      id: '10',
      title: 'Health Concerns',
      preview: 'Health risks associated with damp and mould exposure...',
      timestamp: new Date('2024-01-06T09:50:00'),
      sessionId: 'session-10'
    }
  ]);

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

  // Handle selected chat changes
  useEffect(() => {
    if (selectedChat && isOpen) {
      // Load chat history for selected chat
      const chatMessages = getChatHistory(selectedChat.sessionId);
      if (chatMessages.length > 0) {
        setMessages(chatMessages);
        setSessionId(selectedChat.sessionId);
      }
    }
  }, [selectedChat, isOpen]);

  // Mock function to get chat history (replace with actual API call)
  const getChatHistory = (sessionId) => {
    const chatHistories = {
      'session-1': [
        {
          id: 1,
          type: 'bot',
          text: "Hello! I'm Karla, your Damp and Mould AI Assistant. How can I help you today?",
          timestamp: new Date('2024-01-15T10:30:00')
        },
        {
          id: 2,
          type: 'user',
          text: "I have damp and mould in my bathroom. What should I do?",
          timestamp: new Date('2024-01-15T10:31:00')
        },
        {
          id: 3,
          type: 'bot',
          text: "I'm sorry to hear about the damp and mould issues in your bathroom. This is a common problem that needs immediate attention. Here's what you should do:\n\n1. **Document the issue** - Take photos and videos\n2. **Contact your landlord immediately** - This is their responsibility\n3. **Improve ventilation** - Open windows, use extractor fans\n4. **Clean affected areas** - Use appropriate cleaning products\n\nWould you like me to help you draft a message to your landlord?",
          timestamp: new Date('2024-01-15T10:32:00')
        },
        {
          id: 4,
          type: 'user',
          text: "Yes, please help me draft a message. The mould is black and spreading on the ceiling.",
          timestamp: new Date('2024-01-15T10:33:00')
        },
        {
          id: 5,
          type: 'bot',
          text: "Here's a professional message you can send to your landlord:\n\n**Subject: Urgent - Black Mould in Bathroom Ceiling**\n\nDear [Landlord's Name],\n\nI am writing to report a serious issue with black mould that has developed on the bathroom ceiling. The mould is spreading and poses a health risk.\n\n**Issue Details:**\n- Location: Bathroom ceiling\n- Type: Black mould\n- Status: Spreading rapidly\n- Health concern: Yes\n\n**Immediate Action Required:**\n- Professional mould assessment\n- Ceiling repair/replacement\n- Improved ventilation system\n\nI have documented the issue with photos and videos. Please respond within 24 hours as this is affecting my health and safety.\n\nThank you for your prompt attention to this matter.\n\nBest regards,\n[Your Name]",
          timestamp: new Date('2024-01-15T10:34:00')
        },
        {
          id: 6,
          type: 'user',
          text: "Thank you! How long should I wait for a response?",
          timestamp: new Date('2024-01-15T10:35:00')
        },
        {
          id: 7,
          type: 'bot',
          text: "For mould issues, your landlord should respond within **24-48 hours**. Here's the timeline:\n\n**24 hours**: Initial response acknowledging the issue\n**48 hours**: Assessment visit arranged\n**1 week**: Work should begin\n\n**If no response within 48 hours:**\n1. Send a follow-up email\n2. Contact your local council's environmental health department\n3. Consider legal action if necessary\n\n**Emergency contacts:**\n- Environmental Health: [Your Council Number]\n- Citizens Advice: 0800 144 8848\n- Shelter: 0808 800 4444\n\nWould you like me to help you with the follow-up process?",
          timestamp: new Date('2024-01-15T10:36:00')
        }
      ],
      'session-2': [
        {
          id: 1,
          type: 'bot',
          text: "Hello! I'm Karla, your Damp and Mould AI Assistant. How can I help you today?",
          timestamp: new Date('2024-01-14T15:45:00')
        },
        {
          id: 2,
          type: 'user',
          text: "What are my landlord's responsibilities for repairs?",
          timestamp: new Date('2024-01-14T15:46:00')
        },
        {
          id: 3,
          type: 'bot',
          text: "Your landlord has several legal responsibilities for repairs:\n\n**Structural repairs**: Roof, walls, foundations\n**Heating and hot water**: Boilers, radiators\n**Plumbing**: Pipes, drains, toilets\n**Electrical**: Wiring, sockets, lighting\n**Damp and mould**: Must be addressed promptly\n\nThey must respond within reasonable timeframes. For urgent issues, they should respond within 24 hours.",
          timestamp: new Date('2024-01-14T15:47:00')
        },
        {
          id: 4,
          type: 'user',
          text: "What if they refuse to fix something?",
          timestamp: new Date('2024-01-14T15:48:00')
        },
        {
          id: 5,
          type: 'bot',
          text: "If your landlord refuses to make repairs, you have several options:\n\n**1. Document Everything**\n- Keep all communication in writing\n- Take photos and videos\n- Keep receipts for any temporary fixes\n\n**2. Contact Environmental Health**\n- Your local council can inspect the property\n- They can serve improvement notices\n- They can prosecute landlords who fail to comply\n\n**3. Legal Action**\n- Small claims court for damages\n- County court for specific performance\n- Rent repayment orders\n\n**4. Withhold Rent (Carefully)**\n- Only in specific circumstances\n- Must follow proper procedures\n- Risk of eviction if done incorrectly\n\n**5. Emergency Repairs**\n- You can arrange urgent repairs\n- Recover costs from rent (with notice)\n- Maximum £250 per repair\n\nWould you like me to help you with any of these steps?",
          timestamp: new Date('2024-01-14T15:49:00')
        },
        {
          id: 6,
          type: 'user',
          text: "How do I contact environmental health?",
          timestamp: new Date('2024-01-14T15:50:00')
        },
        {
          id: 7,
          type: 'bot',
          text: "Here's how to contact Environmental Health:\n\n**Find Your Council:**\n1. Go to gov.uk/find-local-council\n2. Enter your postcode\n3. Look for 'Environmental Health' or 'Housing Standards'\n\n**What to Prepare:**\n- Photos and videos of the issues\n- Timeline of when you reported problems\n- Copies of all communication with landlord\n- Details of any health impacts\n\n**What They'll Do:**\n1. Inspect your property within 5 working days\n2. Assess if issues breach housing standards\n3. Serve improvement notices if necessary\n4. Follow up to ensure compliance\n\n**Contact Methods:**\n- Phone: Usually available during office hours\n- Email: Often preferred for documentation\n- Online form: Available on most council websites\n\n**Emergency Issues:**\n- Call immediately for serious health risks\n- They may visit same day for emergencies\n\nWould you like me to help you prepare your complaint?",
          timestamp: new Date('2024-01-14T15:51:00')
        }
      ],
      'session-3': [
        {
          id: 1,
          type: 'bot',
          text: "Hello! I'm Karla, your Damp and Mould AI Assistant. How can I help you today?",
          timestamp: new Date('2024-01-13T09:20:00')
        },
        {
          id: 2,
          type: 'user',
          text: "There's a water leak in my ceiling. What should I do?",
          timestamp: new Date('2024-01-13T09:21:00')
        },
        {
          id: 3,
          type: 'bot',
          text: "A water leak is an emergency that needs immediate action:\n\n**Immediate steps**:\n1. Turn off water if safe to do so\n2. Move valuables away from the area\n3. Place buckets to catch water\n4. Contact your landlord immediately\n\n**Document everything**: Take photos and videos\n\n**If landlord doesn't respond**: Contact your local council's environmental health department.",
          timestamp: new Date('2024-01-13T09:22:00')
        }
      ],
      'session-4': [
        {
          id: 1,
          type: 'bot',
          text: "Hello! I'm Karla, your Damp and Mould AI Assistant. How can I help you today?",
          timestamp: new Date('2024-01-12T14:15:00')
        },
        {
          id: 2,
          type: 'user',
          text: "Can my landlord evict me for reporting problems?",
          timestamp: new Date('2024-01-12T14:16:00')
        },
        {
          id: 3,
          type: 'bot',
          text: "**No, your landlord cannot legally evict you for reporting problems.** This would be a retaliatory eviction and is illegal.\n\n**Your rights**:\n- You have the right to report disrepair\n- You have the right to contact environmental health\n- You have the right to withhold rent (in certain circumstances)\n\n**Protection**: If you've lived there less than 6 months, they cannot serve a Section 21 notice for 6 months after you report issues.",
          timestamp: new Date('2024-01-12T14:17:00')
        }
      ],
      'session-5': [
        {
          id: 1,
          type: 'bot',
          text: "Hello! I'm Karla, your Damp and Mould AI Assistant. How can I help you today?",
          timestamp: new Date('2024-01-11T11:00:00')
        },
        {
          id: 2,
          type: 'user',
          text: "How can I prevent damp and mould in my home?",
          timestamp: new Date('2024-01-11T11:01:00')
        },
        {
          id: 3,
          type: 'bot',
          text: "Here are effective ways to prevent damp and mould:\n\n**Ventilation**:\n- Open windows regularly\n- Use extractor fans in bathrooms/kitchens\n- Don't block air vents\n\n**Heating**:\n- Keep home warm (18-21°C)\n- Don't let rooms get too cold\n\n**Daily habits**:\n- Wipe condensation from windows\n- Dry clothes outside when possible\n- Don't overfill wardrobes\n\n**Maintenance**:\n- Report leaks immediately\n- Check for blocked gutters\n- Ensure proper insulation",
          timestamp: new Date('2024-01-11T11:02:00')
        }
      ]
    };
    
    return chatHistories[sessionId] || [
      {
        id: 1,
        type: 'bot',
        text: "Hello! I'm Karla, your Damp and Mould AI Assistant. How can I help you today?",
        timestamp: new Date()
      }
    ];
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
    setShowChatHistory(true);
  };

  const handleCloseChatHistory = () => {
    setShowChatHistory(false);
  };

  const handleSelectChat = (chat) => {
    const chatMessages = getChatHistory(chat.sessionId);
    if (chatMessages.length > 0) {
      setMessages(chatMessages);
      setSessionId(chat.sessionId);
    }
    setShowChatHistory(false);
    
    // Focus on textarea after loading chat
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  const formatDate = (date) => {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
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
                      <div className="flex items-center justify-end mt-2 space-x-2">
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  {chatHistory.map((chat) => (
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
                  ))}
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