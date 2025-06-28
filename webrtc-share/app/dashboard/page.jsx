"use client"
import { Button } from "@/components/ui/button"
import { FileText, Archive, Trash2, Monitor, Smartphone, Save, History, ArchiveRestore, ExternalLink, FileSearch, MailIcon, Loader2, Maximize2, Home } from "lucide-react"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logoutRequest } from "@/http/authHttp"
import { getAllMeetings, deleteMeeting, archiveMeeting, unarchiveMeeting, getArchivedCount } from "@/http/meetingHttp"
import { useUser } from "@/provider/UserProvider"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { useRouter } from "next/navigation"



import {
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowsPointingOutIcon,
  ClockIcon,
} from "@heroicons/react/20/solid";
import { useDialog } from "@/provider/DilogsProvider"
import CustomDialog from "@/components/dialogs/CustomDialog"
import { updateUserLogoRequest } from "@/http/authHttp"
import VideoLinkSender from "@/components/VideoLinkSender"
import moment from "moment/moment"

export default function Page() {
  const { user, isAuth, setIsAuth, setUser } = useUser();
  const router = useRouter();
  // Remove video link related state variables
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('active');
  const [archivedCount, setArchivedCount] = useState(0);
  // Add state for VideoLinkSender
  const [showVideoLinkSender, setShowVideoLinkSender] = useState(false);

  // Add state for multiple selection
  const [selectedMeetings, setSelectedMeetings] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { setResetOpen, setMessageOpen, setLandlordDialogOpen, setTickerOpen, setInviteOpen, setFeedbackOpen, setFaqOpen, setExportOpen, setHistoryOpen } = useDialog();

  useEffect(() => {
    fetchMeetings();
    fetchArchivedCount();
  }, [viewMode]);

  // Add effect to handle user loading state
  useEffect(() => {
    if (user !== null) {
      setUserLoading(false);
    }
  }, [user]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      // Fix the archived parameter logic
      let archivedParam = null;
      if (viewMode === 'archived') {
        archivedParam = true; // Only get archived meetings
      } else if (viewMode === 'active') {
        archivedParam = false; // Only get non-archived meetings
      }
      // If viewMode is 'all', archivedParam stays null to get all meetings

      console.log('📋 Fetching meetings with archived param:', archivedParam, 'viewMode:', viewMode);
      const response = await getAllMeetings(archivedParam);
      
      // Sort meetings by createdAt date in descending order (newest first)
      const sortedMeetings = (response.data.meetings || []).sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      setMeetings(sortedMeetings);
      console.log('📋 Fetched meetings:', sortedMeetings.length || 0, 'meetings');
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast(error?.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchArchivedCount = async () => {
    try {
      const response = await getArchivedCount();
      setArchivedCount(response.data.archivedCount);
    } catch (error) {
      console.error('Error fetching archived count:', error);
    }
  };

  const handleArchiveMeeting = async (id, meetingName) => {
    try {
      await archiveMeeting(id);
      toast.success(`"${meetingName || 'Meeting'}" archived successfully`);
      fetchMeetings();
      fetchArchivedCount();
    } catch (error) {
      toast.error("Failed to archive meeting", {
        description: error?.response?.data?.message || error.message
      });
    }
  };

  const handleUnarchiveMeeting = async (id, meetingName) => {
    try {
      await unarchiveMeeting(id);
      toast.success(`"${meetingName || 'Meeting'}" unarchived successfully`);
      fetchMeetings();
      fetchArchivedCount();
    } catch (error) {
      toast.error("Failed to unarchive meeting", {
        description: error?.response?.data?.message || error.message
      });
    }
  };
  const handleDeleteMeeting = async (id, meetingName) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete "${meetingName || 'this meeting'}"?\n\nThis will permanently delete:\n• The meeting document\n• All recordings\n• All screenshots\n• All associated media files\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      console.log(`🗑️ Starting complete meeting deletion for: ${meetingName || id}`);
      const response = await deleteMeeting(id);

      // Show detailed success message
      if (response.data.deletion_summary) {
        const summary = response.data.deletion_summary;
        toast.success("Meeting deleted successfully", {
          description: `Deleted ${summary.recordings_total} recordings and ${summary.screenshots_total} screenshots${summary.failed_cloudinary_deletions > 0 ? `, with ${summary.failed_cloudinary_deletions} cloud storage issues` : ''}`
        });
      } else {
        toast.success("Meeting deleted successfully");
      }

      fetchMeetings(); // Refresh the list
    } catch (error) {
      console.error('❌ Meeting deletion failed:', error);
      toast.error("Failed to delete meeting", {
        description: error?.response?.data?.message || error.message
      });
    }
  };

  // Handle multiple delete
  const handleMultipleDelete = async () => {
    if (selectedMeetings.length === 0) {
      toast.error("Please select meetings to delete");
      return;
    }

    const selectedMeetingDetails = meetings.filter(meeting => selectedMeetings.includes(meeting._id));
    const meetingNames = selectedMeetingDetails.map(meeting => meeting.name || 'Unknown').join(', ');

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedMeetings.length} meeting(s)?\n\nMeetings: ${meetingNames}\n\nThis will permanently delete:\n• The meeting documents\n• All recordings\n• All screenshots\n• All associated media files\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    let successCount = 0;
    let failureCount = 0;

    try {
      // Delete meetings one by one
      for (const meetingId of selectedMeetings) {
        try {
          await deleteMeeting(meetingId);
          successCount++;
        } catch (error) {
          console.error(`Failed to delete meeting ${meetingId}:`, error);
          failureCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} meeting(s)`, {
          description: failureCount > 0 ? `${failureCount} deletion(s) failed` : undefined
        });
      }

      if (failureCount > 0 && successCount === 0) {
        toast.error(`Failed to delete ${failureCount} meeting(s)`);
      }

      // Clear selection and refresh
      setSelectedMeetings([]);
      setSelectAll(false);
      fetchMeetings();
    } catch (error) {
      toast.error("Error during bulk deletion");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle select all checkbox
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedMeetings(currentMeetings.map(meeting => meeting._id));
    } else {
      setSelectedMeetings([]);
    }
  };

  // Handle individual checkbox
  const handleSelectMeeting = (meetingId, checked) => {
    if (checked) {
      setSelectedMeetings(prev => [...prev, meetingId]);
    } else {
      setSelectedMeetings(prev => prev.filter(id => id !== meetingId));
      setSelectAll(false);
    }
  };
  const handleLogout = async () => {
    try {
      const res = await logoutRequest();

      // Additional cleanup - clear any localStorage/sessionStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear();

      // Clear cookies from frontend side as well
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=none";

      toast("Logout Successful", {
        description: res.data.message
      });

      setIsAuth(false);
      setUser(null);
      router.push('../../../');
    } catch (error) {
      // Even if logout API fails, clear local state
      setIsAuth(false);
      setUser(null);
      localStorage.clear();

      toast("Logout Unsuccessful", {
        description: error?.response?.data?.message || error.message
      });

      router.push('../../../');
    }
  }

  // Handler for video link success
  const handleVideoLinkSuccess = (token) => {
    // Refresh meetings list when a new link is created
    fetchMeetings();
  };

  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name) return 'U';

    // Split name into words and get first letter of each word (max 2)
    const words = name.trim().split(' ').filter(word => word.length > 0);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else if (words.length >= 2) {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Helper function to check if image URL is valid/accessible
  const isValidImageUrl = (url) => {
    if (!url) return false;
    // Check if it's a data URL (base64) or a valid HTTP/HTTPS URL
    return url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://');
  };

  // Helper function to get profile image with fallback
  const getProfileImage = () => {
    // Check if using landlord logo as profile
    if (user?.landlordInfo?.useLandlordLogoAsProfile && user?.landlordInfo?.landlordLogo) {
      if (isValidImageUrl(user.landlordInfo.landlordLogo)) {
        return user.landlordInfo.landlordLogo;
      }
    }

    // Check if using officer image
    if (user?.landlordInfo?.officerImage) {
      if (isValidImageUrl(user.landlordInfo.officerImage)) {
        return user.landlordInfo.officerImage;
      }
    }

    // Return null to show initials instead
    return null;
  };

  // Helper function to get landlord logo
  const getLandlordLogo = () => {
    if (user?.landlordInfo?.landlordLogo && isValidImageUrl(user.landlordInfo.landlordLogo)) {
      return user.landlordInfo.landlordLogo;
    }
    return null;
  };

  // Helper function to get profile shape class
  const getProfileShapeClass = () => {
    const shape = user?.landlordInfo?.profileShape;
    if (shape === 'square') {
      return 'rounded-lg';
    } else if (shape === 'circle') {
      return 'rounded-full';
    }
    return 'rounded-full'; // default
  };

  // Helper function to get image object fit class based on shape
  const getImageObjectFitClass = () => {
    const shape = user?.landlordInfo?.profileShape;
    if (shape === 'square') {
      return 'object-contain'; // For square, use contain to show full image
    } else {
      return 'object-cover'; // For circle, use cover to fill the circle
    }
  };

  // Helper function to format time with proper alignment
  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    // Create formatted time with consistent width
    if (ampm === 'PM') {
      // PM: no leading zero but maintain consistent spacing
      const hourStr = displayHours.toString();
      const paddedHour = hourStr.length === 1 ? ` ${hourStr}` : hourStr;
      return `${paddedHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
    } else {
      // AM: with leading zero
      return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
    }
  };

  // Helper function to format date for login times
  const formatLoginTime = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);

    // Array of month names
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const timeStr = formatTime(date);

    return `${day} ${month} ${year}, ${timeStr.toLowerCase()}`;
  };

  // Helper function to get last login time with fallback logic
  const getLastLoginTime = () => {
    if (user?.previousLoginTime) {
      return formatLoginTime(user.previousLoginTime);
    } else if (user?.currentLoginTime) {
      // If no previous login, show current login time
      return formatLoginTime(user.currentLoginTime);
    }
    return 'Never';
  };

  // Helper function to get display name
  const getDisplayName = () => {
    // Extract username from email (part before @)
    if (user?.email) {
      return user.email.split('@')[0];
    }

    // Default fallback
    return 'User';
  };

  // Helper function to format date for display in meetings table
  const formatMeetingDate = (dateString) => {
    if (!dateString) return { time: 'Unknown', date: 'Unknown' };
    const date = new Date(dateString);

    // Format time using the same logic as formatTime but with dots
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    let timeStr;
    if (ampm === 'PM') {
      // PM: no leading zero but maintain consistent spacing
      const hourStr = displayHours.toString();
      const paddedHour = hourStr.length === 1 ? ` ${hourStr}` : hourStr;
      timeStr = `${paddedHour}.${String(minutes).padStart(2, '0')} ${ampm}`;
    } else {
      // AM: with leading zero
      timeStr = `${String(displayHours).padStart(2, '0')}.${String(minutes).padStart(2, '0')} ${ampm}`;
    }

    // Format date as "24/5/2025"
    const day = date.getDate();
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    return {
      time: timeStr,
      date: formattedDate
    };
  };

  // Helper function to generate share URL with landlord info
  const generateShareUrl = (meetingId) => {
    const baseUrl = window.location.origin;
    const shareUrl = new URL(`${baseUrl}/share/${meetingId}`);

    // Add landlord information as query parameters if available
    if (user?.landlordInfo) {
      // Add landlord name
      if (user.landlordInfo.landlordName) {
        shareUrl.searchParams.set('landlordName', user.landlordInfo.landlordName);
      }

      // Add landlord logo URL
      if (user.landlordInfo.landlordLogo && isValidImageUrl(user.landlordInfo.landlordLogo)) {
        shareUrl.searchParams.set('landlordLogo', user.landlordInfo.landlordLogo);
      }

      // Add profile shape preference
      if (user.landlordInfo.profileShape) {
        shareUrl.searchParams.set('profileShape', user.landlordInfo.profileShape);
      }

      // Add officer image if using it as profile
      if (user.landlordInfo.officerImage &&
        !user.landlordInfo.useLandlordLogoAsProfile &&
        isValidImageUrl(user.landlordInfo.officerImage)) {
        shareUrl.searchParams.set('officerImage', user.landlordInfo.officerImage);
      }

      // Add flag for using landlord logo as profile
      if (user.landlordInfo.useLandlordLogoAsProfile) {
        shareUrl.searchParams.set('useLandlordLogoAsProfile', 'true');
      }
    }

    // Add user display name as fallback
    if (user?.email) {
      shareUrl.searchParams.set('userName', user.email.split('@')[0]);
    }

    return shareUrl.toString();
  };

  // Helper function to copy share URL
  const copyShareUrl = (meetingId) => {
    const shareUrl = generateShareUrl(meetingId);
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Share link copied to clipboard with landlord info!");
    }).catch(err => {
      toast.error("Failed to copy link");
    });
  };

  // Helper function to open share URL in new tab
  const openShareUrl = (meetingId) => {
    const shareUrl = generateShareUrl(meetingId);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  // Helper function to format complete address based on schema
  const formatCompleteAddress = (meeting) => {
    const addressParts = [];
    
    // Add all address lines from schema
    if (meeting.address_line_1) {
      addressParts.push(meeting.address_line_1.trim());
    }
    if (meeting.address_line_2) {
      addressParts.push(meeting.address_line_2.trim());
    }
    if (meeting.address_line_3) {
      addressParts.push(meeting.address_line_3.trim());
    }
    
    // Add additional address lines (array from schema)
    if (meeting.additional_address_lines && Array.isArray(meeting.additional_address_lines)) {
      meeting.additional_address_lines.forEach(line => {
        if (line && line.trim()) {
          addressParts.push(line.trim());
        }
      });
    }
    
    // Add post code
    if (meeting.post_code) {
      addressParts.push(meeting.post_code.trim());
    }
    
    // Fallback to old address field if no structured address
    if (addressParts.length === 0 && meeting.address) {
      addressParts.push(meeting.address.trim());
    }
    
    return addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';
  };
  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMeetings = meetings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(meetings.length / itemsPerPage);

  // Update select all when individual selections change
  useEffect(() => {
    if (currentMeetings.length > 0) {
      const allSelected = currentMeetings.every(meeting => selectedMeetings.includes(meeting._id));
      setSelectAll(allSelected);
    }
  }, [selectedMeetings, currentMeetings]);

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  // Reset to first page when meetings change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedMeetings([]); // Clear selections when meetings change
    setSelectAll(false);
  }, [meetings]);

  return (
    <>
      <div className="min-h-screen bg-white p-2">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between p-4 relative min-h-[140px]">
            <div className="flex items-center gap-4">
              {/* Home Icon */}
              <Button
                onClick={() => router.push('../')}
                className="bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 rounded-full p-3 flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 hover:border-gray-300 w-11 h-11"
                title="Go to Home"
              >
                <Home style={{ width: '18px', height: '18px', strokeWidth: '2' }} />
              </Button>

              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setLandlordDialogOpen(true)}
                style={{ minWidth: '120px' }}
              >
                {userLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                  </div>
                ) : getLandlordLogo() ? (
                  <img
                    src={getLandlordLogo()}
                    alt="Landlord Logo"
                    className="max-h-10 max-w-[120px] object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <span className="text-gray-600">Your logo here</span>
                  </div>
                )}
              </div>
            </div>

            {/* Center positioned dashboard and image - fixed position */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center flex-col z-10">
              <h1 className="text-4xl font-bold">Dashboard</h1>
              <img src="/devices.svg" alt="Videodesk" className="mt-2 w-60" />
            </div>

            <div className="flex items-center gap-4">              {/* Archive Icon Button */}
              <Button
                className={`${viewMode === 'archived' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-full px-4 py-2 flex items-center gap-2`}
                onClick={() => {
                  console.log('🔄 Current viewMode:', viewMode);
                  if (viewMode === 'archived') {
                    console.log('🔄 Switching to active meetings');
                    setViewMode('active'); // Switch back to active meetings
                  } else {
                    console.log('🔄 Switching to archived meetings');
                    setViewMode('archived'); // Show archived meetings
                  }
                }}
                title={viewMode === 'archived' ? 'View Active Meetings' : 'View Archived Meetings'}
              >
                <img src="/icons/download.svg" className="w-4 h-4 filter brightness-0 invert" />
                <span className="text-sm font-medium">
                  {viewMode === 'archived' ? 'Exit Archive' : 'View Archive'}
                </span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className={"bg-amber-500 text-white rounded-3xl flex items-center gap-2 text-xl"}>Actions <img src="/icons/arrow-down.svg" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className={'bg-white border-none shadow-sm'}>
                  <DropdownMenuItem>
                    <button className='bg-none border-none cursor-pointer' onClick={handleLogout}>Logout</button>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Dashboard</DropdownMenuItem>
                  <DropdownMenuItem>
                    <button className='bg-none border-none cursor-pointer' onClick={() => setTickerOpen(true)}>Raise Support Ticket</button>
                  </DropdownMenuItem>
                  <DropdownMenuItem><button className='bg-none border-none cursor-pointer' onClick={() => setResetOpen(true)}>Reset Password</button></DropdownMenuItem>
                  <DropdownMenuItem > <button className='bg-none border-none cursor-pointer' onClick={() => setInviteOpen(true)}>Invite Coworkers</button></DropdownMenuItem>
                  <DropdownMenuItem><button className='bg-none border-none cursor-pointer' onClick={() => setMessageOpen(true)}>Amend Message</button></DropdownMenuItem>
                  <DropdownMenuItem> <button className='bg-none border-none cursor-pointer text-left' onClick={() => setLandlordDialogOpen(true)}>Add Landlord Name/Logo/ <br />Profile Image </button></DropdownMenuItem>
                  <DropdownMenuItem > <button className='bg-none border-none cursor-pointer' onClick={() => setFaqOpen(true)}>FAQs</button></DropdownMenuItem>
                  <DropdownMenuItem > <button className='bg-none border-none cursor-pointer' onClick={() => setFeedbackOpen(true)}>Give Feedback</button></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* User Profile and Launch Button */}
          <div className="flex items-center">
            <div className="flex items-start gap-2 bg-white p-4 flex-col">
              <div className="flex items-center gap-3 mb-6">
                {userLoading ? (
                  <>
                    <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-12"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={`w-12 h-12 overflow-hidden cursor-pointer ${getProfileShapeClass()} flex items-center justify-center border border-gray-300 bg-gray-50`}
                      onClick={() => setLandlordDialogOpen(true)}
                      title="Click to update profile image"
                    >
                      {getProfileImage() ? (
                        <img
                          src={getProfileImage()}
                          alt="Profile Image"
                          width={48}
                          height={48}
                          className={`w-full h-full ${getImageObjectFitClass()}`}
                          onError={(e) => {
                            // Hide the image if it fails to load
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-lg">
                          {getInitials(getDisplayName())}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Hello,</p>
                      <p className="font-semibold">{getDisplayName()}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-0 w-full">
                {userLoading ? (
                  <>
                    <div className="grid grid-cols-[auto_auto_1fr] gap-2 items-end mb-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                      <span>:</span>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                    </div>
                    <div className="grid grid-cols-[auto_auto_1fr] gap-2 items-end">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                      <span>:</span>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-[80px_auto_1fr] gap-2 items-end">
                      <p className="text-left whitespace-nowrap">Logged in</p>
                      <span>:</span>
                      <p className="text-left whitespace-nowrap font-mono" style={{ whiteSpace: 'pre' }}>{formatLoginTime(user?.currentLoginTime)}</p>
                    </div>
                    <div className="grid grid-cols-[80px_auto_1fr] gap-2 items-end">
                      <p className="text-left whitespace-nowrap">Last Log in</p>
                      <span>:</span>
                      <p className="text-left whitespace-nowrap font-mono" style={{ whiteSpace: 'pre' }}>{formatLoginTime(user?.previousLoginTime || user?.currentLoginTime)}</p>
                    </div>
                  </>
                )}
              </div>

              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-lg font-medium cursor-pointer mt-4 text-lg"
                onClick={() => setShowVideoLinkSender(true)}
                disabled={userLoading}
              >
                {userLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white/30 rounded animate-pulse"></div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  'Launch new video link'
                )}
              </Button>
            </div>
          </div>          <div className="bg-white p-5 rounded-xl shadow-md overflow-x-auto">
            {/* Gmail-style Header with Actions */}            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300"
                  disabled={loading || meetings.length === 0}
                />
                {selectedMeetings.length > 0 ? (
                  <>
                    <span className="text-sm text-gray-600">
                      {selectedMeetings.length} selected
                    </span>
                    <button
                      onClick={handleMultipleDelete}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded"
                      title="Delete selected meetings"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMeetings([]);
                        setSelectAll(false);
                      }}
                      className="text-gray-500 hover:text-gray-700 text-sm hover:bg-gray-50 px-2 py-1 rounded"
                    >
                      Clear selection
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">
                    {meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'}
                  </span>
                )}
              </div>
            </div>

            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th className="px-4 py-2 font-semibold text-black text-left w-1/3">Resident name and address</th>
                  <th className="px-4 py-2 font-semibold text-black text-left w-1/3">Video Link</th>
                  <th className="px-4 py-2 font-semibold text-black text-left w-1/6">Time and Date</th>
                  <th className="px-4 py-2 font-semibold text-black text-left w-1/6">
                    <div>
                      <span className="block">{viewMode === 'archived' ? 'Discard/Unarchive/' : 'Discard/Archive/'}</span>
                      <span className="block">Export/History</span>
                    </div>
                  </th>
                </tr>
              </thead>              <tbody>
                {loading ? (// Skeleton loading rows
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-b">
                      <td className="px-4 py-3 w-2/5">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 w-1/4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                      </td>
                      <td className="px-4 py-3 w-1/6">
                        <div className="space-y-1">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 w-1/6">
                        <div className="flex justify-start gap-3">
                          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </td>
                    </tr>
                  ))                ) : meetings.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500">
                      {viewMode === 'archived' ? 'No archived meetings found.' : 'No meetings found. Create your first video link to get started!'}
                    </td>
                  </tr>
                ) : (
                  currentMeetings.map((meeting, index) => {
                    const { time, date } = formatMeetingDate(meeting.createdAt);
                    const shareUrl = generateShareUrl(meeting.meeting_id);
                    const actualIndex = indexOfFirstItem + index;
                    const isArchived = meeting.archived || false;                    return (
                      <tr key={meeting._id} className="hover:bg-gray-50 border-b group">
                        <td className="px-4 py-3 w-1/3">
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selectedMeetings.includes(meeting._id)}
                              onChange={(e) => handleSelectMeeting(meeting._id, e.target.checked)}
                              className="rounded border-gray-300 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{
                                opacity: selectedMeetings.includes(meeting._id) ? 1 : undefined
                              }}
                            />
                            <span className="flex-shrink-0">{actualIndex + 1}.</span>
                            <div className="flex items-center gap-2 flex-1">
                              <span className="break-words">{meeting.name || 'Unknown Resident'}, {formatCompleteAddress(meeting)}</span>
                              {/* Show archived badge if meeting is archived */}
                              {isArchived && viewMode !== 'archived' && (
                                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs flex-shrink-0">
                                  Archived
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 w-1/3">
                          <button
                            onClick={() => openShareUrl(meeting.meeting_id)}
                            className="text-blue-600 underline hover:text-blue-800 cursor-pointer text-left"
                            title="Click to open share link in new tab"
                          >
                            www.Videodesk.co.uk/share/{meeting.meeting_id.substring(0, 8)}...
                          </button>
                        </td>
                        <td className="px-4 py-3 w-1/6">
                          <div className="flex items-center">
                            <span className="font-mono" style={{ whiteSpace: 'pre' }}>{time}</span>
                            <span className="mx-2"></span>
                            <span className="font-mono">{date}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 w-1/6">
                          <div className="flex justify-start gap-3">
                            <button
                              title="Discard"
                              onClick={() => handleDeleteMeeting(meeting._id, meeting.name)}
                              className="hover:bg-red-50 p-1 rounded"
                            >
                              <img src="/icons/trash-red.svg" className="w-4 h-4" />
                            </button>

                            {/* Show appropriate archive/unarchive button based on meeting status */}
                            {isArchived ? (
                              <button
                                title="Unarchive"
                                onClick={() => handleUnarchiveMeeting(meeting._id, meeting.name)}
                                className="hover:bg-green-50 p-1 rounded"
                              >
                                <ArchiveRestore className="w-4 h-4 text-green-600" />
                              </button>
                            ) : (
                              <button
                                title="Archive"
                                onClick={() => handleArchiveMeeting(meeting._id, meeting.name)}
                                className="hover:bg-gray-50 p-1 rounded"
                              >
                                <img src="/icons/download.svg" className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              title="Export"
                              onClick={() => setExportOpen(true, meeting)}
                              className="hover:bg-gray-50 p-1 rounded"
                            >
                              <img src="/icons/icon-park_share.svg" className="w-5 h-5" />
                            </button>
                            <button
                              title="History"
                              onClick={() => setHistoryOpen(true, meeting)}
                              className="hover:bg-gray-50 p-1 rounded"
                            >
                              <img src="/icons/icon-park-outline_history-query.svg" className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {meetings.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-6 px-4">
                <div className="text-sm text-gray-600">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, meetings.length)} of {meetings.length} results
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageClick(pageNumber)}
                        className={`px-3 py-1 text-sm border border-gray-300 rounded-md ${currentPage === pageNumber
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'hover:bg-gray-50'
                          }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Replace the old form and dialog with the new component */}
      <VideoLinkSender
        isOpen={showVideoLinkSender}
        onClose={() => setShowVideoLinkSender(false)}
        onSuccess={handleVideoLinkSuccess}
      />
    </>
  )
}
