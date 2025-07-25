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
  const [roomUserInfo, setRoomUserInfo] = useState(null);
  const [minSkeletonTimePassed, setMinSkeletonTimePassed] = useState(false);
  const [isDefaultRedirectUrlFromUser, setIsDefaultRedirectUrlFromUser] = useState(true);
  const [redirectUrlFromUser, setRedirectUrlFromUser] = useState('');
  const [showDefaultLeader, setShowDefaultLeader] = useState(false);
  
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
    } catch (error) {
      console.error('Error extracting profile data:', error);
      setProfileData({
        landlordName: null,
        profileImage: null,
        landlordLogo: null
      });
      setRedirectUrl('');
      setIsDefaultRedirectUrl(true);
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
  
  useEffect(() => {
    // Fetch sender info if sid is present
    const sid = searchParams.get('sid'); 
    if (sid) {
      setPageLoading(true); // Loader start karo
      const fetchUserInfo = async () => {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
          const res = await fetch(`${backendUrl}/api/v1/room-user-info?userId=${encodeURIComponent(sid)}`);
          const data = await res.json();
          if (data.success) {
            setRoomUserInfo(data.user);
            if (data.user.messageSettings) {
              setMessageSettings(data.user.messageSettings);
              if (data.user.messageSettings.selectedButtonColor) {
                setButtonColor(data.user.messageSettings.selectedButtonColor);
              }
            }
            // Store redirect info from backend
            setIsDefaultRedirectUrlFromUser(data.isDefaultRedirectUrl);
            setRedirectUrlFromUser(data.redirectUrl);
            console.log('[RoomUserInfo] Backend returned:', {
              isDefault: data.isDefaultRedirectUrl,
              redirectUrl: data.redirectUrl,
              user: data.user
            });
            // Store tailored redirect in localStorage for use on disconnect
            if (data.redirectUrl && data.isDefaultRedirectUrl === false) {
              localStorage.setItem('redirectUrl', data.redirectUrl);
            } else {
              localStorage.removeItem('redirectUrl');
            }
          } else {
            setRoomUserInfo(null);
            setIsDefaultRedirectUrlFromUser(true);
            setRedirectUrlFromUser('');
            localStorage.removeItem('redirectUrl');
            console.warn('[RoomUserInfo] Not found:', data.message);
          }
        } catch (err) {
          setRoomUserInfo(null);
          setIsDefaultRedirectUrlFromUser(true);
          setRedirectUrlFromUser('');
          localStorage.removeItem('redirectUrl');
          console.error('[RoomUserInfo] Error fetching:', err);
        } finally {
          setPageLoading(false); // Loader band karo
        }
      };
      fetchUserInfo();
    } else {
      setRoomUserInfo(null);
      setIsDefaultRedirectUrlFromUser(true);
      setRedirectUrlFromUser('');
      localStorage.removeItem('redirectUrl');
      setPageLoading(false); // sid nahi hai to loader band karo
    }
  }, [searchParams]);
  
  // Ensure skeleton is shown for at least 2 seconds
  useEffect(() => {
    setMinSkeletonTimePassed(false);
    const timer = setTimeout(() => setMinSkeletonTimePassed(true), 2000);
    return () => clearTimeout(timer);
  }, [open, searchParams.get('sid')]);
  
  // 5-second fallback to default leader if roomUserInfo not loaded
  useEffect(() => {
    if (roomUserInfo) {
      setShowDefaultLeader(false); // If loaded, don't show default
      return;
    }
    setShowDefaultLeader(false); // Reset on new load
    const fallbackTimer = setTimeout(() => {
      if (!roomUserInfo) {
        setShowDefaultLeader(true);
      }
    }, 5000);
    return () => clearTimeout(fallbackTimer);
  }, [roomUserInfo, open, searchParams.get('sid')]);
  
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
    // Prefer backend user info for redirect
    let urlToSend = redirectUrlFromUser;
    let isDefault = isDefaultRedirectUrlFromUser;
    console.log('[CallEnd] Initial from backend:', { isDefault, urlToSend });
    // Fallback to tokenLandlordInfo/searchParams if backend not available
    if (!urlToSend) {
      const redirectUrlParam = searchParams.get('redirectUrl');
      const tokenLandlordInfo = searchParams.get('tokenLandlordInfo');
      let parsedTokenInfo = null;
      if (tokenLandlordInfo) {
        try {
          const decodedTokenInfo = decodeURIComponent(tokenLandlordInfo);
          parsedTokenInfo = JSON.parse(decodedTokenInfo);
        } catch (e) {
          console.error('[CallEnd] Failed to parse tokenLandlordInfo:', e);
        }
      }
      if (parsedTokenInfo && parsedTokenInfo.redirectUrl) {
        urlToSend = parsedTokenInfo.redirectUrl;
        isDefault = Boolean(parsedTokenInfo.isDefaultRedirectUrl);
        console.log('[CallEnd] Using tokenLandlordInfo:', { isDefault, urlToSend });
      } else if (redirectUrlParam) {
        urlToSend = redirectUrlParam;
        isDefault = false; // treat as tailored if present
        console.log('[CallEnd] Using redirectUrlParam:', { isDefault, urlToSend });
      }
    }
    if (urlToSend && !urlToSend.startsWith('http://') && !urlToSend.startsWith('https://')) {
      urlToSend = `https://${urlToSend}`;
    }
    console.log('[CallEnd] Final values sent to endCallWithRedirect:', { isDefault, urlToSend });
    endCallWithRedirect(isDefault, urlToSend);
  }
  return (
    <>
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
        <div className={`max-h-[90vh] w-[350px] p-6 flex flex-col items-center justify-center gap-3 overflow-y-auto min-h-[400px] ${!(roomUserInfo?.landlordInfo?.landlordName || roomUserInfo?.landlordInfo?.landlordLogo) && !profileData.landlordName && !profileData.landlordLogo ? 'pb-12' : ''}`}>
          
          {/* Skeleton Loader */}
          {(pageLoading || (!roomUserInfo && !showDefaultLeader) || !minSkeletonTimePassed) ? (
            <div className="flex flex-col items-center gap-4 animate-pulse w-full">
              <div className="bg-gray-200 rounded-full h-24 w-24 mb-4" />
              <div className="bg-gray-200 h-6 w-40 rounded mb-2" />
              <div className="bg-gray-200 h-4 w-32 rounded mb-2" />
              <div className="bg-gray-200 h-10 w-3/4 rounded mb-4" />
              <div className="bg-gray-200 h-8 w-1/2 rounded" />
            </div>
          ) : (
          <>
            {/* Paper Plane Image - Always show */}
            <div className="flex justify-center w-full">
              <img 
                src="/paper-plane.svg" 
                alt="video-link-dialog-bg" 
                className="object-contain pb-4 pt-2 max-w-full max-h-32 sm:max-h-36 md:max-h-40" 
                style={{ width: 'auto', height: 'auto' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>

            {/* Landlord Logo - Show below paper plane if available */}
            {(!showDefaultLeader && roomUserInfo?.landlordInfo?.landlordLogo) && (
              <div className="flex justify-center -mt-2 pt-3 w-full">
                <img 
                  src={roomUserInfo?.landlordInfo?.landlordLogo} 
                  alt="Landlord Logo" 
                  className="object-contain max-w-full" 
                  style={{ width: 'auto', height: 'auto', maxWidth: '180px', maxHeight: '60px' }}
                  onError={e => { e.target.style.display = 'none'; }}
                  onLoad={() => {
                    console.log('✅ Landlord logo loaded successfully in room [id]');
                  }}
                />
              </div>
            )}

            {/* Landlord Name or Videodesk Default */}
            <div className="flex justify-center">
              <h2 className="text-xl font-bold mt-2 text-center pb-3">
                {(!showDefaultLeader && roomUserInfo?.landlordInfo?.landlordName) && (roomUserInfo?.landlordInfo?.landlordName) !== "Videodesk" ? (
                  <span className="text-xl font-bold">{roomUserInfo?.landlordInfo?.landlordName}</span>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Video className="w-6 h-6 text-gray-700" />
                    <span className="text-xl font-bold">Videodesk</span>
                  </div>
                )}
              </h2>
            </div>          <div className="flex justify-center w-full">
              <button 
                className={`${buttonColor} text-white font-medium py-3 cursor-pointer rounded-full mt-4 text-lg w-[90%] outline-none transition-colors text-center`}
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
                    {messageSettings?.tailoredMessage
                      ? messageSettings.tailoredMessage
                      : 'Tap to allow video'} <br/> session now
                  </>
                )}
              </button>
            </div>

            {/* Device Icons - moved up */}
            <div className="flex justify-center mt-2 w-full">
              <img 
                src="/devices.svg" 
                alt="Videodesk" 
                className="object-contain max-w-full max-h-12 sm:max-h-16 md:max-h-20" 
                style={{ width: 'auto', height: 'auto' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>

            {/* Videodesk Heading - show only if landlord name or logo exists and name is not "Videodesk" */}
            {((!showDefaultLeader && roomUserInfo?.landlordInfo?.landlordName && roomUserInfo?.landlordInfo?.landlordName !== "Videodesk") || (!showDefaultLeader && roomUserInfo?.landlordInfo?.landlordLogo)) ? (
              <div className="flex justify-center">
                <h3 className="text-2xl font-bold text-black pt-6 pb-6">Videodesk</h3>
              </div>
            ) : null}
          </>
          )}
        </div>
      </DialogComponent>   
    </>
  )
}

export default page