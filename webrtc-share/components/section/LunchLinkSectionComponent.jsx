'use client'
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { useUser } from '@/provider/UserProvider';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { io } from "socket.io-client";
import CustomDialog from "@/components/dialogs/CustomDialog";
import ContactConfirmationDialog from "@/components/dialogs/ContactConfirmationDialog";
import Image from "next/image";
import Link from "next/link";

export const LaunchLinkSection = () => {
  const { user, isAuth } = useUser();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkAccepted, setLinkAccepted] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [tempPhone, setTempPhone] = useState('');
  const [tempEmail, setTempEmail] = useState('');

  const socketRef = useRef(null);

  // Socket connection for real-time updates
  useEffect(() => {
    if (dialogOpen && token) {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const socketUrl = backendUrl.replace('/api/v1', '');
      
      socketRef.current = io(socketUrl, {
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        console.log('📡 LunchLinkSection connected to socket');
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
        console.log('📡 LunchLinkSection disconnected from socket');
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

  const launchVideoLink = async () => {
    if (!isAuth) {
      toast("Please Login First", {
        description: "You need to be logged in to create video links"
      });
      return;
    }

    // Check if user has resident role
    if (user?.role === 'resident') {
      toast("Access Restricted", {
        description: "Resident users cannot create video links"
      });
      return;
    }

    if (!user?._id || user._id.length !== 24) {
      toast.error("User ID is invalid. Please re-login or contact support.");
      return;
    }

    if (!phone && !email) {
      toast("Please enter phone or email", {
        description: "Enter either a phone number or email address"
      });
      return;
    }

    // Show confirmation popup instead of sending directly
    setTempPhone(phone);
    setTempEmail(email);
    setShowConfirmation(true);
  };

  const handleConfirmSend = async () => {
    setIsLoading(true);
    setShowConfirmation(false);
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      const profileData = {
        number: tempPhone,
        email: tempEmail
      };
      
      if (user?.landlordInfo?.landlordName) {
        profileData.landlordName = user.landlordInfo.landlordName;
      }
      
      // Helper functions for profile data
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

      const landlordLogoUrl = getLandlordLogo();
      if (landlordLogoUrl) {
        profileData.landlordLogo = landlordLogoUrl;
      }
      
      const profileImageUrl = getProfileImage();
      if (profileImageUrl) {
        profileData.profileImage = profileImageUrl;
      }
      
      profileData.tokenLandlordInfo = {
        landlordName: user?.landlordInfo?.landlordName || null,
        landlordLogo: landlordLogoUrl,
        profileImage: profileImageUrl,
        useLandlordLogoAsProfile: user?.landlordInfo?.useLandlordLogoAsProfile || false,
        profileShape: user?.landlordInfo?.profileShape || 'circle'
      };
      
      const queryParams = new URLSearchParams();
      if (profileData.number) queryParams.append('number', profileData.number);
      if (profileData.email) queryParams.append('email', profileData.email);
      if (profileData.landlordName) queryParams.append('landlordName', profileData.landlordName);
      if (profileData.landlordLogo) queryParams.append('landlordLogo', profileData.landlordLogo);
      if (profileData.profileImage) queryParams.append('profileImage', profileData.profileImage);
      if (profileData.tokenLandlordInfo) {
        queryParams.append('tokenLandlordInfo', JSON.stringify(profileData.tokenLandlordInfo));
      }
      
      if (user?._id) queryParams.append('senderId', user._id);
      
      const res = await axios.get(`${backendUrl}/send-token?${queryParams.toString()}`);
      
      setToken(res.data.token);
      setDialogOpen(true);
      setLinkAccepted(false);
      
      // Store last sent link info for resend functionality
      const lastSentInfo = {
        token: res.data.token,
        phone: tempPhone,
        email: tempEmail,
        timestamp: Date.now()
      };
      localStorage.setItem('lastSentLink', JSON.stringify(lastSentInfo));
      
      // Dispatch custom event to notify dashboard about localStorage update
      window.dispatchEvent(new Event('lastSentLinkUpdated'));
      
      toast.success("Video link sent successfully! Look for the floating button to resend or edit.", {
        duration: 5000
      });
      
      // Clear form
      setPhone('');
      setEmail('');
      
    } catch (error) {
      console.error('Error sending token:', error);
      toast.error("Failed to send video link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditContact = () => {
    setShowConfirmation(false);
    setPhone(tempPhone);
    setEmail(tempEmail);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      launchVideoLink();
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setToken('');
    setLinkAccepted(false);
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  return (
    <>
      <section id="launch-link" className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className={`max-w-3xl mx-auto text-center ${!isAuth ? 'mb-6 md:mb-8' : 'mb-2 md:mb-3'}`}>
            <a
              href="#launch"
              className="inline-block text-black font-bold py-2 md:py-3 px-6 md:px-8 rounded-full text-2xl md:text-3xl transition-all transform hover:scale-105 mb-3 md:mb-4"
            >
              Launch new video link
            </a>

            {/* Only show login/signup text if user is not authenticated */}
            {!isAuth && (
              <div className="flex justify-center items-center space-x-2 mt-2 text-sm md:text-base">
                <a href="#login" className="text-blue-500 hover:underline">Log in</a>
                {/* <span>or</span>
                <a href="#signup" className="text-blue-500 hover:underline">Sign up</a> */}
                <span>to launch a video link</span>
              </div>
            )}
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 -mt-2 p-4 md:p-8 relative overflow-hidden">
            <h3 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-center px-2">
              Enter your customer's mobile number or email address below<br />
              to send an instant video link
            </h3>

            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <div className="flex-1 w-full relative">
                <input
                  type="text"
                  placeholder="Enter customer mobile number"
                  className={`w-full px-3 md:px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm md:text-base pr-10${!isAuth || user?.role === 'resident' ? ' cursor-not-allowed opacity-50' : ''}`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!isAuth || user?.role === 'resident'}
                />
                {(!isAuth || user?.role === 'resident') && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="9" cy="9" r="7" stroke="#EF4444" strokeWidth="2" fill="none" />
                      <line x1="6" y1="6" x2="12" y2="12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
              </div>

              <div className="self-center">
                <span className="text-gray-500 text-sm md:text-base">or</span>
              </div>

              <div className="flex-1 w-full relative">
                <input
                  type="email"
                  placeholder="Enter customer email address"
                  className={`w-full px-3 md:px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm md:text-base pr-10${!isAuth || user?.role === 'resident' ? ' cursor-not-allowed opacity-50' : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!isAuth || user?.role === 'resident'}
                />
                {(!isAuth || user?.role === 'resident') && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="9" cy="9" r="7" stroke="#EF4444" strokeWidth="2" fill="none" />
                      <line x1="6" y1="6" x2="12" y2="12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
              </div>

              <button
                onClick={launchVideoLink}
                disabled={isLoading || user?.role === 'resident'}
                className={`bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-2 px-3 md:px-4 rounded-md transition-colors w-full md:w-auto text-sm md:text-base${user?.role === 'resident' ? ' cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <>Launch<br className="hidden md:block" /><span className="md:hidden"> </span>video link</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className='flex items-center justify-center mt-6 md:mt-10'>
          <img src="/devices.svg" alt="Videodesk" className="w-48 md:w-60 mb-2" />
        </div>
      </section>

      {/* Enhanced Confirmation Dialog */}
      <ContactConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSend}
        onEdit={handleEditContact}
        phone={tempPhone}
        email={tempEmail}
        isLoading={isLoading}
        title="Are these details correct?"
        description="Please check the contact details before sending the video link"
        confirmText="Send Link"
        editText="Edit"
      />

      {/* Success Dialog - Same as Dashboard */}
      <CustomDialog open={dialogOpen} setOpen={handleDialogClose} heading={"Link sent successfully"}>
        <div className="h-[33rem] p-16 flex flex-col items-center justify-center">
          <Image src="/paper-plane.svg" alt="video-link-dialog-bg" className='object-contain' width={150} height={150} />
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
};
