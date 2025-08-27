"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { publicApi } from '@/http';
import { toast } from "sonner";
import Image from "next/image";
import { AlertTriangle, FileQuestion, Key, User, ImageIcon, Video, X, Printer, Clock, XCircle } from "lucide-react";
import moment from "moment";
import { useRouter } from "next/navigation";
import { useUser } from '@/provider/UserProvider';

export default function ViewUploadPage() {
  const params = useParams();
  const accessCode = params?.accessCode;
  const router = useRouter();
  const { user } = useUser();
  
  const [upload, setUpload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  
  // Share code search functionality
  const [shareCodeInput, setShareCodeInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Timeout functionality for guest users
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const valid = sessionStorage.getItem(`accessCodeValidated:${accessCode}`) === 'true';
      setAllowed(valid);
      setChecked(true);
      if (!valid) {
        router.replace('/');
        return;
      }
      
      // Only fetch data if access is allowed
      if (valid && accessCode) {
        setLoading(true);
        setError("");
        publicApi.get(`/api/v1/upload/${accessCode}`)
          .then(res => {
            setUpload(res.data?.data?.upload || null);
            setLoading(false);
            // Mark notification as sent when someone accesses the content
            if (res.data?.data?.upload && !notificationSent) {
              // Check if notification was already sent
              if (res.data?.data?.upload.notificationSent) {
                console.log('✅ Notification already sent for this upload');
                return;
              }
              
              // Check if current user is the creator (resident) of this upload
              const uploadData = res.data?.data?.upload;
              const isCreator = user?.role === 'resident' && 
                               user?.email === uploadData?.email;
              
              if (isCreator) {
                console.log('✅ Creator accessing own upload - skipping notification');
                return;
              }
              
              setNotificationSent(true);
              publicApi.post(`/api/v1/uploads/notification/mark-sent/${accessCode}`)
                .then(() => {
                  console.log('✅ Notification marked as sent for first access');
                })
                .catch(err => {
                  console.log('⚠️ Could not mark notification as sent:', err);
                  setNotificationSent(false); // Reset if failed
                });
            }
          })
          .catch(err => {
            const msg = err.response?.data?.message || 'Not found';
            toast.error(msg);
            setError(msg);
            setLoading(false);
          });
      }
    }
  }, [accessCode, router, notificationSent]);

  // Initialize timeout from localStorage for guest users
  useEffect(() => {
    if (!user && allowed && accessCode) {
      const timeoutKey = `timeout_${accessCode}`;
      const startTimeKey = `startTime_${accessCode}`;
      
      // Check if timeout already exists for this access code
      const existingTimeout = localStorage.getItem(timeoutKey);
      const startTime = localStorage.getItem(startTimeKey);
      
      if (existingTimeout && startTime) {
        // Calculate remaining time based on start time
        const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000);
        const remaining = Math.max(0, (15 * 60) - elapsed);
        
        if (remaining <= 0) {
          // Time has expired, clear session and redirect
          sessionStorage.removeItem(`accessCodeValidated:${accessCode}`);
          localStorage.removeItem(timeoutKey);
          localStorage.removeItem(startTimeKey);
          router.replace('/');
          return;
        }
        
        setTimeLeft(remaining);
        
        // Show warning if less than 5 minutes remaining
        if (remaining <= 5 * 60) {
          setShowTimeoutWarning(true);
        }
      } else {
        // First time accessing this share code, set initial timeout
        localStorage.setItem(timeoutKey, 'active');
        localStorage.setItem(startTimeKey, Date.now().toString());
        setTimeLeft(15 * 60);
      }
    }
  }, [user, allowed, accessCode, router]);

  // Timeout countdown for guest users only
  useEffect(() => {
    // Only start timer if user is not logged in (guest user)
    if (!user && allowed && !loading && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Session expired - redirect to home
            sessionStorage.removeItem(`accessCodeValidated:${accessCode}`);
            localStorage.removeItem(`timeout_${accessCode}`);
            localStorage.removeItem(`startTime_${accessCode}`);
            toast.error('Session expired! Please enter the share code again to continue.');
            router.replace('/');
            return 0;
          }
                    
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [user, allowed, loading, timeLeft, accessCode, router]);

  // Format time for display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Early returns after all hooks
  if (!checked) return null;
  if (!allowed) return null;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Loading details...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
      <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
        <AlertTriangle className="text-red-500 w-16 h-16 mx-auto mb-4" />
        <p className="text-xl text-red-600 font-semibold">{error}</p>
      </div>
    </div>
  );

  if (!upload) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
        <FileQuestion className="text-gray-400 w-16 h-16 mx-auto mb-4" />
        <p className="text-xl text-gray-600">No data found</p>
      </div>
    </div>
  );

  // Print handler for upload details
  const handlePrint = () => {
    window.print();
  };

  // Search for another share code from same customer
  const handleShareCodeSearch = async () => {
    if (!shareCodeInput.trim()) {
      toast.error('Please enter a share code');
      return;
    }

    if (!upload) {
      toast.error('No current upload data available');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const res = await publicApi.get(`/api/v1/upload/${shareCodeInput.trim()}`);
      const newUpload = res.data?.data?.upload;
      
      if (!newUpload) {
        toast.error('Share code not found');
        return;
      }

      // Matching logic: same customer email AND (same house OR same flat) AND same postcode
      const normalize = (v) => (v || '').toString().trim().toUpperCase();
      const normalizePost = (v) => normalize(v).replace(/\s+/g, '');

      const emailMatch = normalize(newUpload.email) === normalize(upload.email);

      const curHouse = normalize(upload.house_name_number);
      const curFlat = normalize(upload.flat_apartment_room);
      const curPost = normalizePost(upload.actualPostCode || upload.postCode || upload.post_code);

      const newHouse = normalize(newUpload.house_name_number);
      const newFlat = normalize(newUpload.flat_apartment_room);
      const newPost = normalizePost(newUpload.actualPostCode || newUpload.postCode || newUpload.post_code);

      const houseMatch = curHouse && newHouse && curHouse === newHouse;
      const flatMatch = curFlat && newFlat && curFlat === newFlat;
      const postMatch = curPost && newPost && curPost === newPost;

      if (emailMatch && postMatch && (houseMatch || flatMatch)) {
        console.log('✅ Same customer and address verified, switching to new upload');
        setUpload(newUpload);
        setImageErrors({});
        setSelectedMedia(null);
        setShareCodeInput('');
        window.history.pushState({}, '', `/room/upload/${shareCodeInput.trim()}`);
      } else if (!emailMatch) {
        toast.error('This share code belongs to a different customer');
      } else if (!postMatch) {
        toast.error('Postcode does not match this customer');
      } else {
        toast.error('House/Flat number does not match this customer');
      }
    } catch (err) {
      console.error('Search error:', err);
              toast.error('Failed to find upload');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">


      <div className="max-w-4xl mx-auto p-6 pb-20 sm:pb-6 relative">
        {/* Header with Close Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
          {/* Title Section with Share Code */}
          <div className="text-center sm:text-left flex-1 order-1 sm:order-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">Upload Details</h1>
                             <div className="hidden sm:block">
                 <span className="bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 text-white font-normal text-sm px-3 py-1.5 rounded-full shadow-xl font-mono tracking-wide hover:shadow-2xl hover:scale-105 transition-all duration-300">
                   Share Code: {accessCode}
                 </span>
               </div>
            </div>
            <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto sm:mx-0 rounded-full mb-3 sm:mb-0"></div>
            {/* Mobile Share Code Display */}
            <div className="sm:hidden flex justify-center mb-4">
              <span className="bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 text-white font-normal text-base px-4 py-2.5 rounded-full shadow-xl font-mono tracking-wide">
                Share Code: {accessCode}
              </span>
            </div>
          </div>
          
          {/* Actions Section */}
          <div className="flex items-center gap-2 order-2 sm:order-2 w-full sm:w-auto justify-center sm:justify-end">
            {/* Share Code Search Input */}
            <div className="flex items-center gap-2 bg-white rounded-full shadow-md border border-gray-200 px-2 sm:px-3 py-1 flex-1 sm:flex-none  max-w-[200px] sm:max-w-none">
              <input
                type="text"
                value={shareCodeInput}
                onChange={(e) => {
                  setShareCodeInput(e.target.value);
                  if (searchError) setSearchError('');
                }}
                placeholder="Share code..."
                className="w-full sm:w-32 md:w-40 text-xs sm:text-sm border-none outline-none bg-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleShareCodeSearch()}
                disabled={isSearching}
              />
              <button
                onClick={handleShareCodeSearch}
                disabled={isSearching || !shareCodeInput.trim()}
                className="p-1 sm:p-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-full transition-all duration-200 flex-shrink-0"
                title="Search share code"
              >
                {isSearching ? (
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center p-1.5 sm:p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full border border-blue-500 transition-all duration-200 hover:scale-105 shadow-md flex-shrink-0"
              title="Print this page"
            >
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            {/* Enhanced Close Button */}
            <button
              onClick={() => router.back()}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-lg transition-all duration-200 z-20 border-2 border-white focus:outline-none focus:ring-2 focus:ring-red-400 flex-shrink-0"              aria-label="Close details"
              title="Close details"
            >
              <XCircle className="w-4 h-4 sm:w-6 sm:h-6" />
            </button>          
          </div>
          
          {/* Errors are shown via toast notifications */}
        </div>



        {/* Personal Information Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white mr-3">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Customer Information</h2>
            </div>
            
            {!user && (
              <div className="flex flex-col gap-2 items-center sm:items-end">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-2 rounded-full shadow-lg border border-white w-[280px] sm:w-fit">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-200" />
                    <span className="text-sm font-medium">
                      Session window expires in <span className="font-mono tabular-nums">{formatTime(timeLeft)}</span>
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-600 text-center sm:text-left sm:ml-0 sm:mr-auto pl-2">
                  Press <span className="inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white rounded-full shadow-lg border border-white translate-y-0.5"><XCircle className="w-4 h-4" /></span> above to close window now
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                <span className="text-gray-500 font-medium w-full sm:w-20 text-sm sm:text-base">Name:</span>
                <span className="text-gray-800 font-semibold text-sm sm:text-base">{upload.first_name} {upload.last_name}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                <span className="text-gray-500 font-medium w-full sm:w-20 text-sm sm:text-base">Phone:</span>
                <span className="text-gray-800 text-sm sm:text-base">{upload.phoneNumber}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                <span className="text-gray-500 font-medium w-full sm:w-20 text-sm sm:text-base">Email:</span>
                <span className="text-gray-800 text-sm sm:text-base break-all">{upload.email}</span>
              </div>
              {/* Created Date */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                <span className="text-gray-500 font-medium w-full sm:w-20 text-sm sm:text-base">Created:</span>
                <span className="text-gray-800 text-sm sm:text-base">{upload.createdAt ? moment(upload.createdAt).format('D MMMM YYYY, h:mm a') : '-'}</span>
              </div>
              

            </div>
            <div>
              
              <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 mb-3">
                <span className="text-gray-500 font-medium w-full sm:w-20 text-sm sm:text-base">Address:</span>
                <div className="text-gray-800 leading-relaxed text-sm sm:text-base">
                  {upload.house_name_number}, {upload.flat_apartment_room}, {upload.street_road}, {upload.city}, {upload.country}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                <span className="text-gray-500 font-medium w-full sm:w-20 text-sm sm:text-base">Postcode:</span>
                <span className="inline-block bg-blue-100 text-blue-800 text-base sm:text-lg font-bold px-2 sm:px-3 py-1 rounded-lg w-fit">
                  {upload.actualPostCode}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Images Section */}
        <div className="bg-white rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 mb-6 sm:mb-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white mr-2 sm:mr-3">
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Images/Photos</h2>
            </div>
            {upload.images?.length > 0 && (
              <span className="sm:ml-auto bg-purple-100 text-purple-800 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full w-fit">
                {upload.images.length} image{upload.images.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {upload.images && upload.images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
              {upload.images.map((img, index) => (
                <div key={img.url} className="group">
                  <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl sm:rounded-2xl overflow-hidden relative shadow-md hover:shadow-lg transition-all duration-300">
                    {!imageErrors[img.url] ? (
                      <Image
                        src={img.url}
                        alt={img.label || 'Upload image'}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-300 hover:scale-105"
                        onClick={() => setSelectedMedia({type: 'image', ...img})}
                        onError={() => setImageErrors(prev => ({ ...prev, [img.url]: true }))}
                        onLoad={(e) => {
                          // Log thumbnail dimensions for debugging
                          console.log(`🖼️ Thumbnail ${index + 1} loaded:`, {
                            naturalWidth: e.target.naturalWidth,
                            naturalHeight: e.target.naturalHeight,
                            displayWidth: e.target.offsetWidth,
                            displayHeight: e.target.offsetHeight,
                            aspectRatio: e.target.naturalWidth / e.target.naturalHeight
                          });
                        }}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                      </div>
                    )}
                    <div className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-white/90 backdrop-blur-sm rounded-full px-1.5 sm:px-2 py-0.5 text-xs font-semibold text-gray-700">
                      #{index + 1}
                    </div>
                    <div className="absolute top-1 sm:top-2 right-1 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button 
                        type="button"
                        onClick={() => setSelectedMedia({type: 'image', ...img})}
                        className="p-1 sm:p-1.5 bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full text-white transition-all duration-200 hover:scale-110"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 sm:mt-2 text-center px-1">
                    <div className="text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-center truncate">{img.label}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 md:py-12 text-gray-400">
              <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg">No images uploaded</p>
            </div>
          )}
        </div>

        {/* Videos Section */}
        <div className="bg-white rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-red-400 to-orange-500 rounded-full flex items-center justify-center text-white mr-2 sm:mr-3">
                <Video className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Videos</h2>
            </div>
            {upload.videos?.length > 0 && (
              <span className="sm:ml-auto bg-red-100 text-red-800 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full w-fit">
                {upload.videos.length} video{upload.videos.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {upload.videos && upload.videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {upload.videos.map((vid, index) => (
                <div key={vid.url} className="group">
                  <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl sm:rounded-2xl overflow-hidden relative shadow-md hover:shadow-lg transition-all duration-300">
                    <video
                      src={vid.url}
                      controls
                      className="w-full h-full object-cover"
                      preload="metadata"
                      playsInline
                      onError={(e) => {
                        console.error('Video error:', e);
                        e.target.style.display = 'none';
                        const fallback = e.target.parentElement.querySelector('.fallback-video');
                        if (fallback) fallback.style.display = 'flex';
                      }}
                      onLoadStart={() => {
                        console.log('Video loading started:', vid.url);
                      }}
                      onCanPlay={() => {
                        console.log('Video can play:', vid.url);
                      }}
                    />
                    <div className="fallback-video absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 hidden rounded-xl sm:rounded-2xl">
                      <Video className="w-8 h-8 sm:w-12 sm:h-12" />
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">Video unavailable</p>
                    </div>
                    <div className="absolute top-1 sm:top-2 right-1 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button 
                        type="button"
                        onClick={() => setSelectedMedia({type: 'video', ...vid})}
                        className="p-1 sm:p-1.5 bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full text-white transition-all duration-200 hover:scale-110"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 sm:mt-2 text-center px-1">
                    <div className="text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-center truncate">{vid.label}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 md:py-12 text-gray-400">
              <Video className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg">No videos uploaded</p>
            </div>
          )}
        </div>
      </div>

      {/* Media Modal */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col items-center justify-center relative">
            <button 
              type="button"
              onClick={e => { e.stopPropagation(); setSelectedMedia(null); }}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-lg transition-all duration-200 z-10 border-2 border-white focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 sm:w-6 sm:h-6" />
            </button>
            
            <div className="w-full h-full flex items-center justify-center">
              {selectedMedia.type === 'image' ? (
                <img 
                  src={selectedMedia.url} 
                  alt={selectedMedia.label}
                  className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  style={{ 
                    backgroundColor: 'transparent',
                    maxWidth: 'calc(100vw - 2rem)',
                    maxHeight: 'calc(100vh - 8rem)'
                  }}
                  onLoad={(e) => {
                    // Log image dimensions for debugging
                    console.log('🖼️ Image loaded:', {
                      naturalWidth: e.target.naturalWidth,
                      naturalHeight: e.target.naturalHeight,
                      displayWidth: e.target.offsetWidth,
                      displayHeight: e.target.offsetHeight
                    });
                  }}
                />
              ) : (
                <video 
                  src={selectedMedia.url}
                  controls
                  className="w-auto h-auto max-w-full max-h-full rounded-lg shadow-2xl"
                  style={{ 
                    maxWidth: 'calc(100vw - 2rem)',
                    maxHeight: 'calc(100vh - 8rem)'
                  }}
                  autoPlay
                  playsInline
                />
              )}
            </div>
            
            <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 backdrop-blur-sm rounded-full px-4 py-2">
              <div className="text-white text-sm sm:text-base font-medium text-center">
                {selectedMedia.label || selectedMedia.name}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}