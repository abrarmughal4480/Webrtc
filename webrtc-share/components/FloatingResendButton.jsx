"use client"
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { RotateCcw, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import ResendLinkDialog from './dialogs/ResendLinkDialog';
import { useUser } from '@/provider/UserProvider';
import { useSearchParams } from 'next/navigation';

const FloatingResendButtonInner = ({ onOpenResendDialog, roomUserInfo }) => {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [lastSentLink, setLastSentLink] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 }); // Default position
  const buttonRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragStartTimeRef = useRef(0);
  const holdTimerRef = useRef(null);
  const hasMovedRef = useRef(false);
  const initialPositionRef = useRef({ x: 0, y: 0 });

  // Get senderId from URL parameters as fallback
  const getSenderId = () => {
    // First try to get from user context
    if (user?._id) {
      console.log('🔍 getSenderId: Found from user context:', user._id);
      return user._id;
    }
    
    // Then try to get from room user info (if on room page)
    if (roomUserInfo?._id) {
      console.log('🔍 getSenderId: Found from roomUserInfo:', roomUserInfo._id);
      return roomUserInfo._id;
    }
    
    // Then try to get from URL parameters (sid)
    const sidFromUrl = searchParams.get('sid');
    if (sidFromUrl) {
      console.log('🔍 getSenderId: Found from URL sid:', sidFromUrl);
      return sidFromUrl;
    }
    
    // Finally try to get from stored localStorage data
    const storedLink = localStorage.getItem('lastSentLink');
    if (storedLink) {
      try {
        const linkData = JSON.parse(storedLink);
        if (linkData.senderId) {
          console.log('🔍 getSenderId: Found from localStorage:', linkData.senderId);
          return linkData.senderId;
        }
      } catch (error) {
        console.error('Error parsing last sent link:', error);
      }
    }
    
    console.log('🔍 getSenderId: No senderId found');
    return null;
  };

  // Check localStorage every second for new links
  useEffect(() => {
    const checkForNewLinks = () => {
      const storedLink = localStorage.getItem('lastSentLink');
      
      if (storedLink) {
        try {
          const linkData = JSON.parse(storedLink);
          const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
          
          if (linkData.timestamp > tenMinutesAgo) {
            setLastSentLink(linkData);
            
            // Calculate remaining time based on stored timestamp
            const elapsedTime = Math.floor((Date.now() - linkData.timestamp) / 1000);
            const remainingTime = Math.max(0, 600 - elapsedTime); // 600 seconds = 10 minutes
            
            if (remainingTime > 0) {
              setTimeLeft(remainingTime);
            } else {
              // Time has expired, clean up
              localStorage.removeItem('lastSentLink');
              setLastSentLink(null);
              toast.info('Resend time expired');
            }
          } else {
            // Link has expired, clean up
            localStorage.removeItem('lastSentLink');
            setLastSentLink(null);
          }
        } catch (error) {
          console.error('Error parsing last sent link:', error);
          localStorage.removeItem('lastSentLink');
          setLastSentLink(null);
        }
      } else {
        setLastSentLink(null);
      }
    };

    // Check immediately
    checkForNewLinks();

    // Check every second
    const interval = setInterval(checkForNewLinks, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Only start timer if we have a valid lastSentLink
    if (!lastSentLink) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time expired, clean up
          localStorage.removeItem('lastSentLink');
          setLastSentLink(null);
          toast.info('Resend time expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lastSentLink]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleClick = () => {
    // Only open dialog if not dragging and not a long hold
    if (!isDragging && !hasMovedRef.current && lastSentLink) {
      handleDialogOpen();
    } else if (!lastSentLink) {
      toast.error('No link available to resend');
    }
  };

  // Handle dialog close with proper cleanup
  const handleDialogClose = () => {
    setShowDialog(false);
    // Reset drag state when dialog closes
    setIsDragging(false);
    hasMovedRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // Handle dialog open with proper cleanup
  const handleDialogOpen = () => {
    setShowDialog(true);
    // Reset drag state when dialog opens
    setIsDragging(false);
    hasMovedRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setLastSentLink(null);
    localStorage.removeItem('lastSentLink');
    toast.success('Resend button dismissed');
  };

  // Enhanced drag and drop functionality
  const handleMouseDown = (e) => {
    // Don't start drag on close button
    if (e.target.closest('button') && e.target.closest('button').classList.contains('close-btn')) {
      return;
    }

    // Reset drag state
    hasMovedRef.current = false;
    dragStartTimeRef.current = Date.now();
    initialPositionRef.current = { x: e.clientX, y: e.clientY };
    
    // Start hold timer (2 seconds)
    holdTimerRef.current = setTimeout(() => {
      if (!hasMovedRef.current) {
        setIsDragging(true);
      }
    }, 2000);

    // Set drag start position - track mouse position relative to button center
    const rect = buttonRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    // Add global event listeners
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleGlobalMouseMove = (e) => {
    if (!buttonRef.current) return;

    const deltaX = e.clientX - initialPositionRef.current.x;
    const deltaY = e.clientY - initialPositionRef.current.y;
    const moveThreshold = 5; // 5px threshold

    if (Math.abs(deltaX) > moveThreshold || Math.abs(deltaY) > moveThreshold) {
      hasMovedRef.current = true;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    }

    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - dragStartRef.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragStartRef.current.y));
      
      setPosition({ x: newX, y: newY });
    }
  };

  const handleGlobalMouseUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      // Save position to localStorage
      localStorage.setItem('floatingButtonPosition', JSON.stringify(position));
    }
    
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    // Remove global event listeners
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    initialPositionRef.current = { x: touch.clientX, y: touch.clientY };
    hasMovedRef.current = false;
    
    holdTimerRef.current = setTimeout(() => {
      if (!hasMovedRef.current) {
        setIsDragging(true);
      }
    }, 2000);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const deltaX = touch.clientX - initialPositionRef.current.x;
    const deltaY = touch.clientY - initialPositionRef.current.y;
    const moveThreshold = 10; // 10px threshold for touch

    if (Math.abs(deltaX) > moveThreshold || Math.abs(deltaY) > moveThreshold) {
      hasMovedRef.current = true;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    }

    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - 60, touch.clientX - dragStartRef.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 60, touch.clientY - dragStartRef.current.y));
      
      setPosition({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = (e) => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem('floatingButtonPosition', JSON.stringify(position));
    }
    
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // Load saved position on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem('floatingButtonPosition');
    if (savedPosition) {
      try {
        const parsedPosition = JSON.parse(savedPosition);
        setPosition(parsedPosition);
      } catch (error) {
        console.error('Error parsing saved position:', error);
      }
    }
  }, []);

  // Show button when lastSentLink is available
  useEffect(() => {
    if (lastSentLink) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [lastSentLink]);

  const handleResendSuccess = () => {
    // Close dialog and hide button
    setShowDialog(false);
    setIsVisible(false);
    setLastSentLink(null);
    localStorage.removeItem('lastSentLink');
    
    // Notify parent component if callback provided
    if (onOpenResendDialog) {
      onOpenResendDialog();
    }
    
    toast.success('Link resent successfully!');
  };

  // Don't render if no lastSentLink or not visible
  if (!lastSentLink || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <div
        ref={buttonRef}
        className={`fixed z-50 transition-all duration-300 ease-in-out ${
          isHovered ? 'scale-110' : 'scale-100'
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: `translate(-50%, -50%) ${isHovered ? 'scale(1.1)' : 'scale(1)'}`,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative">
          {/* Main Button */}
          <button
            onClick={handleClick}
            className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-300 ${
              isDragging 
                ? 'bg-blue-600 text-white shadow-xl' 
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl'
            }`}
            style={{
              minWidth: '120px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm font-medium">Resend</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className="text-xs">{formatTime(timeLeft)}</span>
            </div>
          </button>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors close-btn"
            style={{
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              border: '2px solid white',
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Resend Dialog */}
      <ResendLinkDialog
        isOpen={showDialog}
        onClose={handleDialogClose}
        originalPhone={lastSentLink?.phone}
        originalEmail={lastSentLink?.email}
        token={lastSentLink?.token}
        senderId={getSenderId()}
        onResendSuccess={handleResendSuccess}
      />
    </>
  );
};

// Wrapper component with Suspense boundary
const FloatingResendButton = (props) => {
  return (
    <Suspense fallback={null}>
      <FloatingResendButtonInner {...props} />
    </Suspense>
  );
};

export default FloatingResendButton; 