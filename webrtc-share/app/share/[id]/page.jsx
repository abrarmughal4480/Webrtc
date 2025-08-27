"use client"
import { useState, useRef, use, useEffect } from "react"
import { VideoIcon, PlayIcon, Minimize2, Expand, ZoomIn, ZoomOut, ChevronDown, ChevronUp, X, User, Smartphone, MailIcon, Home, Wrench, FileText, ChevronRight, Printer } from "lucide-react"
import { getMeetingForShare, recordVisitorAccessRequest } from "@/http/meetingHttp"
import { useDialog } from "@/provider/DilogsProvider"
import { toast } from "sonner"
import { useUser } from "@/provider/UserProvider"
import { sections as specialNotesSections } from "@/components/dialogs/SpecialNotesDialog";

export default function SharePage({ params }) {
  const { id } = use(params);
  const { openVisitorAccessModal, closeVisitorAccessModal } = useDialog();
  const { user, isAuth, loading: userLoading } = useUser();
  const [accessGranted, setAccessGranted] = useState(false);
  
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
  
  // Add new states for individual item expansion
  const [expandedVideos, setExpandedVideos] = useState(new Set());
  const [expandedImages, setExpandedImages] = useState(new Set());
  const [modalImage, setModalImage] = useState(null);
  const [expandedSpecialNotes, setExpandedSpecialNotes] = useState(new Set());
  
  // Auto-expand important sections (optional)
  const autoExpandSections = ['safety', 'access']; // Safety and access sections auto-expand
  
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

  // Add a state to track if the user is the creator
  const [isCreator, setIsCreator] = useState(false);

  // Add a ref to prevent duplicate logging
  const creatorAccessLogged = useRef(false);

  // Add address ref for auto-height
  const addressRef = useRef(null);

  // Format recording duration
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Print function
  const handlePrint = () => {
    // Open new window for printing
    const printWindow = window.open('', '_blank');
    
    // Get meeting data for print
    const meetingDate = meetingData?.createdAt ? new Date(meetingData.createdAt).toLocaleDateString() : 'Unknown';
    const totalRecordings = recordings?.length || 0;
    const totalScreenshots = screenshots?.length || 0;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Meeting Report - ${id}</title>
          <style>
            @media print {
              @page {
                margin: 1in;
                size: A4;
              }
              
              * {
                overflow: visible !important;
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
                color: black !important;
                background: white !important;
              }
              
              ::-webkit-scrollbar {
                display: none !important;
              }
              
              body, html {
                height: auto !important;
                overflow: visible !important;
                margin: 0;
                padding: 0;
              }
              
              * {
                max-height: none !important;
                height: auto !important;
              }
              
              .print-hide, .media-section {
                display: none !important;
              }
            }
            
            body {
              font-family: 'Times New Roman', serif;
              line-height: 1.4;
              margin: 0;
              padding: 0;
              color: #333;
              background: white;
            }
            
            .print-hide, .media-section {
              display: none;
            }
            
            .print-header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            
            .print-header h1 {
              font-size: 24px;
              font-weight: bold;
              margin: 0 0 10px 0;
              color: #333;
            }
            
            .print-header .subtitle {
              font-size: 14px;
              color: #666;
              margin: 0;
            }
            
            .section {
              margin-bottom: 25px;
            }
            
            .work-item {
              page-break-inside: avoid;
              margin-bottom: 15px;
            }
            
            .section-title {
              font-size: 16px;
              font-weight: bold;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
              margin-bottom: 15px;
              color: #333;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            
            .info-item {
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 5px;
              background: #f9f9f9;
            }
            
            .info-label {
              font-weight: bold;
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            
            .info-value {
              font-size: 14px;
              color: #333;
              font-weight: 500;
            }
            
            .address-box {
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 5px;
              background: #f9f9f9;
              margin-bottom: 20px;
            }
            
            .special-notes {
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 5px;
              background: #f9f9f9;
              margin-bottom: 20px;
            }
            
            .notes-title {
              font-weight: bold;
              margin-bottom: 10px;
              color: #333;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ccc;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-top: 20px;
            }
            
            .summary-item {
              text-align: center;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 5px;
              background: #f9f9f9;
            }
            
            .summary-number {
              font-size: 18px;
              font-weight: bold;
              color: #333;
            }
            
            .summary-label {
              font-size: 11px;
              color: #666;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>MEETING REPORT</h1>
            <p class="subtitle">Meeting ID: ${id} | Generated: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="section">
            <div class="section-title">RESIDENT INFORMATION</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Resident Name</div>
                <div class="info-value">${residentName || 'Not provided'}</div>
              </div>
              ${meetingData?.phone_number ? `
              <div class="info-item">
                <div class="info-label">Phone Number</div>
                <div class="info-value">${meetingData.phone_number}</div>
              </div>
              ` : ''}
              ${meetingData?.email ? `
              <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${meetingData.email}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="address-box">
              <div class="info-label">Resident Address</div>
              <div class="info-value">
                ${(() => {
                  const addressParts = [];
                  if (meetingData?.house_name_number) addressParts.push(meetingData.house_name_number.trim());
                  if (meetingData?.flat_apartment_room) addressParts.push(meetingData.flat_apartment_room.trim());
                  if (meetingData?.street_road) addressParts.push(meetingData.street_road.trim());
                  if (meetingData?.city) addressParts.push(meetingData.city.trim());
                  if (meetingData?.country) addressParts.push(meetingData.country.trim());
                  if (addressParts.length === 0 && residentAddress) addressParts.push(residentAddress.trim());
                  const address = addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';
                  return address + (meetingData?.post_code ? `\nPostcode: ${meetingData.post_code}` : '');
                })()}
              </div>
            </div>
          </div>
          
          ${ref ? `
          <div class="section">
            <div class="section-title">REFERENCE</div>
            <div class="info-item">
              <div class="info-value">${ref}</div>
            </div>
          </div>
          ` : ''}
          
          ${repairDetails ? `
          <div class="section">
            <div class="section-title">REPAIR DETAILS</div>
            <div class="info-item">
              <div class="info-value">${repairDetails}</div>
            </div>
          </div>
          ` : ''}
          
          ${workDetails && workDetails.length > 0 ? `
          <div class="section">
            <div class="section-title">WORK DETAILS</div>
            ${workDetails.map((work, index) => `
              <div class="work-item">
                <div class="info-item">
                  <div class="info-label">Work Item ${index + 1}</div>
                  <div class="info-value">${work.detail}</div>
                  ${work.target_time ? `<div style="font-size: 12px; color: #666; margin-top: 5px;">Target Time: ${work.target_time}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${(() => {
            const hasStructuredNotes = meetingData?.structured_special_notes && typeof meetingData.structured_special_notes === 'object';
            const hasRegularNotes = specialNotes;
            
            if (!hasStructuredNotes && !hasRegularNotes) return '';
            
            let notesContent = '';
            
            // Add regular notes if available
            if (hasRegularNotes) {
              if (hasStructuredNotes) {
                notesContent += '---\n\n';
                notesContent += 'Additional Notes:\n';
              } else {
                notesContent += 'Additional Notes:\n';
              }
              notesContent += specialNotes;
            }
            
            return notesContent;
          })() ? `
          <div class="section">
            <div class="section-title">SPECIAL NOTES</div>
            <div class="special-notes">
              <div class="info-value" style="white-space: pre-line;">${(() => {
                const hasStructuredNotes = meetingData?.structured_special_notes && typeof meetingData.structured_special_notes === 'object';
                const hasRegularNotes = specialNotes;
                
                if (!hasStructuredNotes && !hasRegularNotes) return '';
                
                let notesContent = '';
                
                // Add regular notes if available
                if (hasRegularNotes) {
                  if (hasStructuredNotes) {
                    notesContent += '---\n\n';
                    notesContent += 'Additional Notes:\n';
                  } else {
                    notesContent += 'Additional Notes:\n';
                  }
                  notesContent += specialNotes;
                }
                
                return notesContent;
              })()}</div>
            </div>
          </div>
          ` : ''}
          
          <div class="section">
            <div class="section-title">SUMMARY</div>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-number">${meetingDate}</div>
                <div class="summary-label">Meeting Date</div>
              </div>
              <div class="summary-item">
                <div class="summary-number">${totalRecordings}</div>
                <div class="summary-label">Recordings</div>
              </div>
              <div class="summary-item">
                <div class="summary-number">${totalScreenshots}</div>
                <div class="summary-label">Screenshots</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>Generated by Videodesk.co.uk | Meeting ID: ${id}</p>
            <p>This report contains confidential information and should be handled appropriately.</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  // Function to handle visitor access - always grant access after submission
  const handleVisitorAccess = async (visitorData) => {
    try {
      const response = await recordVisitorAccessRequest(id, visitorData);

      if (response.success) {
        setAccessGranted(true);
        if (typeof closeVisitorAccessModal === 'function') closeVisitorAccessModal();
        // Fetch meeting data for non-creators after visitor access
        setIsLoadingMeetingData(true);
        const meetingResp = await getMeetingForShare(id);
        if (meetingResp.success && meetingResp.meeting) {
          const meetingData = meetingResp.meeting;
          setMeetingData(meetingData);
          // Use new structured name fields
          const fullName = meetingData.first_name && meetingData.last_name 
            ? `${meetingData.first_name} ${meetingData.last_name}`.trim()
            : meetingData.first_name || meetingData.last_name || meetingData.name || "";
          setResidentName(fullName);
          
          // Use new structured address fields
          const addressParts = [];
          if (meetingData.house_name_number) addressParts.push(meetingData.house_name_number);
          if (meetingData.flat_apartment_room) addressParts.push(meetingData.flat_apartment_room);
          if (meetingData.street_road) addressParts.push(meetingData.street_road);
          if (meetingData.city) addressParts.push(meetingData.city);
          if (meetingData.country) addressParts.push(meetingData.country);
          if (meetingData.post_code) addressParts.push(meetingData.post_code);
          
          // Fallback to old address field if no structured address
          const structuredAddress = addressParts.length > 0 ? addressParts.join(', ') : meetingData.address || "";
          setResidentAddress(structuredAddress);
          
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
          if (meetingData.recordings && meetingData.recordings.length > 0) {
            const recordingsData = meetingData.recordings.map(rec => ({
              id: rec._id || Date.now() + Math.random(),
              url: rec.url,
              timestamp: new Date(rec.timestamp).toLocaleString(),
              duration: rec.duration || 0
            }));
            setRecordings(recordingsData);
          }
          if (meetingData.screenshots && meetingData.screenshots.length > 0) {
            const screenshotsData = meetingData.screenshots.map(screenshot => ({
              id: screenshot._id || Date.now() + Math.random(),
              url: screenshot.url,
              timestamp: new Date(screenshot.timestamp).toLocaleString()
            }));
            setScreenshots(screenshotsData);
          }
        }
        setIsLoadingMeetingData(false);
      } else {
        throw new Error(response.message || 'Failed to record access');
      }
    } catch (error) {
      setIsLoadingMeetingData(false);
      console.error('❌ Failed to record visitor access:', error);
      throw error;
    }
  };

  // Fetch meeting data and check creator
  const fetchMeetingDataAndCheckCreator = async () => {
    if (!id) return;
    setIsLoadingMeetingData(true);
    try {
      const response = await getMeetingForShare(id);
      
      if (response.success && response.meeting) {
        const meetingData = response.meeting;
        
        // Populate form fields with existing data (read-only)
        // Use new structured name fields
        const fullName = meetingData.first_name && meetingData.last_name 
          ? `${meetingData.first_name} ${meetingData.last_name}`.trim()
          : meetingData.first_name || meetingData.last_name || meetingData.name || "";
        setResidentName(fullName);
        
        // Use new structured address fields
        const addressParts = [];
        if (meetingData.house_name_number) addressParts.push(meetingData.house_name_number);
        if (meetingData.flat_apartment_room) addressParts.push(meetingData.flat_apartment_room);
        if (meetingData.street_road) addressParts.push(meetingData.street_road);
        if (meetingData.city) addressParts.push(meetingData.city);
        if (meetingData.country) addressParts.push(meetingData.country);
        if (meetingData.post_code) addressParts.push(meetingData.post_code);
        
        // Fallback to old address field if no structured address
        const structuredAddress = addressParts.length > 0 ? addressParts.join(', ') : meetingData.address || "";
        setResidentAddress(structuredAddress);
        
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
        
        // Check if current user is creator
        if (
          isAuth && user && meetingData && (
            (meetingData.owner && user._id && meetingData.owner.toString() === user._id.toString()) ||
            (meetingData.userId && user._id && meetingData.userId.toString() === user._id.toString()) ||
            (meetingData.created_by && user._id && meetingData.created_by.toString() === user._id.toString())
          )
        ) {
          setIsCreator(true);
          setAccessGranted(true);
        } else {
          setIsCreator(false);
        }

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
    return 'Guest/Visitor Access';
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

  // Address value computation and auto-height effect
  const addressValue = (() => {
    const addressParts = [];
    if (meetingData?.house_name_number) addressParts.push(meetingData.house_name_number.trim());
    if (meetingData?.flat_apartment_room) addressParts.push(meetingData.flat_apartment_room.trim());
    if (meetingData?.street_road) addressParts.push(meetingData.street_road.trim());
    if (meetingData?.city) addressParts.push(meetingData.city.trim());
    if (meetingData?.country) addressParts.push(meetingData.country.trim());
    if (addressParts.length === 0 && residentAddress) addressParts.push(residentAddress.trim());
    let addressString = addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';
    if (meetingData?.post_code) addressString += `\nPostcode: ${meetingData.post_code}`;
    return addressString;
  })();

  // Separate postcode for right alignment
  const postcodeValue = meetingData?.post_code || '';

  useEffect(() => {
    if (addressRef.current) {
      addressRef.current.style.height = "auto";
      addressRef.current.style.height = addressRef.current.scrollHeight + "px";
    }
  }, [addressValue]);

  // Effect: For unauthenticated users, open visitor modal after userLoading is false
  useEffect(() => {
    if (userLoading) return;
    if (!isAuth && !accessGranted) {
      openVisitorAccessModal(handleVisitorAccess);
    }
    // eslint-disable-next-line
  }, [userLoading, isAuth, accessGranted]);

  // Effect: Close visitor modal when access is granted
  useEffect(() => {
    if (accessGranted && typeof closeVisitorAccessModal === 'function') {
      closeVisitorAccessModal();
    }
  }, [accessGranted, closeVisitorAccessModal]);

  // Effect: Force-close visitor modal if user becomes authenticated (creator)
  useEffect(() => {
    if (isAuth && typeof closeVisitorAccessModal === 'function') {
      closeVisitorAccessModal();
    }
  }, [isAuth, closeVisitorAccessModal]);

  // Main effect: after user loads, only fetch meeting data if user is creator
  useEffect(() => {
    if (userLoading || !id) return;
    if (!(isAuth && user)) return; // Only run for authenticated users
    (async () => {
      setIsLoadingMeetingData(true);
      try {
        const response = await getMeetingForShare(id);
        if (response.success && response.meeting) {
          const meetingData = response.meeting;
          // Check if user is creator
          if (
            isAuth && user && (
              (meetingData.owner && user._id && meetingData.owner.toString() === user._id.toString()) ||
              (meetingData.userId && user._id && meetingData.userId.toString() === user._id.toString()) ||
              (meetingData.created_by && user._id && meetingData.created_by.toString() === user._id.toString())
            )
          ) {
            setIsCreator(true);
            setAccessGranted(true);
            setMeetingData(meetingData);
            // Populate all fields as before
            // Use new structured name fields
            const fullName = meetingData.first_name && meetingData.last_name 
              ? `${meetingData.first_name} ${meetingData.last_name}`.trim()
              : meetingData.first_name || meetingData.last_name || meetingData.name || "";
            setResidentName(fullName);
            
            // Use new structured address fields
            const addressParts = [];
            if (meetingData.house_name_number) addressParts.push(meetingData.house_name_number);
            if (meetingData.flat_apartment_room) addressParts.push(meetingData.flat_apartment_room);
            if (meetingData.street_road) addressParts.push(meetingData.street_road);
            if (meetingData.city) addressParts.push(meetingData.city);
            if (meetingData.country) addressParts.push(meetingData.country);
            if (meetingData.post_code) addressParts.push(meetingData.post_code);
            
            // Fallback to old address field if no structured address
            const structuredAddress = addressParts.length > 0 ? addressParts.join(', ') : meetingData.address || "";
            setResidentAddress(structuredAddress);
            
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
            if (meetingData.recordings && meetingData.recordings.length > 0) {
              const recordingsData = meetingData.recordings.map(rec => ({
                id: rec._id || Date.now() + Math.random(),
                url: rec.url,
                timestamp: new Date(rec.timestamp).toLocaleString(),
                duration: rec.duration || 0
              }));
              setRecordings(recordingsData);
            }
            if (meetingData.screenshots && meetingData.screenshots.length > 0) {
              const screenshotsData = meetingData.screenshots.map(screenshot => ({
                id: screenshot._id || Date.now() + Math.random(),
                url: screenshot.url,
                timestamp: new Date(screenshot.timestamp).toLocaleString()
              }));
              setScreenshots(screenshotsData);
            }
          } else {
            setIsCreator(false);
          }
        } else {
          setIsLoadingMeetingData(false);
          toast.error("Failed to load meeting data", {
            description: response.message || 'Unknown error'
          });
        }
      } catch (error) {
        setIsLoadingMeetingData(false);
        toast.error("Failed to load meeting data", {
          description: error?.response?.data?.message || error.message
        });
      }
    })();
    // eslint-disable-next-line
  }, [userLoading, isAuth, user, id]);

  // Only show visitor modal if not creator and userLoading is false
  useEffect(() => {
    if (!id || isCreator || userLoading) return;
    
    // If user is authenticated, close modal and grant access
    if (isAuth) {
      setAccessGranted(true);
      closeVisitorAccessModal();
      return;
    }
    
    // Add a small delay to show the profile loader
    const timeout = setTimeout(() => {
      extractLandlordInfoFromUrl();
      const modalTimeout = setTimeout(() => {
        openVisitorAccessModal(handleVisitorAccess);
      }, 100);
      return () => clearTimeout(modalTimeout);
    }, 500); // Show loader for 500ms
    
    return () => clearTimeout(timeout);
  }, [id, isCreator, userLoading, isAuth]);

  // Effect: Handle profile loading for authenticated users
  useEffect(() => {
    if (userLoading) return;
    
    // For authenticated users, extract landlord info immediately
    if (isAuth) {
      const timeout = setTimeout(() => {
        extractLandlordInfoFromUrl();
      }, 300); // Small delay to show loader
      
      return () => clearTimeout(timeout);
    }
  }, [userLoading, isAuth]);

  // Effect: Log creator access if needed
  useEffect(() => {
    if (
      isCreator && user && id && !creatorAccessLogged.current
    ) {
      // Send creator access log
      recordVisitorAccessRequest(id, {
        creator: true,
        visitor_name: user.name || 'You',
        visitor_email: user.email || 'creator@system'
      }).then(() => {
        creatorAccessLogged.current = true;
      }).catch(() => {
        // Ignore errors
      });
    }
  }, [isCreator, user, id]);

  // Loader logic: only show loader if not creator
  if ((!accessGranted || isLoadingMeetingData) && !isCreator) {
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

  // Parse specialNotes as object if possible
  let parsedSpecialNotes = specialNotes;
  try {
    if (typeof specialNotes === 'string') {
      const maybeObj = JSON.parse(specialNotes);
      if (maybeObj && typeof maybeObj === 'object') parsedSpecialNotes = maybeObj;
    }
  } catch (e) { /* ignore */ }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <style jsx>{`
        @media print {
          /* Hide header and footer when printing */
          .print-hide {
            display: none !important;
          }
          
          /* Hide scrollbars and show full content */
          * {
            overflow: visible !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          
          /* Hide webkit scrollbars */
          ::-webkit-scrollbar {
            display: none !important;
          }
          
          /* Ensure all content is visible */
          body, html {
            height: auto !important;
            overflow: visible !important;
          }
          
          /* Remove any max-height constraints */
          * {
            max-height: none !important;
            height: auto !important;
          }
          
          /* Ensure content fills the page */
          body {
            margin: 0;
            padding: 0;
          }
          
          /* Remove background colors for better printing */
          .bg-gradient-to-br {
            background: white !important;
          }
          
          /* Ensure text is readable */
          * {
            color: black !important;
            background: white !important;
          }
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-6 md:py-12">
        {/* Enhanced Header with better spacing */}
        <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-6 mb-6 md:mb-8 border border-gray-200 print-hide">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
            <div className="flex items-center">
              {/* Show landlord logo if available, otherwise show default */}
              {getLandlordLogo() ? (
                <div className="flex items-center">
                  <img 
                    src={getLandlordLogo()} 
                    alt="Landlord Logo" 
                    className="max-h-10 max-w-[140px] object-contain mr-4" 
                  />
                  <a href="/" className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center hover:opacity-80 transition-opacity">
                    <VideoIcon className="mr-3 text-blue-600" size={28} />
                    <span>Videodesk.co.uk</span>
                  </a>
                </div>
              ) : (
                <a href="/" className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center hover:opacity-80 transition-opacity">
                  <VideoIcon className="mr-3 text-blue-600" size={28} />
                  <span>Videodesk.co.uk</span>
                </a>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs md:text-sm text-gray-500 bg-gray-50 px-4 md:px-5 py-2 md:py-2.5 rounded-full border border-gray-200">
                Meeting ID: {id}
              </div>
              <button
                onClick={handlePrint}
                className="inline-flex items-center justify-center p-2 md:p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full border border-blue-500 transition-all duration-200 hover:scale-105 shadow-md"
                title="Print this page"
              >
                <Printer className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={() => window.close()}
                className="inline-flex items-center justify-center p-2 md:p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full border border-red-600 transition-all duration-200 hover:scale-105 shadow-md"
                title="Exit (Close Tab)"
                style={{ marginLeft: '4px' }}
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Profile Section */}
        <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-6 mb-6 md:mb-8 border border-gray-200 print-hide">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
            <div className="flex items-center">
              <div className="flex items-center">
                {isLoadingProfile ? (
                  <div className="flex items-center">
                    <div className="w-14 h-14 bg-gray-200 rounded-full animate-pulse mr-4"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-28 md:w-36"></div>
                  </div>
                ) : (
                  <>
                    <div className={`w-14 h-14 overflow-hidden mr-4 ${getProfileShapeClass()} flex items-center justify-center border-2 border-gray-300 bg-gray-50 shadow-sm`}>
                      {getProfileImage() ? (
                        <img
                          src={getProfileImage()}
                          alt="Profile Image"
                          className={`w-full h-full ${getImageObjectFitClass()}`}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `<div class=\"w-full h-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-semibold\">${getInitials(getDisplayName())}</div>`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                          <span className="text-white font-semibold text-lg md:text-xl">{getInitials(getDisplayName())}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-2xl md:text-3xl font-bold text-gray-800">
                      {getDisplayName()}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="text-xs md:text-sm text-gray-500 bg-gray-50 px-4 md:px-5 py-2 md:py-2.5 rounded-full border border-gray-200">
              {isLoadingProfile ? (
                <div className="h-4 bg-gray-200 rounded animate-pulse w-12 md:w-16"></div>
              ) : landlordInfo.landlordName ? (
                "Profile"
              ) : (
                "Profile"
              )}
            </div>
          </div>
        </div>

        {/* Meeting Summary Section - after profile info, without Target Time */}
        <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-6 mb-6 md:mb-8 border border-blue-200 print-hide">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-blue-800">{meetingData?.createdAt ? new Date(meetingData.createdAt).toLocaleDateString() : 'N/A'}</span>
              <span className="text-xs text-gray-500 mt-1">Meeting Date</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-blue-800">{recordings.length}</span>
              <span className="text-xs text-gray-500 mt-1">Recordings</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-blue-800">{screenshots.length}</span>
              <span className="text-xs text-gray-500 mt-1">Screenshots</span>
            </div>
          </div>
        </div>

        {/* Enhanced Main Content Card with better layout */}
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 mb-6 md:mb-8 border-2 border-gray-200">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
            {/* Left Side - Resident Information */}
            <div className="xl:col-span-2">
              {/* Resident Info & Address Section - Improved Design */}
              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-100 rounded-3xl shadow-lg p-6 md:p-8">
                <div className="flex items-center mb-6">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mr-3">
                    <User className="w-6 h-6 text-blue-500" />
                  </span>
                  <h2 className="text-xl md:text-2xl font-bold text-blue-800 tracking-wide">Resident Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Resident Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" /> Resident Name
                    </label>
                    <input
                      id="residentName"
                      type="text"
                      value={residentName}
                      readOnly
                      className="w-full p-4 border-2 border-blue-100 rounded-xl bg-blue-50 text-blue-900 font-semibold text-base focus:outline-none shadow-inner cursor-default"
                    />
                  </div>
                  {/* Contact (if available) */}
                  {meetingData?.phone_number && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-green-400" /> Phone Number
                      </label>
                      <input
                        type="text"
                        value={meetingData.phone_number}
                        readOnly
                        className="w-full p-4 border-2 border-green-100 rounded-xl bg-green-50 text-green-900 font-semibold text-base focus:outline-none shadow-inner cursor-default"
                      />
                    </div>
                  )}
                  {/* Email (if available) */}
                  {meetingData?.email && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <MailIcon className="w-4 h-4 text-amber-400" /> Email
                      </label>
                      <input
                        type="text"
                        value={meetingData.email}
                        readOnly
                        className="w-full p-4 border-2 border-amber-100 rounded-xl bg-amber-50 text-amber-900 font-semibold text-base focus:outline-none shadow-inner cursor-default"
                      />
                    </div>
                  )}
                </div>
                <div className="my-6 border-t border-blue-100" />
                <div className="grid grid-cols-1 gap-6">
                  {/* Resident Address in One Line with Postcode on New Line, Right Aligned */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Home className="w-4 h-4 text-blue-400" /> Resident Address
                    </label>
                    <div
                      className="w-full p-4 border-2 border-blue-100 rounded-xl bg-blue-50 text-blue-900 font-medium shadow-inner cursor-default"
                      style={{ minHeight: "40px" }}
                    >
                      <div className="whitespace-pre-line">
                        {(() => {
                          const addressParts = [];
                          if (meetingData?.house_name_number) addressParts.push(meetingData.house_name_number.trim());
                          if (meetingData?.flat_apartment_room) addressParts.push(meetingData.flat_apartment_room.trim());
                          if (meetingData?.street_road) addressParts.push(meetingData.street_road.trim());
                          if (meetingData?.city) addressParts.push(meetingData.city.trim());
                          if (meetingData?.country) addressParts.push(meetingData.country.trim());
                          if (addressParts.length === 0 && residentAddress) addressParts.push(residentAddress.trim());
                          return addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';
                        })()}
                      </div>
                      <div className="mt-3 text-blue-900 font-medium">
                        Postcode: {postcodeValue}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Reference and Work Details with Dynamic Height */}
            <div className="flex flex-col">
              {/* Reference Field */}
              {ref && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 md:p-5 mb-6">
                  <div className="text-sm md:text-base font-semibold text-blue-800 mb-2 uppercase tracking-wide">
                    Reference
                  </div>
                  <div className="text-gray-800 font-medium text-base md:text-lg break-all">
                    {ref}
                  </div>
                </div>
              )}

              {/* Repair Details */}
              {repairDetails && (
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 md:p-5 mb-6">
                  <div className="text-sm md:text-base font-semibold text-green-800 mb-3 uppercase tracking-wide">
                    Repair Details
                  </div>
                  <div className="text-gray-800 font-medium text-sm md:text-base leading-relaxed">
                    {repairDetails}
                  </div>
                </div>
              )}

              {/* Work Details with Dynamic Height */}
              {workDetails && workDetails.length > 0 && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 md:p-5">
                  <div className="text-sm md:text-base font-semibold text-purple-800 mb-3 uppercase tracking-wide">
                    Work Details
                  </div>
                  <div className="space-y-3 md:space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-100 pr-2" style={{ maxHeight: '300px' }}>
                    {workDetails.map((work, index) => (
                      <div key={index} className="bg-white border border-purple-200 rounded-xl p-3 md:p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                          <span className="text-xs md:text-sm font-semibold text-purple-800">Work Item {index + 1}</span>
                          {work.target_time && (
                            <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full font-medium mt-1 sm:mt-0">
                              {work.target_time}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-800 font-medium text-sm md:text-base leading-relaxed">{work.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Special Notes Section with Full Width - Only show if notes exist */}
        {((meetingData?.structured_special_notes && typeof meetingData.structured_special_notes === 'object' && Object.keys(meetingData.structured_special_notes).length > 0) || specialNotes) && (
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 mb-6 md:mb-8 border-2 border-gray-200">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 md:p-6">
            <div className="font-bold text-yellow-900 text-lg md:text-xl mb-3 md:mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <span className="mr-2">📝</span>
                Special Notes
              </div>
              {/* Summary badge and quick actions */}
              <div className="flex items-center gap-2">
                {(() => {
                  const hasStructuredNotes = meetingData?.structured_special_notes && typeof meetingData.structured_special_notes === 'object';
                  const hasRegularNotes = specialNotes;
                  const totalSections = hasStructuredNotes ? Object.keys(meetingData.structured_special_notes).length : 0;
                 
                })()}
                
                {/* Quick action buttons */}
                {(() => {
                  const hasStructuredNotes = meetingData?.structured_special_notes && typeof meetingData.structured_special_notes === 'object';
                  const hasRegularNotes = specialNotes;
                  const hasAnyNotes = hasStructuredNotes || hasRegularNotes;
                  
                  if (!hasAnyNotes) return null;
                  
                  const allSections = hasStructuredNotes ? Object.keys(meetingData.structured_special_notes) : [];
                  const allKeys = [...allSections, ...(hasRegularNotes ? ['additional-notes'] : [])];
                  const allExpanded = allKeys.every(key => expandedSpecialNotes.has(key));
                  
                  return (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          if (allExpanded) {
                            setExpandedSpecialNotes(new Set());
                          } else {
                            setExpandedSpecialNotes(new Set(allKeys));
                          }
                        }}
                        className="text-xs bg-yellow-300 hover:bg-yellow-400 text-yellow-800 px-2 py-1 rounded transition-colors duration-200 whitespace-nowrap"
                      >
                        {allExpanded ? 'Collapse All' : 'Expand All'}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {/* Show both structured special notes (popup data) and regular special notes */}
            <div className="space-y-3">
              {/* Regular Special Notes (Text Field) */}
              {specialNotes && (
                <div className="bg-white rounded-xl border border-yellow-200 overflow-hidden">
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedSpecialNotes);
                      const key = 'additional-notes';
                      if (expandedSpecialNotes.has(key)) {
                        newExpanded.delete(key);
                      } else {
                        newExpanded.add(key);
                      }
                      setExpandedSpecialNotes(newExpanded);
                    }}
                    className="w-full p-3 md:p-4 text-left hover:bg-orange-100 transition-colors duration-200 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <ChevronRight 
                        className={`w-4 h-4 mr-2 text-yellow-600 transition-transform duration-200 ${expandedSpecialNotes.has('additional-notes') ? 'rotate-90' : ''}`} 
                      />
                      <span className="font-semibold text-yellow-800 text-sm md:text-base">
                        Additional Notes
                      </span>
                    </div>
                    <div className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                      Text
                    </div>
                  </button>
                  
                  {expandedSpecialNotes.has('additional-notes') && (
                    <div className="px-3 md:px-4 pb-3 md:pb-4 border-t border-yellow-100">
                      <div className="text-yellow-900 text-sm md:text-base leading-relaxed mt-3">
                        {specialNotes}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Structured Special Notes (Popup Data) */}
              {meetingData?.structured_special_notes && typeof meetingData.structured_special_notes === 'object' && (
                (() => {
                  return true;
                })() && (
                  <div className="space-y-3">
                    {specialNotesSections.map(section => {
                      const state = meetingData.structured_special_notes[section.key];
                      if (!state) return null;
                      
                      // Check if any options are selected (excluding default)
                      const checked = section.options.filter(opt => 
                        opt.key !== 'default' && state[opt.key]
                      );
                      
                      // If only default is selected or nothing is selected, show default
                      const hasNonDefaultSelections = checked.length > 0 || 
                        state.otherText || 
                        state.preferredTimeFrom || 
                        state.preferredTimeTo || 
                        state.preferredDays || 
                        state.dehumidifierCount || 
                        state.waitTime;
                      
                      if (!hasNonDefaultSelections && !state.default) return null;
                      
                      const isExpanded = expandedSpecialNotes.has(section.key);
                      const hasContent = checked.length > 0 || (!hasNonDefaultSelections && state.default);
                      
                      return (
                        <div key={section.key} className="bg-white rounded-xl border border-yellow-200 overflow-hidden">
                          {/* Collapsible Header */}
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedSpecialNotes);
                              if (isExpanded) {
                                newExpanded.delete(section.key);
                              } else {
                                newExpanded.add(section.key);
                              }
                              setExpandedSpecialNotes(newExpanded);
                            }}
                            className="w-full p-3 md:p-4 text-left hover:bg-orange-100 transition-colors duration-200 flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              <ChevronRight 
                                className={`w-4 h-4 mr-2 text-yellow-600 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
                              />
                              <span className="font-semibold text-yellow-800 text-sm md:text-base">
                                {section.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasContent && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full whitespace-nowrap">
                                  {checked.length + (state.default ? 1 : 0)} items
                                </span>
                              )}
                            </div>
                          </button>
                          
                          {/* Collapsible Content */}
                          {isExpanded && (
                            <div className="px-3 md:px-4 pb-3 md:pb-4 border-t border-yellow-100">
                              <ul className="list-disc ml-6 text-yellow-900 text-sm md:text-base space-y-1 mt-3">
                                {/* Show default if no other selections */}
                                {(!hasNonDefaultSelections || state.default) && (
                                  <li className="leading-relaxed">
                                    Default: None specified/Follow your local policy
                                  </li>
                                )}
                                
                                {/* Show selected options */}
                                {checked.map(opt => (
                                  <li key={opt.key} className="leading-relaxed">
                                    {opt.label}
                                    {opt.isOther && state.otherText && (
                                      <span className="ml-2 italic text-yellow-700">- {state.otherText}</span>
                                    )}
                                    {opt.isTimeRange && state.preferredTimeFrom && state.preferredTimeTo && (
                                      <span className="ml-2 italic text-yellow-700">
                                        - {state.preferredTimeFrom} to {state.preferredTimeTo}
                                      </span>
                                    )}
                                    {opt.isDays && state.preferredDays && (
                                      <span className="ml-2 italic text-yellow-700">
                                        - {(() => {
                                          if (state.preferredDays.anyDay) {
                                            return "Any day";
                                          }
                                          const selectedDays = [];
                                          if (state.preferredDays.mon) selectedDays.push("Mon");
                                          if (state.preferredDays.tue) selectedDays.push("Tue");
                                          if (state.preferredDays.wed) selectedDays.push("Wed");
                                          if (state.preferredDays.thu) selectedDays.push("Thu");
                                          if (state.preferredDays.fri) selectedDays.push("Fri");
                                          if (state.preferredDays.sat) selectedDays.push("Sat");
                                          if (state.preferredDays.sun) selectedDays.push("Sun");
                                          return selectedDays.join(", ");
                                        })()}
                                      </span>
                                    )}
                                    {opt.isDehumidifier && state.dehumidifierCount && (
                                      <span className="ml-2 italic text-yellow-700">
                                        - {state.dehumidifierCount} unit(s)
                                      </span>
                                    )}
                                    {opt.isWait && state.waitTime && (
                                      <span className="ml-2 italic text-yellow-700">
                                        - Wait {state.waitTime}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
              
              {/* Show message if no special notes at all */}
              {!meetingData?.structured_special_notes && !specialNotes && (
                <div className="text-yellow-700 italic text-sm md:text-base text-center py-4">
                  No special notes provided.
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Enhanced Video & Image Section */}
        <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-8 border-2 border-gray-200 mb-6 md:mb-8 media-section">
          {/* Videos Section */}
          {recordings.length > 0 && (
            <div className="mb-6 md:mb-8">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 pb-3">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse"></div>
                <h2 className="text-lg md:text-xl font-bold text-gray-800 uppercase tracking-wide">Videos</h2>
              </div>
              {/* Better container for videos */}
              <div className="w-full">
                <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 md:pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {recordings.map((recording) => {
                    const isExpanded = expandedVideos.has(recording.id);
                    return (
                      <div key={recording.id} className={`flex-shrink-0 transition-all duration-300 ${isExpanded ? 'w-[320px] sm:w-[400px]' : 'w-[180px] sm:w-[200px] md:w-[280px]'}`}>
                        <div className={`w-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl overflow-hidden relative shadow-lg hover:shadow-xl transition-all duration-300 group ${isExpanded ? 'h-[320px] sm:h-[400px]' : 'h-[140px] sm:h-[200px]'}`}>
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
                              <div className="bg-red-600 rounded-full p-3 md:p-4">
                                <PlayIcon className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-lg" />
                              </div>
                            </div>
                          )}
                          {/* Enhanced Control Buttons */}
                          <div className="absolute top-2 md:top-3 right-2 md:right-3 flex flex-row gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                              className="p-1.5 md:p-2 bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full text-white transition-all duration-200 hover:scale-110"
                            >
                              {isExpanded ? <Minimize2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Expand className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 md:mt-3 text-center">
                          <p className="text-xs md:text-sm text-gray-600 font-medium">{recording.timestamp}</p>
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
            <div className={recordings.length > 0 ? 'border-t border-gray-200 pt-6 md:pt-8' : ''}>
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full animate-pulse"></div>
                <h2 className="text-lg md:text-xl font-bold text-gray-800 uppercase tracking-wide">SCREENSHOT(S)</h2>
              </div>
              
              {/* Better container for screenshots */}
              <div className="w-full">
                <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 md:pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {screenshots.map((screenshot, index) => (
                    <div key={screenshot.id} className="w-[140px] sm:w-[180px] md:w-[200px] flex-shrink-0">
                      <div className="w-full h-[100px] sm:h-[140px] md:h-[200px] bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl overflow-hidden relative shadow-lg hover:shadow-xl transition-all duration-300 group">
                        <img
                          src={screenshot.url}
                          alt="screenshot"
                          className="w-full h-full object-cover rounded-3xl cursor-pointer"
                          onClick={() => setModalImage(screenshot)}
                        />
                        {/* Enhanced Control Buttons for Screenshots */}
                        <div className="absolute top-2 md:top-3 right-2 md:right-3 flex flex-row gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button 
                            onClick={() => setModalImage(screenshot)}
                            className="p-1.5 md:p-2 bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full text-white transition-all duration-200 hover:scale-110"
                          >
                            <Expand className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </button>
                        </div>
                        {/* Enhanced Image Label */}
                        <div className="absolute top-2 md:top-3 left-2 md:left-3 bg-white/90 backdrop-blur-sm rounded-full px-2 md:px-3 py-0.5 md:py-1">
                          <span className="text-xs font-semibold text-gray-700">#{index + 1}</span>
                        </div>
                        {/* Zoom indicator */}
                        <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3 bg-white/90 backdrop-blur-sm rounded-full p-1.5 md:p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <ZoomIn className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-700" />
                        </div>
                      </div>
                      <div className="mt-2 md:mt-3 text-center">
                        <p className="text-xs md:text-sm text-gray-600 font-medium">{screenshot.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No content message */}
          {recordings.length === 0 && screenshots.length === 0 && (
            <div className="text-center py-8 md:py-12">
              <VideoIcon className="w-10 h-10 md:w-16 md:h-16 text-gray-300 mx-auto mb-3 md:mb-4" />
              <p className="text-gray-500 text-base md:text-lg font-medium">No recordings or screenshots found</p>
            </div>
          )}
        </div>

      </div>

      {/* Image Modal */}
      {modalImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4">
          <div className="relative max-w-full md:max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* Image container */}
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button - Positioned at top 5% and right 5% (responsive) */}
              <button
                onClick={() => setModalImage(null)}
                className="absolute z-10 p-2.5 md:p-3 bg-red-600 hover:bg-red-700 text-white rounded-full border-2 border-white/80 transition-all duration-300 hover:scale-110 flex items-center justify-center w-8 md:w-10 h-8 md:h-10 backdrop-blur-sm shadow-lg"
                style={{ 
                  top: '5%', 
                  right: '5%', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)' 
                }}
              >
                <X className="w-4 h-4 md:w-5 md:h-5" strokeWidth="3" />
              </button>
              <img
                src={modalImage.url}
                alt="Expanded screenshot"
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                onClick={() => setModalImage(null)}
              />
              {/* Image info */}
              <div className="absolute bottom-2 md:bottom-4 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-full px-4 md:px-6 py-2 md:py-3">
                <p className="text-white text-xs md:text-sm font-medium">{modalImage.timestamp}</p>
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
