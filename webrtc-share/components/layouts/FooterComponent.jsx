"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Calendar1, Calendar1Icon, Send } from "lucide-react"
import { useState } from "react"
import CustomDialog from "../dialogs/CustomDialog"
import { bookDemoMeetingRequest } from "@/http/authHttp"
import { useUser } from "@/provider/UserProvider"
import axios from "axios"

export function Footer() {
  const { user, isAuth } = useUser();
  const [isCallbackOpen, setIsCallbackOpen] = useState(false);
  const [isMeetingOpen, setISMeetingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [callbackLoading, setCallbackLoading] = useState(false);
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
      alert("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🚀 Starting demo meeting booking process...');
      
      // Step 1: Generate video link for the demo meeting
      let videoToken = null;
      try {
        console.log('📹 Generating video link...');
        videoToken = await generateVideoLinkForDemo(meetingFormData.email);
        console.log('✅ Video token generated:', videoToken);
      } catch (videoError) {
        console.warn('⚠️ Failed to generate video link, proceeding without it:', videoError);
      }

      // Step 2: Send demo meeting request with video token to backend
      const requestData = {
        ...meetingFormData,
        videoToken: videoToken
      };

      console.log('📤 Sending demo meeting request to backend...');
      const response = await bookDemoMeetingRequest(requestData);
      
      if (response.data.success) {
        const successMessage = videoToken 
          ? "Demo meeting request sent successfully with video link!" 
          : "Demo meeting request sent successfully!";
        
        alert(successMessage);
        console.log('✅ Demo meeting booked successfully');
        
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
      alert(error.response?.data?.message || "Failed to send demo meeting request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallbackSubmit = async (e) => {
    e.preventDefault();
    
    if (!callbackFormData.name || !callbackFormData.email || !callbackFormData.phone) {
      alert("Please fill in all required fields");
      return;
    }

    setCallbackLoading(true);
    
    try {
      console.log('📞 Sending callback request...');
      
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/request-callback`, callbackFormData);
      
      if (response.data.success) {
        alert("Callback request sent successfully!");
        console.log('✅ Callback request sent successfully');
        
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
      alert(error.response?.data?.message || "Failed to send callback request");
    } finally {
      setCallbackLoading(false);
    }
  };

  return (
    <>
      <footer className="bg-gray-50 border-t border-gray-200 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Section - Company Info */}
            <div className="space-y-4 flex items-center justify-center flex-col">
              <h2 className="text-2xl font-bold text-gray-900">Videodesk.co.uk</h2>
              <div className="space-y-2 text-gray-600 flex items-center justify-center flex-col">
                <div>
                  <span className="font-medium text-center">Phone number</span>
                </div>
                <div>
                  <span className="font-medium text-center">Email</span>
                </div>
              </div>
            </div>



            <div className="flex items-center justify-center flex-col gap-8">
              <Button className={"text-white bg-purple-500 flex items-center justify-between gap-2 cursor-pointer w-[12rem]"} onClick={() => setIsCallbackOpen(true)}>
                <span>Request a Callback</span>
                <Calendar />
              </Button>
              <Button className={"text-white bg-purple-500 flex items-center justify-between gap-2 cursor-pointer w-[12rem]"} onClick={() => setISMeetingOpen(true)}>
                <span>Book a Demo Meeting</span>
                <Calendar />
              </Button>
            </div>

            {/* Center Section - Navigation Links */}
            <div className="space-y-3">
              <Link href="/about" className="block text-gray-600 hover:text-gray-900 transition-colors">
                About
              </Link>
              <Link href="/how-it-works" className="block text-gray-600 hover:text-gray-900 transition-colors">
                How it works
              </Link>
              <Link href="/launch" className="block text-gray-600 hover:text-gray-900 transition-colors">
                Launch new video link
              </Link>
              <Link href="/pricing" className="block text-gray-600 hover:text-gray-900 transition-colors">
                Pricing and Plans
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <CustomDialog open={isCallbackOpen} setOpen={setIsCallbackOpen} heading={"Request a Callback"}>
        <div className="max-h-[80vh] overflow-y-auto">
          <form className="space-y-6 max-w-lg mx-auto" onSubmit={handleCallbackSubmit}>
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
            <div className="flex items-start flex-col gap-4">
              <label className="text-gray-800 font-semibold text-sm">Best time to call</label>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between w-full mb-4 border-b pb-4">
                  <span className="text-blue-600 font-medium text-sm">(Select a day)</span>
                  <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-md">
                    <p className="text-gray-700 text-sm">Today</p>
                    <input 
                      type="radio" 
                      name="day" 
                      value="today"
                      checked={callbackFormData.day === 'today'}
                      onChange={handleCallbackInputChange}
                      className="w-4 h-4 text-purple-600" 
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-md">
                    <p className="text-gray-700 text-sm">Tomorrow</p>
                    <input 
                      type="radio" 
                      name="day" 
                      value="tomorrow"
                      checked={callbackFormData.day === 'tomorrow'}
                      onChange={handleCallbackInputChange}
                      className="w-4 h-4 text-purple-600" 
                    />
                  </div>
                  <div className="flex items-start gap-2 flex-col">
                    <p className="text-gray-700 text-sm">or Pick a date:</p>
                    <input 
                      type="date" 
                      name="customDate"
                      value={callbackFormData.customDate}
                      onChange={handleCallbackInputChange}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-start flex-1 w-full gap-6 pt-2">
                  <div className="flex items-start gap-4 bg-gray-50 p-3 rounded-lg">
                    <div className="space-y-2">
                      <p className="text-gray-700 text-sm font-medium h-6 flex items-center w-20">Morning</p>
                      <p className="text-gray-700 text-sm font-medium h-6 flex items-center w-20">Lunch time</p>
                      <p className="text-gray-700 text-sm font-medium h-6 flex items-center w-20">Afternoon</p>
                      <p className="text-gray-700 text-sm font-medium h-6 flex items-center w-20">Early Evening</p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-gray-600 text-sm h-6 flex items-center">
                        <span className="w-16 text-left">9.00AM</span>
                        <span className="w-4">-</span>
                        <span className="w-16">12 Noon</span>
                      </div>
                      <div className="text-gray-600 text-sm h-6 flex items-center">
                        <span className="w-16 text-left">12 Noon</span>
                        <span className="w-4">-</span>
                        <span className="w-16">2.00PM</span>
                      </div>
                      <div className="text-gray-600 text-sm h-6 flex items-center">
                        <span className="w-16 text-left">2.00PM</span>
                        <span className="w-4">-</span>
                        <span className="w-16">5.00PM</span>
                      </div>
                      <div className="text-gray-600 text-sm h-6 flex items-center">
                        <span className="w-16 text-left">5.00PM</span>
                        <span className="w-4">-</span>
                        <span className="w-16">6.00PM</span>
                      </div>
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <div className="h-6 flex items-center">
                        <input 
                          type="radio" 
                          name="timeSlot" 
                          value="morning"
                          checked={callbackFormData.timeSlot === 'morning'}
                          onChange={handleCallbackInputChange}
                          className="w-4 h-4 text-purple-600" 
                        />
                      </div>
                      <div className="h-6 flex items-center">
                        <input 
                          type="radio" 
                          name="timeSlot" 
                          value="lunch"
                          checked={callbackFormData.timeSlot === 'lunch'}
                          onChange={handleCallbackInputChange}
                          className="w-4 h-4 text-purple-600" 
                        />
                      </div>
                      <div className="h-6 flex items-center">
                        <input 
                          type="radio" 
                          name="timeSlot" 
                          value="afternoon"
                          checked={callbackFormData.timeSlot === 'afternoon'}
                          onChange={handleCallbackInputChange}
                          className="w-4 h-4 text-purple-600" 
                        />
                      </div>
                      <div className="h-6 flex items-center">
                        <input 
                          type="radio" 
                          name="timeSlot" 
                          value="evening"
                          checked={callbackFormData.timeSlot === 'evening'}
                          onChange={handleCallbackInputChange}
                          className="w-4 h-4 text-purple-600" 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-700 text-sm font-medium mb-2">or Pick a time</p>
                    <div className="flex items-center gap-2">
                      <select 
                        name="customHour"
                        value={callbackFormData.customHour}
                        onChange={handleCallbackInputChange}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-purple-500 text-sm bg-white"
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-purple-500 text-sm bg-white"
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

            <button
              type="submit"
              disabled={callbackLoading}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 w-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {callbackLoading ? 'Sending Request...' : 'Send Request'}
            </button>
          </form>
        </div>
      </CustomDialog>

      <CustomDialog open={isMeetingOpen} setOpen={setISMeetingOpen} heading={"Book a Demo Meeting"}>
        <div className="max-h-[80vh] overflow-y-auto">
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
              {isLoading ? 'Booking Meeting & Generating Video Link...' : 'Book Meeting'}
            </button>
          </form>
        </div>
      </CustomDialog>
    </>
  )
}
