"use client"
import { Button } from '@/components/ui/button'
import React, { useState, use, useRef, useEffect } from 'react'
import { PhoneCall, Monitor, Video, Loader2 } from 'lucide-react'
import { DialogComponent } from '@/components/dialogs/DialogCompnent'
import Image from 'next/image'
import useWebRTC from '@/hooks/useWebRTC'
import { io } from "socket.io-client"
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'

const page = ({params}) => {
  const {id} = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(true);  const [profileData, setProfileData] = useState({});
  const [redirectUrl, setRedirectUrl] = useState('');
  const [isDefaultRedirectUrl, setIsDefaultRedirectUrl] = useState(true);
  const [showRedirectDialog, setShowRedirectDialog] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [messageSettings, setMessageSettings] = useState({});
  const [buttonColor, setButtonColor] = useState('bg-green-800');
  const [pageLoading, setPageLoading] = useState(true);
  const videoRef = useRef(null);
  const notificationSocketRef = useRef(null);  const {localStream, remoteStream, socket, socketConnection, handleDisconnect, startPeerConnection, endCallWithRedirect} = useWebRTC(false, id, videoRef);
  
  // Helper function to get hover color based on button color
  const getHoverColor = (bgColor) => {
    const colorMap = {
      'bg-green-600': 'hover:bg-green-700',
      'bg-green-800': 'hover:bg-green-900',
      'bg-blue-800': 'hover:bg-blue-900',
      'bg-red-800': 'hover:bg-red-900',
      'bg-purple-800': 'hover:bg-purple-900',
      'bg-orange-800': 'hover:bg-orange-900'
    };
    console.log('🎨 Getting hover color for:', bgColor, '->', colorMap[bgColor] || 'hover:bg-green-700');
    return colorMap[bgColor] || 'hover:bg-green-700';
  };
  
  // Extract profile data and redirect URL from URL parameters
  useEffect(() => {
    try {
      const landlordName = searchParams.get('landlordName');
      const profileImage = searchParams.get('profileImage');
      const landlordLogo = searchParams.get('landlordLogo');
      const redirectUrlParam = searchParams.get('redirectUrl');
      const tokenLandlordInfo = searchParams.get('tokenLandlordInfo');
      const messageSettingsParam = searchParams.get('messageSettings');
      
      // Parse tokenLandlordInfo if available
      let parsedTokenInfo = null;
      if (tokenLandlordInfo) {
        try {
          // Decode the URL-encoded tokenLandlordInfo first
          const decodedTokenInfo = decodeURIComponent(tokenLandlordInfo);
          console.log('🔍 Decoded tokenLandlordInfo:', decodedTokenInfo);
          parsedTokenInfo = JSON.parse(decodedTokenInfo);
          console.log('📋 Parsed tokenLandlordInfo:', parsedTokenInfo);
        } catch (e) {
          console.warn('Failed to parse tokenLandlordInfo:', e);
        }
      }

      // Parse message settings if available
      let parsedMessageSettings = {};
      if (messageSettingsParam) {
        try {
          parsedMessageSettings = JSON.parse(messageSettingsParam);
          console.log('📝 Parsed message settings:', parsedMessageSettings);
          setMessageSettings(parsedMessageSettings);
          
          // Set button color from message settings
          if (parsedMessageSettings.selectedButtonColor) {
            setButtonColor(parsedMessageSettings.selectedButtonColor);
            console.log('🎨 Setting button color:', parsedMessageSettings.selectedButtonColor);
          } else {
            console.log('⚠️ No button color in message settings, using default bg-green-800');
            setButtonColor('bg-green-800');
          }
        } catch (e) {
          console.warn('Failed to parse messageSettings:', e);
        }
      }
      
      // Get redirect URL and default flag from tokenLandlordInfo
      let finalRedirectUrl = redirectUrlParam;
      let isDefault = true;
      
      console.log('🔍 Initial redirect URL extraction:', {
        redirectUrlParam,
        parsedTokenInfo,
        finalRedirectUrl,
        isDefault
      });
      
      if (parsedTokenInfo) {
        if (parsedTokenInfo.redirectUrl) {
          finalRedirectUrl = parsedTokenInfo.redirectUrl;
          console.log('✅ Using redirectUrl from tokenLandlordInfo:', finalRedirectUrl);
        }
        if (parsedTokenInfo.hasOwnProperty('isDefaultRedirectUrl')) {
          isDefault = Boolean(parsedTokenInfo.isDefaultRedirectUrl);
          console.log('✅ Using isDefaultRedirectUrl from tokenLandlordInfo:', isDefault, 'original:', parsedTokenInfo.isDefaultRedirectUrl);
        }
      }
      
      console.log('👤 Room [id] loaded with profile data:', {
        id: id,
        landlordName: landlordName,
        hasProfileImage: !!profileImage,
        hasLandlordLogo: !!landlordLogo,
        redirectUrl: finalRedirectUrl,
        isDefaultRedirectUrl: isDefault,
        shouldShowDefaultLayout: landlordName === "Videodesk"
      });
      
      setProfileData({
        landlordName: landlordName,
        profileImage: profileImage,
        landlordLogo: landlordLogo
      });
      
      setIsDefaultRedirectUrl(isDefault);
      
      if (!isDefault && finalRedirectUrl) {
        // Tailored URL - prepare for redirect
        let formattedUrl = finalRedirectUrl;
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
          formattedUrl = `https://${formattedUrl}`;
        }
        setRedirectUrl(formattedUrl);
        // Store in localStorage as backup
        localStorage.setItem("redirectUrl", formattedUrl);
        console.log('🔗 Using tailored redirect URL (will redirect):', formattedUrl);
      } else {        // Default URL - no redirect
        setRedirectUrl('');
        // Clear any existing redirect URL from localStorage
        localStorage.removeItem("redirectUrl");
        console.log('🔗 Default URL - no redirect needed');
      }

      // Set page loading to false after everything is processed
      setPageLoading(false);
    } catch (error) {
      console.error('Error extracting profile data:', error);
      setProfileData({
        landlordName: null,
        profileImage: null,
        landlordLogo: null
      });
      setRedirectUrl('');
      setIsDefaultRedirectUrl(true);
      setPageLoading(false);
    }
  }, [searchParams, id]);
  
  // Track button color changes
  useEffect(() => {
    console.log('🎨 buttonColor state changed to:', buttonColor);
  }, [buttonColor]);
  
  // Notify admin when user opens the link
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const socketUrl = backendUrl.replace('/api/v1', '');
    
    // Create separate socket for notifications
    notificationSocketRef.current = io(socketUrl, {
      reconnectionAttempts: 3,
      timeout: 5000,
      transports: ['websocket'],
    });

    notificationSocketRef.current.on('connect', () => {
      console.log('📡 Room notification socket connected');
      // Notify that user has opened this room
      notificationSocketRef.current.emit('user-opened-link', id);
    });

    return () => {
      if (notificationSocketRef.current) {
        notificationSocketRef.current.disconnect();
      }
    };
  }, [id]);
  
  const handleStrt = () => {
    try {
      setOpen(false);
      startPeerConnection();
      
      // Notify admin that user has accepted and started the session
      if (notificationSocketRef.current) {
        notificationSocketRef.current.emit('user-started-session', id);
      }
    } catch (error) {
      console.error('Error starting peer connection:', error);
    }
  }

  const handleVideoCallEnd = () => {
    // Always use the latest values from the source, not from state
    let urlToSend = '';
    let isDefault = true;

    // Get from tokenLandlordInfo or searchParams again
    const redirectUrlParam = searchParams.get('redirectUrl');
    const tokenLandlordInfo = searchParams.get('tokenLandlordInfo');
    let parsedTokenInfo = null;
    
    if (tokenLandlordInfo) {
      try {
        // Decode the URL-encoded tokenLandlordInfo first
        const decodedTokenInfo = decodeURIComponent(tokenLandlordInfo);
        console.log('🔍 Decoded tokenLandlordInfo:', decodedTokenInfo);
        parsedTokenInfo = JSON.parse(decodedTokenInfo);
      } catch (e) {
        console.error('Failed to parse tokenLandlordInfo:', e);
      }
    }
    
    console.log('🔍 Video call end - extracted data:', {
      redirectUrlParam,
      parsedTokenInfo,
      isDefaultRedirectUrl: parsedTokenInfo?.isDefaultRedirectUrl
    });
    
    if (parsedTokenInfo && parsedTokenInfo.redirectUrl) {
      urlToSend = parsedTokenInfo.redirectUrl;
      isDefault = Boolean(parsedTokenInfo.isDefaultRedirectUrl);
      console.log('✅ Using tokenLandlordInfo data:', { urlToSend, isDefault, originalIsDefault: parsedTokenInfo.isDefaultRedirectUrl });
    } else if (redirectUrlParam) {
      urlToSend = redirectUrlParam;
      isDefault = true;
      console.log('✅ Using redirectUrlParam:', { urlToSend, isDefault });
    }

    if (urlToSend && !urlToSend.startsWith('http://') && !urlToSend.startsWith('https://')) {
      urlToSend = `https://${urlToSend}`;
      console.log('🔗 Added https:// to URL:', urlToSend);
    }

    console.log('🚀 Calling endCallWithRedirect with:', { isDefault, urlToSend });
    endCallWithRedirect(isDefault, urlToSend);
  }
  return (
    <>
      {pageLoading && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <p className="text-gray-600">Setting up your video session...</p>
          </div>
        </div>
      )}
      
      <div className='w-[100vw] h-[100vh] relative overflow-hidden'>
        <video ref={videoRef} autoPlay className="w-full h-full object-cover absolute top-0 left-0" />

        {
          !open && (
            <Button onClick={handleVideoCallEnd} className='absolute bottom-40 right-[50%] translate-x-[50%] text-white bg-red-400 rounded-md hover:bg-red-600 cursor-pointer text-xl'>
              End Video Call
            </Button>
          )
        }
      </div>

      <DialogComponent open={open} setOpen={setOpen}>
        <div className={`max-h-[90vh] w-[350px] p-6 flex flex-col items-center justify-center gap-3 overflow-y-auto min-h-[400px] ${!profileData.landlordName && !profileData.landlordLogo ? 'pb-12' : ''}`}>
          
          {/* Paper Plane Image - Always show */}
          <div className="flex justify-center">
            <Image src="/paper-plane.svg" alt="video-link-dialog-bg" className='object-contain pb-4 pt-2' width={150} height={150} />
          </div>

          {/* Landlord Logo - Show below paper plane if available */}
          {profileData.landlordLogo && (
            <div className="flex justify-center -mt-2 pt-3">
              <img 
                src={profileData.landlordLogo} 
                alt="Landlord Logo" 
                className="max-h-12 max-w-[150px] object-contain" 
                onError={(e) => {
                  console.error('Failed to load landlord logo:', profileData.landlordLogo);
                  e.target.style.display = 'none';
                }}
                onLoad={() => {
                  console.log('✅ Landlord logo loaded successfully in room [id]');
                }}
              />
            </div>
          )}

          {/* Landlord Name or Videodesk Default */}
          <div className="flex justify-center">
            <h2 className="text-xl font-bold mt-2 text-center pb-3">
              {profileData.landlordName && profileData.landlordName !== "Videodesk" ? (
                <span className="text-xl font-bold">{profileData.landlordName}</span>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Video className="w-6 h-6 text-gray-700" />
                  <span className="text-xl font-bold">Videodesk</span>
                </div>
              )}
            </h2>
          </div>          <div className="flex justify-center w-full">
            <button 
              className={`${buttonColor} ${getHoverColor(buttonColor)} text-white font-medium py-3 cursor-pointer rounded-full mt-4 text-lg w-[90%] outline-none transition-colors text-center`}
              onClick={handleStrt}
              disabled={pageLoading}
            >
              {pageLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </div>
              ) : (
                <>
                  Tap to allow video <br/> session now
                </>
              )}
            </button>
          </div>

          {/* Device Icons - moved up */}
          <div className="flex justify-center mt-2">
            <img src="/devices.svg" alt="Videodesk" className="w-30" />
          </div>

          {/* Videodesk Heading - show only if landlord name or logo exists and name is not "Videodesk" */}
          {(profileData.landlordName && profileData.landlordName !== "Videodesk") || profileData.landlordLogo ? (
            <div className="flex justify-center">
              <h3 className="text-2xl font-bold text-black pt-6 pb-6">Videodesk</h3>
            </div>
          ) : null}
        </div>
      </DialogComponent>
    </>
  )
}

export default page