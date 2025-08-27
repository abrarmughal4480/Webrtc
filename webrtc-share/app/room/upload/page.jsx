"use client"
import { useState, useRef, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, VideoIcon, PlayIcon, Minimize2, Expand, ZoomIn, X, Info, Loader2, Printer, LogOut, Monitor, Home } from 'lucide-react';
import { toast } from "sonner";
import AccessCodeDialog from '@/components/dialogs/AccessCodeDialog';
import { publicApi } from '@/http';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';
import { createPortal } from 'react-dom';
import { registerResidentRequest, logoutRequest } from '@/http/authHttp';
import { getMyLatestUploadRequest } from '@/http/uploadHttp';
import { useUser } from '@/provider/UserProvider';
import EnterShareCodeDialog from '@/components/EnterShareCodeDialog';

const MAX_VIDEOS = 2;
const MAX_IMAGES = 6;
const MAX_VIDEO_DURATION = 15; // in seconds

// Add helper to convert file to base64 with proper format detection
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      console.log(`📁 File converted to base64:`, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        base64Length: result.length,
        base64Start: result.substring(0, 100)
      });
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Main component that uses useSearchParams
function UploadPageContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    house_name_number: "",
    flat_apartment_room: "",
    street_road: "",
    city: "",
    country: "",
    postCode: "",
    actualPostCode: "",
    phoneNumber: "",
    email: ""
  });
  const [accessCode, setAccessCode] = useState('');
  const [isAccessCodeDialogOpen, setIsAccessCodeDialogOpen] = useState(false);
  // Add new state to control flow
  const [pendingShareCode, setPendingShareCode] = useState(null);
  const [pendingShowSignup, setPendingShowSignup] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  
  // State for Enter Share Code dialog
  const [isEnterShareCodeOpen, setIsEnterShareCodeOpen] = useState(false);
  const [prefilledShareCodeData, setPrefilledShareCodeData] = useState({
    code: '',
    house: '',
    postcode: '',
    email: ''
  });
  const [consentChecked, setConsentChecked] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Check for URL parameters and auto-open Enter Share Code dialog
  useEffect(() => {
    const houseNumber = searchParams.get('house_number');
    const flatNumber = searchParams.get('flat_number');
    const postcode = searchParams.get('postcode');
    
    // If any of these parameters exist, open the Enter Share Code dialog
    if (houseNumber || flatNumber || postcode) {
      console.log('🔍 URL parameters detected:', { houseNumber, flatNumber, postcode });
      
      // Set prefilled data
      setPrefilledShareCodeData({
        code: '', // Access code will be entered by user
        house: houseNumber || flatNumber || '', // Use house number or flat number
        postcode: postcode || '',
        email: ''
      });
      
      // Open the dialog
      setIsEnterShareCodeOpen(true);
    }
  }, [searchParams]);

  const requiredFields = [
    'first_name', 'last_name', 'actualPostCode', 'phoneNumber', 'email'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form state before validation:', form);
    // Validate required fields
    for (const field of requiredFields) {
      if (!form[field] || form[field].trim() === '') {
        console.log('Missing required field:', field);
        toast.error('Please fill all required fields.');
        return;
      }
    }
    setAccessCode(''); // Clear before request
    const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Convert images to base64
    const imagesWithBase64 = await Promise.all(
      images.map(async (img) => ({
        name: img.name,
        label: img.label,
        data: await fileToBase64(img.file),
      }))
    );

    // Convert videos to base64
    const videosWithBase64 = await Promise.all(
      recordings.map(async (vid) => {
        const base64Data = await fileToBase64(vid.file);
        console.log(`🎥 Converting video to base64:`, {
          name: vid.name,
          duration: vid.duration,
          base64Length: base64Data ? base64Data.length : 0,
          base64Start: base64Data ? base64Data.substring(0, 100) : 'no data'
        });
        return {
          name: vid.name,
          label: vid.label,
          duration: vid.duration,
          data: base64Data,
        };
      })
    );

    // Remove spaces from postcode before saving
    const cleanedForm = {
      ...form,
      actualPostCode: form.actualPostCode.replace(/\s/g, ''), // Remove all spaces
    };

    const submissionData = {
      ...cleanedForm,
      images: imagesWithBase64,
      videos: videosWithBase64,
      accessCode: generatedCode,
    };

    console.log('📤 Submitting data:', {
      accessCode: generatedCode,
      imagesCount: imagesWithBase64.length,
      videosCount: videosWithBase64.length,
      videos: videosWithBase64.map(v => ({
        name: v.name,
        dataLength: v.data ? v.data.length : 0
      }))
    });

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('🚀 Initializing upload session...');
    
    try {
      // First, create upload session and get session ID
      const sessionData = {
        first_name: cleanedForm.first_name,
        last_name: cleanedForm.last_name,
        house_name_number: cleanedForm.house_name_number,
        flat_apartment_room: cleanedForm.flat_apartment_room,
        street_road: cleanedForm.street_road,
        city: cleanedForm.city,
        country: cleanedForm.country,
        postCode: cleanedForm.postCode,
        actualPostCode: cleanedForm.actualPostCode,
        phoneNumber: cleanedForm.phoneNumber,
        email: cleanedForm.email,
        accessCode: generatedCode,
        totalImages: imagesWithBase64.length,
        totalVideos: videosWithBase64.length
      };
      
      // Create upload session
      const sessionRes = await publicApi.post('/api/v1/upload/session', sessionData);
      const sessionId = sessionRes.data.data.sessionId;
      
      setUploadStatus('📸 Starting image uploads...');
      
      // Upload images one by one
      for (let i = 0; i < imagesWithBase64.length; i++) {
        const image = imagesWithBase64[i];
        setUploadStatus(`📸 Uploading image ${i + 1}/${imagesWithBase64.length} (${image.name})`);
        
        await publicApi.post(`/api/v1/upload/file/${sessionId}`, {
          fileData: image.data,
          fileName: image.name,
          fileLabel: image.label,
          fileType: 'image',
          fileIndex: i
        });
        
        const imageProgress = Math.round(((i + 1) / imagesWithBase64.length) * 50); // Images are 50% of total
        setUploadProgress(imageProgress);
      }
      
      setUploadStatus('🎥 Starting video uploads...');
      
      // Upload videos one by one
      for (let i = 0; i < videosWithBase64.length; i++) {
        const video = videosWithBase64[i];
        setUploadStatus(`🎥 Uploading video ${i + 1}/${videosWithBase64.length} (${video.name})`);
        
        await publicApi.post(`/api/v1/upload/file/${sessionId}`, {
          fileData: video.data,
          fileName: video.name,
          fileLabel: video.label,
          fileType: 'video',
          fileIndex: i,
          duration: video.duration
        });
        
        const videoProgress = 50 + Math.round(((i + 1) / videosWithBase64.length) * 50); // Videos are 50% of total
        setUploadProgress(videoProgress);
      }
      
      // Complete upload
      setUploadStatus('✨ Finalizing upload...');
      const completeRes = await publicApi.post(`/api/v1/upload/complete/${sessionId}`);
      const data = completeRes.data;
      const code = data?.data?.upload?.accessCode || generatedCode;
      setAccessCode(code);
      
      setUploadProgress(100);
      setUploadStatus('🎉 Upload completed successfully!');
      
      if (user?.role === 'resident' || data?.data?.alreadyUploaded) {
        setIsAccessCodeDialogOpen(true);
        setShowSignupPrompt(false);
        setPendingShowSignup(false);
        setPendingShareCode(null);
      } else {
        setShowSignupPrompt(true);
        setPendingShowSignup(true);
        setPendingShareCode(code);
        setIsAccessCodeDialogOpen(false);
      }
      toast.success("Details Submitted!", { description: "Your access code has been generated." });
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Upload failed';
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  // Demo state for recordings and images
  const [recordings, setRecordings] = useState([]);
  const [images, setImages] = useState([]);
  const [playingVideos, setPlayingVideos] = useState(new Set());
  const [expandedVideos, setExpandedVideos] = useState(new Set());
  const [modalImage, setModalImage] = useState(null);

  const recordingInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleFileChange = async (event, type) => {
    let files = Array.from(event.target.files);
    if (files.length === 0) return;

    if (type === 'video') {
      if (recordings.length >= MAX_VIDEOS) {
        toast.warning(`You can only upload a maximum of ${MAX_VIDEOS} videos.`);
        return;
      }
      const availableSlots = MAX_VIDEOS - recordings.length;
      if (files.length > availableSlots) {
        toast.warning(`You can only add ${availableSlots} more video(s).`, {
          description: `The first ${availableSlots} files were added.`
        });
        files = files.slice(0, availableSlots);
      }

      const promises = files.map(async file => {
        const duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_DURATION) {
            toast.error(`Video exceeds 15-second limit`, {
                description: `'${file.name}' was not uploaded.`
            });
            return null;
        }
        return {
            id: crypto.randomUUID(),
            url: URL.createObjectURL(file),
            timestamp: new Date().toLocaleString(),
            name: file.name,
            duration,
            file, // Keep the file object for submission
        };
      });

      const newItems = (await Promise.all(promises)).filter(Boolean);
      if(newItems.length > 0) {
        setRecordings(prev => [...prev, ...newItems]);
      }

    } else if (type === 'image') {
      if (images.length >= MAX_IMAGES) {
        toast.warning(`You can only upload a maximum of ${MAX_IMAGES} images.`);
        return;
      }
      const availableSlots = MAX_IMAGES - images.length;
      if (files.length > availableSlots) {
        toast.warning(`You can only add ${availableSlots} more image(s).`, {
          description: `The first ${availableSlots} files were added.`
        });
        files = files.slice(0, availableSlots);
      }

      const newItems = files.map(file => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        timestamp: new Date().toLocaleString(),
        name: file.name,
        duration: 0,
        file, // Keep the file object for submission
      }));
      setImages(prev => [...prev, ...newItems]);
    }
    
    event.target.value = null; // Reset file input
  };

  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => {
        resolve(0); // Could not get duration
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const formatRecordingTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) {
      return "0:00";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const triggerRecordingUpload = () => recordingInputRef.current?.click();
  const triggerImageUpload = () => imageInputRef.current?.click();

  const removeRecording = (id) => {
    setRecordings(prev => prev.filter(rec => rec.id !== id));
  };
  
  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleImageLabelChange = (id, value) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, label: value } : img));
  };
  const handleVideoLabelChange = (id, value) => {
    setRecordings(prev => prev.map(rec => rec.id === id ? { ...rec, label: value } : rec));
  };

  // Logout function
  const handleLogout = async () => {
    try {
      const res = await logoutRequest();
      if (res.success) {
        toast.success('Logged out successfully');
        router.push('/');
      } else {
        toast.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const router = useRouter();
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [signupEmailEditable, setSignupEmailEditable] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Prefill form for logged-in residents
  useEffect(() => {
    if (user && user.role === 'resident') {
      getMyLatestUploadRequest().then(res => {
        console.log('Latest upload response:', res.data);
        const upload = res.data?.data?.upload;
        if (upload) {
          setForm(prev => ({
            ...prev,
            first_name: upload.first_name || '',
            last_name: upload.last_name || '',
            house_name_number: upload.house_name_number || '',
            flat_apartment_room: upload.flat_apartment_room || '',
            street_road: upload.street_road || '',
            city: upload.city || '',
            country: upload.country || '',
            postCode: upload.postCode || '',
            actualPostCode: upload.actualPostCode || '',
            phoneNumber: upload.phoneNumber || '',
            email: upload.email || '',
          }));
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (showSignupPrompt || isAccessCodeDialogOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSignupPrompt, isAccessCodeDialogOpen]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 pt-6 md:pt-12 pb-4 md:pb-6">
          <div className="bg-indigo-50 rounded-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 border-2 border-indigo-100">
            <div className="flex flex-col items-center text-center gap-2 sm:gap-4">
              <div className="flex-shrink-0">
                <Info className="h-7 w-7 sm:h-8 sm:w-8 text-indigo-400" />
              </div>
              <div className="mt-2 sm:mt-4">
                <p className="text-base sm:text-lg font-semibold text-indigo-800 text-balance">
                  You can upload images/photos or videos on this page and share them by generating a Share Code below <br className="hidden sm:block" /> and giving this to your landLord/Councillor or anyone else.
                </p>
                <p className="text-base sm:text-lg font-semibold text-indigo-800 mt-1 sm:mt-2">
                  Happy Sharing!
                </p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 mb-6 md:mb-8 border-2 border-gray-200 relative">
              {/* Header with title and icons - mobile responsive layout */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6">
                {/* Title - positioned on left, below icons on mobile */}
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 order-2 sm:order-1 mt-4 sm:mt-0">
                  Your Details
                </h1>
                
                {/* Top-right icons */}
                <div className="flex gap-2 z-10 order-1 sm:order-2 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full border border-blue-500 transition-all duration-200 hover:scale-105 shadow-md"
                    title="Print"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  {user ? (
                    <>
                      <button
                        type="button"
                        onClick={() => router.push('/dashboard')}
                        className="inline-flex items-center justify-center p-2 bg-green-600 hover:bg-green-700 text-white rounded-full border border-green-500 transition-all duration-200 hover:scale-105 shadow-md"
                        title="Go to Resident Portal"
                      >
                        <Monitor className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center justify-center p-2 bg-orange-600 hover:bg-orange-700 text-white rounded-full border border-orange-500 transition-all duration-200 hover:scale-105 shadow-md"
                        title="Logout"
                      >
                        <LogOut className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      className="inline-flex items-center justify-center p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full border border-purple-500 transition-all duration-200 hover:scale-105 shadow-md"
                      title="Back to Main Page"
                    >
                      <Home className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center justify-center p-2 bg-red-600 hover:bg-red-700 text-white rounded-full border border-red-600 transition-all duration-200 hover:scale-105 shadow-md"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {!user && (
                <div className="text-center text-sm text-gray-700 font-semibold mb-4">
                  Already registered? <a href="#" className="text-blue-700 underline hover:text-blue-900" onClick={e => { e.preventDefault(); localStorage.setItem('loginRedirect', window.location.pathname); localStorage.setItem('openLoginPopup', 'true'); window.location.href = '/'; }}>Log in</a> or <a href="#" className="text-blue-700 underline hover:text-blue-900" onClick={e => { e.preventDefault(); setShowSignupPrompt(true); setSignupEmailEditable(true); }}>Sign up</a>
                </div>
              )}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">First Name<span className="text-red-500">*</span></label>
                    <Input name="first_name" value={form.first_name} onChange={handleChange} placeholder="Enter first name" className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Last Name<span className="text-red-500">*</span></label>
                    <Input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Enter last name" className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} required />
                  </div>
                </div>

                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-600">Address</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input name="house_name_number" value={form.house_name_number} onChange={handleChange} placeholder="House/Building Name or Number" className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
                      <Input name="flat_apartment_room" value={form.flat_apartment_room} onChange={handleChange} placeholder="Flat/Apartment/Room Number" className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
                    </div>
                    <Input name="street_road" value={form.street_road} onChange={handleChange} placeholder="Street/Road" className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input name="city" value={form.city} onChange={handleChange} placeholder="Town/City" className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
                      <Input name="country" value={form.country} onChange={handleChange} placeholder="County" className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Postcode<span className="text-red-500">*</span></label>
                    <Input name="actualPostCode" value={form.actualPostCode} onChange={handleChange} placeholder="e.g., SW1 0AA" className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} required />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number<span className="text-red-500">*</span></label>
                    <Input name="phoneNumber" type="tel" value={form.phoneNumber} onChange={handleChange} placeholder="Enter phone number" className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Email<span className="text-red-500">*</span></label>
                    <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter email address" className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} required />
                  </div>
                </div>

              </div>
              
              {/* Required field indicator */}
              <div className="text-center mt-4">
                <p className="text-xs text-gray-500">
                  <span className="text-red-500">*</span>required
                </p>
              </div>
            </div>

            {/* Enhanced Video & Image Section */}
            <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-8 border-2 border-gray-200 mb-6 md:mb-8 media-section">
              {/* Images Section */}
              <div>
                <div className="flex justify-between items-center mb-4 md:mb-6">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 uppercase tracking-wide">
                      Images/Photos ({images.length}/{MAX_IMAGES})
                    </h2>
                  </div>
                  <Button type="button" onClick={triggerImageUpload} variant="outline" disabled={images.length >= MAX_IMAGES} className="cursor-pointer disabled:cursor-not-allowed">
                    <Plus className="mr-2 h-4 w-4" /> Upload
                  </Button>
                </div>

                <input 
                  type="file" 
                  ref={imageInputRef} 
                  onChange={(e) => handleFileChange(e, 'image')}
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/svg+xml"
                  multiple
                />

                {images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                    {images.map((image, index) => (
                      <div key={image.id} className="w-full">
                        <div className="w-full aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl overflow-hidden relative shadow-lg hover:shadow-xl transition-all duration-300 group">
                          <img
                            src={image.url}
                            alt={image.name}
                            className="w-full h-full object-cover rounded-3xl cursor-pointer"
                            onClick={() => setModalImage(image)}
                          />
                          <div className="absolute top-2 md:top-3 right-2 md:right-3 flex flex-row gap-1 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                             <button type="button" onClick={() => removeImage(image.id)} className="p-1.5 md:p-2 bg-black/20 backdrop-blur-sm hover:bg-red-500/80 rounded-full text-white transition-all duration-200 hover:scale-110">
                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>
                            <button 
                              type="button"
                              onClick={() => setModalImage(image)}
                              className="p-1.5 md:p-2 bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full text-white transition-all duration-200 hover:scale-110"
                            >
                              <Expand className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                          </div>
                          <div className="absolute top-2 md:top-3 left-2 md:left-3 bg-white/90 backdrop-blur-sm rounded-full px-2 md:px-3 py-0.5 md:py-1">
                            <span className="text-xs font-semibold text-gray-700">#{index + 1}</span>
                          </div>
                          <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3 bg-white/90 backdrop-blur-sm rounded-full p-1.5 md:p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <ZoomIn className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-700" />
                          </div>
                        </div>
                        <div className="mt-2 md:mt-3 text-center px-2">
                          <p className="text-xs md:text-sm text-gray-700 font-medium truncate" title={image.name}>{image.name}</p>
                          <input
                            type="text"
                            value={image.label || ''}
                            onChange={e => handleImageLabelChange(image.id, e.target.value)}
                            placeholder="Add a label or description…"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-xs md:text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 md:py-12 text-gray-500">
                    <div className="text-sm">Please upload up to 6 images here.</div>
                    <div className="text-sm">No images uploaded yet.</div>
                  </div>
                )}
              </div>

              {/* Videos Section */}
              <div className='border-t border-gray-200 pt-6 md:pt-8 mt-6 md:mt-8'>
                <div className="flex justify-between items-center mb-4 md:mb-6">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 uppercase tracking-wide">
                      Videos ({recordings.length}/{MAX_VIDEOS})
                    </h2>
                  </div>
                  <Button type="button" onClick={triggerRecordingUpload} variant="outline" disabled={recordings.length >= MAX_VIDEOS} className="cursor-pointer disabled:cursor-not-allowed">
                    <Plus className="mr-2 h-4 w-4" /> Upload
                  </Button>
                </div>
                
                <input 
                  type="file" 
                  ref={recordingInputRef} 
                  onChange={(e) => handleFileChange(e, 'video')}
                  className="hidden"
                  accept="video/mp4,video/webm,video/ogg,video/avi,video/mov,video/wmv,video/flv,video/mkv"
                  multiple
                />

                {recordings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {recordings.map((recording) => {
                      const isExpanded = expandedVideos.has(recording.id);
                      return (
                        <div key={recording.id} className={`w-full transition-all duration-300 ${isExpanded ? 'sm:col-span-2' : ''}`}>
                          <div className={`w-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl overflow-hidden relative shadow-lg hover:shadow-xl transition-all duration-300 group ${isExpanded ? 'aspect-video' : 'aspect-video sm:aspect-[4/3]'}`}>
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
                                if (!isExpanded && e.target.paused) e.target.play();
                                else if (!isExpanded && !e.target.paused) e.target.pause();
                              }}
                            />
                            {!isExpanded && (
                              <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 ${playingVideos.has(recording.id) ? 'opacity-0 group-hover:opacity-70 scale-75' : 'opacity-80 group-hover:opacity-100 group-hover:scale-110'}`}>
                                <div className="bg-red-600 rounded-full p-3 md:p-4">
                                  <PlayIcon className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-lg" />
                                </div>
                              </div>
                            )}
                            <div className="absolute top-2 md:top-3 right-2 md:right-3 flex flex-row gap-1 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                              <button type="button" onClick={() => removeRecording(recording.id)} className="p-1.5 md:p-2 bg-black/20 backdrop-blur-sm hover:bg-red-500/80 rounded-full text-white transition-all duration-200 hover:scale-110">
                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  const newExpanded = new Set(expandedVideos);
                                  if (isExpanded) newExpanded.delete(recording.id);
                                  else newExpanded.add(recording.id);
                                  setExpandedVideos(newExpanded);
                                }}
                                className="p-1.5 md:p-2 bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full text-white transition-all duration-200 hover:scale-110"
                              >
                                {isExpanded ? <Minimize2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Expand className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 md:mt-3 text-center px-2">
                            <p className="text-xs md:text-sm text-gray-700 font-medium truncate" title={recording.name}>{recording.name}</p>
                            <p className="text-xs text-gray-500">Duration: {formatRecordingTime(recording.duration)}</p>
                            <input
                              type="text"
                              value={recording.label || ''}
                              onChange={e => handleVideoLabelChange(recording.id, e.target.value)}
                              placeholder="Add a label or description…"
                              className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-xs md:text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 md:py-12 text-gray-500">
                    <div className="text-sm">Please upload up to 2 videos here.</div>
                    <div className="text-sm">No videos uploaded yet.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Consent Checkbox Section */}
            <div className="mt-6">
              <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border-2 border-gray-200">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-1 w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-0 focus:outline-none flex-shrink-0"
                    required
                  />
                  <label htmlFor="consent" className="text-sm text-gray-700 leading-relaxed">
                    By checking this box and continuing to 'Save/Get Share Code', you consent to sharing your personal information, and the photo(s) and video(s) you uploaded with the person(s) or organisation(s) that you give or send the Share Code to.
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button Section */}
            <div className="mt-8">
              <div className="max-w-md mx-auto">

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-full relative overflow-hidden" 
                  disabled={isUploading || !consentChecked}
                >
                  {isUploading ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300" 
                           style={{ width: `${uploadProgress}%` }}></div>
                      <div className="relative z-10 flex items-center justify-center w-full">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                            <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping"></div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-white drop-shadow-sm">
                              {uploadStatus}
                            </div>
                            <div className="text-xs text-white/90 font-medium">
                              {uploadProgress}% Complete
                            </div>
                            <div className="mt-1 w-16 h-1 bg-white/30 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    'Save/Get Share Code'
                  )}
                </Button>
                {!consentChecked && (
                  <p className="text-xs text-red-500 text-center mt-2">
                    Please check the consent box to continue
                  </p>
                )}
              </div>
            </div>
          </form>

          {/* Footer */}
          <footer className="text-center py-8 text-gray-500 text-sm mt-10">
            <Image src="/devices.svg" alt="Videodesk" width={120} height={120} className="w-28 mx-auto mb-8" />
            <p>© 2025 Videodesk.co.uk. All rights reserved.</p>
          </footer>
        </div>
        
        {/* Image Modal */}
        {modalImage && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4" onClick={() => setModalImage(null)}>
            <div className="relative max-w-full md:max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img
                src={modalImage.url}
                alt="Expanded image"
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setModalImage(null)}
                className="absolute top-4 right-4 z-10 p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all duration-300"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                <p className="text-white text-sm font-medium">{modalImage.name}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <AccessCodeDialog 
        isOpen={isAccessCodeDialogOpen}
        onOpenChange={(open) => {
          setIsAccessCodeDialogOpen(open);
          if (open) setShowSignupPrompt(true);
          if (!open) setShowSignupPrompt(false);
        }}
        accessCode={accessCode}
        onCopy={() => {}}
      />
      {showSignupPrompt && typeof window !== 'undefined' && createPortal(
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] pointer-events-auto"></div>
          {/* Centered signup modal */}
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="min-w-[0] max-w-[95vw] w-full sm:w-[400px] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col mx-2 sm:mx-0">
              {/* Purple header strip above modal */}
              <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-base sm:text-lg font-bold text-center break-words whitespace-pre-line leading-snug w-full text-balance">
                    Sign up for an easier and faster <br className="hidden sm:block" /> experience next time!
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowSignupPrompt(false);
                    setPendingShowSignup(false);
                    setPendingShareCode(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-200"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="w-full bg-white rounded-b-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 flex flex-col items-center gap-3 pointer-events-auto">
                <div className="text-gray-500 text-xs sm:text-sm text-center mb-2">Create a password to save your uploads.</div>
                <div className="w-full flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-600 ml-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!signupEmailEditable}
                    className={`w-full px-3 py-2 rounded-lg border border-gray-300 ${signupEmailEditable ? 'bg-white text-gray-900 cursor-text' : 'bg-gray-100 text-gray-500 cursor-not-allowed'} text-sm`}
                  />
                  <label className="text-xs font-semibold text-gray-600 ml-1 mt-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                    placeholder="Enter password"
                  />
                  <label className="text-xs font-semibold text-gray-600 ml-1 mt-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                    placeholder="Confirm password"
                  />
                </div>
                <div className="flex gap-2 w-full justify-center mt-2">
                  <button
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-full transition-all w-full"
                    onClick={async () => {
                      if (!password || !confirmPassword) {
                        toast.error('Please enter both password fields.');
                        return;
                      }
                      if (password !== confirmPassword) {
                        toast.error('Passwords do not match.');
                        return;
                      }
                      setIsSignupLoading(true);
                      try {
                        const res = await registerResidentRequest({ email: form.email, password });
                        toast.success('Resident account created!');
                        setShowSignupPrompt(false);
                        setPendingShowSignup(false);
                        setSignupEmailEditable(false);
                        if (pendingShareCode) {
                          setAccessCode(pendingShareCode);
                          setIsAccessCodeDialogOpen(true);
                          setPendingShareCode(null);
                        }
                      } catch (err) {
                        toast.error('Signup failed');
                      } finally {
                        setIsSignupLoading(false);
                      }
                    }}
                    disabled={isSignupLoading}
                  >
                    {isSignupLoading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving...</>) : 'Save My Details'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
      
      {/* Enter Share Code Dialog */}
      <EnterShareCodeDialog 
        open={isEnterShareCodeOpen} 
        setOpen={setIsEnterShareCodeOpen} 
        prefilledData={prefilledShareCodeData}
      />
    </>
  );
}

// Wrapper component with Suspense boundary
export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  );
}
