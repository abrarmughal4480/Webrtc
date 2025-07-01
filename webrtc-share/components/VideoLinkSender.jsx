"use client"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, XIcon, Move } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import Link from "next/link"
import Image from "next/image"
import { io } from "socket.io-client"
import { useUser } from "@/provider/UserProvider"
import { useDialog } from "@/provider/DilogsProvider"
import CustomDialog from "@/components/dialogs/CustomDialog"

export default function VideoLinkSender({ isOpen, onClose, onSuccess }) {
  const { user, isAuth } = useUser();
  const { getUserMessageSettings, messageSettingsLoaded, loadMessageSettings } = useDialog();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactMethod, setContactMethod] = useState('email');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastTypingTime, setLastTypingTime] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isManualSelection, setIsManualSelection] = useState(false);
  const [linkAccepted, setLinkAccepted] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });

  const phoneInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const socketRef = useRef(null);
  const modalRef = useRef(null);
  const dragHandleRef = useRef(null);

  // Socket connection for real-time updates
  useEffect(() => {
    if (dialogOpen && token) {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const socketUrl = backendUrl.replace('/api/v1', '');
      
      socketRef.current = io(socketUrl, {
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        console.log('📡 VideoLinkSender connected to socket');
        setSocketConnected(true);
        socketRef.current.emit('admin-waiting', token);
      });

      socketRef.current.on('user-joined-room', (roomToken) => {
        console.log('✅ User opened the link:', roomToken);
        if (roomToken === token) {
          setLinkAccepted(true);
          toast.success("User has opened the video link!");
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('📡 VideoLinkSender disconnected from socket');
        setSocketConnected(false);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [dialogOpen, token]);

  // Cleanup socket on component unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Auto-focus switching logic
  useEffect(() => {
    let focusTimer;

    if (isOpen && !isManualSelection) {
      focusTimer = setInterval(() => {
        const currentTime = Date.now();
        if (!isTyping && currentTime - lastTypingTime > 3000) {
          if (contactMethod === 'phone') {
            emailInputRef.current?.focus();
            setContactMethod('email');
          } else {
            phoneInputRef.current?.focus();
            setContactMethod('phone');
          }
        }
      }, 3000);
    }

    return () => {
      clearInterval(focusTimer);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [isOpen, isTyping, lastTypingTime, contactMethod, isManualSelection]);

  // Reset modal position when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Drag functionality
  const handleMouseDown = (e) => {
    if (!modalRef.current) return;
    
    setIsDragging(true);
    const modalRect = modalRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    // Calculate offset from modal's top-left corner
    setDragOffset({
      x: e.clientX - modalRect.left,
      y: e.clientY - modalRect.top
    });
    
    // Prevent text selection while dragging
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !modalRef.current) return;

      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      // Calculate new position relative to center
      let newX = e.clientX - viewport.width / 2 - dragOffset.x + modalRef.current.offsetWidth / 2;
      let newY = e.clientY - viewport.height / 2 - dragOffset.y + modalRef.current.offsetHeight / 2;

      // Boundary constraints - keep modal visible
      const modalWidth = modalRef.current.offsetWidth;
      const modalHeight = modalRef.current.offsetHeight;
      
      const maxX = viewport.width / 2 - 100; // Keep at least 100px visible
      const minX = -viewport.width / 2 + 100;
      const maxY = viewport.height / 2 - 100;
      const minY = -viewport.height / 2 + 100;

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      setModalPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleInputChange = (value, type) => {
    setIsTyping(true);
    setLastTypingTime(Date.now());
    
    if (type === 'phone') {
      setPhone(value);
      setContactMethod('phone');
    } else {
      setEmail(value);
      setContactMethod('email');
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  // Helper functions for user data
  const isValidImageUrl = (url) => {
    if (!url) return false;
    return url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://');
  };

  const getProfileImage = () => {
    if (user?.landlordInfo?.useLandlordLogoAsProfile && user?.landlordInfo?.landlordLogo) {
      if (isValidImageUrl(user.landlordInfo.landlordLogo)) {
        return user.landlordInfo.landlordLogo;
      }
    }
    
    if (user?.landlordInfo?.officerImage) {
      if (isValidImageUrl(user.landlordInfo.officerImage)) {
        return user.landlordInfo.officerImage;
      }
    }
    
    return null;
  };

  const getLandlordLogo = () => {
    if (user?.landlordInfo?.landlordLogo && isValidImageUrl(user.landlordInfo.landlordLogo)) {
      return user.landlordInfo.landlordLogo;
    }
    return null;
  };
  // Normalize phone number to E.164 (UK default)
  const normalizePhoneNumber = (number) => {
    let cleaned = number.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    if (cleaned.startsWith('0')) {
      // 07123456789 => +447123456789
      return '+44' + cleaned.slice(1);
    }
    if (cleaned.length === 10 && cleaned.startsWith('7')) {
      // 7123456789 => +447123456789
      return '+44' + cleaned;
    }
    // fallback: just return as is
    return cleaned;
  };

  const validatePhoneNumber = (number) => {
    // Accepts numbers starting with + and 10-15 digits, or UK local formats
    const cleaned = number.replace(/[\s\-()]/g, '');
    if (/^\+[1-9]\d{9,14}$/.test(cleaned)) return true;
    if (/^0[1-9]\d{8,12}$/.test(cleaned)) return true; // UK local with 0
    if (/^7\d{9}$/.test(cleaned)) return true; // UK local without 0
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!phone && !email) {
      toast.error("Please enter either phone number or email address");
      return;
    }
    // Phone validation for international and UK local numbers
    if (phone && !validatePhoneNumber(phone)) {
      toast.error("Please enter a valid phone number (e.g. +447123456789 or 07123456789)");
      return;
    }

    if (isAuth == false) {
      toast("Please Login First");
      return
    }

    setIsLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const queryParams = new URLSearchParams();
      if (phone) queryParams.append('number', normalizePhoneNumber(phone));
      if (email) queryParams.append('email', email);
      if (user?._id) queryParams.append('senderId', user._id);
      const res = await axios.get(`${backendUrl}/send-token?${queryParams.toString()}`);
      setToken(res.data.token);
      setDialogOpen(true);
      setLinkAccepted(false);
      toast.success("Video link sent successfully");
      setPhone('');
      setEmail('');
      setIsManualSelection(false);
      setModalPosition({ x: 0, y: 0 });
      if (onSuccess) {
        onSuccess(res.data.token);
      }
    } catch (error) {
      console.error('Error sending token:', error);
      toast.error("Failed to send video link. Please try again.");
    } finally {
      setIsLoading(false);
      setIsManualSelection(false);
    }
  };

  const handleClose = () => {
    setPhone('');
    setEmail('');
    setIsManualSelection(false);
    setModalPosition({ x: 0, y: 0 });
    onClose();
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setToken('');
    setLinkAccepted(false);
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Form Modal - only show when dialog is not open */}
      {!dialogOpen && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-[9999] px-4">
          <div 
            ref={modalRef}
            className={`bg-white rounded-xl shadow-lg p-8 relative overflow-hidden transition-shadow duration-200 max-w-4xl w-full ${
              isDragging ? 'shadow-2xl cursor-grabbing' : 'cursor-default'
            }`}
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${modalPosition.x}px), calc(-50% + ${modalPosition.y}px))`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              zIndex: 10000
            }}
          >
          {/* Drag Handle Header */}
          <div 
            className="absolute top-0 left-0 right-0 h-12 bg-white rounded-t-xl flex items-center justify-between px-4"
          >
            <div 
              ref={dragHandleRef}
              className={`flex items-center gap-1 bg-purple-600 text-white px-2 py-0.5 rounded-md ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onMouseDown={handleMouseDown}
            >
              <Move className="w-3 h-3" />
              <span className="text-xs p-1 font-medium">Drag to move</span>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="text-gray-600 hover:text-gray-800 cursor-pointer transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="pt-8">
            <h3 className="text-xl font-semibold mb-6 text-center">
              Enter your customer's mobile number or email address below to send an instant video link
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <input
                  ref={phoneInputRef}
                  type="text"
                  placeholder="Enter customer mobile number"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 ${contactMethod === 'phone' ? 'bg-white' : 'bg-gray-100'}`}
                  value={phone}
                  onChange={(e) => handleInputChange(e.target.value, 'phone')}
                  onClick={() => {
                    setContactMethod('phone');
                    setIsManualSelection(true);
                  }}
                />
              </div>

              <div className="self-center">
                <span className="text-gray-500">or</span>
              </div>

              <div className="flex-1 w-full">
                <input
                  ref={emailInputRef}
                  type="email"
                  placeholder="Enter customer email address"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 ${contactMethod === 'email' ? 'bg-white' : 'bg-gray-100'}`}
                  value={email}
                  onChange={(e) => handleInputChange(e.target.value, 'email')}
                  onClick={() => {
                    setContactMethod('email');
                    setIsManualSelection(true);
                  }}
                />
              </div>

              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                disabled={isDragging}
              >
                {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : <>Send<br />video link</>}
              </button>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* Success Dialog */}
      <CustomDialog open={dialogOpen} setOpen={handleDialogClose} heading={"Link sent successfully"}>
        <div className="h-[33rem] p-16 flex flex-col items-center justify-center">
          <Image src="/paper-plane.svg" alt="video-link-dialog-bg" className='object-contain' width={200} height={200} />
          <div className='mt-5'>
            <div className='flex items-start gap-2'>
              <img className='w-8 h-8' src='/icons/single-check.svg' />
              <div className='flex flex-col gap-0 mb-1'>
                <h2 className="text-2xl font-bold text-left">
                  Link sent successfully
                </h2>
                <p>Please wait a second for user to open and accept link...</p>
              </div>
            </div>
            
            <div className={`flex items-start gap-2 mt-5 transition-opacity duration-500 ${linkAccepted ? 'opacity-100' : 'opacity-30'}`}>
              <img 
                className={`w-8 h-8 transition-all duration-500 ${linkAccepted ? 'filter-none' : 'grayscale'}`} 
                src='/icons/double-check.svg' 
              />
              <div className='flex flex-col gap-0 mb-1'>
                <h2 className={`text-2xl font-bold text-left transition-colors duration-500 ${linkAccepted ? 'text-green-600' : 'text-gray-400'}`}>
                  {linkAccepted ? 'Link accepted by user' : 'Waiting for user to open link...'}
                </h2>
              </div>
            </div>

            <Link 
              href={`/room/admin/${token}`} 
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 cursor-pointer h-12 rounded-3xl mt-10 text-2xl block w-full text-center transition-all duration-300"
            >
              Join Video Session
            </Link>

            <div className='flex items-start mt-4 justify-center'>
              <p className='text-center'>
                <strong className='text-red-400 whitespace-pre'>Tip - </strong> 
                Ask the user to check their spam folder for the email link, if they can't see it!
              </p>
            </div>
          </div>
        </div>
      </CustomDialog>
    </>
  );
}
