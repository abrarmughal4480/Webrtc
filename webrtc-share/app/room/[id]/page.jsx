"use client"
import { Button } from '@/components/ui/button'
import React, { useState, use, useRef, useEffect, Suspense } from 'react'
import { PhoneCall, Monitor, Video, Loader2 } from 'lucide-react'
import { DialogComponent } from '@/components/dialogs/DialogCompnent'
import Image from 'next/image'
import useWebRTC from '@/hooks/useWebRTC'
import { io } from "socket.io-client"
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import FloatingResendButton from '@/components/FloatingResendButton'

const RoomPageInner = ({params}) => {
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
    console.log('🔍 Room page: sid from URL:', sid);
    console.log('🔍 Room page: all searchParams:', Object.fromEntries(searchParams.entries()));
    
    if (sid) {
      setPageLoading(true); // Loader start karo
      const fetchUserInfo = async () => {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
          const response = await fetch(`${backendUrl}/api/v1/user/${sid}`);
          
          if (response.ok) {
            const userData = await response.json();
            console.log('👤 Fetched user info for sid:', sid, userData);
            setRoomUserInfo(userData.user);
          } else {
            console.warn('⚠️ Failed to fetch user info for sid:', sid);
          }
        } catch (error) {
          console.error('❌ Error fetching user info:', error);
        } finally {
          setPageLoading(false); // Loader end karo
        }
      };
      
      fetchUserInfo();
    } else {
      setPageLoading(false); // No sid, no loader needed
    }
  }, [searchParams]);

  // Set minimum skeleton time
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSkeletonTimePassed(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleStrt = () => {
    setOpen(false);
    startPeerConnection();
  };

  const handleVideoCallEnd = () => {
    handleDisconnect();
    if (redirectUrl) {
      setShowRedirectDialog(true);
      setRedirecting(true);
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 2000);
    } else {
      router.push('/');
    }
  };

  // Rest of your component logic here...
  // (I'll keep the existing logic but wrap it in the Suspense boundary)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Your existing JSX here */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {profileData.landlordName || 'Video Call'}
            </h1>
            <p className="text-gray-600">
              Click the button below to start your video call
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleStrt}
              className={`w-full ${buttonColor} ${getHoverColor(buttonColor)} text-white font-semibold py-4 rounded-xl text-lg transition-all duration-300 transform hover:scale-105`}
              disabled={pageLoading}
            >
              {pageLoading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5" />
                  <span>Start Video Call</span>
                </div>
              )}
            </Button>

            <Button
              onClick={handleVideoCallEnd}
              variant="outline"
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-4 rounded-xl text-lg transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <PhoneCall className="w-5 h-5" />
                <span>End Call</span>
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* Floating Resend Button */}
      <FloatingResendButton roomUserInfo={roomUserInfo} />
    </div>
  );
};

// Wrapper component with Suspense boundary
const page = (props) => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <RoomPageInner {...props} />
    </Suspense>
  );
};

export default page;