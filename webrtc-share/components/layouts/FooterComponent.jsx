"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Calendar1, Calendar1Icon, Send, X } from "lucide-react"
import { useState, useEffect } from "react"
import CustomDialog from "../dialogs/CustomDialog"
import { bookDemoMeetingRequest } from "@/http/authHttp"
import { useUser } from "@/provider/UserProvider"
import axios from "axios"
import { toast } from "sonner";
import { useRouter } from "next/navigation"
import EnterShareCodeDialog from "../EnterShareCodeDialog";

export function Footer() {
  const { user, isAuth } = useUser();
  const [isCallbackOpen, setIsCallbackOpen] = useState(false);
  const [isMeetingOpen, setISMeetingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [callbackLoading, setCallbackLoading] = useState(false);
  const [isShareCodeOpen, setIsShareCodeOpen] = useState(false);
  const [callbackFormData, setCallbackFormData] = useState({
    name: '',
    email: '',
    phone: '',
    day: '',
    customDate: '',
    timeSlot: '',
    customHour: '09',
    customMinute: '00',
    message: ''
  });
  const [meetingFormData, setMeetingFormData] = useState({
    name: '',
    email: '',
    date: '',
    hour: '08',
    minute: '00',
    message: ''
  });

  const router = useRouter();

  // Reset form fields when callback modal closes
  useEffect(() => {
    if (!isCallbackOpen) {
      setCallbackFormData({
        name: '',
        email: '',
        phone: '',
        day: '',
        customDate: '',
        timeSlot: '',
        customHour: '09',
        customMinute: '00',
        message: ''
      });
    }
  }, [isCallbackOpen]);

  // Reset form fields when demo meeting modal closes
  useEffect(() => {
    if (!isMeetingOpen) {
      setMeetingFormData({
        name: '',
        email: '',
        date: '',
        hour: '08',
        minute: '00',
        message: ''
      });
    }
  }, [isMeetingOpen]);

  const handleCallbackInputChange = (e) => {
    const { name, value } = e.target;
    setCallbackFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMeetingInputChange = (e) => {
    const { name, value } = e.target;
    setMeetingFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Helper functions for user data (same as VideoLinkSender)
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

  const generateVideoLinkForDemo = async (email) => {
    try {
      console.log('🎥 Generating video link for demo meeting...');
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      const profileData = {
        email: email
      };
      
      // Add landlord info if user is authenticated and has it
      if (user?.landlordInfo?.landlordName) {
        profileData.landlordName = user.landlordInfo.landlordName;
      }
      
      const landlordLogoUrl = getLandlordLogo();
      if (landlordLogoUrl) {
        profileData.landlordLogo = landlordLogoUrl;
      }
      
      const profileImageUrl = getProfileImage();
      if (profileImageUrl) {
        profileData.profileImage = profileImageUrl;
      }
      
      // Add redirect URL logic for demo meetings
      let redirectUrl = ''; // Empty means use current frontend URL
      if (user?.landlordInfo?.redirectUrlTailored && user?.landlordInfo?.redirectUrlTailored.trim() !== 'www.') {
        redirectUrl = user.landlordInfo.redirectUrlTailored;
        console.log('🔗 Using tailored redirect URL for demo:', redirectUrl);
      } else if (user?.landlordInfo?.redirectUrlDefault && user?.landlordInfo?.redirectUrlDefault.trim() !== '') {
        redirectUrl = user.landlordInfo.redirectUrlDefault;
        console.log('🔗 Using custom default redirect URL for demo:', redirectUrl);
      } else {
        // Use current frontend URL as default
        redirectUrl = window.location.origin;
        console.log('🔗 Using current frontend URL as default for demo:', redirectUrl);
      }
      
      // Set token landlord info (same as VideoLinkSender)
      profileData.tokenLandlordInfo = {
        landlordName: user?.landlordInfo?.landlordName || 'Videodesk Demo',
        landlordLogo: landlordLogoUrl,
        profileImage: profileImageUrl,
        useLandlordLogoAsProfile: user?.landlordInfo?.useLandlordLogoAsProfile || false,
        profileShape: user?.landlordInfo?.profileShape || 'circle',
        redirectUrl: redirectUrl
      };
      
      const queryParams = new URLSearchParams();
      queryParams.append('email', email);
      if (profileData.landlordName) queryParams.append('landlordName', profileData.landlordName);
      if (profileData.landlordLogo) queryParams.append('landlordLogo', profileData.landlordLogo);
      if (profileData.profileImage) queryParams.append('profileImage', profileData.profileImage);
      if (redirectUrl) queryParams.append('redirectUrl', redirectUrl);
      if (profileData.tokenLandlordInfo) {
        queryParams.append('tokenLandlordInfo', JSON.stringify(profileData.tokenLandlordInfo));
      }
      
      console.log('📞 Calling video link generation API with URL:', `${backendUrl}/send-token`);
      console.log('📊 Query params with redirect URL:', queryParams.toString());
      
      const res = await axios.get(`${backendUrl}/send-token?${queryParams.toString()}`);
      
      console.log('✅ Video link generated successfully with redirect URL:', res.data.token);
      return res.data.token;
    } catch (error) {
      console.error('❌ Error generating video link for demo:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
      throw error;
    }
  };

  const handleMeetingSubmit = async (e) => {
    e.preventDefault();
    
    if (!meetingFormData.name || !meetingFormData.email || !meetingFormData.date) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('📅 Submitting demo meeting request...');
      
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/demo-meetings`, {
        name: meetingFormData.name,
        email: meetingFormData.email,
        date: meetingFormData.date,
        hour: meetingFormData.hour,
        minute: meetingFormData.minute,
        message: meetingFormData.message
      });
      
      if (response.data.success) {
        toast.success("Demo meeting request submitted successfully!");
        console.log('✅ Demo meeting request submitted successfully');
        
        // Reset form
        setMeetingFormData({
          name: '',
          email: '',
          date: '',
          hour: '08',
          minute: '00',
          message: ''
        });
        setISMeetingOpen(false);
      }
    } catch (error) {
      console.error('❌ Demo meeting request error:', error);
      toast.error("Failed to submit demo meeting request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallbackSubmit = async (e) => {
    e.preventDefault();
    
    if (!callbackFormData.name || !callbackFormData.email || !callbackFormData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCallbackLoading(true);
    
    try {
      console.log('📞 Sending callback request...');
      
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/callback-requests`, {
        name: callbackFormData.name,
        email: callbackFormData.email,
        phone: callbackFormData.phone,
        day: callbackFormData.day,
        customDate: callbackFormData.customDate,
        customHour: callbackFormData.customHour,
        customMinute: callbackFormData.customMinute,
        message: callbackFormData.message
      });
      
      if (response.data.success) {
        toast.success("Callback request submitted successfully!");
        console.log('✅ Callback request submitted successfully');
        
        // Reset form
        setCallbackFormData({
          name: '',
          email: '',
          phone: '',
          day: '',
          customDate: '',
          timeSlot: '',
          customHour: '09',
          customMinute: '00',
          message: ''
        });
        setIsCallbackOpen(false);
      }
    } catch (error) {
      console.error('❌ Callback request error:', error);
      toast.error("Failed to submit callback request");
    } finally {
      setCallbackLoading(false);
    }
  };

  return (
    <>
      <footer className="bg-gray-50 border-t border-gray-200 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-stretch h-full">
            {/* Left Section - Company Info */}
            <div className="space-y-4 flex items-center justify-center flex-col">
              <h2 className="text-2xl font-bold text-gray-900">Videodesk.co.uk</h2>
              <div className="text-gray-600 text-center">
                <a 
                  href="mailto:Info@videodesk.co.uk" 
                  className="font-medium hover:text-[#9452FF] transition-colors duration-200 cursor-pointer"
                  title="Send email to Info@videodesk.co.uk"
                >
                  Info@videodesk.co.uk
                </a>
              </div>
            </div>

            {/* Center Section - Action Buttons */}
            <div className="flex flex-col items-center justify-center h-full gap-4 w-full">
              <Button className={"w-[220px] text-white bg-purple-500 flex items-center justify-between gap-2 cursor-pointer rounded-full py-3 px-6 text-base font-semibold shadow-md hover:bg-purple-600 transition-all duration-200 text-center"} onClick={() => setIsCallbackOpen(true)}>
                <span>Request a Callback</span>
                <Calendar />
              </Button>
              <Button className={"w-[220px] text-white bg-purple-500 flex items-center justify-between gap-2 cursor-pointer rounded-full py-3 px-6 text-base font-semibold shadow-md hover:bg-purple-600 transition-all duration-200 text-center"} onClick={() => setISMeetingOpen(true)}>
                <span>Book a Demo Meeting</span>
                <Calendar />
              </Button>
            </div>

            {/* Right Section - Navigation Links */}
            <div className="space-y-3 flex flex-col items-center lg:items-end">
              <a href="#about" className="block text-gray-600 hover:text-gray-900 transition-colors">
                About
              </a>
              <a href="#how-it-works" className="block text-gray-600 hover:text-gray-900 transition-colors">
                How it works
              </a>
              <a href="#launch-link" className="block text-gray-600 hover:text-gray-900 transition-colors">
                Launch new video link
              </a>
              <a href="#pricing" className="block text-gray-600 hover:text-gray-900 transition-colors">
                Plans
              </a>
            </div>

            {/* Fourth Column - Resident Button */}
            <div className="flex flex-col items-center lg:items-end gap-4">
              <Button className={"w-[230px] text-white bg-orange-500 flex items-center justify-between gap-2 cursor-pointer rounded-full py-3 px-6 text-base font-semibold shadow-md hover:bg-orange-600 transition-all duration-200 h-auto"} onClick={() => router.push('/room/upload')}>
                <span>For Residents <br/> Share Photos and Videos</span>
              </Button>
              <Button className={"w-[230px] text-white bg-blue-500 flex items-center justify-center gap-2 cursor-pointer rounded-full py-3 px-6 text-base font-semibold shadow-md hover:bg-blue-600 transition-all duration-200 h-auto"} onClick={() => setIsShareCodeOpen(true)}>
                <span className="text-center">Enter Share Code</span>
              </Button>
            </div>
          </div>
        </div>
      </footer>

      {/* Request Callback Modal with Cross Icon */}
      <CustomDialog 
        open={isCallbackOpen} 
        setOpen={setIsCallbackOpen} 
        heading={
          <div className="w-full relative flex items-center justify-center">
            <h2 className="text-[1.3rem] md:text-[1.8rem] font-bold text-white">Request a Callback</h2>
            <button
              onClick={() => setIsCallbackOpen(false)}
              className="absolute right-2 md:right-0 text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/10"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        }
      >
        <div className="max-h-[73vh] overflow-y-auto pb-3">
          <form className="space-y-6 max-w-lg mx-auto" onSubmit={handleCallbackSubmit}>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Best time to call</label>
              <div className="flex flex-col gap-3 w-full px-4 md:px-8 mx-auto">
                <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                  <input
                    type="radio"
                    name="day"
                    value="today"
                    checked={callbackFormData.day === 'today'}
                    onChange={e => setCallbackFormData(prev => ({ ...prev, day: 'today', customDate: '' }))}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-gray-700 text-sm">Today</span>
                </label>
                <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                  <input
                    type="radio"
                    name="day"
                    value="tomorrow"
                    checked={callbackFormData.day === 'tomorrow'}
                    onChange={e => setCallbackFormData(prev => ({ ...prev, day: 'tomorrow', customDate: '' }))}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-gray-700 text-sm">Tomorrow</span>
                </label>
                <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                  <input
                    type="radio"
                    name="day"
                    value="custom"
                    checked={callbackFormData.day === 'custom'}
                    onChange={e => setCallbackFormData(prev => ({ ...prev, day: 'custom' }))}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-gray-700 text-sm">Or pick a date:</span>
                  <input
                    type="date"
                    name="customDate"
                    value={callbackFormData.customDate}
                    onChange={e => setCallbackFormData(prev => ({ ...prev, customDate: e.target.value, day: 'custom' }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-purple-500 text-sm"
                  />
                </label>
                <div className="flex flex-col bg-gray-50 p-2 rounded-lg w-full mt-2">
                  <span className="text-gray-700 text-xs font-medium mb-2">Pick a time</span>
                  <div className="flex items-center gap-2">
                    <select
                      name="customHour"
                      value={callbackFormData.customHour}
                      onChange={handleCallbackInputChange}
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-purple-500 text-xs bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const hour = i + 8;
                        const display = hour.toString().padStart(2, '0');
                        return (
                          <option key={hour} value={display}>
                            {display}
                          </option>
                        );
                      })}
                    </select>
                    <select
                      name="customMinute"
                      value={callbackFormData.customMinute}
                      onChange={handleCallbackInputChange}
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-purple-500 text-xs bg-white"
                    >
                      {Array.from({ length: 60 }, (_, i) => {
                        const minute = i;
                        const display = minute.toString().padStart(2, '0');
                        return (
                          <option key={minute} value={display}>
                            {display}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Message</label>
              <textarea
                name="message"
                value={callbackFormData.message}
                onChange={handleCallbackInputChange}
                placeholder="Enter your message"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm h-24 resize-none"
              />
            </div>

            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Your Name *</label>
              <input
                type="text"
                name="name"
                value={callbackFormData.name}
                onChange={handleCallbackInputChange}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm"
                required
              />
            </div>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Your email address *</label>
              <input
                type="email"
                name="email"
                value={callbackFormData.email}
                onChange={handleCallbackInputChange}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm"
                required
              />
            </div>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Your phone *</label>
              <input
                type="tel"
                name="phone"
                value={callbackFormData.phone}
                onChange={handleCallbackInputChange}
                placeholder="Enter your phone number"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={callbackLoading}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 w-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {callbackLoading ? 'Sending Request...' : 'Send Request'}
            </button>
            
            {/* Required field indicator */}
            <div className="text-center mt-4">
              <p className="text-xs text-gray-500">
                <span className="text-red-500">*</span>required
              </p>
            </div>
          </form>
        </div>
      </CustomDialog>

      {/* Book Demo Meeting Modal with Cross Icon */}
      <CustomDialog 
        open={isMeetingOpen} 
        setOpen={setISMeetingOpen} 
        heading={
          <div className="w-full relative flex items-center justify-center">
            <h2 className="text-[1.3rem] md:text-[1.8rem] font-bold text-white">Book a Demo Meeting</h2>
            <button
              onClick={() => setISMeetingOpen(false)}
              className="absolute right-2 md:right-0 text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/10"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        }
      >
        <div className="max-h-[73vh] overflow-y-auto pb-3">
          <form className="space-y-6 max-w-lg mx-auto" onSubmit={handleMeetingSubmit}>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Your Name *</label>
              <input
                type="text"
                name="name"
                value={meetingFormData.name}
                onChange={handleMeetingInputChange}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm"
                required
              />
            </div>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Your email address *</label>
              <input
                type="email"
                name="email"
                value={meetingFormData.email}
                onChange={handleMeetingInputChange}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm"
                required
              />
            </div>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Pick a date & time *</label>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="grid grid-cols-3 gap-3 w-full">
                  <input
                    type="date"
                    name="date"
                    value={meetingFormData.date}
                    onChange={handleMeetingInputChange}
                    className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white text-sm"
                    required
                  />
                  <select 
                    name="hour"
                    value={meetingFormData.hour}
                    onChange={handleMeetingInputChange}
                    className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = i + 8;
                      const display = hour.toString().padStart(2, '0');
                      return (
                        <option key={hour} value={display}>
                          {display}:00
                        </option>
                      );
                    })}
                  </select>
                  <select 
                    name="minute"
                    value={meetingFormData.minute}
                    onChange={handleMeetingInputChange}
                    className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white text-sm"
                  >
                    {Array.from({ length: 60 }, (_, i) => {
                      const minute = i;
                      const display = minute.toString().padStart(2, '0');
                      return (
                        <option key={minute} value={display}>
                          {display}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Message</label>
              <textarea
                name="message"
                value={meetingFormData.message}
                onChange={handleMeetingInputChange}
                placeholder="Enter your message"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm h-24 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 w-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Booking Meeting...' : 'Book Meeting'}
            </button>
            
            {/* Required field indicator */}
            <div className="text-center mt-4">
              <p className="text-xs text-gray-500">
                <span className="text-red-500">*</span>required
              </p>
            </div>
          </form>
        </div>
      </CustomDialog>

      {/* Enter Share Code Modal */}
      <EnterShareCodeDialog open={isShareCodeOpen} setOpen={setIsShareCodeOpen} />
    </>
  )
}
