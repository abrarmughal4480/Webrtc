"use client"
import { Button } from "@/components/ui/button"
import { FileText, Archive, Trash2, Monitor, Smartphone, Save, History, ArchiveRestore, ExternalLink, FileSearch, MailIcon, Loader2, Maximize2, Home, RotateCcw, XCircle, Undo2, Info } from "lucide-react"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logoutRequest } from "@/http/authHttp"
import { getAllMeetings, deleteMeeting, archiveMeeting, unarchiveMeeting, getArchivedCount, restoreMeeting, permanentDeleteMeeting } from "@/http/meetingHttp"
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
import FloatingResendButton from "@/components/FloatingResendButton"

import moment from "moment/moment"
import { AiOutlineInfoCircle } from "react-icons/ai";
import { BsInfoCircleFill, BsInfoCircle } from "react-icons/bs";

export default function Page() {
  const { user, isAuth, setIsAuth, setUser } = useUser();
  const router = useRouter();
  // Remove video link related state variables
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('active');
  const [archivedCount, setArchivedCount] = useState(0);
  // Add state for VideoLinkSender
  const [showVideoLinkSender, setShowVideoLinkSender] = useState(false);

  // Add state for floating resend button
  const [lastSentLink, setLastSentLink] = useState(null);

  // Add state for multiple selection
  const [selectedMeetings, setSelectedMeetings] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { setResetOpen, setMessageOpen, setLandlordDialogOpen, setTickerOpen, setFeedbackOpen, setFaqOpen, setExportOpen, setHistoryOpen, setInviteOpen } = useDialog();

  // Add state for permanent delete dialog
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [multipleDeleteMode, setMultipleDeleteMode] = useState(false);

  const skeletonMinTimeRef = useRef(null);

  useEffect(() => {
    fetchMeetings();
    fetchArchivedCount();

    let trashInterval;
    if (viewMode === 'trash') {
      // Poll every 30 seconds in trash view, but no skeleton after first load
      trashInterval = setInterval(() => {
        fetchMeetings(false); // no skeleton
      }, 30000);
    }
    return () => {
      if (trashInterval) clearInterval(trashInterval);
    };
  }, [viewMode]);

  // Load last sent link from localStorage
  useEffect(() => {
    const loadLastSentLink = () => {
      const storedLink = localStorage.getItem('lastSentLink');
      
      if (storedLink) {
        try {
          const linkData = JSON.parse(storedLink);
          const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
          
          // Only show if link was sent within last 10 minutes
          if (linkData.timestamp > tenMinutesAgo) {
            setLastSentLink(linkData);
          } else {
            // Clear expired link
            localStorage.removeItem('lastSentLink');
            setLastSentLink(null);
          }
        } catch (error) {
          console.error('Error parsing last sent link:', error);
          localStorage.removeItem('lastSentLink');
        }
      }
    };

    // Load initially
    loadLastSentLink();

    // Listen for storage changes (when localStorage is updated from other components)
    const handleStorageChange = (e) => {
      if (e.key === 'lastSentLink') {
        loadLastSentLink();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (for same-tab updates)
    const handleCustomStorageChange = () => {
      loadLastSentLink();
    };

    window.addEventListener('lastSentLinkUpdated', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('lastSentLinkUpdated', handleCustomStorageChange);
    };
  }, []);

  // Timer to clear expired link
  useEffect(() => {
    if (!lastSentLink) return;

    const checkExpiry = () => {
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      if (lastSentLink.timestamp < tenMinutesAgo) {
        localStorage.removeItem('lastSentLink');
        setLastSentLink(null);
      }
    };

    const interval = setInterval(checkExpiry, 1000); // Check every second
    return () => clearInterval(interval);
  }, [lastSentLink]);

  // Add effect to handle user loading state
  useEffect(() => {
    if (user !== null) {
      setUserLoading(false);
    }
  }, [user]);

  const fetchMeetings = async (showSkeleton = true) => {
    try {
      let minTimePromise;
      if (showSkeleton) {
        setLoading(true);
        if (skeletonMinTimeRef.current) clearTimeout(skeletonMinTimeRef.current);
        minTimePromise = new Promise(resolve => {
          skeletonMinTimeRef.current = setTimeout(() => {
            resolve();
          }, 2000);
        });
      } else {
        setIsActionLoading(true);
      }

      // Fetch and filter logic (shared)
      let archivedParam = null;
      let deletedParam = null;
      if (viewMode === 'archived') archivedParam = true;
      else if (viewMode === 'active') archivedParam = false;
      if (viewMode === 'trash') deletedParam = true;

      const response = await getAllMeetings(archivedParam, deletedParam);
      const sortedMeetings = (response.data.meetings || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      let filteredMeetings = sortedMeetings;
      if (viewMode === 'trash') filteredMeetings = sortedMeetings.filter(m => m.deleted);
      else filteredMeetings = sortedMeetings.filter(m => !m.deleted);

      setMeetings(filteredMeetings);

      if (showSkeleton) {
        await minTimePromise;
        setLoading(false);
      } else {
        setIsActionLoading(false);
      }
    } catch (error) {
      setLoading(false);
      setIsActionLoading(false);
      console.error('Error fetching meetings:', error);
      toast(error?.response?.data?.message || error.message);
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
      fetchMeetings(false);
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
      fetchMeetings(false);
      fetchArchivedCount();
    } catch (error) {
      toast.error("Failed to unarchive meeting", {
        description: error?.response?.data?.message || error.message
      });
    }
  };
  const handleDeleteMeeting = async (id, meetingName) => {
    try {
      if (viewMode === 'trash') {
        // In trash view, permanently delete
        await permanentDeleteMeeting(id);
        toast.success("Meeting permanently deleted");
      } else {
        // In other views, soft delete (move to trash)
        const response = await deleteMeeting(id);
        if (response.data && response.data.message === 'Meeting moved to trash') {
          toast.success("Meeting moved to trash");
        } else {
          toast.success("Meeting deleted successfully");
        }
      }
      fetchMeetings(false); // Refresh the list
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

    if (viewMode === 'trash') {
      // Show permanent delete dialog for multiple
      setMultipleDeleteMode(true);
      setShowPermanentDeleteDialog(true);
      return;
    } else {
      // No confirmation, just move to trash
      await proceedMultipleDelete();
    }
  };

  // Helper for actual multiple delete logic
  const proceedMultipleDelete = async () => {
    setIsDeleting(true);
    let successCount = 0;
    let failureCount = 0;

    try {
      for (const meetingId of selectedMeetings) {
        try {
          if (viewMode === 'trash') {
            await permanentDeleteMeeting(meetingId);
          } else {
            await deleteMeeting(meetingId);
          }
          successCount++;
        } catch (error) {
          console.error(`Failed to delete meeting ${meetingId}:`, error);
          failureCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          viewMode === 'trash'
            ? `Permanently deleted ${successCount} meeting(s)`
            : `Successfully moved ${successCount} meeting(s) to trash`,
          {
            description: failureCount > 0 ? `${failureCount} deletion(s) failed` : undefined
          }
        );
      }
      if (failureCount > 0 && successCount === 0) {
        toast.error(`Failed to delete ${failureCount} meeting(s)`);
      }
      setSelectedMeetings([]);
      setSelectAll(false);
      fetchMeetings(false);
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
    fetchMeetings(false);
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
        <div className="container mx-auto space-y-4 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 relative min-h-[120px] sm:min-h-[140px]">
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
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mt-8 sm:mt-12">Dashboard</h1>
              <div className="mt-0 flex items-center justify-center" style={{ minHeight: '7rem', height: '7rem' }}>
                {viewMode === 'archived' ? (
                  <span className="text-3xl font-bold text-blue-600 flex items-center justify-center h-full">Archive</span>
                ) : viewMode === 'trash' ? (
                  <span className="text-3xl font-bold text-red-600 flex items-center justify-center h-full">Trash</span>
                ) : (
                  <img src="/devices.svg" alt="Videodesk" className="w-40 sm:w-48 lg:w-60 h-full object-contain" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">              {/* Trash Button */}
              <Button
                className={`${viewMode === 'trash' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white rounded-full px-4 py-2 flex items-center gap-2 shadow transition-all duration-200`}
                onClick={() => {
                  if (viewMode === 'trash') {
                    setViewMode('active');
                  } else {
                    setViewMode('trash');
                  }
                }}
                title={viewMode === 'trash' ? '' : 'View Trashed Meetings'}
              >
                <img src="/icons/trash-red.svg" className="w-4 h-4 filter brightness-0 invert" />
                <span className="text-sm font-medium">
                  {viewMode === 'trash' ? 'Exit Trash' : 'View Trash'}
                </span>
                {viewMode === 'trash' && (
                  <span className="relative group ml-1 flex items-center h-5 w-5">
                    <BsInfoCircle className="w-full h-full text-white/90 hover:text-white cursor-pointer" />
                    <span className="absolute left-1/2 top-full z-30 mt-4 min-w-[380px] max-w-xs -translate-x-1/2 rounded-md bg-blue-50 text-blue-900 text-xs px-3 py-2 h-auto overflow-visible opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none shadow-lg border border-blue-200 flex flex-col items-center">
                      <span className="font-semibold text-xs mb-1">Trash Auto-Delete</span>
                      <span className="text-xs text-center">
                        <ul className="list-disc pl-5 space-y-1 text-left">
                          <li>Records in Trash are <b>PERMANENTLY DELETED</b> after 10 days.</li>
                          <li>This action cannot be undone.</li>
                          <li>You can <b>RESTORE</b> records before 10 days to retain them.</li>
                        </ul>
                      </span>
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-0 h-0 border-l-6 border-r-6 border-b-6 border-l-transparent border-r-transparent border-b-blue-50"></span>
                    </span>
                  </span>
                )}
              </Button>
              {/* Archive Icon Button */}
              <Button
                className={`${viewMode === 'archived' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-full px-4 py-2 flex items-center gap-2`}
                onClick={() => {
                  if (viewMode === 'archived') {
                    setViewMode('active');
                  } else {
                    setViewMode('archived');
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
            <div className="flex items-start gap-2 bg-white p-3 sm:p-4 flex-col">
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
                className="bg-amber-500 hover:bg-amber-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium cursor-pointer mt-4 text-base sm:text-lg"
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
          </div>          <div className="bg-white p-4 sm:p-5 rounded-xl shadow-md overflow-x-auto mt-6">
            {/* Gmail-style Header with Actions - Fixed height to prevent layout shift */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 h-12">
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

            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="h-14 align-middle">
                  <th className="px-4 py-2 font-semibold text-black text-left w-1/3 h-14 align-middle">Resident name and address</th>
                  <th className="px-4 py-2 font-semibold text-black text-left w-1/3 h-14 align-middle">Video Link</th>
                  <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">Time and Date</th>
                  <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">
                    <div>
                      {viewMode === 'trash' ? (
                        <span className="block">Restore/Delete Permanently</span>
                      ) : (
                        <>
                          <span className="block">{viewMode === 'archived' ? 'Discard/Unarchive/' : 'Discard/Archive/'}</span>
                          <span className="block">Export/History</span>
                        </>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && !isActionLoading ? (
                  // Skeleton loading rows
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-b">
                      <td className="px-4 py-3 w-1/3">
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse mt-1"></div>
                          <span className="flex-shrink-0">{index + 1}.</span>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 w-1/3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                      </td>
                      <td className="px-4 py-3 w-1/6">
                        <div className="flex items-center space-x-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-10"></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 w-1/6">
                        {viewMode === 'trash' ? (
                          <div className="flex justify-start gap-3">
                            <div className="p-1 rounded w-7 h-7 flex items-center justify-center bg-orange-100 animate-pulse"></div>
                            <div className="p-1 rounded w-7 h-7 flex items-center justify-center bg-orange-100 animate-pulse"></div>
                          </div>
                        ) : (
                          <div className="flex justify-start gap-3">
                            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : meetings.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500 align-middle" style={{ height: '72px' }}>
                      {viewMode === 'archived'
                        ? 'No archived meetings found.'
                        : viewMode === 'trash'
                          ? 'No trashed meetings found.'
                          : 'No meetings found. Create your first video link to get started!'}
                    </td>
                  </tr>
                ) : (
                  currentMeetings.map((meeting, index) => {
                    const { time, date } = formatMeetingDate(meeting.createdAt);
                    const shareUrl = generateShareUrl(meeting.meeting_id);
                    const actualIndex = indexOfFirstItem + index;
                    const isArchived = meeting.archived || false;
                    return (
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
                          {meeting.deleted ? (
                            <span
                              className="text-gray-400 line-through cursor-not-allowed text-left"
                              title="Link disabled for trashed meetings"
                            >
                              www.Videodesk.co.uk/share/{meeting.meeting_id.substring(0, 8)}...
                            </span>
                          ) : (
                            <button
                              onClick={() => openShareUrl(meeting.meeting_id)}
                              className="text-blue-600 underline hover:text-blue-800 cursor-pointer text-left"
                              title="Click to open share link in new tab"
                            >
                              www.Videodesk.co.uk/share/{meeting.meeting_id.substring(0, 8)}...
                            </button>
                          )}
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
                            {viewMode === 'trash' ? (
                              <>
                                <button
                                  title="Restore"
                                  onClick={async () => {
                                    try {
                                      await restoreMeeting(meeting._id);
                                      toast.success("Meeting restored successfully");
                                      fetchMeetings(false);
                                    } catch (error) {
                                      toast.error("Failed to restore meeting", { description: error?.response?.data?.message || error.message });
                                    }
                                  }}
                                  className="hover:bg-green-50 p-1 rounded"
                                >
                                  <Undo2 className="w-5 h-5 text-green-600" />
                                </button>
                                <button
                                  title="Permanently Delete"
                                  onClick={() => {
                                    setMeetingToDelete(meeting);
                                    setShowPermanentDeleteDialog(true);
                                  }}
                                  className="hover:bg-red-50 p-1 rounded"
                                >
                                  <Trash2 className="w-5 h-5 text-red-600" />
                                </button>
                              </>
                            ) : (
                              <>
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
                              </>
                            )}
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

      {/* Floating Resend Button */}
      <FloatingResendButton />



      {/* Permanent Delete Confirmation Dialog */}
      {showPermanentDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-sm">
          <div className="bg-orange-100/90 backdrop-blur-lg rounded-xl shadow-2xl p-7 w-full max-w-md border border-orange-200" style={{ boxShadow: '0 8px 32px 0 rgba(255, 183, 77, 0.18)' }}>
            <h2 className="text-xl font-bold text-red-600 mb-3">Permanently Delete Meeting{multipleDeleteMode && selectedMeetings.length > 1 ? 's' : ''}?</h2>
            <p className="mb-4 text-orange-900">This will permanently delete:</p>
            <ul className="list-disc list-inside mb-4 text-orange-800">
              <li>The meeting document{multipleDeleteMode && selectedMeetings.length > 1 ? 's' : ''}</li>
              <li>All recordings</li>
              <li>All screenshots</li>
              <li>All associated media files</li>
            </ul>
            <p className="mb-4 text-sm text-orange-700">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                className="px-5 py-2 bg-orange-50 text-orange-900 rounded-full shadow-sm hover:bg-orange-200 hover:shadow-md transition-all font-semibold"
                onClick={() => {
                  setShowPermanentDeleteDialog(false);
                  setMeetingToDelete(null);
                  setMultipleDeleteMode(false);
                }}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 bg-red-600 text-white rounded-full shadow-sm hover:bg-red-700 hover:shadow-md transition-all font-semibold"
                onClick={async () => {
                  if (multipleDeleteMode) {
                    await proceedMultipleDelete();
                    setShowPermanentDeleteDialog(false);
                    setMultipleDeleteMode(false);
                  } else if (meetingToDelete) {
                    try {
                      await permanentDeleteMeeting(meetingToDelete._id);
                      toast.success("Meeting permanently deleted");
                      setShowPermanentDeleteDialog(false);
                      setMeetingToDelete(null);
                      fetchMeetings(false);
                    } catch (error) {
                      toast.error("Failed to permanently delete meeting", { description: error?.response?.data?.message || error.message });
                    }
                  }
                }}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
