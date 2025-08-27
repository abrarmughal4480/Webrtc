"use client"
import { Button } from "@/components/ui/button"
import { FileText, Archive, Trash2, Monitor, Smartphone, Save, History, ArchiveRestore, ExternalLink, FileSearch, MailIcon, Loader2, Maximize2, Home, RotateCcw, XCircle, Undo2, Info, Search, X, User, Wrench, Clock, ChevronDown, Plus, Check, Image as ImageIcon, Video as VideoIcon, LogOut, Bell } from "lucide-react"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logoutRequest } from "@/http/authHttp"
import { createFolderRequest, updateFolderRequest, deleteFolderRequest, moveFolderToTrashRequest, restoreFolderFromTrashRequest, getFoldersRequest, assignMeetingToFolderRequest, getMeetingFoldersRequest } from "@/http/authHttp"
import { getAllMeetings, deleteMeeting, archiveMeeting, unarchiveMeeting, getArchivedCount, restoreMeeting, permanentDeleteMeeting, searchMeetings } from "@/http/meetingHttp"
import { getPaginationSettings, updatePaginationSettings } from "@/http/authHttp"
import { useUser } from "@/provider/UserProvider"
import { useEffect, useRef, useState, useMemo } from "react"
import { toast } from "sonner"

import { useRouter } from "next/navigation"

import { useDialog } from "@/provider/DilogsProvider"
import CustomDialog from "@/components/dialogs/CustomDialog"
import { updateUserLogoRequest } from "@/http/authHttp"
import VideoLinkSender from "@/components/VideoLinkSender"
import FloatingResendButton from "@/components/FloatingResendButton"

import moment from "moment/moment"
import { AiOutlineInfoCircle } from "react-icons/ai";
import { BsInfoCircleFill, BsInfoCircle } from "react-icons/bs";
import { updateUserRequest } from "@/http/authHttp";
import AccessCodeDialog from "@/components/dialogs/AccessCodeDialog";
import { loadMeRequest } from "@/http/authHttp";
import { getMyUploadsRequest, getMyTrashedUploadsRequest, deleteUploadRequest, restoreUploadRequest, permanentDeleteUploadRequest, searchUploadsRequest } from "@/http/uploadHttp";
import { publicApi } from "@/http";
import useNotifications from "@/hooks/useNotifications";
import VideoGuidesDialog from "@/components/dialogs/VideoGuidesDialog";
import { companyHttp } from "@/http/companyHttp";

export default function Page() {
  const { user, isAuth, setIsAuth, setUser } = useUser();
  const router = useRouter();
  
  // Use real-time notifications hook
  const { hasNotifications, notificationData, markAsRead, readNotifications } = useNotifications(user?.email);
  
  // Remove video link related state variables
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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

  // Add state for folders and selected folder (archive view only)
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('all'); // 'all' means show all
  const [newFolderName, setNewFolderName] = useState('');

  // Add state for mapping meetingId -> folderId
  const [meetingFolders, setMeetingFolders] = useState({});
  const [createFolderLoading, setCreateFolderLoading] = useState(false);
  const [updateFolderLoading, setUpdateFolderLoading] = useState(null); // folderId when updating
  const [deleteFolderLoading, setDeleteFolderLoading] = useState(null); // folderId when deleting

  const [myUploads, setMyUploads] = useState([]);
  const [residentUploads, setResidentUploads] = useState([]);
  const [residentTrashedUploads, setResidentTrashedUploads] = useState([]);
  const [residentViewMode, setResidentViewMode] = useState('active'); // 'active' or 'trash'
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  const handleMarkAsRead = (notificationId) => {
    markAsRead(notificationId);
    toast.success('Notification marked as read');
  };

  useEffect(() => {
    if (user?.role === 'resident') {
      getMyUploadsRequest().then(res => {
        console.log('Resident uploads API response:', res.data);
        const uploads = res.data.data.uploads || [];
        setResidentUploads(sortUploadsByDate(uploads));
      }).catch(() => {
        setResidentUploads([]);
      });
      
      getMyTrashedUploadsRequest().then(res => {
        console.log('Resident trashed uploads API response:', res.data);
        const trashedUploads = res.data.data.uploads || [];
        setResidentTrashedUploads(sortUploadsByDate(trashedUploads));
      }).catch(() => {
        setResidentTrashedUploads([]);
      });
    }
  }, [user?.role]);

  // Load folders and meeting assignments from backend
  useEffect(() => {
    if (isAuth && user) {
      loadFolders();
      loadMeetingFolders();
      loadPaginationSettings();
    }
  }, [isAuth, user]);

  // Get trashed folders for trash view
  const getTrashedFolders = () => {
    console.log('🔍 [getTrashedFolders] All folders:', folders);
    const trashedFolders = folders.filter(folder => folder.trashed);
    console.log('🔍 [getTrashedFolders] Trashed folders:', trashedFolders);
    return trashedFolders;
  };

  const loadFolders = async () => {
    try {
      const response = await getFoldersRequest();
      // Add trashed property if missing
      const foldersWithTrashed = (response.data.folders || []).map(f => ({ ...f, trashed: f.trashed || false }));
      setFolders(foldersWithTrashed);
    } catch (error) {
      console.error('Error loading folders:', error);
      toast.error('Failed to load folders');
    }
  };

  const loadMeetingFolders = async () => {
    try {
      const response = await getMeetingFoldersRequest();
      setMeetingFolders(response.data.meetingFolders || {});
    } catch (error) {
      console.error('Error loading meeting folders:', error);
    }
  };

  const { setResetOpen, setMessageOpen, setLandlordDialogOpen, setTickerOpen, setFeedbackOpen, setFaqOpen, setExportOpen, setHistoryOpen, setInviteOpen, historyOpen, selectedItemForHistory, historyLoading, setHasTemporaryPassword, hasTemporaryPassword, setOnTemporaryPasswordChangeSuccess, setViewTicketsOpen } = useDialog();
  
  // Video guides dialog state
  const [videoGuidesOpen, setVideoGuidesOpen] = useState(false);

  // Add state for permanent delete dialog
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [multipleDeleteMode, setMultipleDeleteMode] = useState(false);

  // Add state for search modal
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Add state for search fields
  const [searchFields, setSearchFields] = useState({
    // Meeting fields
    first_name: '',
    last_name: '',
    house_name_number: '', // House/Building number or name
    flat_apartment_room: '', // Flat/Apartment/Room number
    street_road: '',      // Street/Road
    city: '',        // Town/City
    country: '',     // Country
    post_code: '',   // Postcode
    phone_number: '',
    email: '',
    date_from: '',
    date_to: '',
    repair_detail: '',
    target_time: '',
    special_notes: '',
    reference: '',
    // Upload fields
    accessCode: '',
    description: '',
  });

  const [roleLoading, setRoleLoading] = useState(false);

  // Helper function to sort uploads by date (latest first)
  const sortUploadsByDate = (uploads) => {
    return uploads.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0);
      const dateB = new Date(b.createdAt || b.created_at || 0);
      return dateB - dateA; // Latest first
    });
  };

  const handleRoleToggle = () => {
    if (!user) return;
    const newRole = user.role === "landlord" ? "resident" : "landlord";
    setUser({ ...user, role: newRole });
    toast.success(`Role switched to ${newRole === "landlord" ? "User" : "Customer"}`);
  };

  // Add state to track if user is in search mode
  const [isInSearchMode, setIsInSearchMode] = useState(false);

  const skeletonMinTimeRef = useRef(null);

  const [showFolderInput, setShowFolderInput] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameFolderName, setRenameFolderName] = useState('');

  // State for folder delete confirmation
  const [showFolderDeleteDialog, setShowFolderDeleteDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);

  // Dummy uploads for customer role
  const [customerUploads] = useState([
    {
      id: 1,
      date: '2024-06-01',
      images: 3,
      videos: 1,
      shareCode: '1234',
      history: [
        { action: 'Uploaded', date: '2024-06-01 10:00' },
        { action: 'Viewed', date: '2024-06-01 12:00' },
      ],
    },
    {
      id: 2,
      date: '2024-06-03',
      images: 2,
      videos: 2,
      shareCode: '5678',
      history: [
        { action: 'Uploaded', date: '2024-06-03 09:30' },
      ],
    },
    {
      id: 3,
      date: '2024-06-05',
      images: 5,
      videos: 0,
      shareCode: '9012',
      history: [
        { action: 'Uploaded', date: '2024-06-05 14:20' },
        { action: 'Edited', date: '2024-06-05 15:00' },
      ],
    },
  ]);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
  const [selectedShareCode, setSelectedShareCode] = useState('');



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
      setIsInSearchMode(false); // Reset search mode when fetching all meetings

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
      toast("Failed to load meetings");
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
      toast.error("Failed to archive meeting");
    }
  };

  const handleUnarchiveMeeting = async (id, meetingName) => {
    try {
      await unarchiveMeeting(id);
      toast.success(`"${meetingName || 'Meeting'}" unarchived successfully`);
      fetchMeetings(false);
      fetchArchivedCount();
      // Reload meeting folders to reflect the removal from folder assignment
      await loadMeetingFolders();
    } catch (error) {
      toast.error("Failed to unarchive meeting");
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
      toast.error("Failed to delete meeting");
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

  // Resident upload operations
  const handleDeleteUpload = async (uploadId) => {
    try {
      await deleteUploadRequest(uploadId);
      toast.success("Upload moved to trash");
      // Refresh both active and trashed uploads
      const [activeRes, trashedRes] = await Promise.all([
        getMyUploadsRequest(),
        getMyTrashedUploadsRequest()
      ]);
      // Sort uploads by createdAt date (latest first)
      const sortedActiveUploads = (activeRes.data.data.uploads || []).sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA; // Latest first
      });
      const sortedTrashedUploads = (trashedRes.data.data.uploads || []).sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA; // Latest first
      });
      setResidentUploads(sortedActiveUploads);
      setResidentTrashedUploads(sortedTrashedUploads);
    } catch (error) {
      toast.error("Failed to delete upload");
    }
  };

  const handleRestoreUpload = async (uploadId) => {
    try {
      await restoreUploadRequest(uploadId);
      toast.success("Upload restored successfully");
      // Refresh both active and trashed uploads
      const [activeRes, trashedRes] = await Promise.all([
        getMyUploadsRequest(),
        getMyTrashedUploadsRequest()
      ]);
      // Sort uploads by createdAt date (latest first)
      const sortedActiveUploads = (activeRes.data.data.uploads || []).sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA; // Latest first
      });
      const sortedTrashedUploads = (trashedRes.data.data.uploads || []).sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA; // Latest first
      });
      setResidentUploads(sortedActiveUploads);
      setResidentTrashedUploads(sortedTrashedUploads);
    } catch (error) {
      toast.error("Failed to restore upload");
    }
  };

  const handlePermanentDeleteUpload = async (uploadId) => {
    try {
      await permanentDeleteUploadRequest(uploadId);
      toast.success("Upload permanently deleted");
      // Refresh trashed uploads
      const trashedRes = await getMyTrashedUploadsRequest();
      // Sort trashed uploads by createdAt date (latest first)
      const sortedTrashedUploads = (trashedRes.data.data.uploads || []).sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA; // Latest first
      });
      setResidentTrashedUploads(sortedTrashedUploads);
    } catch (error) {
      toast.error("Failed to permanently delete upload");
    }
  };

  // Handle double-click on upload to redirect to access page
  const handleUploadDoubleClick = (upload) => {
    if (user?.role === 'resident' && upload.accessCode) {
      // Set session storage to allow access (security check)
      sessionStorage.setItem(`accessCodeValidated:${upload.accessCode}`, 'true');
      // Redirect to the upload access page
      router.push(`/room/upload/${upload.accessCode}`);
    }
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
    // Check if backend sent problematic values
    if (user?.firstName === 'Unknown' || user?.lastName === 'User' || 
        user?.firstName === 'Unknown User' || user?.lastName === 'Unknown User') {
      // Show email username instead of problematic values
      return user?.email?.split('@')[0] || 'User';
    }
    
    // First priority: Use firstName + lastName if available
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.trim()} ${user.lastName.trim()}`;
    }
    
    // Second priority: Use firstName only if available
    if (user?.firstName) {
      return user.firstName;
    }
    
    // Third priority: Use lastName only if available
    if (user?.lastName) {
      return user.lastName;
    }
    
    // Fallback: Extract username from email (part before @)
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

  // Helper functions for history modal
  const formatHistoryDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getLocationFromIP = (ip) => {
    if (!ip || ip === 'Unknown' || ip === '127.0.0.1' || ip === 'localhost') {
      return 'Local/Unknown';
    }
    return 'Location data not available';
  };

  const parseUserAgent = (userAgent) => {
    if (!userAgent) return 'Unknown Device';
    
    if (userAgent.includes('Mobile')) return 'Mobile Device';
    if (userAgent.includes('Tablet')) return 'Tablet';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';
    
    return 'Desktop';
  };

  // Helper function to open share URL in new tab
  const openShareUrl = (meetingId) => {
    const shareUrl = generateShareUrl(meetingId);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  // Replace formatCompleteAddress with new logic for new address fields
  const formatCompleteAddress = (meeting) => {
    const addressParts = [];
    // New schema fields
    if (meeting.house_name_number) {
      addressParts.push(meeting.house_name_number.trim());
    }
    if (meeting.flat_apartment_room) {
      addressParts.push(meeting.flat_apartment_room.trim());
    }
    if (meeting.street_road) {
      addressParts.push(meeting.street_road.trim());
    }
    if (meeting.city) {
      addressParts.push(meeting.city.trim());
    }
    if (meeting.country) {
      addressParts.push(meeting.country.trim());
    }
    // Add post code if present
    if (meeting.post_code) {
      addressParts.push(meeting.post_code.trim());
    }
    // Fallback to old address field if no structured address
    if (addressParts.length === 0 && meeting.address) {
      addressParts.push(meeting.address.trim());
    }
    return addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';
  };

  // Filter meetings by selected folder in archive view
  const filteredMeetings = viewMode === 'archived'
    ? meetings.filter(m => {
        if (selectedFolder === 'all') {
          // Only show meetings whose folder is not trashed
          const folderId = meetingFolders[m._id];
          if (!folderId) return true;
          const folder = folders.find(f => f.id === folderId);
          return !folder || !folder.trashed;
        }
        // Only show if assigned to selectedFolder and not trashed
        return meetingFolders[m._id] === selectedFolder && !folders.find(f => f.id === selectedFolder && f.trashed);
      })
    : viewMode === 'trash'
    ? (() => {
        console.log('🔍 [Trash Filter] All meetings:', meetings.length);
        console.log('🔍 [Trash Filter] All meetings with trashed status:', meetings.map(m => ({ id: m._id, trashed: m.trashed, name: m.name })));
        console.log('🔍 [Trash Filter] Meeting folders mapping:', meetingFolders);
        
        const trashedFolders = getTrashedFolders();
        console.log('🔍 [Trash Filter] Trashed folders:', trashedFolders);
        
        const trashedIndividualRecords = meetings.filter(m => m.deleted && !meetingFolders[m._id]);
        const trashedRecordsInFolders = meetings.filter(m => m.deleted && meetingFolders[m._id]);
        console.log('🔍 [Trash Filter] Trashed individual records (not in folders):', trashedIndividualRecords.length);
        console.log('🔍 [Trash Filter] Trashed records in folders:', trashedRecordsInFolders.length);
        
        return [
          // Show trashed folders
          ...trashedFolders.map(folder => ({
            _id: `folder_${folder.id}`,
            isFolder: true,
            folder: folder,
            name: folder.name,
            createdAt: folder.createdAt,
            recordCount: Object.values(meetingFolders).filter(folderId => folderId === folder.id).length
          })),
          // Add ALL trashed individual records (both in folders and not in folders)
          ...meetings.filter(m => m.deleted).map(meeting => ({
            ...meeting,
            isFolder: false
          }))
        ];
      })()
    : meetings.filter(m => !m.deleted); // Show only non-deleted meetings for other views

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMeetings = filteredMeetings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMeetings.length / itemsPerPage);

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

  // Load pagination settings from backend
  const loadPaginationSettings = async () => {
    try {
      const response = await getPaginationSettings();
      if (response.data.success) {
        setItemsPerPage(response.data.paginationSettings.itemsPerPage);
      }
    } catch (error) {
      console.error('Error loading pagination settings:', error);
    }
  };

  // Handler for changing items per page
  const handleItemsPerPageChange = async (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
    
    // Save to backend silently (no toast)
    try {
      await updatePaginationSettings({ itemsPerPage: newItemsPerPage });
    } catch (error) {
      console.error('Error saving pagination settings:', error);
    }
  };

  // Reset to first page when meetings change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedMeetings([]); // Clear selections when meetings change
    setSelectAll(false);
  }, [meetings]);

  // Handler for search popup field changes
  const handleSearchFieldChange = (field, value) => {
    setSearchFields(prev => ({ ...prev, [field]: value }));
  };

  // Handler for search button
  const handleSearchMeetings = async (e) => {
    if (e) e.preventDefault();
    
    // Validate date range
    if (searchFields.date_from && searchFields.date_to) {
      const fromDate = new Date(searchFields.date_from);
      const toDate = new Date(searchFields.date_to);
      if (fromDate > toDate) {
        toast.error("From date cannot be after To date");
        return;
      }
    }
    
    // Only send filled fields
    const params = {};
    Object.entries(searchFields).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        // Handle date fields properly
        if (key === 'date_from' || key === 'date_to') {
          // Convert date to ISO string for backend
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            params[key] = date.toISOString();
          }
        } else {
          params[key] = value.trim();
        }
      }
    });
    
    console.log('🔍 Search parameters:', params);
    
    setShowSearchModal(false);
    setLoading(true);
    try {
      let response;
      
      // Handle different view modes for landlord
      if (user?.role === 'landlord') {
        if (Object.keys(params).length === 0) {
          // No search fields, show all meetings based on current view mode
          console.log('📋 No search criteria, showing all meetings for view mode:', viewMode);
          setIsInSearchMode(false);
          await fetchMeetings();
          setLoading(false);
          return;
        } else {
          // Add view mode parameters to search
          if (viewMode === 'archived') {
            params.archived = true;
          } else if (viewMode === 'trash') {
            params.deleted = true;
          } else {
            params.archived = false;
            params.deleted = false;
          }
          
          console.log('🔍 Sending search request with params:', params);
          response = await searchMeetings(params);
          console.log('✅ Search response:', response.data);
          setIsInSearchMode(true);
        }
        const sortedMeetings = (response.data.meetings || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setMeetings(sortedMeetings);
      } 
      // Handle resident view - search uploads
      else if (user?.role === 'resident') {
        if (Object.keys(params).length === 0) {
          // No search fields, show all uploads based on current view mode
          console.log('📋 No search criteria, showing all uploads for view mode:', residentViewMode);
          setIsInSearchMode(false);
          // Reload uploads based on current view mode
          if (residentViewMode === 'trash') {
            const res = await getMyTrashedUploadsRequest();
            const uploads = res.data.data.uploads || [];
            // Sort uploads by createdAt date (latest first)
            const sortedUploads = uploads.sort((a, b) => {
              const dateA = new Date(a.createdAt || a.created_at || 0);
              const dateB = new Date(b.createdAt || b.created_at || 0);
              return dateB - dateA; // Latest first
            });
            setResidentTrashedUploads(sortedUploads);
          } else {
            const res = await getMyUploadsRequest();
            const uploads = res.data.data.uploads || [];
            // Sort uploads by createdAt date (latest first)
            const sortedUploads = uploads.sort((a, b) => {
              const dateA = new Date(a.createdAt || a.created_at || 0);
              const dateB = new Date(b.createdAt || b.created_at || 0);
              return dateB - dateA; // Latest first
            });
            setResidentUploads(sortedUploads);
          }
          setLoading(false);
          return;
        } else {
          // Add view mode parameter to search
          if (residentViewMode === 'trash') {
            params.deleted = true;
          } else {
            params.deleted = false;
          }
          
          console.log('🔍 Sending upload search request with params:', params);
          response = await searchUploadsRequest(params);
          console.log('✅ Upload search response:', response.data);
          setIsInSearchMode(true);
          
          const uploads = response.data.data.uploads || [];
          // Sort uploads by createdAt date (latest first)
          const sortedUploads = uploads.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || 0);
            const dateB = new Date(b.createdAt || b.created_at || 0);
            return dateB - dateA; // Latest first
          });
          if (residentViewMode === 'trash') {
            setResidentTrashedUploads(sortedUploads);
          } else {
            setResidentUploads(sortedUploads);
          }
        }
      }
      
      setLoading(false);
      
      // Show search results count
      const searchFieldsCount = Object.keys(params).length;
      if (searchFieldsCount > 0) {
        const resultCount = user?.role === 'landlord' 
          ? (response?.data?.meetings || []).length 
          : (residentViewMode === 'trash' ? residentTrashedUploads.length : residentUploads.length);
        toast.success(`Found ${resultCount} ${user?.role === 'landlord' ? 'meeting(s)' : 'upload(s)'} matching your search criteria`);
      }
    } catch (error) {
      setLoading(false);
      console.error('❌ Search error:', error);
      toast.error("Failed to perform search");
    }
  };

  // Prevent background scroll when search modal is open
  useEffect(() => {
    if (showSearchModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSearchModal]);

  // --- DEMO/FRONTEND-ONLY ROLE STATE ---
  // Remove all fakeRole and demo role state/logic
  // Replace all fakeRole === 'landlord' with user?.role === 'landlord'
  // Replace all fakeRole === 'resident' with user?.role === 'resident'
  // Remove the fakeRole state and toggle logic
  // Show the real user role in the UI

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await loadMeRequest();
        setUser(res.data.user);
      } catch (err) {
        // Optionally handle error
      }
    }
    fetchUser();
  }, []);

  // Check temporary password status when user and auth state are ready
  useEffect(() => {
    if (isAuth && user) {
      // Check immediately since we're using user data directly
      checkTemporaryPasswordStatus();
    }
  }, [isAuth, user]);

  // Get search fields based on user role and view mode
  const getSearchFieldsForCurrentView = () => {
    if (user?.role === 'resident') {
      // Resident view - upload search fields
      return [
        { key: 'accessCode', label: 'Access Code', placeholder: 'Enter access code' },
        { key: 'description', label: 'Description', placeholder: 'Enter description' },
        { key: 'date_from', label: 'From Date', type: 'date' },
        { key: 'date_to', label: 'To Date', type: 'date' }
      ];
    } else {
      // Landlord view - meeting search fields
      return [
        { key: 'first_name', label: 'First Name', placeholder: 'Enter first name' },
        { key: 'last_name', label: 'Last Name', placeholder: 'Enter last name' },
        { key: 'house_name_number', label: 'House/Building', placeholder: 'House/Building number or name' },
        { key: 'flat_apartment_room', label: 'Flat/Apartment/Room', placeholder: 'Flat/Apartment/Room number' },
        { key: 'street_road', label: 'Street/Road', placeholder: 'Street/Road name' },
        { key: 'city', label: 'Town/City', placeholder: 'Town/City' },
        { key: 'country', label: 'County', placeholder: 'County' },
        { key: 'post_code', label: 'Postcode', placeholder: 'Postcode' },
        { key: 'phone_number', label: 'Phone Number', placeholder: 'Phone number' },
        { key: 'email', label: 'Email', placeholder: 'Email address' },
        { key: 'date_from', label: 'From Date', type: 'date' },
        { key: 'date_to', label: 'To Date', type: 'date' },
        { key: 'repair_detail', label: 'Repair Detail', placeholder: 'Repair detail' },
        { key: 'target_time', label: 'Target Time', placeholder: 'Target time' },
        { key: 'special_notes', label: 'Special Notes', placeholder: 'Special notes' },
        { key: 'reference', label: 'Reference', placeholder: 'Reference' }
      ];
    }
  };

  // Get search modal title based on current view
  const getSearchModalTitle = () => {
    if (user?.role === 'resident') {
      return `Search ${residentViewMode === 'trash' ? 'Trashed' : 'Active'} Uploads`;
    } else {
      if (viewMode === 'trash') return 'Search Trashed Meetings';
      if (viewMode === 'archived') return 'Search Archived Meetings';
      return 'Search Active Meetings';
    }
  };

  // Get search button text based on current view
  const getSearchButtonText = () => {
    return "Search";
  };

  // Resident upload stats (active view)
  const displayedResidentUploads = residentViewMode === 'trash' ? residentTrashedUploads : residentUploads;
  const residentUploadStats = useMemo(() => {
    const uploadsArray = Array.isArray(displayedResidentUploads) ? displayedResidentUploads : [];
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let thisMonth = 0;
    let lastMonth = 0;
    let older = 0;

    for (const upload of uploadsArray) {
      const createdAtString = upload?.createdAt || upload?.created_at;
      const createdAtDate = createdAtString ? new Date(createdAtString) : null;

      if (!createdAtDate || isNaN(createdAtDate.getTime())) {
        older++;
        continue;
      }

      if (createdAtDate >= startOfCurrentMonth) thisMonth++;
      else if (createdAtDate >= startOfLastMonth && createdAtDate < startOfCurrentMonth) lastMonth++;
      else older++;
    }

    return { total: uploadsArray.length, thisMonth, lastMonth, older };
  }, [displayedResidentUploads]);



  // Function to check if user has temporary password
  const checkTemporaryPasswordStatus = () => {
    try {
      // Only check if user is authenticated and user data is available
      if (!isAuth || !user) {
        console.log('User not authenticated, skipping temporary password check');
        return;
      }

      // Check if user has temporary password directly from user data
      const isTemp = user.isTemporaryPassword || false;
      setHasTemporaryPassword(isTemp);
      
      if (isTemp) {
        // User has temporary password, show reset popup
        console.log('Temporary password detected, opening reset dialog');
        // Set callback for when password is successfully changed
        setOnTemporaryPasswordChangeSuccess(() => refreshTemporaryPasswordStatus);
        setResetOpen(true);
      } else {
        console.log('User does not have temporary password');
      }
    } catch (error) {
      console.error('Error checking temporary password status:', error);
    }
  };

  // Function to refresh temporary password status (call this after successful password change)
  // Usage: Call this function in your reset password dialog's success callback
  // Example: onPasswordChangeSuccess={() => refreshTemporaryPasswordStatus()}
  const refreshTemporaryPasswordStatus = async () => {
    try {
      // Reload user data to get updated temporary password status
      const response = await loadMeRequest();
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
        const isTemp = response.data.user.isTemporaryPassword || false;
        setHasTemporaryPassword(isTemp);
        console.log('Temporary password status refreshed:', isTemp);
        
        // If password is no longer temporary, close the dialog
        if (!isTemp) {
          setResetOpen(false);
        }
      }
    } catch (error) {
      console.error('Error refreshing temporary password status:', error);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-white p-2">
        <div className={`container mx-auto space-y-4 px-4 sm:px-6 lg:px-8 ${user?.role === 'resident' ? 'mt-8' : ''}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 relative min-h-[120px] sm:min-h-[140px]">
            <div className="flex items-center gap-4">
              {/* Home Icon */}
              <Button
                onClick={() => router.push('../')}
                className="bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 rounded-full p-3 flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 hover:border-gray-300 w-11 h-11 md:ml-0 -ml-2"
                title="Go to Home"
              >
                <Home style={{ width: '18px', height: '18px', strokeWidth: '2' }} />
              </Button>

              {user?.role === "landlord" && (
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
              )}
            </div>

            {/* Center positioned dashboard and image - fixed position */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center flex-col z-10">
              {user?.role === "resident" ? (
                <>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mt-8 sm:mt-12">Videodesk</h1>
                  <div className="text-base sm:text-lg mt-1 font-semibold">Resident Portal</div>
                </>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mt-8 sm:mt-12">Dashboard</h1>
                </>
              )}
              <div className="mt-0 flex items-center justify-center" style={{ minHeight: '7rem', height: '7rem' }}>
                {viewMode === 'archived' ? (
                  <span className="text-3xl font-bold text-blue-600 flex items-center justify-center h-full">Archive View</span>
                ) : viewMode === 'trash' ? (
                  <span className="text-3xl font-bold text-red-600 flex items-center justify-center h-full">Trash View</span>
                ) : isInSearchMode ? (
                  <span className="text-3xl font-bold text-purple-600 flex items-center justify-center h-full">Search View</span>
                ) : (
                  <img src="/devices.svg" alt="Videodesk" className="w-40 sm:w-48 lg:w-60 h-full object-contain -mt-13 sm:mt-0" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">              {/* Trash Button */}
              {user?.role === "landlord" && (
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
                          <li>You can <b>RESTORE</b> records before 10 days to retain them.</li>
                        </ul>
                      </span>
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-0 h-0 border-l-6 border-r-6 border-b-6 border-l-transparent border-r-transparent border-b-blue-50"></span>
                    </span>
                  </span>
                )}
              </Button>
              )}
              {/* Archive Icon Button */}
              {user?.role === "landlord" && (
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
              )}

              {user?.role === "landlord" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className={"bg-amber-500 text-white rounded-3xl flex items-center gap-2 text-xl"}>Actions <img src="/icons/arrow-down.svg" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className={'bg-white border-none shadow-sm'}>
                  <DropdownMenuItem className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                    <button className='w-full text-left bg-none border-none cursor-pointer hover:text-gray-700 transition-colors duration-200' onClick={handleLogout}>Logout</button>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="bg-blue-50 text-blue-700 font-medium cursor-default">
                    <span className='w-full text-left cursor-default'>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                    <button className='w-full text-left bg-none border-none cursor-pointer hover:text-gray-700 transition-colors duration-200' onClick={() => setTickerOpen(true)}>Raise Support Ticket</button>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                    <button className='w-full text-left bg-none border-none cursor-pointer hover:text-gray-700 transition-colors duration-200' onClick={() => setViewTicketsOpen(true)}>View Existing Support Tickets</button>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                    <button 
                      className={`w-full text-left bg-none border-none cursor-pointer hover:text-gray-700 transition-colors duration-200 ${hasTemporaryPassword ? 'text-red-600 font-semibold' : ''}`} 
                      onClick={() => setResetOpen(true)}
                    >
                      {hasTemporaryPassword ? (
                        <>
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          Change Temporary Password
                        </>
                      ) : (
                        'Reset Password'
                      )}
                    </button>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                    <button className='w-full text-left bg-none border-none cursor-pointer hover:text-gray-700 transition-colors duration-200' onClick={() => setInviteOpen(true)}>Invite Coworkers</button>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                    <button className='w-full text-left bg-none border-none cursor-pointer hover:text-gray-700 transition-colors duration-200' onClick={() => setMessageOpen(true)}>Amend Message</button>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                    <button className='w-full text-left bg-none border-none cursor-pointer hover:text-gray-700 transition-colors duration-200' onClick={() => setLandlordDialogOpen(true)}>Add Landlord Name/Logo/ <br />Profile Image </button>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                    <button className='bg-none border-none cursor-pointer hover:text-gray-700 transition-colors duration-200' onClick={() => setFaqOpen(true)}>FAQs</button>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                    <button className='bg-none border-none cursor-pointer hover:text-gray-700 transition-colors duration-200' onClick={() => setFeedbackOpen(true)}>Give Feedback</button>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                    <button className='bg-none border-none cursor-pointer hover:text-gray-700 transition-colors duration-200' onClick={() => setVideoGuidesOpen(true)}>How to Video Guides</button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              )}
              {/* Resident Upload Button */}
              {user?.role === "resident" && (
                <>
                  {/* Desktop View */}
                  <div className="hidden md:flex items-center gap-3">
                    <button
                      className="p-3 transition-all duration-200 flex items-center justify-center cursor-pointer"
                      style={{ marginRight: '0.25rem' }}
                      title="Notifications"
                      onClick={() => setShowNotificationPopup(true)}
                    >
                      <span className="relative inline-block">
                        <Bell className="w-6 h-6 text-blue-600 hover:text-blue-700" />
                        {hasNotifications && (
                          <span
                            className="absolute bg-red-600 rounded-full animate-pulse border-2 border-white shadow"
                            style={{ width: '0.7rem', height: '0.7rem', top: '-3px', right: '0px', boxShadow: '0 0 4px 1px rgba(255,0,0,0.4)' }}
                          />
                        )}
                      </span>
                    </button>
                    <Button
                      className="bg-amber-500 hover:bg-amber-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-medium cursor-pointer text-base sm:text-lg border-0"
                      onClick={() => router.push('/room/upload')}
                    >
                      + New Share Code
                    </Button>
                    <Button
                      className="bg-red-500 hover:bg-red-600 text-white p-3 sm:p-4 rounded-full font-medium cursor-pointer border-0"
                      onClick={handleLogout}
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  {/* Mobile View - Dropdown Menu */}
                  <div className="md:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="bg-amber-500 text-white rounded-full p-3 md:mr-0 -mr-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-white border-none shadow-sm min-w-[200px]" side="bottom" align="end">
                        <DropdownMenuItem>
                          <button 
                            className="bg-none border-none cursor-pointer w-full text-left flex items-center gap-2" 
                            onClick={() => router.push('/room/upload')}
                          >
                            <Plus className="w-4 h-4" />
                            New Share Link
                          </button>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <button 
                            className="bg-none border-none cursor-pointer w-full text-left flex items-center gap-2 text-red-600" 
                            onClick={handleLogout}
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User Profile and Launch Button */}
          <div className="flex items-center">
            <div className="flex items-start gap-2 bg-white p-3 sm:p-4 flex-col">
              <div className="flex items-center gap-3 mb-6">
                {userLoading ? (
                  <>
                    {user?.role === "landlord" && (
                    <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                    )}
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-12"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                    </div>
                  </>
                ) : (
                  <>
                    {user?.role === "landlord" && (
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
                    )}
                    <div>
                      <p className="text-sm text-gray-600">{user?.role === "landlord" ? "Hello," : "Welcome Back"}</p>
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

              {user?.role === "landlord" && (
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
              )}
            </div>
          </div>
          {/* Colored Blocks Row */}
          <div className="bg-white p-4 sm:p-5 rounded-xl shadow-md overflow-x-auto mt-6">
            {user?.role === "landlord" && (
              <>
                {/* Gmail-style Header with Actions - Fixed height to prevent layout shift */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 h-12">
                  {/* Left: Select All, Selection Info, Bulk Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
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
                        {viewMode === 'trash' 
                          ? `${filteredMeetings.length} ${filteredMeetings.length === 1 ? 'item' : 'items'} (${getTrashedFolders().length} folders, ${meetings.filter(m => m.deleted).length} records)`
                          : viewMode === 'archived'
                            ? selectedFolder !== 'all'
                              ? `${meetings.filter(m => meetingFolders[m._id] === selectedFolder).length} Record${meetings.filter(m => meetingFolders[m._id] === selectedFolder).length === 1 ? '' : 's'} in Folder`
                              : `${meetings.length} Record${meetings.length === 1 ? '' : 's'} in Archive`
                            : `${meetings.length} ${meetings.length === 1 ? 'meeting' : 'meetings'}`
                        }
                      </span>
                    )}
                    {/* Clear Search Button - Show when in search mode */}
                    {isInSearchMode && (
                      <button
                        onClick={() => {
                          setIsInSearchMode(false);
                          setSearchFields({
                            first_name: '', last_name: '', house_name_number: '', 
                            flat_apartment_room: '', street_road: '', city: '', 
                            country: '', post_code: '', phone_number: '', 
                            repair_detail: '', special_notes: '', target_time: '', 
                            reference: '', date_from: '', date_to: '', email: ''
                          });
                          fetchMeetings();
                        }}
                        className="text-purple-600 hover:text-purple-800 text-sm flex items-center gap-1 hover:bg-purple-50 px-2 py-1 rounded border border-purple-200"
                        title="Clear search and show all meetings"
                      >
                        <X className="w-4 h-4" />
                        <span>Clear Search</span>
                      </button>
                    )}
                  </div>
                  {/* Right: Colored Small Boxes (replacing search/date filters) */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                    <div className="flex gap-2">
                      <div className="w-[70px] h-6 rounded-md bg-sky-400" />
                      <div className="w-[70px] h-6 rounded-md bg-red-500" />
                      <div className="w-[70px] h-6 rounded-md bg-green-500" />
                      <div className="w-[70px] h-6 flex items-center justify-center rounded-md bg-yellow-300 border border-yellow-400 cursor-pointer" onClick={() => setShowSearchModal(true)}>
                        <Search className="w-4 h-4 mr-1" />
                        <span className="text-xs font-semibold text-black">{getSearchButtonText()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Archive Folders UI - only show in archive view */}
                {viewMode === 'archived' && (
                  <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        className={`px-3 py-1 rounded-full text-sm font-semibold border ${selectedFolder === 'all' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-300'} transition`}
                        onClick={() => setSelectedFolder('all')}
                      >
                        All
                      </button>
                      {folders.filter(f => !f.trashed).map(folder => (
                        <div key={folder.id} className="flex items-center gap-1">
                          {renamingFolderId === folder.id ? (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (!renameFolderName.trim()) return;
                                setUpdateFolderLoading(folder.id);
                                try {
                                  await updateFolderRequest(folder.id, renameFolderName.trim());
                                  await loadFolders();
                                  setRenamingFolderId(null);
                                  setRenameFolderName('');
                                  toast.success('Folder renamed successfully');
                                    } catch (error) {
      toast.error('Failed to rename folder');
    } finally {
                                  setUpdateFolderLoading(null);
                                }
                              }}
                              className="flex items-center gap-1"
                            >
                              <input
                                type="text"
                                value={renameFolderName}
                                onChange={e => setRenameFolderName(e.target.value)}
                                placeholder="Rename folder"
                                className="px-4 py-2 rounded-lg border border-purple-300 text-sm bg-purple-50 focus:bg-white focus:border-purple-500 focus:shadow-lg focus:outline-none transition-all duration-200 w-48 shadow-sm"
                                style={{ minWidth: 120, maxWidth: 220 }}
                                autoFocus
                                disabled={updateFolderLoading === folder.id}
                                onKeyDown={e => {
                                  if (e.key === 'Escape') {
                                    setRenamingFolderId(null);
                                    setRenameFolderName('');
                                  }
                                }}
                              />
                              <button type="submit" className="text-green-600 hover:text-green-800" disabled={updateFolderLoading === folder.id}>
                                {updateFolderLoading === folder.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                              </button>
                              <button type="button" className="text-gray-400 hover:text-red-600" onClick={() => { setRenamingFolderId(null); setRenameFolderName(''); }}><X className="w-5 h-5" /></button>
                            </form>
                          ) : (
                            <div
                              className={`px-3 py-1 rounded-full text-sm font-semibold border ${selectedFolder === folder.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-300'} transition flex items-center gap-1 hover:shadow-md`}
                              onClick={() => setSelectedFolder(folder.id)}
                              onDoubleClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setRenamingFolderId(folder.id);
                                setRenameFolderName(folder.name);
                              }}
                              style={{ position: 'relative', userSelect: 'none' }}
                              title="Click to select, Double-click to rename"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.cursor = 'pointer';
                              }}
                              tabIndex={0}
                              role="button"
                            >
                              {folder.name}
                              <span
                                className="ml-1 text-gray-400 hover:text-red-600 cursor-pointer flex items-center"
                                title="Delete folder"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFolderToDelete(folder);
                                  setShowFolderDeleteDialog(true);
                                }}
                              >
                                {deleteFolderLoading === folder.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Folder create button and input */}
                      {showFolderInput ? (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!newFolderName.trim()) return;
                            setCreateFolderLoading(true);
                            try {
                              await createFolderRequest(newFolderName.trim());
                              await loadFolders();
                              setNewFolderName('');
                              setShowFolderInput(false);
                              toast.success('Folder created successfully');
                                } catch (error) {
      toast.error('Failed to create folder');
    } finally {
                              setCreateFolderLoading(false);
                            }
                          }}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="text"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            placeholder="Type name of new folder here"
                            className="px-4 py-2 rounded-lg border border-purple-300 text-sm bg-purple-50 focus:bg-white focus:border-purple-500 focus:shadow-lg focus:outline-none transition-all duration-200 w-64 shadow-sm"
                            style={{ minWidth: 180, maxWidth: 260 }}
                            autoFocus
                            disabled={createFolderLoading}
                          />
                          <button type="submit" className="text-green-600 hover:text-green-800" disabled={createFolderLoading}>
                            {createFolderLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                          </button>
                          <button type="button" className="text-gray-400 hover:text-red-600" onClick={() => { setShowFolderInput(false); setNewFolderName(''); }}><X className="w-5 h-5" /></button>
                        </form>
                      ) : (
                        <button
                          className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border bg-white text-purple-700 border-purple-300 hover:bg-purple-100 transition"
                          onClick={() => setShowFolderInput(true)}
                          type="button"
                        >
                          <Plus className="w-4 h-4" /> Create New Folder
                        </button>
                      )}
                    </div>
                    {selectedFolder !== 'all' && (
                      <div className="text-xs text-purple-700 font-medium">Showing: {folders.find(f => f.id === selectedFolder)?.name || ''}</div>
                    )}
                  </div>
                )}

                {/* Trash View Info - Only show in trash view */}
                {viewMode === 'trash' && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-red-700">Trash View</span>
                      <span className="text-xs text-red-600">Showing both trashed folders and individual records</span>
                    </div>
                  </div>
                )}

                <table className="min-w-full text-left text-xs sm:text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="h-14 align-middle">
                      <th className="px-4 py-2 font-semibold text-black text-left w-1/3 h-14 align-middle">
                        {viewMode === 'trash' ? 'Name/Address' : 'Resident name and address'}
                      </th>
                      <th className="px-4 py-2 font-semibold text-black text-left w-1/3 h-14 align-middle">
                        {viewMode === 'trash' ? 'Details' : 'Video Link'}
                      </th>
                      <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">
                        Time and Date
                      </th>
                      <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle whitespace-nowrap">
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
                      {viewMode === 'archived' && (
                        <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle whitespace-nowrap">Folder Location</th>
                      )}
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
                          {viewMode === 'archived' && (
                            <td className="px-4 py-3 w-1/6">
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (selectedFolder !== 'all' && viewMode === 'archived' && filteredMeetings.length === 0) ? (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-gray-500 align-middle" style={{ height: '72px' }}>
                          This folder has no records yet
                        </td>
                      </tr>
                    ) : filteredMeetings.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-gray-500 align-middle" style={{ height: '72px' }}>
                          {viewMode === 'archived'
                            ? 'No archived meetings found.'
                            : viewMode === 'trash'
                              ? 'No trashed items found.'
                              : 'No meetings found. Create your first video link to get started!'}
                        </td>
                      </tr>
                    ) : (
                      currentMeetings.map((item, index) => {
                        const actualIndex = indexOfFirstItem + index;
                        

                        
                        // Handle folders in trash view
                        if (viewMode === 'trash' && item.isFolder) {
                          const folder = item.folder;
                          const { time, date } = formatMeetingDate(folder.createdAt);
                          return (
                            <tr key={item._id} className="hover:bg-gray-50 border-b group">
                              <td className="px-4 py-3 w-1/3">
                                <div className="flex items-start gap-2">
                                  <span className="flex-shrink-0">{actualIndex + 1}.</span>
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="break-words font-medium">{folder.name}</span>
                                    <span className="bg-red-200 text-red-700 px-2 py-1 rounded-full text-xs flex-shrink-0">
                                      Trashed Folder
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 w-1/3">
                                <span className="text-gray-700 font-medium">
                                  {item.recordCount} records
                                </span>
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
                                    title="Restore Folder"
                                    onClick={async () => {
                                      try {
                                        const response = await restoreFolderFromTrashRequest(folder.id);
                                        await loadFolders();
                                        await fetchMeetings(false);
                                        await loadMeetingFolders();
                                        // Calculate the actual number of records in the folder
                                        const recordsInFolder = Object.values(meetingFolders).filter(folderId => String(folderId) === String(folder.id)).length;
                                        toast.success(`Folder "${folder.name}" and ${recordsInFolder} records restored successfully`);
                                          } catch (error) {
      toast.error("Failed to restore folder");
    }
                                    }}
                                    className="hover:bg-green-50 p-1 rounded"
                                  >
                                    <Undo2 className="w-5 h-5 text-green-600" />
                                  </button>
                                  <button
                                    title="Permanently Delete Folder"
                                    onClick={() => {
                                      setFolderToDelete(folder);
                                      setShowFolderDeleteDialog(true);
                                    }}
                                    className="hover:bg-red-50 p-1 rounded"
                                  >
                                    <Trash2 className="w-5 h-5 text-red-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        
                        // Handle individual meetings (both in trash and other views)
                        const meeting = item;
                        const { time, date } = formatMeetingDate(meeting.createdAt);
                        const shareUrl = meeting.meeting_id ? generateShareUrl(meeting.meeting_id) : null;
                        const isArchived = meeting.archived || false;
                        return (
                          <tr key={meeting._id} className="hover:bg-gray-50 border-b group">
                            <td className="px-4 py-3 w-1/3">
                              <div className="flex items-start gap-2">
                                {!meeting.deleted && (
                                <input
                                  type="checkbox"
                                  checked={selectedMeetings.includes(meeting._id)}
                                  onChange={(e) => handleSelectMeeting(meeting._id, e.target.checked)}
                                  className="rounded border-gray-300 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{
                                    opacity: selectedMeetings.includes(meeting._id) ? 1 : undefined
                                  }}
                                />
                                )}
                                <span className="flex-shrink-0">{actualIndex + 1}.</span>
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="break-words">{
                                    (meeting.first_name || meeting.last_name
                                      ? `${meeting.first_name || ''} ${meeting.last_name || ''}`.trim()
                                      : meeting.name || 'Unknown Resident')
                                  }, {formatCompleteAddress(meeting)}</span>
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
                              {meeting.deleted || !meeting.meeting_id ? (
                                <span
                                  className="text-gray-400 line-through cursor-not-allowed text-left"
                                  title="Link disabled for deleted meetings"
                                >
                                  {meeting.meeting_id ? `www.Videodesk.co.uk/share/${meeting.meeting_id.substring(0, 8)}...` : 'No link available'}
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
      toast.error("Failed to restore meeting");
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
                            {viewMode === 'archived' && (
                              <td className="px-4 py-3 w-1/6">
                                <div className="flex items-center gap-2">
                                  <select
                                    value={meetingFolders[meeting._id] || ''}
                                    onChange={async (e) => {
                                      const folderId = e.target.value;
                                      try {
                                        await assignMeetingToFolderRequest(meeting._id, folderId || null);
                                        await loadMeetingFolders();
                                        toast.success(folderId ? 'Meeting assigned to folder' : 'Meeting removed from folder');
                                          } catch (error) {
      toast.error('Failed to assign meeting to folder');
    }
                                    }}
                                    className="border border-purple-300 rounded px-2 py-1 text-xs"
                                  >
                                    <option value="">No Folder</option>
                                    {folders.filter(f => !f.trashed).map(folder => (
                                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {!loading && !isActionLoading && filteredMeetings.length > 0 && (
                  <div className="flex items-center justify-between mt-6 px-4">
                    {/* Left side - Items per page selector and results info */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Show:</span>
                        <div className="relative">
                          <select
                            value={itemsPerPage}
                            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                            className="px-2 py-1 pr-8 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={30}>30</option>
                            <option value={40}>40</option>
                            <option value={50}>50</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-gray-900 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" strokeWidth={2} />
                        </div>
                        <span className="text-sm text-gray-600">per page</span>
                      </div>
                    <div className="text-sm text-gray-600">
                      Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredMeetings.length)} of {filteredMeetings.length} results
                      </div>
                    </div>

                    {/* Right side - Pagination buttons (only show if more than one page) */}
                    {filteredMeetings.length > itemsPerPage && (
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
                    )}
                  </div>
                )}
              </>
            )}
            {user?.role === "resident" && (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-0">
                  <h2 className="text-lg sm:text-xl font-bold text-blue-700 flex flex-col sm:flex-row sm:items-center">
                    <span>{residentViewMode === 'trash' ? 'Trashed Uploads' : 'Your Share Code Uploads'}</span>
                    {residentViewMode === 'active' && residentUploadStats.total > 0 && (
                      <>
                        {/* Desktop/Tablet: inline */}
                        <span className="hidden sm:inline ml-2 text-sm font-normal text-gray-600">
                          {residentUploadStats.total} in total
                          <span className="mx-2 text-gray-400">|</span>
                          {residentUploadStats.thisMonth} this month
                          <span className="mx-2 text-gray-400">|</span>
                          {residentUploadStats.lastMonth} last month
                          <span className="mx-2 text-gray-400">|</span>
                          {residentUploadStats.older} older
                        </span>
                         {/* Mobile: show full stats in a single line below title */}
                         <div className="sm:hidden mt-1 text-xs font-normal text-gray-600">
                           {residentUploadStats.total} in total
                           <span className="mx-1 text-gray-400">|</span>
                           {residentUploadStats.thisMonth} this month
                           <span className="mx-1 text-gray-400">|</span>
                           {residentUploadStats.lastMonth} last month
                           <span className="mx-1 text-gray-400">|</span>
                           {residentUploadStats.older} older
                         </div>
                      </>
                    )}
                  </h2>
                  <div className="flex items-center gap-3">
                    <Button
                      className={`${residentViewMode === 'trash' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white rounded-full px-3 sm:px-4 py-2 flex items-center gap-1 sm:gap-2 shadow transition-all duration-200`}
                      onClick={() => setResidentViewMode(residentViewMode === 'active' ? 'trash' : 'active')}
                      title={residentViewMode === 'trash' ? 'Exit Trash' : 'View Trash'}
                    >
                      <img src="/icons/trash-red.svg" className="w-3 h-3 sm:w-4 sm:h-4 filter brightness-0 invert" />
                      <span>{residentViewMode === 'trash' ? 'Exit Trash' : 'View Trash'}</span>
                    </Button>
                  </div>
                </div>
                
                {residentViewMode === 'trash' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <Trash2 className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <span className="text-sm font-semibold text-red-700">Trash View</span>
                        <span className="text-xs text-red-600 block">Showing deleted uploads. Records in Trash are PERMANENTLY DELETED after 10 days.</span>
                      </div>
                    </div>
                  </div>
                )}
                

                
                <div className="flex flex-col gap-4">
                  {(residentViewMode === 'active' ? residentUploads : residentTrashedUploads).length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      {residentViewMode === 'trash' ? 'No trashed uploads found.' : 'No uploads found.'}
                    </div>
                  ) : (
                    (residentViewMode === 'active' ? residentUploads : residentTrashedUploads).map((upload, idx) => {
                      const dateObj = new Date(upload.createdAt);
                      const formattedDate = !isNaN(dateObj) ? `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}` : upload.createdAt;
                      let formattedTime = '';
                      if (!isNaN(dateObj)) {
                        const hours = dateObj.getHours();
                        const minutes = dateObj.getMinutes();
                        const ampm = hours >= 12 ? 'pm' : 'am';
                        let displayHours = hours % 12 || 12;
                        let hourStr = '';
                        if (ampm === 'am') {
                          hourStr = String(displayHours).padStart(2, '0');
                        } else {
                          hourStr = displayHours < 10 ? ` ${displayHours}` : String(displayHours);
                        }
                        formattedTime = `${hourStr}:${String(minutes).padStart(2, '0')} ${ampm}`;
                      }
                      return (
                        <div
                          key={upload._id}
                          className={`flex flex-col sm:flex-row ${residentViewMode === 'trash' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border rounded-lg shadow-sm p-4 sm:px-6 sm:py-4 w-full items-stretch gap-4 sm:gap-0 cursor-pointer hover:shadow-md transition-all duration-200`}
                          onDoubleClick={() => handleUploadDoubleClick(upload)}
                          title="Double-click to view upload details"
                        >
                          {/* Left: Date */}
                          <div className="flex flex-col justify-center sm:min-w-[120px] sm:pr-6">
                            <span className="text-xs text-gray-500 text-left">Date</span>
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-lg text-blue-900">
                                {formattedDate}
                                {formattedTime && <span className="text-xs text-gray-500 ml-2 font-mono">{formattedTime}</span>}
                              </span>
                              <span
                                onClick={() => handleUploadDoubleClick(upload)}
                                className="mt-2 text-xs text-blue-600 hover:text-blue-800 cursor-pointer transition-colors duration-200"
                                title="View upload details"
                              >
                                View upload details
                              </span>
                            </div>
                          </div>
                          {/* Divider */}
                          <div className="hidden sm:block w-px bg-blue-200 mx-4" />
                          {/* Center: Images, Videos & Visitors */}
                          <div className="flex flex-col justify-center items-center flex-grow sm:min-w-[240px]">
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1">
                                  <ImageIcon className="w-5 h-5 text-blue-700" />
                                  <span className="font-semibold text-blue-700 text-lg">{upload.images?.length || 0}</span>
                                </div>
                                <span className="text-xs text-gray-500 mt-1">Image(s)</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1">
                                  <VideoIcon className="w-5 h-5 text-blue-700" />
                                  <span className="font-semibold text-blue-700 text-lg">{upload.videos?.length || 0}</span>
                                </div>
                                <span className="text-xs text-gray-500 mt-1">Video(s)</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1">
                                  <User className="w-5 h-5 text-blue-700" />
                                  <span className="font-semibold text-blue-700 text-lg">{upload.visitors || 0}</span>
                                </div>
                                <span className="text-xs text-gray-500 mt-1">Visitor(s)</span>
                              </div>
                            </div>
                          </div>
                          {/* Divider */}
                          <div className="hidden sm:block w-px bg-blue-200 mx-4" />
                          {/* Right: Share Code and Actions */}
                          <div className="flex flex-col justify-between items-center sm:items-end sm:min-w-[160px] mt-4 sm:mt-0">
                            <div className="flex flex-col items-center w-full mb-2">
                              <div className="flex flex-row items-center justify-center gap-2">
                                <span className="text-xs text-gray-500">Share Code</span>
                                <span className="font-mono font-bold text-lg text-blue-900 bg-blue-100 px-3 py-1 rounded-lg">{upload.accessCode}</span>
                              </div>
                              <div className="flex flex-row items-center justify-center gap-2 mt-2 w-full sm:justify-end">
                                {residentViewMode === 'active' ? (
                                  <>
                                    <button
                                      onClick={() => handleDeleteUpload(upload._id)}
                                      className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm transition-colors"
                                      title="Move to trash"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span>Delete</span>
                                    </button>
                                    <button
                                      onClick={() => setHistoryOpen(true, upload)}
                                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm transition-all duration-200 hover:scale-105"
                                      title="History"
                                    >
                                      <img src="/icons/icon-park-outline_history-query.svg" className="w-5 h-5" alt="History" />
                                      <span>History</span>
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleRestoreUpload(upload._id)}
                                      className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm transition-colors"
                                      title="Restore upload"
                                    >
                                      <ArchiveRestore className="w-4 h-4" />
                                      <span>Restore</span>
                                    </button>
                                    <button
                                      onClick={() => handlePermanentDeleteUpload(upload._id)}
                                      className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm transition-colors"
                                      title="Permanently delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
                    {/* Floating Resend Button */}
          <FloatingResendButton />
          


          </div>

        {/* Replace the old form and dialog with the new component */}
        <VideoLinkSender
          isOpen={showVideoLinkSender}
          onClose={() => setShowVideoLinkSender(false)}
          onSuccess={handleVideoLinkSuccess}
        />

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
      toast.error("Failed to permanently delete meeting");
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

        {showSearchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
            <div className="relative w-full max-w-2xl p-0 rounded-2xl border border-gray-200 shadow-2xl bg-white overflow-hidden animate-fade-in-up">
              {/* Header bar like other modals */}
              <div className="flex items-center justify-between bg-purple-500 text-white p-4 m-0 rounded-t-2xl relative sticky top-0 z-20">
                <div className="flex-1 flex items-center justify-center relative">
                  <h2 className="text-base font-semibold text-center w-full">{getSearchModalTitle()}</h2>
                  <button
                    onClick={() => setShowSearchModal(false)}
                    aria-label="Close"
                    className="absolute right-0 text-white hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* Form section */}
              <form className="space-y-3 px-6 py-4 max-h-[calc(85vh-64px)] overflow-y-auto" onSubmit={handleSearchMeetings}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input type="text" value={searchFields.first_name} onChange={e => handleSearchFieldChange('first_name', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" placeholder="First name" />
                  </div>
                  <div>
                    <input type="text" value={searchFields.last_name} onChange={e => handleSearchFieldChange('last_name', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" placeholder="Last name" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input type="text" value={searchFields.house_name_number} onChange={e => handleSearchFieldChange('house_name_number', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" placeholder="House/Building number or name" />
                  </div>
                  <div>
                    <input type="text" value={searchFields.flat_apartment_room} onChange={e => handleSearchFieldChange('flat_apartment_room', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" placeholder="Flat/Apartment/Room number" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input type="text" value={searchFields.street_road} onChange={e => handleSearchFieldChange('street_road', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" placeholder="Street/Road name" />
                  </div>
                  <div>
                    <input type="text" value={searchFields.city} onChange={e => handleSearchFieldChange('city', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" placeholder="Town/City" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input type="text" value={searchFields.country} onChange={e => handleSearchFieldChange('country', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" placeholder="County" />
                  </div>
                  <div>
                    <input type="text" value={searchFields.post_code} onChange={e => handleSearchFieldChange('post_code', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" placeholder="Postcode" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input type="text" value={searchFields.phone_number} onChange={e => handleSearchFieldChange('phone_number', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" placeholder="Phone number" />
                  </div>
                  <div>
                    <input type="text" value={searchFields.email} onChange={e => handleSearchFieldChange('email', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" placeholder="Email address" />
                  </div>
                </div>
                {/* Date range with labels */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-medium text-gray-700">From</label>
                    <input 
                      type="date" 
                      value={searchFields.date_from} 
                      onChange={e => handleSearchFieldChange('date_from', e.target.value)} 
                      className={`w-full h-14 border rounded-xl pl-4 pr-3 py-2 text-base bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none ${searchFields.date_from ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}`}
                      placeholder="Date From"
                      max={searchFields.date_to || undefined}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-medium text-gray-700">To</label>
                    <input 
                      type="date" 
                      value={searchFields.date_to} 
                      onChange={e => handleSearchFieldChange('date_to', e.target.value)} 
                      className={`w-full h-14 border rounded-xl pl-4 pr-3 py-2 text-base bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none ${searchFields.date_to ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}`}
                      placeholder="Date To"
                      min={searchFields.date_from || undefined}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input type="text" value={searchFields.reference} onChange={e => handleSearchFieldChange('reference', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" placeholder="Job ref" />
                  </div>
                  <div className="relative">
                    <select value={searchFields.target_time} onChange={e => handleSearchFieldChange('target_time', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-10 py-2 text-base bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none appearance-none shadow-sm">
                      <option value="">Target Time</option>
                      <option value="Emergency 24 Hours">Emergency 24 Hours</option>
                      <option value="Urgent (7 Days)">Urgent (7 Days)</option>
                      <option value="Routine (28 Days)">Routine (28 Days)</option>
                      <option value="Follow Up Work">Follow Up Work</option>
                      <option value="Other">Other</option>
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 drop-shadow"><ChevronDown className="w-5 h-5" /></span>
                  </div>
                </div>
                <div className="border-t border-gray-100 my-3" />
                <div>
                  <input type="text" value={searchFields.repair_detail} onChange={e => handleSearchFieldChange('repair_detail', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" placeholder="Repair details" />
                </div>
                <div className="border-t border-gray-100 my-3" />
                <div>
                  <input type="text" value={searchFields.special_notes} onChange={e => handleSearchFieldChange('special_notes', e.target.value)} className="w-full h-14 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-base bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:scale-[1.02] transition-all duration-200 outline-none" placeholder="Special notes" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  
                  <div>{/* Empty for layout symmetry */}</div>
                </div>
                <div className="border-t border-gray-100 my-3" />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-bold px-6 py-3 rounded-xl shadow-sm transition-all duration-200 outline-none focus:ring-2 focus:ring-blue-300 min-w-[160px] flex items-center justify-center gap-2" onClick={() => { 
                    setShowSearchModal(false); 
                    setSearchFields({ 
                      first_name: '', last_name: '', house_name_number: '', flat_apartment_room: '', street_road: '', city: '', country: '', post_code: '', phone_number: '', repair_detail: '', special_notes: '', target_time: '', reference: '', date_from: '', date_to: '', email: '', accessCode: '', description: '' 
                    }); 
                    setIsInSearchMode(false); 
                    if (user?.role === 'landlord') {
                      fetchMeetings();
                    } else {
                      // Reload uploads based on current view mode
                      if (residentViewMode === 'trash') {
                        getMyTrashedUploadsRequest().then(res => {
                          const uploads = res.data.data.uploads || [];
                          // Sort uploads by createdAt date (latest first)
                          const sortedUploads = uploads.sort((a, b) => {
                            const dateA = new Date(a.createdAt || a.created_at || 0);
                            const dateB = new Date(b.createdAt || b.created_at || 0);
                            return dateB - dateA; // Latest first
                          });
                          setResidentTrashedUploads(sortedUploads);
                        });
                      } else {
                        getMyUploadsRequest().then(res => {
                          const uploads = res.data.data.uploads || [];
                          // Sort uploads by createdAt date (latest first)
                          const sortedUploads = uploads.sort((a, b) => {
                            const dateA = new Date(a.createdAt || a.created_at || 0);
                            const dateB = new Date(b.createdAt || b.created_at || 0);
                            return dateB - dateA; // Latest first
                          });
                          setResidentUploads(sortedUploads);
                        });
                      }
                    }
                  }}>
                    <img src="/erase.svg" alt="Clear" className="w-5 h-5" />
                    Clear
                  </button>
                  <button type="submit" className="flex items-center gap-2 bg-yellow-300 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl shadow-md transition-all duration-200 outline-none focus:ring-2 focus:ring-yellow-400 active:scale-95 border-2 border-yellow-400 min-w-[160px]"><Search className="w-5 h-5 text-black" />Search</button>
                </div>
              </form>
            </div>
            <style>{`.animate-fade-in-up{animation:fadeInUp .4s cubic-bezier(.39,.575,.565,1) both;}@keyframes fadeInUp{0%{opacity:0;transform:translateY(40px);}100%{opacity:1;transform:translateY(0);}}`}</style>
          </div>
        )}

        {showFolderDeleteDialog && folderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-2xl p-7 w-full max-w-md border border-gray-200">
              <h2 className="text-xl font-bold text-red-600 mb-3">Move Folder to Trash?</h2>
              <p className="mb-4 text-gray-800">Are you sure you want to move the folder <span className="font-semibold">"{folderToDelete.name}"</span> to trash?</p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-5 py-2 bg-gray-100 text-gray-900 rounded-full shadow-sm hover:bg-gray-200 transition-all font-semibold"
                  onClick={() => {
                    setShowFolderDeleteDialog(false);
                    setFolderToDelete(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2 bg-red-600 text-white rounded-full shadow-sm hover:bg-red-700 transition-all font-semibold"
                  onClick={async () => {
                    setDeleteFolderLoading(folderToDelete.id);
                    
                    try {
                      // Move folder to trash using backend function
                      const response = await moveFolderToTrashRequest(folderToDelete.id);
                      
                      // Reload folders and meetings to get updated data
                      await loadFolders();
                      await fetchMeetings(false);
                      
                    // If selected, deselect
                    if (selectedFolder === folderToDelete.id) setSelectedFolder('all');
                    setDeleteFolderLoading(null);
                    setShowFolderDeleteDialog(false);
                    setFolderToDelete(null);
                      toast.success(response.data.message);
                    } catch (error) {
                      setDeleteFolderLoading(null);
                      toast.error("Failed to move folder to trash");
                    }
                  }}
                  disabled={deleteFolderLoading === folderToDelete.id}
                >
                  {deleteFolderLoading === folderToDelete.id ? 'Moving...' : 'Move to Trash'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notification Popup */}
      {showNotificationPopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-purple-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6" />
                <h2 className="text-lg font-bold">Notifications</h2>
              </div>
              <button 
                onClick={() => setShowNotificationPopup(false)}
                className="p-2 hover:bg-purple-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {/* Dynamic notifications from backend */}
                {notificationData && notificationData.map((notification, index) => (
                  <div key={notification._id || index} className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer group ${readNotifications.has(notification._id) ? 'bg-gray-50 opacity-75' : 'bg-green-50 hover:bg-green-100'}`}>
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Check className="w-3 h-3 text-green-600" />
                        <p className="font-semibold text-sm text-gray-800">Congratulations! 🎉</p>
                      </div>
                      <p className="text-xs text-gray-600">
                        Your shared information has been viewed successfully. Your Landlord/Councillor has accessed your uploaded content.
                        <br />
                        <span className="font-semibold text-blue-600">Share Code: {notification.accessCode}</span>
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-green-600">
                          {notification.firstAccessedAt ? 
                            new Date(notification.firstAccessedAt).toLocaleString() : 
                            'Just now'
                          }
                        </p>
                        <button 
                          className={`text-xs transition-colors ${readNotifications.has(notification._id) ? 'text-green-600 opacity-100' : 'text-gray-500 hover:text-green-600 opacity-0 group-hover:opacity-100'}`}
                          onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification._id); }}
                        >
                          {readNotifications.has(notification._id) ? '✓ Read' : 'Mark as read'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!notificationData || notificationData.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No notifications to show</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
              )}
        
        {/* Video Guides Dialog */}
        <VideoGuidesDialog open={videoGuidesOpen} setOpen={setVideoGuidesOpen} />
      </>
    )
}



