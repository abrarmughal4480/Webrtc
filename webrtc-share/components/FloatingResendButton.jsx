"use client"
import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import ResendLinkDialog from './dialogs/ResendLinkDialog';
import { useUser } from '@/provider/UserProvider';

const FloatingResendButton = ({ onOpenResendDialog, roomUserInfo }) => {
  const { user } = useUser();
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

  // Get senderId from available sources
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
    const buttonCenterX = rect.left + rect.width / 2;
    const buttonCenterY = rect.top + rect.height / 2;
    
    dragStartRef.current = {
      offsetX: e.clientX - buttonCenterX,
      offsetY: e.clientY - buttonCenterY
    };

    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e) => {
    if (holdTimerRef.current) {
      // Check if mouse has moved significantly (more than 5px)
      const deltaX = Math.abs(e.clientX - initialPositionRef.current.x);
      const deltaY = Math.abs(e.clientY - initialPositionRef.current.y);
      
      if (deltaX > 5 || deltaY > 5) {
        hasMovedRef.current = true;
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
        setIsDragging(true);
      }
    }

    if (isDragging) {
      // Calculate new position based on mouse position
      const newX = e.clientX - dragStartRef.current.offsetX;
      const newY = e.clientY - dragStartRef.current.offsetY;
      
      // Get button dimensions for bounds checking
      const buttonWidth = 200; // Approximate button width
      const buttonHeight = 80; // Approximate button height
      
      // Keep button within viewport bounds
      const maxX = window.innerWidth - buttonWidth;
      const maxY = window.innerHeight - buttonHeight;
      
      // Convert to bottom-right positioning
      const bottomPosition = window.innerHeight - newY - buttonHeight;
      const rightPosition = window.innerWidth - newX - buttonWidth;
      
      setPosition({
        x: Math.max(0, Math.min(rightPosition, maxX)),
        y: Math.max(0, Math.min(bottomPosition, maxY))
      });
    }
  };

  const handleMouseUp = (e) => {
    // Clear hold timer
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    
    setIsDragging(false);
    hasMovedRef.current = false;
    
    if (e) {
      e.stopPropagation();
    }
  };

  // Touch event handlers for mobile support
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    handleMouseDown({
      clientX: touch.clientX,
      clientY: touch.clientY,
      target: e.target,
      preventDefault: () => e.preventDefault()
    });
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    handleMouseMove({
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    e.preventDefault(); // Prevent scrolling while dragging
  };

  const handleTouchEnd = (e) => {
    handleMouseUp();
  };

  // Add global mouse and touch event listeners
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleMouseMove(e);
      };
      
      const handleGlobalMouseUp = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleMouseUp(e);
      };
      
      const handleGlobalTouchMove = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleTouchMove(e);
      };
      
      const handleGlobalTouchEnd = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleTouchEnd(e);
      };
      
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalMouseUp, { passive: false });
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [isDragging, showDialog]);

  // Cleanup effect when dialog opens or closes
  useEffect(() => {
    // Reset drag state when dialog state changes
    setIsDragging(false);
    hasMovedRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, [showDialog]);

  const handleResendSuccess = () => {
    toast.success('Link resent successfully!');
    // Update the last sent link timestamp and reset timer
    if (lastSentLink) {
      const updatedLink = { 
        ...lastSentLink, 
        timestamp: Date.now(),
        senderId: getSenderId() // Ensure senderId is preserved
      };
      localStorage.setItem('lastSentLink', JSON.stringify(updatedLink));
      setLastSentLink(updatedLink);
      setTimeLeft(600); // Reset timer to 10 minutes
    }
  };

  if (!lastSentLink) return null;

  return (
    <>
      <div 
        ref={buttonRef}
        className="fixed cursor-move"
        style={{ 
          bottom: `${position.y}px`, 
          right: `${position.x}px`,
          userSelect: 'none',
          touchAction: 'none', // Prevent default touch actions
          pointerEvents: showDialog ? 'none' : 'auto',
          zIndex: isDragging ? 9999 : 50
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Main Button */}
        <div
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            relative group
            bg-amber-500 hover:bg-amber-600 
            text-white font-medium
            rounded-full shadow-lg
            transition-all duration-300 ease-in-out
            transform hover:scale-105
            flex items-center gap-3
            px-6 py-4
            min-w-[200px]
            cursor-pointer
            ${isHovered ? 'shadow-xl' : 'shadow-lg'}
            ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'}
            ${isDragging ? 'shadow-2xl' : ''}
          `}
          style={{
            transition: isDragging ? 'none' : 'all 0.3s ease-in-out',
            pointerEvents: isDragging || showDialog ? 'none' : 'auto'
          }}
        >
          {/* Icon */}
          <div className="flex-shrink-0">
            <RotateCcw className={`w-5 h-5 ${isDragging ? 'animate-spin' : ''}`} />
          </div>

          {/* Text */}
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold">
              {isDragging ? 'Dragging...' : 'Resend Link'}
            </span>
            <span className="text-xs opacity-90">
              {isDragging ? 'Release to drop' : 'Edit & resend'}
            </span>
          </div>

          {/* Timer Badge */}
          <div className="flex-shrink-0 ml-auto">
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 py-1">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-mono">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="
              close-btn
              absolute -top-2 -right-2
              bg-red-500 hover:bg-red-600
              text-white
              rounded-full p-1
              transition-all duration-200
              opacity-0 group-hover:opacity-100
              transform scale-75 group-hover:scale-100
            "
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Tooltip */}
        {isHovered && !isDragging && (
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
            Click to edit and resend the last sent link
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        )}
      </div>

      {/* Resend Dialog */}
      <ResendLinkDialog
        isOpen={showDialog}
        onClose={handleDialogClose}
        originalPhone={lastSentLink?.phone || ''}
        originalEmail={lastSentLink?.email || ''}
        token={lastSentLink?.token || ''}
        senderId={getSenderId()}
        onResendSuccess={handleResendSuccess}
      />
    </>
  );
};

export default FloatingResendButton; 