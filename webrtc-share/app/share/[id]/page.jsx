"use client"
import { useState, useRef, use, useEffect } from "react"
import { VideoIcon, PlayIcon, Minimize2, Expand, ZoomIn, ZoomOut, ChevronDown, ChevronUp, X, User } from "lucide-react"
import { getMeetingByMeetingId } from "@/http/meetingHttp"
import { recordVisitorAccessRequest } from "@/http/meetingHttp"
import { useDialog } from "@/provider/DilogsProvider"
import { toast } from "sonner"

export default function SharePage({ params }) {
  const { id } = use(params);
  const { openVisitorAccessModal } = useDialog();
  
  const [targetTime, setTargetTime] = useState("Emergency 24 Hours")
  const [residentName, setResidentName] = useState("")
  const [residentAddress, setResidentAddress] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [addressLine2, setAddressLine2] = useState("")
  const [addressLine3, setAddressLine3] = useState("")
  const [additionalAddressLines, setAdditionalAddressLines] = useState([])
  const [postCode, setPostCode] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [ref, setRef] = useState("")
  const [repairDetails, setRepairDetails] = useState("")
  const [workDetails, setWorkDetails] = useState([])
  const [specialNotes, setSpecialNotes] = useState("")
  
  // Meeting data states
  const [meetingData, setMeetingData] = useState(null);
  const [isLoadingMeetingData, setIsLoadingMeetingData] = useState(true);
  const [recordings, setRecordings] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [playingVideos, setPlayingVideos] = useState(new Set());
  const [accessGranted, setAccessGranted] = useState(false);
  
  // Add new states for individual item expansion
  const [expandedVideos, setExpandedVideos] = useState(new Set());
  const [expandedImages, setExpandedImages] = useState(new Set());
  const [modalImage, setModalImage] = useState(null);
  
  // Add landlord info states
  const [landlordInfo, setLandlordInfo] = useState({
    landlordName: null,
    landlordLogo: null,
    profileShape: 'circle',
    officerImage: null,
    useLandlordLogoAsProfile: false,
    userName: null
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Format recording duration
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to handle visitor access - always grant access after submission
  const handleVisitorAccess = async (visitorData) => {
    try {
      console.log(`🔐 Recording visitor access for meeting: ${id}`);
      const response = await recordVisitorAccessRequest(id, visitorData);

      if (response.success) {
        setAccessGranted(true);
        console.log(`✅ Visitor access recorded successfully for meeting: ${id}`);
        await fetchMeetingData();
      } else {
        throw new Error(response.message || 'Failed to record access');
      }
    } catch (error) {
      console.error('❌ Failed to record visitor access:', error);
      throw error;
    }
  };

  // Fetch meeting data when component mounts
  const fetchMeetingData = async () => {
    if (!id) return;
    
    setIsLoadingMeetingData(true);
    try {
      console.log(`🔍 Fetching meeting data for share ID: ${id}`);
      const response = await getMeetingByMeetingId(id);
      
      if (response.data.success && response.data.meeting) {
        const meetingData = response.data.meeting;
        console.log('✅ Found meeting data:', meetingData);
        
        // Populate form fields with existing data (read-only)
        setResidentName(meetingData.name || "");
        setResidentAddress(meetingData.address || "");
        setAddressLine1(meetingData.address_line_1 || "");
        setAddressLine2(meetingData.address_line_2 || "");
        setAddressLine3(meetingData.address_line_3 || "");
        setAdditionalAddressLines(meetingData.additional_address_lines || []);
        setPostCode(meetingData.post_code || "");
        setPhoneNumber(meetingData.phone_number || "");
        setRef(meetingData.reference || meetingData.ref || "");
        setRepairDetails(meetingData.repair_detail || "");
        setWorkDetails(meetingData.work_details || []);
        setSpecialNotes(meetingData.special_notes || "");
        setTargetTime(meetingData.target_time || "Emergency 24 Hours");
        
        // Load recordings
        if (meetingData.recordings && meetingData.recordings.length > 0) {
          const recordingsData = meetingData.recordings.map(rec => ({
            id: rec._id || Date.now() + Math.random(),
            url: rec.url,
            timestamp: new Date(rec.timestamp).toLocaleString(),
            duration: rec.duration || 0
          }));
          setRecordings(recordingsData);
        }
        
        // Load screenshots
        if (meetingData.screenshots && meetingData.screenshots.length > 0) {
          const screenshotsData = meetingData.screenshots.map(screenshot => ({
            id: screenshot._id || Date.now() + Math.random(),
            url: screenshot.url,
            timestamp: new Date(screenshot.timestamp).toLocaleString()
          }));
          setScreenshots(screenshotsData);
        }
        
        setMeetingData(meetingData);
        
        toast.success("Meeting data loaded successfully!", {
          description: `Found ${meetingData.recordings?.length || 0} recordings and ${meetingData.screenshots?.length || 0} screenshots`
        });
      }
    } catch (error) {
      console.error('❌ Failed to fetch meeting data:', error);
      toast.error("Failed to load meeting data", {
        description: error?.response?.data?.message || error.message
      });
    } finally {
      setIsLoadingMeetingData(false);
    }
  };

  // Helper function to extract query parameters
  const extractLandlordInfoFromUrl = () => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      // New format parameters
      const senderName = urlParams.get('senderName');
      const senderProfile = urlParams.get('senderProfile');
      const profileType = urlParams.get('profileType');
      const profileShape = urlParams.get('profileShape');
      // Old format parameters
      const landlordLogo = urlParams.get('landlordLogo');
      const landlordName = urlParams.get('landlordName');
      const officerImage = urlParams.get('officerImage');
      const useLandlordLogoAsProfile = urlParams.get('useLandlordLogoAsProfile') === 'true';
      const userName = urlParams.get('userName');
      let extractedInfo = {
        landlordName: null,
        landlordLogo: null,
        profileShape: 'circle',
        officerImage: null,
        useLandlordLogoAsProfile: false,
        userName: null
      };
      // Prefer new format if present
      if (senderName || senderProfile) {
        extractedInfo.landlordName = senderName ? decodeURIComponent(senderName) : null;
        extractedInfo.userName = senderName ? decodeURIComponent(senderName) : null;
        if (senderProfile && profileType === 'logo') {
          extractedInfo.landlordLogo = decodeURIComponent(senderProfile);
          extractedInfo.useLandlordLogoAsProfile = true;
        } else if (senderProfile && profileType === 'officer') {
          extractedInfo.officerImage = decodeURIComponent(senderProfile);
          extractedInfo.useLandlordLogoAsProfile = false;
        }
        if (profileShape) {
          extractedInfo.profileShape = profileShape;
        }
      }
      // Always fallback to old format if landlordLogo is present and not already set
      if (!extractedInfo.landlordLogo && landlordLogo) {
        extractedInfo.landlordLogo = decodeURIComponent(landlordLogo);
      }
      if (!extractedInfo.landlordName && landlordName) {
        extractedInfo.landlordName = decodeURIComponent(landlordName);
      }
      if (!extractedInfo.officerImage && officerImage) {
        extractedInfo.officerImage = decodeURIComponent(officerImage);
      }
      if (!extractedInfo.userName && userName) {
        extractedInfo.userName = decodeURIComponent(userName);
      }
      if (!extractedInfo.useLandlordLogoAsProfile && useLandlordLogoAsProfile) {
        extractedInfo.useLandlordLogoAsProfile = true;
      }
      if (!extractedInfo.profileShape && profileShape) {
        extractedInfo.profileShape = profileShape;
      }
      setLandlordInfo(extractedInfo);
      setIsLoadingProfile(false);
    } catch (error) {
      console.error('❌ Failed to extract landlord info from URL:', error);
      toast.error("Unable to fetch landlord information from link");
      setIsLoadingProfile(false);
    }
  };

  // Helper function to check if image URL is valid
  const isValidImageUrl = (url) => {
    if (!url) return false;
    return url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://');
  };

  // Helper function to get profile image with landlord info
  const getProfileImage = () => {
    // Check if using landlord logo as profile
    if (landlordInfo.useLandlordLogoAsProfile && landlordInfo.landlordLogo) {
      if (isValidImageUrl(landlordInfo.landlordLogo)) {
        return landlordInfo.landlordLogo;
      }
    }
    
    // Check if using officer image
    if (landlordInfo.officerImage && isValidImageUrl(landlordInfo.officerImage)) {
      return landlordInfo.officerImage;
    }
    
    return null;
  };

  // Helper function to get landlord logo
  const getLandlordLogo = () => {
    if (landlordInfo.landlordLogo && isValidImageUrl(landlordInfo.landlordLogo)) {
      return landlordInfo.landlordLogo;
    }
    return null;
  };

  // Helper function to get profile shape class
  const getProfileShapeClass = () => {
    if (landlordInfo.profileShape === 'square') {
      return 'rounded-lg';
    }
    return 'rounded-full';
  };

  // Helper function to get image object fit class based on shape
  const getImageObjectFitClass = () => {
    if (landlordInfo.profileShape === 'square') {
      return 'object-contain'; // For square, use contain to show full image
    } else {
      return 'object-cover'; // For circle, use cover to fill the circle
    }
  };

  // Helper function to get display name
  const getDisplayName = () => {
    // Priority order: userName > landlordName > fallback
    if (landlordInfo.userName) {
      return landlordInfo.userName;
    }
    if (landlordInfo.landlordName) {
      return landlordInfo.landlordName;
    }
    return 'Guest Access';
  };

  // Helper function to get initials
  const getInitials = (name) => {
    if (!name) return 'VO';
    
    const words = name.trim().split(' ').filter(word => word.length > 0);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else if (words.length >= 2) {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  useEffect(() => {
    if (!id) return;
    
    // Extract landlord info from URL first
    extractLandlordInfoFromUrl();
    
    // ============ NO CACHE - ALWAYS SHOW MODAL ============
    console.log(`🔐 Always showing visitor access modal for meeting ${id}...`);
    const timeout = setTimeout(() => {
      openVisitorAccessModal(handleVisitorAccess);
    }, 100); // 100ms delay to ensure provider is mounted
    return () => clearTimeout(timeout);
  }, [id]);

  // Show loading while waiting for access or loading data
  if (!accessGranted || isLoadingMeetingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto p-6 py-12">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <VideoIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-xl font-medium text-gray-700">
                {!accessGranted ? "Please provide your information to access this meeting..." : "Loading meeting data..."}
              </div>
              {isLoadingMeetingData && (
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-6 py-12">
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Show landlord logo if available, otherwise show default */}
              {getLandlordLogo() ? (
                <div className="flex items-center">
                  <img 
                    src={getLandlordLogo()} 
                    alt="Landlord Logo" 
                    className="max-h-8 max-w-[120px] object-contain mr-3" 
                  />
                  <a href="/" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center hover:opacity-80 transition-opacity">
                    <VideoIcon className="mr-3 text-blue-600" size={32} />
                    <span>Videodesk.co.uk</span>
                  </a>
                </div>
              ) : (
                <a href="/" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center hover:opacity-80 transition-opacity">
                  <VideoIcon className="mr-3 text-blue-600" size={32} />
                  <span>Videodesk.co.uk</span>
                </a>
              )}
            </div>
            <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full">
              Meeting ID: {id}
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center">
                {isLoadingProfile ? (
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mr-3"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-32"></div>
                  </div>
                ) : (
                  <>
                    <div className={`w-12 h-12 overflow-hidden mr-3 ${getProfileShapeClass()} flex items-center justify-center border border-gray-300 bg-gray-50`}>
                      {getProfileImage() ? (
                        <img
                          src={getProfileImage()}
                          alt="Profile Image"
                          className={`w-full h-full ${getImageObjectFitClass()}`}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            // Show fallback initials
                            e.target.parentElement.innerHTML = `<div class="w-full h-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-semibold">${getInitials(getDisplayName())}</div>`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">{getInitials(getDisplayName())}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-3xl font-bold text-gray-800">
                      {getDisplayName()}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full">
              {isLoadingProfile ? (
                <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
              ) : landlordInfo.landlordName ? (
                "Profile"
              ) : (
                "Profile"
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Main Content Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border-2 border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Enhanced Name and Address */}
            <div className="space-y-6">
              {/* Resident Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Resident Name
                </label>
                <input
                  id="residentName"
                  type="text"
                  value={residentName}
                  readOnly
                  className="w-full p-4 border-4 border-gray-200 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 font-medium text-lg focus:outline-none shadow-inner"
                />
              </div>
              
              {/* Enhanced Address Fields */}
              <div>
                <label htmlFor="residentAddress" className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Resident's Address
                </label>
                
                {/* Main Address */}
                {residentAddress && (
                  <textarea
                    value={residentAddress}
                    readOnly
                    rows={2}
                    className="w-full p-4 border-4 border-gray-200 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 font-medium resize-none focus:outline-none shadow-inner leading-relaxed mb-3"
                  />
                )}
                
                {/* Address Lines */}
                {addressLine1 && (
                  <input
                    value={addressLine1}
                    readOnly
                    placeholder="Address Line 1"
                    className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-800 font-medium focus:outline-none shadow-inner mb-2"
                  />
                )}
                
                {addressLine2 && (
                  <input
                    value={addressLine2}
                    readOnly
                    placeholder="Address Line 2"
                    className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-800 font-medium focus:outline-none shadow-inner mb-2"
                  />
                )}
                
                {addressLine3 && (
                  <input
                    value={addressLine3}
                    readOnly
                    placeholder="Address Line 3"
                    className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-800 font-medium focus:outline-none shadow-inner mb-2"
                  />
                )}
                
                {/* Additional Address Lines */}
                {additionalAddressLines.map((line, index) => (
                  line && (
                    <input
                      key={index}
                      value={line}
                      readOnly
                      placeholder={`Address Line ${index + 4}`}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-800 font-medium focus:outline-none shadow-inner mb-2"
                    />
                  )
                ))}
              </div>
              
              {/* Postcode and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {postCode && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                      Postcode
                    </label>
                    <input
                      value={postCode}
                      readOnly
                      className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-800 font-medium focus:outline-none shadow-inner"
                    />
                  </div>
                )}
                
                {phoneNumber && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                      Phone Number
                    </label>
                    <input
                      value={phoneNumber}
                      readOnly
                      className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-800 font-medium focus:outline-none shadow-inner"
                    />
                  </div>
                )}
              </div>
              
              {/* Special Notes - Moved to Left Side */}
              {specialNotes && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    Special Notes
                  </label>
                  <textarea
                    value={specialNotes}
                    readOnly
                    rows={4}
                    className="w-full p-4 border-4 border-yellow-200 rounded-2xl bg-gradient-to-r from-yellow-50 to-yellow-100 text-gray-800 font-medium resize-none focus:outline-none shadow-inner leading-relaxed"
                  />
                </div>
              )}
            </div>
            
            {/* Right Side - Ref and Work Details */}
            <div className="h-full flex flex-col space-y-6">
              {/* Ref Field */}
              {ref && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    Reference
                  </label>
                  <input
                    type="text"
                    value={ref}
                    readOnly
                    className="w-full p-4 border-4 border-gray-200 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 font-medium text-lg focus:outline-none shadow-inner overflow-x-auto"
                  />
                </div>
              )}
              
              {/* Repair Details */}
              {repairDetails && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    Repair Details
                  </label>
                  <textarea
                    value={repairDetails}
                    readOnly
                    rows={3}
                    className="w-full p-4 border-4 border-gray-200 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 font-medium resize-none focus:outline-none shadow-inner leading-relaxed"
                  />
                </div>
              )}
              
              {/* Work Details */}
              {workDetails && workDetails.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    Work Details
                  </label>
                  <div className="space-y-3">
                    {workDetails.map((work, index) => (
                      <div key={index} className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-semibold text-blue-800">Work Item {index + 1}</span>
                          {work.target_time && (
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-medium">
                              {work.target_time}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-800 font-medium">{work.detail}</p>
                        {work.timestamp && (
                          <p className="text-xs text-gray-500 mt-2">
                            Added: {new Date(work.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Video & Image Section */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-200">
          {/* Videos Section */}
          {recordings.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Videos</h2>
              </div>
              
              {/* Better container for videos */}
              <div className="w-full">
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {recordings.map((recording) => {
                    const isExpanded = expandedVideos.has(recording.id);
                    return (
                      <div key={recording.id} className={`flex-shrink-0 transition-all duration-300 ${isExpanded ? 'w-[400px]' : 'w-[280px] md:w-[200px]'}`}>
                        <div className={`w-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl overflow-hidden relative shadow-lg hover:shadow-xl transition-all duration-300 group ${isExpanded ? 'h-[400px]' : 'h-[200px]'}`}>
                          <video
                            src={recording.url}
                            controls={isExpanded}
                            muted={!isExpanded}
                            className="w-full h-full object-cover rounded-3xl"
                            onPlay={() => setPlayingVideos(prev => new Set(prev).add(recording.id))}
                            onPause={() => setPlayingVideos(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(recording.id);
                              return newSet;
                            })}
                            onClick={(e) => {
                              if (!isExpanded && e.target.paused) {
                                e.target.play();
                              } else if (!isExpanded && !e.target.paused) {
                                e.target.pause();
                              }
                            }}
                          />
                          {/* Enhanced Play Icon - only show when not expanded */}
                          {!isExpanded && (
                            <div 
                              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 ${
                                playingVideos.has(recording.id) 
                                  ? 'opacity-0 group-hover:opacity-70 scale-75' 
                                  : 'opacity-80 group-hover:opacity-100 group-hover:scale-110'
                              }`}
                            >
                              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                                <PlayIcon className="w-8 h-8 text-red-600 drop-shadow-lg" />
                              </div>
                            </div>
                          )}
                          {/* Enhanced Control Buttons */}
                          <div className="absolute top-3 right-3 flex flex-row gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button 
                              onClick={() => {
                                const newExpanded = new Set(expandedVideos);
                                if (isExpanded) {
                                  newExpanded.delete(recording.id);
                                } else {
                                  newExpanded.add(recording.id);
                                }
                                setExpandedVideos(newExpanded);
                              }}
                              className="p-2 bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full text-white transition-all duration-200 hover:scale-110"
                            >
                              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 text-center">
                          <p className="text-sm text-gray-600 font-medium">{recording.timestamp}</p>
                          <p className="text-xs text-gray-500">Duration: {formatRecordingTime(recording.duration)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Screenshots Section */}
          {screenshots.length > 0 && (
            <div className={recordings.length > 0 ? 'border-t border-gray-200 pt-8' : ''}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">SCREENSHOT(S)</h2>
              </div>
              
              {/* Better container for screenshots */}
              <div className="w-full">
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {screenshots.map((screenshot, index) => (
                    <div key={screenshot.id} className="w-[280px] md:w-[200px] flex-shrink-0">
                      <div className="w-full h-[200px] bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl overflow-hidden relative shadow-lg hover:shadow-xl transition-all duration-300 group">
                        <img
                          src={screenshot.url}
                          alt="screenshot"
                          className="w-full h-full object-cover rounded-3xl cursor-pointer"
                          onClick={() => setModalImage(screenshot)}
                        />
                        {/* Enhanced Control Buttons for Screenshots */}
                        <div className="absolute top-3 right-3 flex flex-row gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button 
                            onClick={() => setModalImage(screenshot)}
                            className="p-2 bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full text-white transition-all duration-200 hover:scale-110"
                          >
                            <Expand className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Enhanced Image Label */}
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                          <span className="text-xs font-semibold text-gray-700">#{index + 1}</span>
                        </div>
                        {/* Zoom indicator */}
                        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <ZoomIn className="w-4 h-4 text-gray-700" />
                        </div>
                      </div>
                      <div className="mt-3 text-center">
                        <p className="text-sm text-gray-600 font-medium">{screenshot.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No content message */}
          {recordings.length === 0 && screenshots.length === 0 && (
            <div className="text-center py-12">
              <VideoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No recordings or screenshots found</p>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* Image container */}
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button - Positioned at top 5% and right 27% */}
              <button
                onClick={() => setModalImage(null)}
                className="absolute z-10 p-3 bg-red-600 hover:bg-red-700 text-white rounded-full border-2 border-white/80 transition-all duration-300 hover:scale-110 flex items-center justify-center w-10 h-10 backdrop-blur-sm shadow-lg"
                style={{ 
                  top: '5%', 
                  right: '27%', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)' 
                }}
              >
                <X className="w-5 h-5" strokeWidth="3" />
              </button>
              
              <img
                src={modalImage.url}
                alt="Expanded screenshot"
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                onClick={() => setModalImage(null)}
              />
              
              {/* Image info */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
                <p className="text-white text-sm font-medium">{modalImage.timestamp}</p>
              </div>
            </div>
          </div>
          
          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10"
            onClick={() => setModalImage(null)}
          ></div>
        </div>
      )}
    </div>
  )
}
