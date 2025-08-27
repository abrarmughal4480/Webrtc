"use client"
import { DialogComponent } from '@/components/dialogs/DialogCompnent';
import React, { createContext, useState, useContext, useRef, useEffect, useCallback, useMemo } from 'react';
import { FileText, Archive, Trash2, Monitor, Smartphone, Save, History, ArchiveRestore, ExternalLink, FileSearch, MailIcon, Loader2, LockIcon, XIcon, Link, Copy, Eye, EyeOff, ChevronLeft, ArrowLeft, ChevronRight } from "lucide-react"
import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { sendFriendLinkRequest, resetPasswordFromDashboardRequest, sendFeedbackRequest, raiseSupportTicketRequest, forgotPasswordRequest, updateLandlordInfoRequest, updateMessageSettingsRequest, getMessageSettingsRequest } from '@/http/authHttp';
import { createSupportTicket, getUserTickets, deleteAttachment, ticketUtils } from '@/http/supportTicketHttp';
import { getMeetingById } from '@/http/meetingHttp';
import { useUser } from './UserProvider';
import { toast } from 'sonner';
import CustomDialog from "@/components/dialogs/CustomDialog";
import { X } from "lucide-react";
import AdminChatScreen from '@/components/AdminChatScreen';

const DialogContext = createContext();

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

const faqs = ["What is Videodesk?", "How do I use Videodesk?", "How do I send a video link?", "Can I take videos in the call?", "Can I take screenshots in the call?", "How do I generate page links to saved videos and images?", "What does the actions button do?", "How do I provide feedback to Videodesk?", "Can Videodesk develop other solutions and apps?"];

export const DialogProvider = ({ children }) => {
  const [resetOpen, setResetOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [landlordDialogOpen, setLandlordDialogOpen] = useState(false);
  const [ticketOpen, setTickerOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [checked, setIsCheked] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [messageOption, setMessageOption] = useState('');
  const [defaultTextSize, setDefaultTextSize] = useState('14px');
  const [tailoredTextSize, setTailoredTextSize] = useState('14px');
  const [selectedButtonColor, setSelectedButtonColor] = useState('bg-green-800');

  const buttonColors = [
    { name: 'Green Light', bgClass: 'bg-green-600', hoverClass: 'hover:bg-green-700', color: '#16a34a' },
    { name: 'Blue', bgClass: 'bg-blue-800', hoverClass: 'hover:bg-blue-900', color: '#1e40af' },
    { name: 'Red', bgClass: 'bg-red-800', hoverClass: 'hover:bg-red-900', color: '#dc2626' },
    { name: 'Purple', bgClass: 'bg-purple-800', hoverClass: 'hover:bg-purple-900', color: '#7c3aed' },
    { name: 'Orange', bgClass: 'bg-orange-400', hoverClass: 'hover:bg-orange-500', color: '#fb923c' },
    { name: 'Yellow', bgClass: 'bg-yellow-500', hoverClass: 'hover:bg-yellow-600', color: '#eab308' }
  ];

  const [landlordName, setLandlordName] = useState("");
  const [landlordLogo, setLandlordLogo] = useState(null);
  const [officerImage, setOfficerImage] = useState(null);
  const [landlordLogoFile, setLandlordLogoFile] = useState(null);
  const [officerImageFile, setOfficerImageFile] = useState(null);
  const [redirectUrlDefault, setRedirectUrlDefault] = useState("www.videodesk.co.uk");
  const [redirectUrlTailored, setRedirectUrlTailored] = useState("www.");
  const [profileShape, setProfileShape] = useState("");
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState(['']);
  const { user, isAuth, setUser } = useUser();
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(`Hey, I'm using Videodesk , check it out here www.videodesk.co.uk`);
  const inviteTextareaRef = useRef(null);
  const [profileImageOption, setProfileImageOption] = useState('');
  const [redirectOption, setRedirectOption] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [landlordNameEnabled, setLandlordNameEnabled] = useState(false);
  const [landlordLogoEnabled, setLandlordLogoEnabled] = useState(false);
  const [landlordLogoUploading, setLandlordLogoUploading] = useState(false);
  const [officerImageUploading, setOfficerImageUploading] = useState(false);
  const [landlordSaving, setLandlordSaving] = useState(false);
  const [landlordDataLoaded, setLandlordDataLoaded] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [exportLoading, setExportLoading] = useState({ word: false, pdf: false, copy: false, share: false });
  const [pendingActions, setPendingActions] = useState({ deleteLandlordLogo: false, deleteOfficerImage: false });
  const [onTemporaryPasswordChangeSuccess, setOnTemporaryPasswordChangeSuccess] = useState(null);
  const [visitorAccessOpen, setVisitorAccessOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorLoading, setVisitorLoading] = useState(false);
  const visitorAccessCallbackRef = useRef(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyInterval, setHistoryInterval] = useState(null);
  const [shareLinkOpen, setShareLinkOpen] = useState(false);
  const [selectedMeetingForShare, setSelectedMeetingForShare] = useState(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [isCallbackOpen, setIsCallbackOpen] = useState(false);
  const [isMeetingOpen, setISMeetingOpen] = useState(false);
  const [hasTemporaryPassword, setHasTemporaryPassword] = useState(false);

  const [callbackFormData, setCallbackFormData] = useState({ name: '', email: '', phone: '', day: '', customDate: '', timeSlot: '', customHour: '09', customMinute: '00', message: '' });
  const [meetingFormData, setMeetingFormData] = useState({ name: '', email: '', date: '', hour: '08', minute: '00', message: '' });
  const [callbackLoading, setCallbackLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [supportCategory, setSupportCategory] = useState('');
  const [supportAttachments, setSupportAttachments] = useState([]);
  const [viewTicketsOpen, setViewTicketsOpen] = useState(false);
  const [userTickets, setUserTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [adminChatOpen, setAdminChatOpen] = useState(false);
  const [selectedTicketForChat, setSelectedTicketForChat] = useState(null);

  const supportCategories = ["Accessibility (eg. font size, button size, colour or contrast issues)", "'Actions' button issue", "Amending Message issue", "Dashboard issue", "Delete/Archive issue", "Export issue", "History issue", "Log in/Log out issue", "Payment/account queries", "Password/Security issue", "Saving videos or screenshots query", "Sending shared links to third parties", "Sending a text/email link to customers", "Uploading logo or profile image issue", "Video viewing page issue", "Any Other issue not listed above"];

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

  const handleCallbackSubmit = async (e) => {
    e.preventDefault();
    if (!callbackFormData.name || !callbackFormData.email || !callbackFormData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    setCallbackLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/request-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callbackFormData)
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Callback request sent successfully!");
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
      } else {
        throw new Error(data.message || "Failed to send callback request");
      }
    } catch (error) {
              toast.error("Failed to send callback request");
    } finally {
      setCallbackLoading(false);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/book-demo-meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingFormData)
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Demo meeting request sent successfully!");
        setMeetingFormData({
          name: '',
          email: '',
          date: '',
          hour: '08',
          minute: '00',
          message: ''
        });
        setISMeetingOpen(false);
      } else {
        throw new Error(data.message || "Failed to send demo meeting request");
      }
    } catch (error) {
              toast.error("Failed to send demo meeting request");
    } finally {
      setIsLoading(false);
    }
  };

  const addEmailField = () => {
    setInviteEmails([...inviteEmails, '']);
  };

  const updateEmail = (index, value) => {
    const newEmails = [...inviteEmails];
    newEmails[index] = value;
    setInviteEmails(newEmails);
  };

  const removeEmailField = (index) => {
    if (inviteEmails.length > 1) {
      const newEmails = inviteEmails.filter((_, i) => i !== index);
      setInviteEmails(newEmails);
    }
  };

  const handleInviteCoWorkers = async () => {
    if (!isAuth) {
      toast("Please Login First", {
        description: "You need to be logged in to send invites"
      });
      return;
    }

    const validEmails = inviteEmails.filter(email => email.trim() !== '');
    if (validEmails.length === 0) {
      toast("No valid emails", {
        description: "Please enter at least one email address"
      });
      return;
    }

    setInviteLoading(true);

    try {
      // Auto-detect current website URL
      const currentUrl = `${window.location.protocol}//${window.location.host}`;
      const senderName = user?.landlordInfo?.landlordName || user.email.split('@')[0];

      // Send invite to each email
      const promises = validEmails.map(email =>
        sendFriendLinkRequest({
          fromName: senderName,
          fromEmail: user.email,
          toEmail: email,
          message: inviteMessage,
          websiteLink: currentUrl,
          // Add landlord info for personalization
          landlordName: user?.landlordInfo?.landlordName,
          senderProfile: user?.landlordInfo?.useLandlordLogoAsProfile
            ? user?.landlordInfo?.landlordLogo
            : user?.landlordInfo?.officerImage
        })
      );

      await Promise.all(promises);

      toast("Invites Sent Successfully", {
        description: `Invites sent to ${validEmails.length} co-worker(s)`
      });

      // Reset form
      setInviteEmails(['']);
      setInviteMessage(`Hey, I'm using Videodesk , check it out here www.videodesk.co.uk`);
      setInviteOpen(false);
    } catch (error) {
      toast("Failed to Send Invites", {
        description: "Please try again later"
      });
    } finally {
      setInviteLoading(false);
    }
  };
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryWord, setRecoveryWord] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPasswordTimer, setCurrentPasswordTimer] = useState(null);
  const [newPasswordTimer, setNewPasswordTimer] = useState(null);
  const [confirmPasswordTimer, setConfirmPasswordTimer] = useState(null);

  // Function to toggle password visibility with auto-hide
  const togglePasswordVisibility = (passwordType) => {
    if (passwordType === 'current') {
      if (!showCurrentPassword) {
        setShowCurrentPassword(true);
        // Clear existing timer
        if (currentPasswordTimer) {
          clearTimeout(currentPasswordTimer);
        }
        // Set new timer to hide after 4 seconds
        const timer = setTimeout(() => {
          setShowCurrentPassword(false);
        }, 4000);
        setCurrentPasswordTimer(timer);
      } else {
        setShowCurrentPassword(false);
        if (currentPasswordTimer) {
          clearTimeout(currentPasswordTimer);
          setCurrentPasswordTimer(null);
        }
      }
    } else if (passwordType === 'new') {
      if (!showNewPassword) {
        setShowNewPassword(true);
        // Clear existing timer
        if (newPasswordTimer) {
          clearTimeout(newPasswordTimer);
        }
        // Set new timer to hide after 4 seconds
        const timer = setTimeout(() => {
          setShowNewPassword(false);
        }, 4000);
        setNewPasswordTimer(timer);
      } else {
        setShowNewPassword(false);
        if (newPasswordTimer) {
          clearTimeout(newPasswordTimer);
          setNewPasswordTimer(null);
        }
      }
    } else if (passwordType === 'confirm') {
      if (!showConfirmPassword) {
        setShowConfirmPassword(true);
        // Clear existing timer
        if (confirmPasswordTimer) {
          clearTimeout(confirmPasswordTimer);
        }
        // Set new timer to hide after 4 seconds
        const timer = setTimeout(() => {
          setShowConfirmPassword(false);
        }, 4000);
        setConfirmPasswordTimer(timer);
      } else {
        setShowConfirmPassword(false);
        if (confirmPasswordTimer) {
          clearTimeout(confirmPasswordTimer);
          setConfirmPasswordTimer(null);
        }
      }
    }
  };

  // Cleanup timers when modal is closed or component unmounts
  useEffect(() => {
    if (!resetOpen) {
      // Clear all password visibility timers when reset modal is closed
      if (currentPasswordTimer) {
        clearTimeout(currentPasswordTimer);
        setCurrentPasswordTimer(null);
      }
      if (newPasswordTimer) {
        clearTimeout(newPasswordTimer);
        setNewPasswordTimer(null);
      }
      if (confirmPasswordTimer) {
        clearTimeout(confirmPasswordTimer);
        setConfirmPasswordTimer(null);
      }
      // Reset all password visibility states
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [resetOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentPasswordTimer) clearTimeout(currentPasswordTimer);
      if (newPasswordTimer) clearTimeout(newPasswordTimer);
      if (confirmPasswordTimer) clearTimeout(confirmPasswordTimer);
    };
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!isAuth) {
      toast("Please Login First", {
        description: "You need to be logged in to reset password"
      });
      return;
    }

    // For temporary password change, current password is not required
    if (!hasTemporaryPassword && !currentPassword) {
      toast("Current password required", {
        description: "Please enter your current password"
      });
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast("New password fields required", {
        description: "Please fill in all required fields"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast("Passwords don't match", {
        description: "New password and confirm password must match"
      });
      return;
    }

    // For temporary password change, skip current password comparison
    if (!hasTemporaryPassword && currentPassword === newPassword) {
      toast("Passwords must be different", {
        description: "New password must be different from current password"
      });
      return;
    }

    if (newPassword.length < 8) {
      toast("Password too short", {
        description: "Password must be at least 8 characters long"
      });
      return;
    }

    setResetLoading(true);

    try {
      // For temporary password change, we might need a different API or handle differently
      const requestData = {
        newPassword,
        confirmPassword,
        recoveryWord
      };
      
      // Only add currentPassword if it's not a temporary password change
      if (!hasTemporaryPassword) {
        requestData.currentPassword = currentPassword;
      }
      
      const res = await resetPasswordFromDashboardRequest(requestData);

      toast(hasTemporaryPassword ? "Temporary Password Changed Successfully" : "Password Updated Successfully", {
        description: hasTemporaryPassword ? "Your temporary password has been changed to a permanent one" : "Your password has been updated successfully"
      });

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setRecoveryWord('');
      setResetOpen(false);
      
      // If this was a temporary password change, refresh the status
      if (hasTemporaryPassword && onTemporaryPasswordChangeSuccess) {
        onTemporaryPasswordChangeSuccess();
      }
    } catch (error) {
      toast("Failed to Update Password", {
        description: "Please try again later"
      });
    } finally {
      setResetLoading(false);
    }
  };

  const [feedbackText, setFeedbackText] = useState('');
  const [supportQuery, setSupportQuery] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);

  const handleSendFeedback = async (e) => {
    e.preventDefault();

    if (!isAuth) {
      toast("Please Login First", {
        description: "You need to be logged in to send feedback"
      });
      return;
    }

    if (!feedbackText.trim()) {
      toast("Feedback Required", {
        description: "Please enter your feedback"
      });
      return;
    }

    setFeedbackLoading(true);

    try {
      const res = await sendFeedbackRequest({
        feedback: feedbackText
      });

      toast("Feedback Sent Successfully", {
        description: "Thank you for your feedback!"
      });

      setFeedbackText('');
      setFeedbackOpen(false);
    } catch (error) {
      toast("Failed to Send Feedback", {
        description: "Please try again later"
      });
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleRaiseSupportTicket = async (e) => {
    e.preventDefault();

    if (!isAuth) {
      toast("Please Login First", {
        description: "You need to be logged in to raise support ticket"
      });
      return;
    }

    if (!supportCategory) {
      toast("Category Required", {
        description: "Please select a support category"
      });
      return;
    }

    if (!supportQuery.trim()) {
      toast("Query Required", {
        description: "Please enter your support query"
      });
      return;
    }

    setSupportLoading(true);

    try {
      const res = await createSupportTicket({
        category: supportCategory,
        subject: supportQuery.substring(0, 200), // Limit subject to 200 chars
        description: supportQuery,
        priority: 'Medium', // Default priority
        source: 'Web'
      }, supportAttachments);

      toast("Support Ticket Created", {
        description: res.message || "Your support ticket has been created successfully"
      });

      setSupportQuery('');
      setSupportCategory('');
      setSupportAttachments([]);
      setTickerOpen(false);
      
      // Refresh tickets list
      loadUserTickets();
    } catch (error) {
      toast("Failed to Create Ticket", {
        description: "Please try again later"
      });
    } finally {
      setSupportLoading(false);
    }
  };

  // File attachment handlers
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast("File size must be less than 10MB");
        return false;
      }
      return true;
    });
    
    setSupportAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index) => {
    setSupportAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const loadUserTickets = useCallback(async () => {
    if (!isAuth) return;
    
    setTicketsLoading(true);
    try {
      const res = await getUserTickets();
      setUserTickets(res.data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast("Failed to load tickets");
    } finally {
      setTicketsLoading(false);
    }
  }, [isAuth]);

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!forgotEmail.trim()) {
      toast("Email Required", {
        description: "Please enter your email address"
      });
      return;
    }

    setForgotLoading(true);

    try {
      const res = await forgotPasswordRequest({
        email: forgotEmail
      });

      toast("Reset Link Sent", {
        description: "Password reset link has been sent to your email"
      });

      setForgotEmail('');
      setForgotPasswordOpen(false);
    } catch (error) {
      toast("Failed to Send Reset Link", {
        description: "Please try again later"
      });
    } finally {
      setForgotLoading(false);
    }
  };

  // File selection handlers (only local preview, no upload)
  const handleLandlordLogoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast("File size must be less than 5MB");
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast("Please select a valid image file");
        return;
      }

      // Store file for later upload
      setLandlordLogoFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setLandlordLogo(event.target.result);
      };
      reader.readAsDataURL(file);

      // Clear any pending delete action
      setPendingActions(prev => ({ ...prev, deleteLandlordLogo: false }));
    }
  };

  const handleOfficerImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast("File size must be less than 5MB");
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast("Please select a valid image file");
        return;
      }

      // Store file for later upload
      setOfficerImageFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setOfficerImage(event.target.result);
      };
      reader.readAsDataURL(file);

      // Clear any pending delete action
      setPendingActions(prev => ({ ...prev, deleteOfficerImage: false }));
    }
  };

  // Modified deletion handlers (only local state changes, no API calls)
  const handleDeleteLandlordLogo = () => {
    // Only update local state - no API call
    setLandlordLogo(null);
    setLandlordLogoFile(null);
    setLandlordLogoEnabled(false);
    if (profileImageOption === 'landlord') {
      setProfileImageOption('');
    }

    // Mark for deletion when save is clicked
    setPendingActions(prev => ({ ...prev, deleteLandlordLogo: true }));

    toast("Landlord logo will be deleted when you save");
  };

  const handleDeleteOfficerImage = () => {
    // Only update local state - no API call
    setOfficerImage(null);
    setOfficerImageFile(null);
    setProfileImageOption('');

    // Mark for deletion when save is clicked
    setPendingActions(prev => ({ ...prev, deleteOfficerImage: true }));

    toast("Officer image will be deleted when you save");
  };

  const handleSaveLandlordInfo = async () => {
    if (!isAuth) {
      toast("Please Login First");
      return;
    }

    setLandlordSaving(true);

    try {
      let landlordLogoUrl = landlordLogo;
      let officerImageUrl = officerImage;

      // Handle pending deletions first
      if (pendingActions.deleteLandlordLogo && user?.landlordInfo?.landlordLogo) {
        console.log('🗑️ Deleting landlord logo from server...');
        const deleteResponse = await updateLandlordInfoRequest({
          type: 'deleteLandlordLogo'
        });

        if (deleteResponse.data.success) {
          console.log('✅ Landlord logo deleted from server');
          landlordLogoUrl = null;
        }
      }

      if (pendingActions.deleteOfficerImage && user?.landlordInfo?.officerImage) {
        console.log('🗑️ Deleting officer image from server...');
        const deleteResponse = await updateLandlordInfoRequest({
          type: 'deleteOfficerImage'
        });

        if (deleteResponse.data.success) {
          console.log('✅ Officer image deleted from server');
          officerImageUrl = null;
        }
      }

      // Upload landlord logo if new file selected
      if (landlordLogoEnabled && landlordLogoFile) {
        console.log('📤 Uploading new landlord logo...');
        const reader = new FileReader();
        const logoData = await new Promise((resolve) => {
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsDataURL(landlordLogoFile);
        });

        const logoResponse = await updateLandlordInfoRequest({
          type: 'landlordLogo',
          logoData
        });

        if (logoResponse.data.success) {
          landlordLogoUrl = logoResponse.data.logoUrl;
          console.log('✅ New landlord logo uploaded successfully');
        }
      }

      // Upload officer image if new file selected
      if (profileImageOption === 'officer' && officerImageFile) {
        console.log('📤 Uploading new officer image...');
        const reader = new FileReader();
        const imageData = await new Promise((resolve) => {
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsDataURL(officerImageFile);
        });

        const imageResponse = await updateLandlordInfoRequest({
          type: 'officerImage',
          imageData
        });

        if (imageResponse.data.success) {
          officerImageUrl = imageResponse.data.imageUrl;
          console.log('✅ New officer image uploaded successfully');
        }
      }

      // Save all landlord information
      const landlordData = {
        type: 'saveLandlordInfo',
        landlordName: landlordNameEnabled === 'custom' ? landlordName : landlordNameEnabled === 'default' ? 'Videodesk' : null,
        landlordLogo: landlordLogoEnabled ? landlordLogoUrl : null,
        officerImage: profileImageOption === 'officer' ? officerImageUrl : null,
        useLandlordLogoAsProfile: profileImageOption === 'landlord',
        profileShape: profileShape || null,
        redirectUrlDefault: redirectOption === 'default' ? redirectUrlDefault : null,
        redirectUrlTailored: redirectOption === 'tailored' ? redirectUrlTailored : null
      };

      const response = await updateLandlordInfoRequest(landlordData);

      if (response.data.success) {
        // Update user context with new data immediately
        console.log('🔄 Updating user context with new landlord data...');
        setUser(response.data.user);

        toast("Landlord information saved successfully");

        // Reset form state and pending actions
        setLandlordLogoFile(null);
        setOfficerImageFile(null);
        setPendingActions({ deleteLandlordLogo: false, deleteOfficerImage: false });
        setLandlordDialogOpen(false);

        // Reset form for next time
        setTimeout(() => {
          resetLandlordForm();
        }, 300);
      }
    } catch (error) {
      console.error('Error saving landlord info:', error);
      toast("Failed to save landlord information");
    } finally {
      setLandlordSaving(false);
    }
  };

  const loadLandlordData = useCallback(() => {
    if (user?.landlordInfo && !landlordDataLoaded) {
      if (user.landlordInfo.landlordName) {
        if (user.landlordInfo.landlordName === 'Videodesk') {
          setLandlordNameEnabled('default');
          setLandlordName('Videodesk');
        } else {
          setLandlordNameEnabled('custom');
          setLandlordName(user.landlordInfo.landlordName);
        }
      }
      if (user.landlordInfo.landlordLogo) {
        setLandlordLogo(user.landlordInfo.landlordLogo);
        setLandlordLogoEnabled(true);
      }
      if (user.landlordInfo.officerImage) {
        setOfficerImage(user.landlordInfo.officerImage);
        setProfileImageOption('officer');
      }
      if (user.landlordInfo.useLandlordLogoAsProfile) setProfileImageOption('landlord');
      if (user.landlordInfo.profileShape) setProfileShape(user.landlordInfo.profileShape);
      if (user.landlordInfo.redirectUrlDefault && user.landlordInfo.redirectUrlDefault !== 'www.videodesk.co.uk') {
        setRedirectUrlDefault(user.landlordInfo.redirectUrlDefault);
        setRedirectOption('default');
      }
      if (user.landlordInfo.redirectUrlTailored && user.landlordInfo.redirectUrlTailored !== 'www.') {
        setRedirectUrlTailored(user.landlordInfo.redirectUrlTailored);
        setRedirectOption('tailored');
      }
      setLandlordDataLoaded(true);
    }
  }, [user?.landlordInfo, landlordDataLoaded]);

  const resetLandlordForm = useCallback(() => {
    setLandlordName("");
    setLandlordNameEnabled(false);
    setLandlordLogo(null);
    setOfficerImage(null);
    setLandlordLogoFile(null);
    setOfficerImageFile(null);
    setRedirectUrlDefault("www.videodesk.co.uk");
    setRedirectUrlTailored("www.");
    setProfileShape("");
    setLandlordLogoEnabled(false);
    setProfileImageOption('');
    setRedirectOption('');
    setLandlordDataLoaded(false);
    setPendingActions({ deleteLandlordLogo: false, deleteOfficerImage: false });
  }, []);

  const handleTextareaFocus = useCallback(() => {
    if (inviteTextareaRef.current && inviteMessage === `Hey, I'm using Videodesk , check it out here www.videodesk.co.uk`) {
      const textarea = inviteTextareaRef.current;
      textarea.focus();
      textarea.setSelectionRange(inviteMessage.length, inviteMessage.length);
    }
  }, [inviteMessage]);

  useEffect(() => {
    if (inviteOpen) {
      const timer = setTimeout(handleTextareaFocus, 100);
      return () => clearTimeout(timer);
    }
  }, [inviteOpen, handleTextareaFocus]);

  const [initialMeetingId, setInitialMeetingId] = useState(null);

  useEffect(() => {
    if (historyOpen && selectedItemForHistory && (selectedItemForHistory._id || selectedItemForHistory.accessCode)) {
      if (selectedItemForHistory.meeting_id) {
        const fetchHistoryDataSilent = async () => {
          try {
            const response = await getMeetingById(selectedItemForHistory._id);
            if (response.data.success && response.data.data && response.data.data.meeting) {
              setSelectedItemForHistory(response.data.data.meeting);
            }
          } catch (error) {
            console.error('Error fetching history data:', error);
          }
        };

        const fetchHistoryDataWithLoading = async () => {
          try {
            setHistoryLoading(true);
            const response = await getMeetingById(selectedItemForHistory._id);
            if (response.data.success && response.data.data && response.data.data.meeting) {
              setSelectedItemForHistory(response.data.data.meeting);
            }
          } catch (error) {
            console.error('Error fetching history data:', error);
          } finally {
            setHistoryLoading(false);
          }
        };

        if (!historyInterval || selectedItemForHistory._id !== initialMeetingId) {
          if (historyInterval) clearInterval(historyInterval);
          setInitialMeetingId(selectedItemForHistory._id);
          fetchHistoryDataWithLoading();
          const interval = setInterval(fetchHistoryDataSilent, 5000);
          setHistoryInterval(interval);
        }
      } else if (selectedItemForHistory.accessCode) {
        setHistoryLoading(false);
      }
    } else if (!historyOpen) {
      if (historyInterval) {
        clearInterval(historyInterval);
        setHistoryInterval(null);
      }
      if (initialMeetingId) setInitialMeetingId(null);
    }
  }, [historyOpen, selectedItemForHistory?._id, historyInterval, initialMeetingId]);

  useEffect(() => {
    return () => {
      if (historyInterval) clearInterval(historyInterval);
    };
  }, [historyInterval]);

  const getInitials = useCallback((name) => {
    if (!name) return 'U';
    const words = name.trim().split(' ').filter(word => word.length > 0);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    if (words.length >= 2) return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    return name.charAt(0).toUpperCase();
  }, []);

  const generateShareLink = useCallback((meetingId) => {
    const baseUrl = window.location.origin;
    let shareUrl = `${baseUrl}/share/${meetingId}`;
    const urlParams = new URLSearchParams();
    if (user?.landlordInfo?.landlordName) urlParams.append('senderName', encodeURIComponent(user.landlordInfo.landlordName));
    if (user?.landlordInfo?.useLandlordLogoAsProfile && user?.landlordInfo?.landlordLogo) {
      urlParams.append('senderProfile', encodeURIComponent(user.landlordInfo.landlordLogo));
      urlParams.append('profileType', 'logo');
      if (user?.landlordInfo?.profileShape) urlParams.append('profileShape', user.landlordInfo.profileShape);
    } else if (user?.landlordInfo?.officerImage) {
      urlParams.append('senderProfile', encodeURIComponent(user.landlordInfo.officerImage));
      urlParams.append('profileType', 'officer');
      if (user?.landlordInfo?.profileShape) urlParams.append('profileShape', user.landlordInfo.profileShape);
    }
    const paramString = urlParams.toString();
    if (paramString) shareUrl += `?${paramString}`;
    return shareUrl;
  }, [user?.landlordInfo]);

  // Open email client with pre-filled content (no clipboard copy)
  const handleCopyLink = async () => {
    if (!selectedMeeting) {
      toast.error("No meeting selected for export");
      return;
    }

    setExportLoading(prev => ({ ...prev, copy: true }));

    const shareLink = generateShareLink(selectedMeeting.meeting_id);

    // Prepare email content with sender info
    const senderName = user?.landlordInfo?.landlordName || user?.email?.split('@')[0] || 'Landlord';
    const emailSubject = `Meeting Report from ${senderName} - ${selectedMeeting.name || 'Repair Meeting'}`;
    const emailBody = `Hi,

${senderName} has shared a meeting report with you.

Meeting Details:
Meeting ID: ${selectedMeeting.meeting_id}
Resident Name: ${selectedMeeting.name || 'N/A'}${selectedMeeting.address_line_1 ? `
Address Line 1: ${selectedMeeting.address_line_1}` : ''}${selectedMeeting.address_line_2 ? `
Address Line 2: ${selectedMeeting.address_line_2}` : ''}${selectedMeeting.address_line_3 ? `
Address Line 3: ${selectedMeeting.address_line_3}` : ''}${selectedMeeting.additional_address_lines && selectedMeeting.additional_address_lines.length > 0 ? selectedMeeting.additional_address_lines.filter(line => line && line.trim()).map((line, index) => `
Address Line ${index + 4}: ${line}`).join('') : ''}
Post Code: ${selectedMeeting.post_code || 'N/A'}${selectedMeeting.phone_number ? `
Phone Number: ${selectedMeeting.phone_number}` : ''}${selectedMeeting.reference ? `
Reference: ${selectedMeeting.reference}` : ''}
Repair Details: ${selectedMeeting.repair_detail || 'N/A'}${selectedMeeting.work_details && selectedMeeting.work_details.length > 0 ? `

Work Details:${selectedMeeting.work_details.map((work, index) => `
Work Item ${index + 1}: ${work.detail || 'N/A'}${work.target_time ? `
Target Time: ${work.target_time}` : ''}${work.timestamp ? `
Added: ${new Date(work.timestamp).toLocaleString()}` : ''}`).join('')}` : ''}${selectedMeeting.special_notes ? `

Special Notes:
${selectedMeeting.special_notes}` : ''}
Date Created: ${new Date(selectedMeeting.createdAt).toLocaleDateString()}

You can view the complete meeting content including recordings and screenshots using this link:
${shareLink}

Best regards,
${senderName}`;

    try {
      // Create mailto link with pre-filled content
      const mailtoLink = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

      // Open email client
      const emailWindow = window.open(mailtoLink, '_blank');

      // Check if email client opened successfully
      if (emailWindow) {
        toast.success("Email client opened with meeting details!");
      } else {
        // Fallback if popup was blocked
        window.location.href = mailtoLink;
        toast.success("Opening email client...");
      }

    } catch (error) {
      console.error('Failed to open email client:', error);
      // Ultimate fallback - show alert with email content
      window.alert(`Please copy this information to your email:\n\nSubject: ${emailSubject}\n\nBody:\n${emailBody}`);
      toast.error("Please copy the information manually to your email");
    } finally {
      setExportLoading(prev => ({ ...prev, copy: false }));
    }
  };

  // Generate PDF document with ultra-high quality
  const handleGeneratePDF = async () => {
    if (!selectedMeeting) {
      toast.error("No meeting selected for export");
      return;
    }

    setExportLoading(prev => ({ ...prev, pdf: true }));

    try {
      // Import jsPDF dynamically
      const jsPDF = (await import('jspdf')).jsPDF;

      const pdf = new jsPDF();
      let yPosition = 20;

      // Title with sender info
      const senderName = user?.landlordInfo?.landlordName || user?.email?.split('@')[0] || 'Landlord';
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Meeting Report from ${senderName}`, 20, yPosition);
      yPosition += 20;

      // Meeting Info
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');

      const addLine = (label, value) => {
        // Check if we need a new page
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFont(undefined, 'bold');
        pdf.text(label, 20, yPosition);
        pdf.setFont(undefined, 'normal');

        // Handle long text by splitting it
        const maxWidth = 120;
        const lines = pdf.splitTextToSize(value || 'N/A', maxWidth);
        pdf.text(lines, 70, yPosition);
        yPosition += lines.length * 7;
      };

      addLine('Shared by:', senderName);
      addLine('Meeting ID:', selectedMeeting.meeting_id);
      addLine('Resident Name:', selectedMeeting.name);

      // Add individual address lines if they exist
      if (selectedMeeting.address_line_1) {
        addLine('Address Line 1:', selectedMeeting.address_line_1);
      }
      if (selectedMeeting.address_line_2) {
        addLine('Address Line 2:', selectedMeeting.address_line_2);
      }
      if (selectedMeeting.address_line_3) {
        addLine('Address Line 3:', selectedMeeting.address_line_3);
      }

      // Add additional address lines if they exist
      if (selectedMeeting.additional_address_lines && selectedMeeting.additional_address_lines.length > 0) {
        selectedMeeting.additional_address_lines.forEach((line, index) => {
          if (line && line.trim()) {
            addLine(`Address Line ${index + 4}:`, line);
          }
        });
      }

      addLine('Post Code:', selectedMeeting.post_code);

      // Add phone number if it exists
      if (selectedMeeting.phone_number) {
        addLine('Phone Number:', selectedMeeting.phone_number);
      }

      // Add reference if it exists
      if (selectedMeeting.reference) {
        addLine('Reference:', selectedMeeting.reference);
      }

      addLine('Repair Details:', selectedMeeting.repair_detail);

      // Add work details if they exist
      if (selectedMeeting.work_details && selectedMeeting.work_details.length > 0) {
        yPosition += 5;
        pdf.setFont(undefined, 'bold');
        pdf.text('Work Details:', 20, yPosition);
        yPosition += 7;

        selectedMeeting.work_details.forEach((work, index) => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.setFont(undefined, 'bold');
          pdf.text(`Work Item ${index + 1}:`, 25, yPosition);
          yPosition += 7;

          pdf.setFont(undefined, 'normal');
          const workLines = pdf.splitTextToSize(work.detail || 'N/A', 115);
          pdf.text(workLines, 25, yPosition);
          yPosition += workLines.length * 7;

          if (work.target_time) {
            pdf.setFont(undefined, 'italic');
            pdf.text(`Target Time: ${work.target_time}`, 25, yPosition);
            yPosition += 7;
          }

          if (work.timestamp) {
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(10);
            pdf.text(`Added: ${new Date(work.timestamp).toLocaleString()}`, 25, yPosition);
            yPosition += 7;
            pdf.setFontSize(12);
          }

          yPosition += 3; // Extra spacing between work items
        });
      }

      // Add special notes if they exist
      if (selectedMeeting.special_notes) {
        yPosition += 5;
        pdf.setFont(undefined, 'bold');
        pdf.text('Special Notes:', 20, yPosition);
        yPosition += 7;

        pdf.setFont(undefined, 'normal');
        const notesLines = pdf.splitTextToSize(selectedMeeting.special_notes, 150);
        pdf.text(notesLines, 20, yPosition);
        yPosition += notesLines.length * 7 + 5;
      }

      addLine('Date Created:', new Date(selectedMeeting.createdAt).toLocaleDateString());
      addLine('Share Link:', generateShareLink(selectedMeeting.meeting_id));

      yPosition += 10;

      // Screenshots section with ultra-high quality (matching WebRTC approach)
      if (selectedMeeting.screenshots && selectedMeeting.screenshots.length > 0) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(16);
        pdf.text('Screenshots', 20, yPosition);
        yPosition += 15;

        for (let i = 0; i < selectedMeeting.screenshots.length; i++) {
          const screenshot = selectedMeeting.screenshots[i];

          // Check if we need a new page (increased spacing for larger images)
          if (yPosition > 100) {
            pdf.addPage();
            yPosition = 20;
          }

          try {
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'bold');
            pdf.text(`Screenshot ${i + 1}:`, 20, yPosition);
            yPosition += 10;

            // Create a promise to load and convert image with ultra-high quality (matching WebRTC)
            await new Promise((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';

              img.onload = () => {
                try {
                  // Create canvas to convert image with ultra-high quality (matching WebRTC approach)
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');

                  // Get source image dimensions
                  const sourceWidth = img.naturalWidth || img.width;
                  const sourceHeight = img.naturalHeight || img.height;

                  // Enhanced quality settings - matching WebRTC's 4x resolution approach
                  const maxDisplayWidth = 170; // Display size on PDF
                  const maxDisplayHeight = 130; // Display size on PDF

                  // Calculate aspect ratio and display dimensions
                  const aspectRatio = sourceWidth / sourceHeight;
                  let displayWidth = maxDisplayWidth;
                  let displayHeight = displayWidth / aspectRatio;

                  if (displayHeight > maxDisplayHeight) {
                    displayHeight = maxDisplayHeight;
                    displayWidth = displayHeight * aspectRatio;
                  }

                  // Set canvas size to ultra-high resolution (4x like WebRTC)
                  canvas.width = sourceWidth * 4;  // 4x resolution for extreme quality
                  canvas.height = sourceHeight * 4;

                  // Apply advanced image quality settings (matching WebRTC)
                  ctx.imageSmoothingEnabled = true;
                  ctx.imageSmoothingQuality = 'high';
                  ctx.filter = 'contrast(1.05) saturate(1.05)'; // Slightly enhance contrast and color

                  // Scale context for ultra-high resolution
                  ctx.scale(4, 4);

                  // Draw image on canvas with ultra-high quality
                  ctx.drawImage(img, 0, 0, sourceWidth, sourceHeight);

                  // Convert to base64 with maximum quality (PNG for lossless, matching WebRTC)
                  const dataURL = canvas.toDataURL('image/png', 1.0); // PNG at 100% quality

                  // Add image to PDF with calculated display dimensions
                  pdf.addImage(dataURL, 'PNG', 20, yPosition, displayWidth, displayHeight);
                  yPosition += displayHeight + 20; // Increased spacing

                  resolve();
                } catch (error) {
                  console.error('Error processing ultra-high quality image:', error);
                  // Fallback: add URL as text
                  pdf.setFont(undefined, 'normal');
                  const lines = pdf.splitTextToSize(screenshot.url, 150);
                  pdf.text(lines, 20, yPosition);
                  yPosition += lines.length * 7 + 5;
                  resolve();
                }
              };

              img.onerror = () => {
                console.error('Failed to load image:', screenshot.url);
                // Fallback: add URL as text
                pdf.setFont(undefined, 'normal');
                const lines = pdf.splitTextToSize(screenshot.url, 150);
                pdf.text(lines, 20, yPosition);
                yPosition += lines.length * 7 + 5;
                resolve();
              };

              // Add cache busting and ultra-high quality parameters
              const imageUrl = new URL(screenshot.url);
              imageUrl.searchParams.set('quality', 'ultra');
              imageUrl.searchParams.set('format', 'png');
              imageUrl.searchParams.set('resolution', '4k');
              imageUrl.searchParams.set('timestamp', Date.now().toString());
              img.src = imageUrl.toString();
            });

          } catch (imageError) {
            console.error('Failed to add ultra-high quality screenshot to PDF:', imageError);
            // Add URL as fallback
            pdf.setFont(undefined, 'normal');
            const lines = pdf.splitTextToSize(screenshot.url, 150);
            pdf.text(lines, 20, yPosition);
            yPosition += lines.length * 7 + 5;
          }
        }
      }

      // Recordings section with enhanced quality (matching WebRTC bitrate settings)
      if (selectedMeeting.recordings && selectedMeeting.recordings.length > 0) {
        // Check if we need a new page
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(16);
        pdf.text('Video Recordings', 20, yPosition);
        yPosition += 15;

        selectedMeeting.recordings.forEach((recording, index) => {
          if (yPosition > 240) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.setFontSize(12);
          pdf.setFont(undefined, 'bold');
          pdf.text(`Video Recording ${index + 1}:`, 20, yPosition);
          yPosition += 8;

          pdf.setFont(undefined, 'normal');
          pdf.text('Type: Ultra High Quality Video (VP9/VP8, 8Mbps)', 20, yPosition);
          yPosition += 8;

          pdf.text(`Duration: ${recording.duration || 0} seconds`, 20, yPosition);
          yPosition += 8;

          pdf.text('Quality: 4K Resolution, High Bitrate Encoding', 20, yPosition);
          yPosition += 8;

          // Add clickable link for video with ultra-high quality parameters
          pdf.setTextColor(0, 0, 255); // Blue color for links
          pdf.text('Click to view ultra high quality video:', 20, yPosition);
          const videoUrl = new URL(recording.url);
          videoUrl.searchParams.set('quality', 'ultra');
          videoUrl.searchParams.set('bitrate', '8000000'); // 8 Mbps like WebRTC
          videoUrl.searchParams.set('resolution', '4k');
          videoUrl.searchParams.set('codec', 'vp9');
          pdf.link(20, yPosition - 3, 80, 6, { url: videoUrl.toString() });
          yPosition += 8;

          // Add URL in smaller text
          pdf.setTextColor(0, 0, 0); // Reset to black
          pdf.setFontSize(8);
          const urlLines = pdf.splitTextToSize(videoUrl.toString(), 150);
          pdf.text(urlLines, 20, yPosition);
          yPosition += urlLines.length * 4 + 10;

          pdf.setFontSize(12); // Reset font size
        });
      }

      // Download PDF
      pdf.save(`Meeting_Report_UltraHQ_${selectedMeeting.meeting_id}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Ultra high quality PDF document downloaded successfully!");

    } catch (error) {
      console.error('Failed to generate ultra-high quality PDF:', error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setExportLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  // Generate Word document with ultra-high quality (matching WebRTC approach)
  const handleGenerateWord = async () => {
    if (!selectedMeeting) {
      toast.error("No meeting selected for export");
      return;
    }

    setExportLoading(prev => ({ ...prev, word: true }));

    try {
      // Import docx library dynamically
      const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, ExternalHyperlink } = await import('docx');

      const senderName = user?.landlordInfo?.landlordName || user?.email?.split('@')[0] || 'Landlord';

      const children = [
        // Title with sender info
        new Paragraph({
          text: `Meeting Report from ${senderName}`,
          heading: HeadingLevel.TITLE,
        }),

        // Sender info
        new Paragraph({
          children: [
            new TextRun({ text: "Shared by: ", bold: true }),
            new TextRun({ text: senderName }),
          ],
        }),

        // Meeting Info
        new Paragraph({
          children: [
            new TextRun({ text: "Meeting ID: ", bold: true }),
            new TextRun({ text: selectedMeeting.meeting_id }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Resident Name: ", bold: true }),
            new TextRun({ text: selectedMeeting.name || 'N/A' }),
          ],
        }),

        // Add individual address lines conditionally
        ...(selectedMeeting.address_line_1 ? [
          new Paragraph({
            children: [
              new TextRun({ text: "Address Line 1: ", bold: true }),
              new TextRun({ text: selectedMeeting.address_line_1 }),
            ],
          })
        ] : []),

        ...(selectedMeeting.address_line_2 ? [
          new Paragraph({
            children: [
              new TextRun({ text: "Address Line 2: ", bold: true }),
              new TextRun({ text: selectedMeeting.address_line_2 }),
            ],
          })
        ] : []),

        ...(selectedMeeting.address_line_3 ? [
          new Paragraph({
            children: [
              new TextRun({ text: "Address Line 3: ", bold: true }),
              new TextRun({ text: selectedMeeting.address_line_3 }),
            ],
          })
        ] : []),

        // Add additional address lines
        ...(selectedMeeting.additional_address_lines && selectedMeeting.additional_address_lines.length > 0 ?
          selectedMeeting.additional_address_lines.filter(line => line && line.trim()).map((line, index) =>
            new Paragraph({
              children: [
                new TextRun({ text: `Address Line ${index + 4}: `, bold: true }),
                new TextRun({ text: line }),
              ],
            })
          ) : []),

        new Paragraph({
          children: [
            new TextRun({ text: "Post Code: ", bold: true }),
            new TextRun({ text: selectedMeeting.post_code || 'N/A' }),
          ],
        }),

        // Add phone number if exists
        ...(selectedMeeting.phone_number ? [
          new Paragraph({
            children: [
              new TextRun({ text: "Phone Number: ", bold: true }),
              new TextRun({ text: selectedMeeting.phone_number }),
            ],
          })
        ] : []),

        // Add reference if exists
        ...(selectedMeeting.reference ? [
          new Paragraph({
            children: [
              new TextRun({ text: "Reference: ", bold: true }),
              new TextRun({ text: selectedMeeting.reference }),
            ],
          })
        ] : []),

        new Paragraph({
          children: [
            new TextRun({ text: "Repair Details: ", bold: true }),
            new TextRun({ text: selectedMeeting.repair_detail || 'N/A' }),
          ],
        }),

        // Add work details if they exist
        ...(selectedMeeting.work_details && selectedMeeting.work_details.length > 0 ? [
          new Paragraph({
            text: "Work Details:",
            heading: HeadingLevel.HEADING_2,
          }),
          ...selectedMeeting.work_details.flatMap((work, index) => [
            new Paragraph({
              children: [
                new TextRun({ text: `Work Item ${index + 1}: `, bold: true }),
                new TextRun({ text: work.detail || 'N/A' }),
              ],
            }),
            ...(work.target_time ? [
              new Paragraph({
                children: [
                  new TextRun({ text: "Target Time: ", bold: true }),
                  new TextRun({ text: work.target_time }),
                ],
              })
            ] : []),
            ...(work.timestamp ? [
              new Paragraph({
                children: [
                  new TextRun({ text: "Added: ", bold: true }),
                  new TextRun({ text: new Date(work.timestamp).toLocaleString() }),
                ],
              })
            ] : []),
            new Paragraph({ text: "" }) // Spacing between work items
          ])
        ] : []),

        // Add special notes if they exist
        ...(selectedMeeting.special_notes ? [
          new Paragraph({
            text: "Special Notes:",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: selectedMeeting.special_notes }),
            ],
          }),
          new Paragraph({ text: "" }) // Spacing
        ] : []),

        new Paragraph({
          children: [
            new TextRun({ text: "Date Created: ", bold: true }),
            new TextRun({ text: new Date(selectedMeeting.createdAt).toLocaleDateString() }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Share Link: ", bold: true }),
            new ExternalHyperlink({
              children: [new TextRun({ text: generateShareLink(selectedMeeting.meeting_id), style: "Hyperlink" })],
              link: generateShareLink(selectedMeeting.meeting_id),
            }),
          ],
        }),

        // Spacing
        new Paragraph({ text: "" }),
      ];

      // Add screenshots section with embedded images (NO OVERLAP)
      if (selectedMeeting.screenshots && selectedMeeting.screenshots.length > 0) {
        children.push(
          new Paragraph({
            text: "Screenshots (Ultra High Quality - 4K Resolution)",
            heading: HeadingLevel.HEADING_1,
          }),
          // Add extra spacing after main heading
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" })
        );

        for (let i = 0; i < selectedMeeting.screenshots.length; i++) {
          const screenshot = selectedMeeting.screenshots[i];

          // Add screenshot heading with proper spacing
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Screenshot ${i + 1} (Ultra High Quality):`,
                  bold: true,
                  size: 28 // Larger font size
                }),
              ],
              spacing: {
                before: 400, // Space before heading (20pt)
                after: 200,  // Space after heading (10pt)
              },
            })
          );

          try {
            // Create ultra-high quality image URL
            const imageUrl = new URL(screenshot.url);
            imageUrl.searchParams.set('quality', 'ultra');
            imageUrl.searchParams.set('format', 'png');
            imageUrl.searchParams.set('resolution', '4k');
            imageUrl.searchParams.set('enhance', 'true');
            imageUrl.searchParams.set('bitrate', 'maximum');
            imageUrl.searchParams.set('timestamp', Date.now().toString());

            // Fetch and embed the image with ultra-high quality
            const response = await fetch(imageUrl.toString());
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();

              // Embed high-quality image INLINE (NO FLOATING - prevents overlap)
              children.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: arrayBuffer,
                      transformation: {
                        width: 450, // Smaller width to fit better
                        height: 338, // Maintaining 4:3 aspect ratio
                      },
                      // NO FLOATING PROPERTIES - this prevents overlap
                    }),
                  ],
                  alignment: "center", // Center the image
                  spacing: {
                    before: 200, // Space before image (10pt)
                    after: 400,  // Space after image (20pt)
                  },
                })
              );
            } else {
              throw new Error('Failed to fetch ultra-high quality image');
            }
          } catch (imageError) {
            console.error('Failed to embed ultra-high quality screenshot:', imageError);
            // Add placeholder text instead of link
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: "Screenshot could not be embedded - Image loading failed", style: "Normal" }),
                ],
                spacing: {
                  before: 200,
                  after: 400,
                },
              })
            );
          }

          // Add extra spacing between screenshots to ensure separation
          children.push(
            new Paragraph({ text: "" }), // Empty paragraph
            new Paragraph({ text: "" }), // Extra empty paragraph
            new Paragraph({ text: "---" }), // Visual separator
            new Paragraph({ text: "" })  // More spacing
          );
        }
      }

      // Add recordings section with clickable video links
      if (selectedMeeting.recordings && selectedMeeting.recordings.length > 0) {
        children.push(
          new Paragraph({
            text: "Video Recordings (Ultra High Quality - VP9 Codec, 8Mbps)",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({ text: "" }) // Spacing after heading
        );

        selectedMeeting.recordings.forEach((recording, index) => {
          // Create ultra-high quality video URL
          const videoUrl = new URL(recording.url);
          videoUrl.searchParams.set('quality', 'ultra');
          videoUrl.searchParams.set('bitrate', '8000000');
          videoUrl.searchParams.set('codec', 'vp9');
          videoUrl.searchParams.set('resolution', '4k');
          videoUrl.searchParams.set('audio_bitrate', '192000');

          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Video Recording ${index + 1}: `, bold: true }),
                new ExternalHyperlink({
                  children: [new TextRun({ text: "Click to view Ultra HD video (VP9, 8Mbps)", style: "Hyperlink" })],
                  link: videoUrl.toString(),
                }),
              ],
              spacing: {
                before: 200,
                after: 100,
              },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Duration: ", bold: true }),
                new TextRun({ text: `${recording.duration || 0} seconds` }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Type: ", bold: true }),
                new TextRun({ text: "Ultra High Quality Video File (VP9/VP8 codec)" }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Quality: ", bold: true }),
                new TextRun({ text: "4K Resolution, 8Mbps video + 192kbps audio" }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Encoding: ", bold: true }),
                new TextRun({ text: "VP9 codec with advanced quality settings" }),
              ],
            }),
            new Paragraph({ text: "" }), // Spacing between recordings
            new Paragraph({ text: "" })  // Extra spacing
          );
        });
      }

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 inch margins
                bottom: 1440,
                left: 1440,
                right: 1440,
              },
            },
          },
          children: children,
        }],
      });

      // Generate and download Word document
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Meeting_Report_UltraHQ_${selectedMeeting.meeting_id}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Ultra high quality Word document with properly spaced images downloaded successfully!");

    } catch (error) {
      console.error('Failed to generate ultra-high quality Word document:', error);
      toast.error("Failed to generate Word document. Please try again.");
    } finally {
      setExportLoading(prev => ({ ...prev, word: false }));
    }
  };

  // Create share link functionality
  const handleCreateShareLink = async () => {
    if (!selectedMeeting) {
      toast.error("No meeting selected for export");
      return;
    }

    setExportLoading(prev => ({ ...prev, share: true }));

    const shareLink = generateShareLink(selectedMeeting.meeting_id);

    try {
      // Modern browsers with Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareLink);
        toast.success("Share link copied to clipboard!");
      }
      // Fallback for older browsers
      else {
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (successful) {
            toast.success("Share link copied to clipboard!");
          } else {
            throw new Error('Copy command failed');
          }
        } catch (err) {
          // Final fallback - show the link in a prompt
          window.prompt('Copy this link:', shareLink);
          toast.success("Link displayed for manual copy");
        }

        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Failed to copy share link:', error);
      // Ultimate fallback - show in alert
      window.alert(`Copy this link: ${shareLink}`);
      toast.error("Please copy the link manually from the alert");
    } finally {
      setExportLoading(prev => ({ ...prev, share: false }));
    }
  };

  const handleVisitorAccess = useCallback(async (e) => {
    e.preventDefault();
    if (!visitorName.trim()) {
      toast("Name Required", { description: "Please enter your name" });
      return;
    }
    if (!visitorEmail.trim()) {
      toast("Email Required", { description: "Please enter your email address" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(visitorEmail)) {
      toast("Invalid Email", { description: "Please enter a valid email address" });
      return;
    }
    setVisitorLoading(true);
    try {
      if (visitorAccessCallbackRef.current) {
        await visitorAccessCallbackRef.current({
          visitor_name: visitorName.trim(),
          visitor_email: visitorEmail.trim().toLowerCase()
        });
      }
      toast("Access Granted", { description: "Your information has been recorded successfully" });
      setVisitorName('');
      setVisitorEmail('');
      setVisitorAccessOpen(false);
      visitorAccessCallbackRef.current = null;
    } catch (error) {
      toast("Failed to Record Access", { description: "Please try again" });
    } finally {
      setVisitorLoading(false);
    }
  }, [visitorName, visitorEmail, visitorAccessCallbackRef]);

  const openVisitorAccessModal = useCallback((callback) => {
    visitorAccessCallbackRef.current = callback;
    setVisitorAccessOpen(true);
  }, []);

  const formatHistoryDate = useCallback((dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = String(hours % 12 || 12).padStart(2, '0');
    return `${day}/${month}/${year} at ${displayHours}:${minutes} ${ampm}`;
  }, []);

  const getLocationFromIP = useCallback((ip) => {
    if (!ip || ip === 'unknown' || ip.includes('127.0.0.1') || ip.includes('::1')) return 'Local/Unknown';
    return 'Location not available';
  }, []);

  const parseUserAgent = useCallback((userAgent) => {
    if (!userAgent) return 'Unknown Browser';
    if (userAgent.includes('Chrome')) return 'Google Chrome';
    if (userAgent.includes('Firefox')) return 'Mozilla Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Microsoft Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown Browser';
  }, []);

  const getUniqueVisitors = useCallback((accessHistory) => {
    if (!accessHistory || !Array.isArray(accessHistory)) return [];
    const uniqueEmails = new Set();
    const uniqueVisitors = [];
    const sortedHistory = [...accessHistory].sort((a, b) => new Date(b.access_time) - new Date(a.access_time));
    sortedHistory.forEach(access => {
      const email = access.visitor_email?.toLowerCase() || 'no-email';
      if (!uniqueEmails.has(email)) {
        uniqueEmails.add(email);
        uniqueVisitors.push(access);
      }
    });
    return uniqueVisitors;
  }, []);

  const [tailoredMessageText, setTailoredMessageText] = useState('');
  const [messageSettingsLoaded, setMessageSettingsLoaded] = useState(false);
  const [messageSaving, setMessageSaving] = useState(false);

  const loadMessageSettings = useCallback(async () => {
    if (!isAuth || messageSettingsLoaded) return;
    try {
      const response = await getMessageSettingsRequest();
      if (response.data.success && response.data.messageSettings) {
        const settings = response.data.messageSettings;
        setMessageOption(settings.messageOption || '');
        setDefaultTextSize(settings.defaultTextSize || '14px');
        setTailoredTextSize(settings.tailoredTextSize || '14px');
        setSelectedButtonColor(settings.selectedButtonColor || 'bg-green-800');
        if (settings.tailoredMessage) setTailoredMessageText(settings.tailoredMessage);
        setMessageSettingsLoaded(true);
      }
    } catch (error) {
      console.error('Error loading message settings:', error);
    }
  }, [isAuth, messageSettingsLoaded]);

  const handleSaveMessageSettings = useCallback(async () => {
    if (!isAuth) {
      toast("Please Login First");
      return;
    }
    setMessageSaving(true);
    try {
      const messageData = { messageOption, tailoredMessage: tailoredMessageText || '', defaultTextSize, tailoredTextSize, selectedButtonColor };
      const response = await updateMessageSettingsRequest(messageData);
      if (response.data.success) {
        setUser(response.data.user);
        toast("Message settings saved successfully");
        setMessageOpen(false);
      }
    } catch (error) {
      console.error('Error saving message settings:', error);
      toast("Failed to save message settings");
    } finally {
      setMessageSaving(false);
    }
  }, [isAuth, messageOption, tailoredMessageText, defaultTextSize, tailoredTextSize, selectedButtonColor, setUser]);

  const openHistoryModal = useCallback((open, item = null) => {
    setHistoryOpen(open);
    if (open && item) {
      setSelectedItemForHistory(item);
      setHistoryLoading(true);
    } else if (!open) {
      setSelectedItemForHistory(null);
      setHistoryLoading(false);
    }
  }, []);

  const closeVisitorAccessModal = useCallback(() => {
    setVisitorAccessOpen(false);
    setVisitorName('');
    setVisitorEmail('');
    visitorAccessCallbackRef.current = null;
  }, []);

  const value = useMemo(() => ({
    setResetOpen,
    setHasTemporaryPassword,
    hasTemporaryPassword,
    setOnTemporaryPasswordChangeSuccess,
    setMessageOpen: (open) => {
      setMessageOpen(open);
      if (open && isAuth) loadMessageSettings();
    },
    setLandlordDialogOpen: (open) => {
      setLandlordDialogOpen(open);
      if (open) loadLandlordData();
      else setTimeout(resetLandlordForm, 300);
    },
    setTickerOpen,
    setInviteOpen,
    setFeedbackOpen,
    setFaqOpen,
    setForgotPasswordOpen,
    setExportOpen: (open, meeting = null) => {
      setExportOpen(open);
      if (meeting) setSelectedMeeting(meeting);
    },
    selectedMeeting,
    setSelectedMeeting,
    handleCopyLink,
    handleGenerateWord,
    handleGeneratePDF,
    handleCreateShareLink,
    exportLoading,
    openVisitorAccessModal,
    closeVisitorAccessModal,
    visitorAccessOpen,
    setVisitorAccessOpen,
    checkVisitorAccess: () => true,
    setHistoryOpen: openHistoryModal,
    historyOpen,
    selectedItemForHistory,
    historyLoading,
    setShareLinkOpen: (open, meeting = null) => {
      setShareLinkOpen(open);
      if (meeting) setSelectedMeetingForShare(meeting);
    },
    shareLinkOpen,
    selectedMeetingForShare,
    handleSaveMessageSettings,
    messageSaving,
    tailoredMessageText,
    setTailoredMessageText,
    messageOption,
    setMessageOption,
    defaultTextSize,
    setDefaultTextSize,
    tailoredTextSize,
    setTailoredTextSize,
    selectedButtonColor,
    setSelectedButtonColor,
    buttonColors,
    messageSettingsLoaded,
    loadMessageSettings,
    getUserMessageSettings: () => ({
      messageOption,
      tailoredMessage: tailoredMessageText,
      defaultTextSize,
      tailoredTextSize,
      selectedButtonColor,
      isLoaded: messageSettingsLoaded
    }),
    setAddUserOpen,
    isCallbackOpen,
    setIsCallbackOpen,
    isMeetingOpen,
    setISMeetingOpen,
    setTickerOpen,
    supportCategory,
    setSupportCategory,
    supportQuery,
    setSupportQuery,
    supportAttachments,
    setSupportAttachments,
    supportLoading,
    handleRaiseSupportTicket,
    handleFileSelect,
    removeAttachment,
    viewTicketsOpen,
    setViewTicketsOpen,
    userTickets,
    ticketsLoading,
    loadUserTickets,
    ticketSearchQuery,
    setTicketSearchQuery,
    adminChatOpen,
    setAdminChatOpen,
    selectedTicketForChat,
  }), [resetOpen, hasTemporaryPassword, isAuth, loadMessageSettings, loadLandlordData, resetLandlordForm, selectedMeeting, exportLoading, openHistoryModal, historyOpen, selectedItemForHistory, historyLoading, shareLinkOpen, selectedMeetingForShare, messageSaving, tailoredMessageText, messageOption, defaultTextSize, tailoredTextSize, selectedButtonColor, messageSettingsLoaded, isCallbackOpen, isMeetingOpen, supportCategory, supportQuery, supportAttachments, supportLoading, viewTicketsOpen, userTickets, ticketsLoading, ticketSearchQuery]);

  useEffect(() => {
    if (!resetOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setRecoveryWord('');
    }
  }, [resetOpen]);

  useEffect(() => {
    if (!resetOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setRecoveryWord('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [resetOpen]);

  useEffect(() => {
    if (!messageOpen) {
      setMessageOption('');
      setDefaultTextSize('14px');
      setTailoredTextSize('14px');
      setSelectedButtonColor('bg-green-800');
      setTailoredMessageText('');
      setMessageSettingsLoaded(false);
    }
  }, [messageOpen]);

  useEffect(() => {
    if (!landlordDialogOpen) setTimeout(resetLandlordForm, 300);
  }, [landlordDialogOpen, resetLandlordForm]);

  useEffect(() => {
    if (!ticketOpen) {
      setSupportCategory('');
      setSupportQuery('');
    }
  }, [ticketOpen]);

  useEffect(() => {
    if (!inviteOpen) {
      setInviteEmails(['']);
      setInviteMessage(`Hey, I'm using Videodesk , check it out here www.videodesk.co.uk`);
    }
  }, [inviteOpen]);

  useEffect(() => {
    if (!feedbackOpen) setFeedbackText('');
  }, [feedbackOpen]);

  useEffect(() => {
    if (!forgotPasswordOpen) setForgotEmail('');
  }, [forgotPasswordOpen]);

  useEffect(() => {
    if (!exportOpen) {
      setSelectedMeeting(null);
      setExportLoading({ word: false, pdf: false, copy: false, share: false });
    }
  }, [exportOpen]);

  useEffect(() => {
    if (!visitorAccessOpen) {
      setVisitorName('');
      setVisitorEmail('');
      visitorAccessCallbackRef.current = null;
    }
  }, [visitorAccessOpen]);

  useEffect(() => {
    if (!historyOpen) {
      setSelectedItemForHistory(null);
      setHistoryLoading(false);
      if (historyInterval) {
        clearInterval(historyInterval);
        setHistoryInterval(null);
      }
      setInitialMeetingId(null);
    }
  }, [historyOpen, historyInterval]);

  useEffect(() => {
    if (viewTicketsOpen && isAuth) {
      loadUserTickets(); // Automatically load tickets when modal opens
    }
  }, [viewTicketsOpen, isAuth, loadUserTickets]);

  useEffect(() => {
    if (!shareLinkOpen) setSelectedMeetingForShare(null);
  }, [shareLinkOpen]);





  return (
    <DialogContext.Provider value={value}>
      {children}

      {/* Add styles to document head */}
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        .textarea-with-cursor {
          caret-color: #333;
        }
        
        .textarea-with-cursor:focus {
          caret-color: #333;
        }
        
        .textarea-with-cursor::after {
          content: '';
          animation: blink 1s infinite;
        }
      `}</style>

      <DialogComponent open={resetOpen} setOpen={setResetOpen} isCloseable={!hasTemporaryPassword}>
        <div className="w-[360px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <LockIcon className="w-5 h-5 text-white" />
              <h2 className="text-base font-semibold">
                {hasTemporaryPassword ? 'Change Temporary Password' : 'Reset Password'}
              </h2>
            </div>
            {!hasTemporaryPassword && (
              <button
                onClick={() => setResetOpen(false)}
                aria-label="Close"
                className="absolute right-4 text-white hover:text-gray-200"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            <form onSubmit={handleResetPassword}>
              {/* Fields */}              <div className="space-y-3">
                {!hasTemporaryPassword && (
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter current password"
                      className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />                  <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-red-500 -mt-1">
                  Minimum 8 characters including 1 capital, 1 lower case and 1 special character
                </p>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Retype new password"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Type secret account recovery word (optional)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  value={recoveryWord}
                  onChange={(e) => setRecoveryWord(e.target.value)}
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={resetLoading}
                className="mt-4 w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2"
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save new password'
                )}
              </button>
            </form>

            {/* Forgot Link */}
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => {
                  setResetOpen(false);
                  setForgotPasswordOpen(true);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </div>
        </div>
      </DialogComponent>
      <DialogComponent open={messageOpen} setOpen={setMessageOpen} isCloseable={true}>
        <div className="w-[500px] max-h-[90vh] bg-purple-500 rounded-2xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <h2 className="text-lg font-semibold">Amend Message:</h2>
            <button
              onClick={() => setMessageOpen(false)}
              className="absolute right-4 text-white hover:text-gray-200 transition"
              aria-label="Close dialog"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            {/* Default Message */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-sm text-black">Default message:</label>
                <div className="flex items-center gap-1">
                  <select
                    value={defaultTextSize}
                    onChange={(e) => setDefaultTextSize(e.target.value)}
                    className="text-white bg-black border border-gray-300 rounded-lg px-3 py-1 text-xs mr-6"
                  >
                    <option value="10px" style={{ color: 'white' }}>Text Size: 10</option>
                    <option value="11px" style={{ color: 'white' }}>Text Size: 11</option>
                    <option value="12px" style={{ color: 'white' }}>Text Size: 12</option>
                    <option value="13px" style={{ color: 'white' }}>Text Size: 13</option>
                    <option value="14px" style={{ color: 'white' }}>Text Size: 14</option>
                    <option value="16px" style={{ color: 'white' }}>Text Size: 16</option>
                    <option value="18px" style={{ color: 'white' }}>Text Size: 18</option>
                    <option value="20px" style={{ color: 'white' }}>Text Size: 20</option>
                    <option value="22px" style={{ color: 'white' }}>Text Size: 22</option>
                  </select>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={messageOption === 'default'}
                  onChange={() => setMessageOption(messageOption === 'default' ? '' : 'default')}
                  className="mt-1"
                />
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" style={{ fontSize: defaultTextSize }}>
                  <p>Please click on the link below to connect with your landlord</p>
                  <a
                    href="https://www.videodesk.co.uk/xyz91dasd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    www.Videodesk.co.uk/xyz91dasd
                  </a>
                </div>
              </div>
            </div>

            {/* Tailored Message */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-sm text-black">Or type tailored message:</label>
                <div className="flex items-center gap-1">
                  <select
                    value={tailoredTextSize}
                    onChange={(e) => setTailoredTextSize(e.target.value)}
                    className="text-white bg-black border border-gray-300 rounded-lg px-3 py-1 text-xs mr-6"
                  >
                    <option value="10px" style={{ color: 'white' }}>Text Size: 10</option>
                    <option value="11px" style={{ color: 'white' }}>Text Size: 11</option>
                    <option value="12px" style={{ color: 'white' }}>Text Size: 12</option>
                    <option value="13px" style={{ color: 'white' }}>Text Size: 13</option>
                    <option value="14px" style={{ color: 'white' }}>Text Size: 14</option>
                    <option value="16px" style={{ color: 'white' }}>Text Size: 16</option>
                    <option value="18px" style={{ color: 'white' }}>Text Size: 18</option>
                    <option value="20px" style={{ color: 'white' }}>Text Size: 20</option>
                    <option value="22px" style={{ color: 'white' }}>Text Size: 22</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="checkbox"
                  checked={messageOption === 'tailored'}
                  onChange={() => setMessageOption(messageOption === 'tailored' ? '' : 'tailored')}
                  className="mt-1"
                />
                <textarea
                  placeholder="Enter your message"
                  value={tailoredMessageText}
                  onChange={(e) => setTailoredMessageText(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none ${messageOption === 'tailored' ? 'h-[6rem]' : 'h-[4rem]'}`}
                  style={{ fontSize: tailoredTextSize }}
                />
              </div>
            </div>

            {/* Choose Button Color Section */}
            <div className="mb-6">
              <h3 className="font-medium text-sm text-black mb-4">Choose the button colour that the user will click to connect on the sent link:</h3>

              {/* Default heading and green circle on left */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-black">Default:</span>
                <button
                  onClick={() => {
                    console.log('🎨 Default green button clicked');
                    setSelectedButtonColor('bg-green-800');
                  }}
                  className={`rounded-full border transition-all ${selectedButtonColor === 'bg-green-800'
                    ? 'border-black border-2 scale-110'
                    : 'border-gray-300'
                    }`}
                  style={{
                    backgroundColor: '#166534',
                    width: '5mm',
                    height: '5mm'
                  }}
                  title="Default Green"
                />
              </div>

              {/* Color Row - 5 colors centered */}
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-1">
                  {buttonColors.map((colorOption, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        console.log('🎨 Custom button color clicked:', colorOption.bgClass, colorOption.name);
                        setSelectedButtonColor(colorOption.bgClass);
                      }}
                      className={`rounded-full border transition-all ${selectedButtonColor === colorOption.bgClass
                        ? 'border-black border-2 scale-110'
                        : 'border-gray-300'
                        }`}
                      style={{
                        backgroundColor: colorOption.color,
                        width: '5mm',
                        height: '5mm'
                      }}
                      title={colorOption.name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview Button */}
              <div className="flex justify-center">
                <button className={`w-[70%] ${selectedButtonColor} ${selectedButtonColor === 'bg-green-800' ? 'hover:bg-green-900' : buttonColors.find(c => c.bgClass === selectedButtonColor)?.hoverClass} text-white font-bold py-3 rounded-full text-sm transition`}>
                  Tap to allow video<br />session now
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveMessageSettings}
              disabled={messageSaving}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 rounded-full text-sm transition flex items-center justify-center gap-2"
            >
              {messageSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={landlordDialogOpen} setOpen={setLandlordDialogOpen} isCloseable>
        <div className="w-[550px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <h2 className="text-base font-semibold">Add Landlord Name/Logo/Profile Image:</h2>
            <button
              onClick={() => setLandlordDialogOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            <div className="space-y-4">
              {/* 1. Landlord Name Section */}
              <div className="flex items-start flex-col gap-2">
              <label className="text-black font-semibold flex items-center gap-2 mb-2">1. Landlord/Company Name</label>
                <label className="text-black font-semibold flex items-center gap-2">
                  {/* 1a. Default Checkbox */}
                  <input
                    type="checkbox"
                    checked={landlordNameEnabled === 'default'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLandlordNameEnabled('default');
                        setLandlordName('Videodesk');
                      } else {
                        setLandlordNameEnabled(false);
                        setLandlordName('');
                      }
                    }}
                  />
                  <span>1a. Default Name/Message</span>
                </label>
                <div className="flex items-center gap-2 w-full ml-4">
                  <input
                    type="text"
                    value={landlordNameEnabled === 'default' ? 'Videodesk' : ''}
                    placeholder={landlordNameEnabled !== 'default' ? 'Videodesk' : ''}
                    disabled={landlordNameEnabled !== 'default'}
                    className={`flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none bg-gray-100 cursor-not-allowed`}
                  />
                </div>
                <label className="text-black font-semibold flex items-center gap-2 mt-2">
                  {/* 1b. Landlord Name Checkbox */}
                  <input
                    type="checkbox"
                    checked={landlordNameEnabled === 'custom'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLandlordNameEnabled('custom');
                        if (landlordName === '' || landlordName === 'Videodesk') setLandlordName('');
                      } else {
                        setLandlordNameEnabled(false);
                        setLandlordName('');
                      }
                    }}
                  />
                  <span>1b. Tailored Name/Message</span>
                </label>
                <div className="flex items-center gap-2 w-full ml-4">
                  <input
                    type="text"
                    placeholder="Type here"
                    value={landlordNameEnabled === 'custom' ? landlordName : ''}
                    onChange={(e) => setLandlordName(e.target.value)}
                    disabled={landlordNameEnabled !== 'custom'}
                    className={`flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none ${landlordNameEnabled !== 'custom' ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                  />
                </div>
              </div>

              {/* 2. Landlord Logo Section */}
              <div className="flex items-start flex-col gap-2">
                <label className="text-black font-semibold flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={landlordLogoEnabled}
                    onChange={(e) => setLandlordLogoEnabled(e.target.checked)}
                  />
                  <span>2. Upload Landlord logo to use on dashboard and video page:</span>
                </label>
                <div className={`flex relative items-center justify-center gap-2 w-[97%] p-4 h-[4rem] border border-gray-300 rounded-md ml-4 ${!landlordLogoEnabled ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                  {/* Upload area - clickable only when checkbox is enabled and no image */}
                  <div
                    className={`flex items-center justify-center w-full h-full ${!landlordLogo && landlordLogoEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onClick={() => {
                      if (!landlordLogo && landlordLogoEnabled) {
                        document.getElementById('landlordLogoInput').click();
                      }
                    }}
                  >
                    {landlordLogo ? (
                      <img src={landlordLogo} alt="Landlord Logo Preview" className="max-h-8 max-w-full object-contain" />
                    ) : (
                      <img src="/icons/material-symbols_upload-rounded.svg" className={!landlordLogoEnabled ? 'opacity-50' : ''} />
                    )}
                  </div>

                  {/* Trash icon - only visible when logo exists and checkbox is enabled */}
                  {landlordLogoEnabled && landlordLogo && (
                    <button
                      type="button"
                      className="absolute top-2 right-2 cursor-pointer z-10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteLandlordLogo();
                      }}
                    >
                      <img src="/icons/trash-red.svg" className="w-5 h-5" />
                    </button>
                  )}

                  {/* Hidden file input */}
                  <input
                    id="landlordLogoInput"
                    type="file"
                    accept="image/*"
                    onChange={handleLandlordLogoSelect}
                    disabled={!landlordLogoEnabled}
                    className="hidden"
                  />
                </div>

                {/* 3. Use landlord logo for profile section */}
                <div className="ml-0 mt-2">
                  <label className="text-black font-semibold flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profileImageOption === 'landlord'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setProfileImageOption('landlord');
                        } else {
                          setProfileImageOption('');
                        }
                      }}
                      disabled={!landlordLogoEnabled || !landlordLogo}
                    />
                    <span className={!landlordLogoEnabled || !landlordLogo ? 'text-gray-400' : 'text-black'}>
                      3. Use landlord logo for profile photo
                    </span>
                  </label>
                </div>
              </div>

              {/* 4. Officer Image Section */}
              <div className="flex items-start flex-col gap-2">
                <label className="text-black font-semibold flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profileImageOption === 'officer'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setProfileImageOption('officer');
                      } else {
                        setProfileImageOption('');
                      }
                    }}
                  />
                  <span>4. Upload Officer image to use as profile photo on dashboard screen:</span>
                </label>
                <div className={`flex relative items-center justify-center gap-2 w-[97%] p-4 h-[12rem] border border-gray-300 rounded-md ml-4 ${profileImageOption !== 'officer' ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                  {/* Upload area - only clickable when officer option is selected */}
                  <div
                    className={`flex items-center justify-center w-full h-full ${profileImageOption === 'officer' ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onClick={() => {
                      if (profileImageOption === 'officer') {
                        document.getElementById('officerImageInput').click();
                      }
                    }}
                  >
                    {officerImage ? (
                      <img
                        src={officerImage}
                        alt="Officer Preview"
                        className="max-h-28 max-w-full object-contain pointer-events-none"
                        onError={(e) => {
                          // If image fails to load, show initials
                          e.target.style.display = 'none';
                          e.target.parentNode.innerHTML = `
                <div class="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold text-xl">
                  ${getInitials(landlordName || user?.email?.split('@')[0] || 'User')}
                </div>
              `;
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <img src="/icons/material-symbols_upload-rounded.svg" className={`pointer-events-none mb-2 ${profileImageOption !== 'officer' ? 'opacity-50' : ''}`} />
                        {profileImageOption === 'officer' && (
                          <span className="text-xs text-center">Upload officer image</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Trash icon - only visible when officer image exists and option is selected */}
                  {profileImageOption === 'officer' && officerImage && (
                    <button
                      type="button"
                      className="absolute top-2 right-2 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteOfficerImage();
                      }}
                    >
                      <img src="/icons/trash-red.svg" className="w-5 h-5" />
                    </button>
                  )}

                  {/* Profile Shape Controls - only visible when officer option is selected */}
                  <div className={`absolute bottom-2 left-4 right-4 flex items-center gap-4 ${profileImageOption !== 'officer' || !officerImage ? 'opacity-50 pointer-events-none' : ''}`}>
                    <span className="text-black font-semibold text-sm">Select Profile Shape:</span>
                    <label className="text-black font-semibold flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profileShape === 'square'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProfileShape('square');
                          } else {
                            setProfileShape('');
                          }
                        }}
                        disabled={profileImageOption !== 'officer' || !officerImage}
                        className="w-4 h-4"
                      />
                      Square
                    </label>
                    <label className="text-black font-semibold flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profileShape === 'circle'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProfileShape('circle');
                          } else {
                            setProfileShape('');
                          }
                        }}
                        disabled={profileImageOption !== 'officer' || !officerImage}
                        className="w-4 h-4"
                      />
                      Circle
                    </label>
                  </div>

                  {/* Hidden file input */}
                  <input
                    id="officerImageInput"
                    type="file"
                    accept="image/*"
                    onChange={handleOfficerImageSelect}
                    disabled={profileImageOption !== 'officer'}
                    className="hidden"
                  />
                </div>
              </div>


              {/* Redirect Options Section */}
              <div className="mt-6">
                <label className="text-black font-semibold block mb-4">
                  5. When video call ends, user is directed to the following website:
                </label>

                {/* 5a. Default Option */}
                <div className="flex items-start flex-col gap-2">
                  <label className="text-black font-semibold flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={redirectOption === 'default'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRedirectOption('default');
                        } else {
                          setRedirectOption('');
                        }
                      }}
                    />
                    <span>5a. Default:</span>
                  </label>
                  <div className="flex items-center gap-2 w-full ml-4">
                    <input
                      type="text"
                      value={redirectUrlDefault}
                      onChange={(e) => setRedirectUrlDefault(e.target.value)}
                      disabled={true}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>
                {/* 5b. Tailored Option */}
                <div className="flex items-start flex-col gap-2 mt-4">
                  <label className="text-black font-semibold flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={redirectOption === 'tailored'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRedirectOption('tailored');
                        } else {
                          setRedirectOption('');
                        }
                      }}
                    />
                    <span>5b. Tailored:</span>
                  </label>
                  <div className="flex items-center gap-2 w-full ml-4">
                    <input
                      type="text"
                      value={redirectUrlTailored}
                      onChange={(e) => setRedirectUrlTailored(e.target.value)}
                      disabled={redirectOption !== 'tailored'}
                      className={`flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none ${redirectOption !== 'tailored' ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveLandlordInfo}
              disabled={landlordSaving}
              className="mt-4 w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2"
            >
              {landlordSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={ticketOpen} setOpen={setTickerOpen} isCloseable={true}>
        <div className="w-[500px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <MailIcon className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold">Raise/View Support Ticket</h2>
            </div>
            <button
              onClick={() => setTickerOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            <form onSubmit={handleRaiseSupportTicket}>
              {/* Category Dropdown */}
              <div className="mb-4">
                <select
                  value={supportCategory}
                  onChange={(e) => setSupportCategory(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  style={{
                    height: '48px',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'calc(100% - 16px) center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '20px'
                  }}
                  size="1"
                  required
                >
                  <option value="">Choose a category</option>
                  {supportCategories.map((category, index) => (
                    <option key={index} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Textarea */}
              <div>
                <textarea
                  placeholder="Enter support query"
                  className="w-full h-40 px-4 py-3 text-sm border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={supportQuery}
                  onChange={(e) => setSupportQuery(e.target.value)}
                  required
                />
              </div>

              {/* Attachments */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments (max 10MB each)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={handleFileSelect}
                />
                
                {/* Show selected files */}
                {supportAttachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {supportAttachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* View Existing Tickets Link */}
              <div className="text-center mb-6">
                <button
                  type="button"
                  onClick={() => {
                    loadUserTickets();
                    setViewTicketsOpen(true);
                    setTickerOpen(false); 
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium underline decoration-blue-300 hover:decoration-blue-500 transition-all duration-200 cursor-pointer"
                >
                  View Existing Tickets
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={supportLoading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 rounded-full text-sm transition flex items-center justify-center gap-2"
              >
                {supportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Ticket...
                  </>
                ) : (
                  'Send'
                )}
              </button>
            </form>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={inviteOpen} setOpen={setInviteOpen} isCloseable={true}>
        <div className="w-[360px] max-h-[90vh] bg-purple-500 rounded-2xl shadow-md relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 relative m-0">
            <div className="flex items-center gap-2">
              <img src="/icons/ri_user-add-line.svg" className="filter brightness-0 invert" />
              <h2 className="text-base font-semibold">Invite Co-Worker(s)</h2>
            </div>
            <button
              onClick={() => setInviteOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            {/* Dynamic Email Fields */}
            <div className="space-y-3">
              {inviteEmails.map((email, index) => (
                <div key={index}>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder={`${index + 1}. Enter email address for Co-worker`}
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      className={`w-full px-4 py-2 text-sm border border-gray-300 rounded-lg ${index > 0 ? 'pr-12' : ''}`}
                    />
                    {index > 0 && (
                      <button
                        onClick={() => removeEmailField(index)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-full cursor-pointer transition-colors shadow-lg flex items-center justify-center"
                      >
                        -
                      </button>
                    )}
                  </div>
                  {index === inviteEmails.length - 1 && (
                    <div className="flex justify-end items-center mt-3">
                      <button
                        onClick={addEmailField}
                        className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-full cursor-pointer transition-colors shadow-lg relative"
                      >
                        <span className="absolute inset-0 flex items-center justify-center" style={{ top: '-1px' }}>
                          +
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Message Textarea with Auto Focus */}
            <div>
              <textarea
                ref={inviteTextareaRef}
                rows={3}
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                onFocus={handleTextareaFocus}
                onClick={() => {
                  if (inviteMessage === `Hey, I'm using Videodesk , check it out here www.videodesk.co.uk`) {
                    handleTextareaFocus();
                  }
                }}
                placeholder="Hey, I'm using Videodesk , check it out here www.videodesk.co.uk"
                className="textarea-with-cursor w-full px-4 py-2 text-sm border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  caretColor: inviteMessage === `Hey, I'm using Videodesk , check it out here www.videodesk.co.uk` ? '#333' : 'auto'
                }}
              />
            </div>

            {/* Invite Button */}
            <button
              onClick={handleInviteCoWorkers}
              disabled={inviteLoading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-2 rounded-full text-sm transition flex items-center justify-center gap-2"
            >
              {inviteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Invite'
              )}
            </button>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={feedbackOpen} setOpen={setFeedbackOpen} isCloseable={true}>
        <div className="w-[520px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <img src="/icons/ic_sharp-outlined-flag.svg" className="filter brightness-0 invert" />
              <h2 className="text-base font-semibold">Give Feedback/Make Suggestions</h2>
            </div>
            <button
              onClick={() => setFeedbackOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            <form onSubmit={handleSendFeedback}>
              {/* Feedback Field */}
              <textarea
                placeholder="We'd love to hear your feedback, so please get in touch with any feedback or suggestions"
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg h-40 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                required
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={feedbackLoading}
                className="mt-4 w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2"
              >
                {feedbackLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send'
                )}
              </button>
            </form>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={faqOpen} setOpen={setFaqOpen} isCloseable={true}>
        <div className="rounded-2xl shadow-md max-h-[90vh] overflow-hidden bg-purple-500">
          {/* Header */}
          <div className="flex items-center justify-between bg-purple-500 text-white p-4 m-0">
            <span></span>
            <div className="flex items-center gap-2 justify-center">
              <h2 className="text-base font-semibold text-center">
                FAQs<br />
                (Frequently Asked Questions)
              </h2>
            </div>
            <button onClick={() => setFaqOpen(false)} aria-label="Close">
              <XIcon className="w-5 h-5 text-white hover:text-gray-200" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto bg-white rounded-b-2xl max-h-[calc(90vh-4rem)]">
            {/* FAQ Accordion List */}
            <div className="space-y-2">
              {faqs.map((question, index) => (
                <Disclosure key={index}>
                  {({ open }) => (
                    <div className="rounded-md bg-yellow-500">
                      <Disclosure.Button className="flex justify-between items-center w-full px-4 py-2 text-left text-black font-medium focus:outline-none">
                        <span>{question}</span>
                        <ChevronDownIcon
                          className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </Disclosure.Button>
                      <Disclosure.Panel className="px-4 pb-2 text-sm text-black bg-yellow-100">
                        This is the answer for: <strong>{question}</strong>. You can customize this.
                      </Disclosure.Panel>
                    </div>
                  )}
                </Disclosure>
              ))}
            </div>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={forgotPasswordOpen} setOpen={setForgotPasswordOpen} isCloseable={true}>
        <div className="w-[400px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <LockIcon className="w-5 h-5 text-white" />
              <h2 className="text-base font-semibold">Forgot Password</h2>
            </div>
            <button
              onClick={() => setForgotPasswordOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            <form onSubmit={handleForgotPassword}>
              <p className="text-sm text-gray-600 mb-4 text-center">
                Enter the email address you used to sign up for your account
              </p>

              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={forgotLoading}
                className="mt-4 w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2"
              >
                {forgotLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            {/* Back to Reset Link */}
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => {
                  setForgotPasswordOpen(false);
                  setResetOpen(true);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Back to Reset Password
              </button>
            </div>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={exportOpen} setOpen={setExportOpen} isCloseable={true}>
        <div className="w-[400px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <img src="/icons/icon-park_share.svg" className="w-5 h-5 filter brightness-0 invert" />
              <h2 className="text-base font-semibold">Export Options</h2>
            </div>
            <button
              onClick={() => setExportOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            <div className="space-y-3">
              {/* Create Share Link */}
              <button
                onClick={handleCreateShareLink}
                disabled={exportLoading.share}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left disabled:opacity-50"
              >
                <Link className="w-5 h-5 text-gray-600" />
                <span className="text-black font-medium" style={{ fontSize: '16px' }}>
                  {exportLoading.share ? 'Opening link...' : 'Create share link'}
                </span>
                {exportLoading.share && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </button>

              {/* Copy and Paste Link to Email */}
              <button
                onClick={handleCopyLink}
                disabled={exportLoading.copy}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left disabled:opacity-50"
              >
                <Copy className="w-5 h-5 text-gray-600" />
                <span className="text-black font-medium" style={{ fontSize: '16px' }}>
                  {exportLoading.copy ? 'Copying...' : 'Copy link and paste in email'}
                </span>
                {exportLoading.copy && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </button>

              {/* Copy and Paste to Word */}
              <button
                onClick={handleGenerateWord}
                disabled={exportLoading.word}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left disabled:opacity-50"
              >
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-black font-medium" style={{ fontSize: '16px' }}>
                  {exportLoading.word ? 'Generating Word...' : 'Generate Word document'}
                </span>
                {exportLoading.word && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </button>

              {/* Convert to PDF */}
              <button
                onClick={handleGeneratePDF}
                disabled={exportLoading.pdf}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left disabled:opacity-50"
              >
                <FileSearch className="w-5 h-5 text-red-600" />
                <span className="text-black font-medium" style={{ fontSize: '16px' }}>
                  {exportLoading.pdf ? 'Generating PDF...' : 'Generate PDF document'}
                </span>
                {exportLoading.pdf && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </button>
            </div>
          </div>
        </div>
      </DialogComponent>

      {/* Visitor Access Modal */}
      <CustomDialog 
        open={visitorAccessOpen} 
        setOpen={setVisitorAccessOpen} 
        heading={
          <div className="w-full relative flex items-center justify-center">
            <h2 className="text-[1.3rem] md:text-[1.8rem] font-bold text-white">To Access Shared Link</h2>
            <button
              onClick={() => setVisitorAccessOpen(false)}
              className="absolute right-2 md:right-0 text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/10"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        }
        className="max-w-[95vw] w-full sm:max-w-[600px]"
      >
        <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
          <form onSubmit={handleVisitorAccess}>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter your name"
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Enter your work email address"
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={visitorLoading}
              className="mt-6 w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2"
            >
              {visitorLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                </>
              ) : (
                'Access Shared Link'
              )}
            </button>
          </form>
        </div>
      </CustomDialog>

      {/* History Modal */}
      <DialogComponent open={historyOpen} setOpen={setHistoryOpen} isCloseable={true}>
        <div className="max-w-[95vw] w-full sm:max-w-[600px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <img src="/icons/icon-park-outline_history-query.svg" className="w-5 h-5 filter brightness-0 invert" />
              <h2 className="text-base font-semibold">Access History</h2>
            </div>
            <button
              onClick={() => setHistoryOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            {historyLoading ? (
              // Skeleton Loading State
              <div className="space-y-4 animate-pulse">
                {/* Meeting Info Header Skeleton */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="h-6 bg-gray-300 rounded w-20 mb-2"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-8 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-16 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-16 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded w-40"></div>
                    </div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-14 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                    </div>
                  </div>
                </div>

                {/* Access Statistics Skeleton */}
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <div className="h-5 bg-gray-300 rounded w-28 sm:w-32 mb-2"></div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                    <div>
                      <div className="h-7 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 mx-auto mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-16 sm:w-20 mx-auto"></div>
                    </div>
                    <div>
                      <div className="h-7 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 mx-auto mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-16 sm:w-24 mx-auto"></div>
                    </div>
                    <div>
                      <div className="h-7 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 mx-auto mb-1"></div>
                      <div className="h-3 bg-gray-2 00 rounded w-14 sm:w-20 mx-auto"></div>
                    </div>
                  </div>
                </div>

                {/* Access History List Skeleton */}
                <div>
                  <div className="h-5 bg-gray-300 rounded w-36 sm:w-48 mb-2 sm:mb-3"></div>
                  <div className="space-y-2 sm:space-y-3 max-h-56 sm:max-h-60 overflow-y-auto">
                    {[1, 2, 3].map((index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 rounded-full"></div>
                          <div className="flex-1 min-w-0">
                            <div className="h-4 bg-gray-300 rounded w-24 sm:w-32 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-28 sm:w-40"></div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="h-3 bg-gray-200 rounded w-5 sm:w-6 mb-1 ml-auto"></div>
                            <div className="h-3 bg-gray-200 rounded w-16 sm:w-20 ml-auto"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content Summary Skeleton */}
                <div className="border-t pt-3 sm:pt-4">
                  <div className="h-4 bg-gray-300 rounded w-28 sm:w-32 mb-2 sm:mb-3"></div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="bg-green-50 p-2 sm:p-3 rounded">
                      <div className="flex items-center justify-between">
                        <div className="h-4 bg-gray-300 rounded w-20 sm:w-24"></div>
                        <div className="h-5 sm:h-6 bg-gray-300 rounded w-7 sm:w-8"></div>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-2 sm:p-3 rounded">
                      <div className="flex items-center justify-between">
                        <div className="h-4 bg-gray-300 rounded w-20 sm:w-24"></div>
                        <div className="h-5 sm:h-6 bg-gray-300 rounded w-7 sm:w-8"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Share Link Skeleton */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 bg-gray-200 rounded flex-1"></div>
                    <div className="h-8 bg-gray-300 rounded w-12"></div>
                  </div>
                </div>
              </div>
            ) : selectedItemForHistory ? (
              <div className="space-y-4">
                {/* Meeting Info Header */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Details</h3>
                  <div className="space-y-3 text-sm">
                    {/* Row 1: Meeting ID/Share Code and Resident Name */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700">
                          {selectedItemForHistory.accessCode ? 'Share Code:' : 'Meeting ID:'}
                        </span>
                        <p className="text-gray-600 mt-0.5">
                          {selectedItemForHistory.accessCode || selectedItemForHistory.meeting_id}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Resident Name:</span>
                        <p className="text-gray-600 mt-0.5">
                          {(() => {
                            // Format resident name using new structured fields
                            const residentName = selectedItemForHistory.first_name || selectedItemForHistory.last_name
                              ? `${selectedItemForHistory.first_name || ''} ${selectedItemForHistory.last_name || ''}`.trim()
                              : selectedItemForHistory.name || 'Unknown Resident';
                            return residentName;
                          })()}
                        </p>
                      </div>
                    </div>

                    {/* Row 2: Address and Phone+Created vertically */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Address - Left Side */}
                      <div>
                        <span className="font-medium text-gray-700">Address:</span>
                        <p className="text-gray-600 mt-0.5">
                          {(() => {
                            // Format address in single line like dashboard
                            const addressParts = [];
                            if (selectedItemForHistory.house_name_number) {
                              addressParts.push(selectedItemForHistory.house_name_number.trim());
                            }
                            if (selectedItemForHistory.flat_apartment_room) {
                              
                              addressParts.push(selectedItemForHistory.flat_apartment_room.trim());
                            }
                            if (selectedItemForHistory.street_road) {
                              addressParts.push(selectedItemForHistory.street_road.trim());
                            }
                            if (selectedItemForHistory.city) {
                              addressParts.push(selectedItemForHistory.city.trim());
                            }
                            if (selectedItemForHistory.country) {
                              addressParts.push(selectedItemForHistory.country.trim());
                            }
                            // Handle both post_code (meetings) and postCode (uploads)
                            if (selectedItemForHistory.post_code) {
                              addressParts.push(selectedItemForHistory.post_code.trim());
                            } else if (selectedItemForHistory.postCode) {
                              addressParts.push(selectedItemForHistory.postCode.trim());
                            }
                            // Fallback to old address field if no structured address
                            if (addressParts.length === 0 && selectedItemForHistory.address) {
                              addressParts.push(selectedItemForHistory.address.trim());
                            }
                            return addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';
                          })()}
                        </p>
                      </div>

                      {/* Phone and Created Date - Right Side (Vertical Stack) */}
                      <div className="space-y-4">
                        {(selectedItemForHistory.phone_number || selectedItemForHistory.phoneNumber) && (
                          <div>
                            <span className="font-medium text-gray-700">Phone Number:</span>
                            <p className="text-gray-600 mt-0.5">{selectedItemForHistory.phone_number || selectedItemForHistory.phoneNumber}</p>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-gray-700">Created Date:</span>
                          <p className="text-gray-600 mt-0.5">{formatHistoryDate(selectedItemForHistory.createdAt)}</p>
                        </div>
                      </div>
                    </div>



                    {/* Repair Details - Full Width if exists */}
                    {selectedItemForHistory.repair_detail && (
                      <div>
                        <span className="font-medium text-gray-700">Repair Details:</span>
                        <p className="text-gray-600 mt-0.5">{selectedItemForHistory.repair_detail}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Access Statistics */}
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-sm sm:text-base mb-2">Access Statistics</h4>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                    <div>
                      <div className="text-lg sm:text-2xl font-bold text-blue-600 leading-tight">
                        {selectedItemForHistory.total_access_count || selectedItemForHistory.access_history?.length || 0}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">Total Accesses</div>
                    </div>
                    <div>
                      <div className="text-lg sm:text-2xl font-bold text-green-600 leading-tight">
                        {getUniqueVisitors(selectedItemForHistory.access_history).length}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">Unique Visitors</div>
                    </div>
                    <div>
                      <div className="text-base sm:text-2xl font-bold text-purple-600 leading-tight whitespace-nowrap">
                        {selectedItemForHistory.access_history?.length > 0 ?
                          formatHistoryDate(selectedItemForHistory.access_history[selectedItemForHistory.access_history.length - 1].access_time).split(' ')[0] :
                          'N/A'
                        }
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">Last Access</div>
                    </div>
                  </div>
                </div>

                {/* Access History List - Show ALL accesses, not just unique */}
                <div>
                  <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Visitor Access Log</h4>
                  {(() => {
                    const allAccesses = (selectedItemForHistory.access_history || []).slice().sort((a, b) =>
                      new Date(a.access_time) - new Date(b.access_time)
                    );

                    // Debug: Log the access history data
                    console.log('🔍 Access History Debug:', {
                      totalAccesses: selectedItemForHistory.total_access_count,
                      accessHistoryLength: selectedItemForHistory.access_history?.length,
                      allAccessesLength: allAccesses.length,
                      accessHistory: selectedItemForHistory.access_history
                    });

                    if (allAccesses.length > 0) {
                      return (
                        <div className="space-y-2 sm:space-y-3 max-h-56 sm:max-h-60 overflow-y-auto">
                          {allAccesses.map((access, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50">
                                                              <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm sm:text-lg">
                                      {access.visitor_email ? access.visitor_email.charAt(0).toUpperCase() : 'A'}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                                      {access.visitor_email === 'anonymous@visitor' ? 'Anonymous Visitor' : access.visitor_email}
                                    </p>
                                    <p className="text-xs sm:text-sm text-gray-600">
                                      {access.creator ? 'Creator Access' : 'Visitor Access'}
                                    </p>
                                  </div>
                                <div className="text-right shrink-0">
                                  <div className="text-[10px] sm:text-xs text-gray-400 mb-1">
                                    #{index + 1}
                                  </div>
                                  <div className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
                                    {formatHistoryDate(access.access_time)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <img src="/icons/icon-park-outline_history-query.svg" className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No visitor access recorded yet</p>
                          <p className="text-sm">When someone visits the shared link, their access will be logged here.</p>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Content Summary */}
                <div className="border-t pt-3 sm:pt-4">
                  <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Content Summary</h4>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="bg-green-50 p-2 sm:p-3 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Video Recordings</span>
                        <span className="text-base sm:text-lg font-bold text-green-600">
                          {selectedItemForHistory.recordings?.length || selectedItemForHistory.videos?.length || 0}
                        </span>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-2 sm:p-3 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Screenshots</span>
                        <span className="text-base sm:text-lg font-bold text-blue-600">
                          {selectedItemForHistory.screenshots?.length || selectedItemForHistory.images?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Share Link */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm font-medium block mb-2">Share Link:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-white p-2 rounded text-xs flex-1 border">
                      {(() => {
                        let fullLink;
                        
                        // For resident uploads (accessCode), use the shortened URL with address parameters
                        if (selectedItemForHistory.accessCode) {
                          const urlParams = new URLSearchParams();
                          
                          // Add house number if available
                          if (selectedItemForHistory.house_name_number && selectedItemForHistory.house_name_number.trim() !== '') {
                            urlParams.append('house_number', selectedItemForHistory.house_name_number.trim());
                          }
                          
                          // Add flat number if available
                          if (selectedItemForHistory.flat_apartment_room && selectedItemForHistory.flat_apartment_room.trim() !== '') {
                            urlParams.append('flat_number', selectedItemForHistory.flat_apartment_room.trim());
                          }
                          
                          // Add postcode if available (check all possible fields)
                          const postcode = selectedItemForHistory.post_code || selectedItemForHistory.postCode || selectedItemForHistory.actualPostCode;
                          if (postcode && postcode.trim() !== '') {
                            urlParams.append('postcode', postcode.trim());
                          }
                          
                          // Build the shortened URL for residents
                          const baseUrl = `${window.location.origin}/${selectedItemForHistory.accessCode}`;
                          const paramString = urlParams.toString();
                          fullLink = paramString ? `${baseUrl}?${paramString}` : baseUrl;
                        } else {
                          // For landlord meetings (meeting_id), use the generateShareLink function
                          fullLink = generateShareLink(selectedItemForHistory.meeting_id);
                        }
                        
                        // Limit display to 50 characters with "...." for the rest
                        return fullLink.length > 50 ? `${fullLink.substring(0, 50)}....` : fullLink;
                      })()}
                    </code>
                    <button
                      onClick={() => {
                        let shareLink;
                        
                        // For resident uploads (accessCode), use the shortened URL with address parameters
                        if (selectedItemForHistory.accessCode) {
                          const urlParams = new URLSearchParams();
                          
                          // Add house number if available
                          if (selectedItemForHistory.house_name_number && selectedItemForHistory.house_name_number.trim() !== '') {
                            urlParams.append('house_number', selectedItemForHistory.house_name_number.trim());
                          }
                          
                          // Add flat number if available
                          if (selectedItemForHistory.flat_apartment_room && selectedItemForHistory.flat_apartment_room.trim() !== '') {
                            urlParams.append('flat_number', selectedItemForHistory.flat_apartment_room.trim());
                          }
                          
                          // Add postcode if available (check all possible fields)
                          const postcode = selectedItemForHistory.post_code || selectedItemForHistory.postCode || selectedItemForHistory.actualPostCode;
                          if (postcode && postcode.trim() !== '') {
                            urlParams.append('postcode', postcode.trim());
                          }
                          
                          // Build the shortened URL for residents
                          const baseUrl = `${window.location.origin}/${selectedItemForHistory.accessCode}`;
                          const paramString = urlParams.toString();
                          shareLink = paramString ? `${baseUrl}?${paramString}` : baseUrl;
                        } else {
                          // For landlord meetings (meeting_id), use the generateShareLink function
                          shareLink = generateShareLink(selectedItemForHistory.meeting_id);
                        }
                        
                        navigator.clipboard.writeText(shareLink);
                        toast.success("Link copied to clipboard!");
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Not selected</p>
              </div>
            )}
          </div>
        </div>
      </DialogComponent>
      {/* Create share Link */}
      <DialogComponent open={shareLinkOpen} setOpen={setShareLinkOpen} isCloseable={true}>
        <div className="w-[400px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <Link className="w-5 h-5 text-white" />
              <h2 className="text-base font-semibold">Share Meeting</h2>
            </div>
            <button
              onClick={() => setShareLinkOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            {selectedMeetingForShare ? (
              <div className="space-y-4">
                {/* Meeting Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Meeting Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">ID:</span> {selectedMeetingForShare.meeting_id}
                    </div>
                    <div>
                      <span className="font-medium">Resident:</span> {selectedMeetingForShare.name || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Address:</span> {selectedMeetingForShare.address || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Share Link */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Share Link</h4>
                  <div className="flex items-center gap-2">
                    <code className="bg-white p-2 rounded text-xs flex-1 border">
                      {(() => {
                        const fullLink = generateShareLink(selectedMeetingForShare.meeting_id);
                        return fullLink.length > 30 ? `${fullLink.substring(0, 30)}.....` : fullLink;
                      })()}
                    </code>
                    <button
                      onClick={() => {
                        if (!selectedMeetingForShare) {
                          toast.error("No meeting selected for sharing");
                          return;
                        }

                        setExportLoading(prev => ({ ...prev, share: true }));

                        const shareLink = generateShareLink(selectedMeetingForShare.meeting_id);

                        try {
                          // Modern browsers with Clipboard API
                          if (navigator.clipboard && window.isSecureContext) {
                            navigator.clipboard.writeText(shareLink);
                            toast.success("Share link copied to clipboard!");
                          }
                          // Fallback for older browsers
                          else {
                            const textArea = document.createElement('textarea');
                            textArea.value = shareLink;
                            textArea.style.position = 'fixed';
                            textArea.style.left = '-999999px';
                            textArea.style.top = '-999999px';
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();

                            try {
                              const successful = document.execCommand('copy');
                              if (successful) {
                                toast.success("Share link copied to clipboard!");
                              } else {
                                throw new Error('Copy command failed');
                              }
                            } catch (err) {
                              // Final fallback - show the link in a prompt
                              window.prompt('Copy this link:', shareLink);
                              toast.success("Link displayed for manual copy");
                            }

                            document.body.removeChild(textArea);
                          }
                        } catch (error) {
                          console.error('Failed to copy share link:', error);
                          // Ultimate fallback - show in alert
                          window.alert(`Copy this link: ${shareLink}`);
                          toast.error("Please copy the link manually from the alert");
                        } finally {
                          setExportLoading(prev => ({ ...prev, share: false }));
                        }
                      }}
                      disabled={exportLoading.share}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-3 py-2 rounded text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      {exportLoading.share ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Copying...
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Content Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {selectedMeetingForShare.recordings?.length || 0}
                      </div>
                      <div className="text-xs text-gray-600">Videos</div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {selectedMeetingForShare.screenshots?.length || 0}
                      </div>
                      <div className="text-xs text-gray-600">Screenshots</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No meeting selected</p>
              </div>
            )}
          </div>
        </div>
      </DialogComponent>
      <DialogComponent open={addUserOpen} setOpen={setAddUserOpen} isCloseable={true} heading={"Add User"}>
        <div className="w-[500px] p-4 flex flex-col items-center max-h-[80vh] overflow-y-auto">
          <form className='w-full relative py-0 space-y-5 mt-2'>
            <input
              type="email"
              placeholder="Enter user email address"
              className={`w-full px-4 py-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white`}
              // value, onChange to be implemented
              autoComplete="off"
            />
            <div>
              <label className='font-medium text-black mb-2 block'>Select a role</label>
              <div className="relative">
                <select className="w-full bg-amber-500 text-white flex items-center justify-center text-xl font-semibold rounded-md py-2 px-3 appearance-none">
                  <option value="landlord">Social Landlord</option>
                  <option value="automotive">Automotive</option>
                  <option value="charity">Charity</option>
                  <option value="hotel">Hotel/Resort/Accomodation Provider</option>
                  <option value="nhs">NHS/Health Provider</option>
                </select>
                <ChevronDownIcon className="w-5 h-5 text-white absolute right-4 top-1/2 -translate-y-1/2 mr-3 pointer-events-none" />
              </div>
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-3xl transition-colors w-full cursor-pointer mb-2 flex items-center justify-center"
            >
              Add User
            </button>
          </form>
        </div>
      </DialogComponent>
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
                  <input type="radio" name="day" value="today" checked={callbackFormData.day === 'today'} onChange={e => setCallbackFormData(prev => ({ ...prev, day: 'today', customDate: '' }))} className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-700 text-sm">Today</span>
                </label>
                <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                  <input type="radio" name="day" value="tomorrow" checked={callbackFormData.day === 'tomorrow'} onChange={e => setCallbackFormData(prev => ({ ...prev, day: 'tomorrow', customDate: '' }))} className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-700 text-sm">Tomorrow</span>
                </label>
                <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                  <input type="radio" name="day" value="custom" checked={callbackFormData.day === 'custom'} onChange={e => setCallbackFormData(prev => ({ ...prev, day: 'custom' }))} className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-700 text-sm">Or pick a date:</span>
                  <input type="date" name="customDate" value={callbackFormData.customDate} onChange={e => setCallbackFormData(prev => ({ ...prev, customDate: e.target.value, day: 'custom' }))} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-purple-500 text-sm" />
                </label>
                <div className="flex flex-col bg-gray-50 p-2 rounded-lg w-full mt-2">
                  <span className="text-gray-700 text-xs font-medium mb-2">Pick a time</span>
                  <div className="flex items-center gap-2">
                    <select name="customHour" value={callbackFormData.customHour} onChange={handleCallbackInputChange} className="flex-1 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-purple-500 text-xs bg-white">
                      {Array.from({ length: 12 }, (_, i) => {
                        const hour = i + 8;
                        const display = hour.toString().padStart(2, '0');
                        return <option key={hour} value={display}>{display}</option>;
                      })}
                    </select>
                    <select name="customMinute" value={callbackFormData.customMinute} onChange={handleCallbackInputChange} className="flex-1 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-purple-500 text-xs bg-white">
                      {Array.from({ length: 60 }, (_, i) => {
                        const minute = i;
                        const display = minute.toString().padStart(2, '0');
                        return <option key={minute} value={display}>{display}</option>;
                      })}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Message</label>
              <textarea name="message" value={callbackFormData.message} onChange={handleCallbackInputChange} placeholder="Enter your message" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm h-24 resize-none" />
            </div>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Your Name *</label>
              <input type="text" name="name" value={callbackFormData.name} onChange={handleCallbackInputChange} placeholder="Enter your name" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm" required />
            </div>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Your email address *</label>
              <input type="email" name="email" value={callbackFormData.email} onChange={handleCallbackInputChange} placeholder="Enter your email address" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm" required />
            </div>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Your phone *</label>
              <input type="tel" name="phone" value={callbackFormData.phone} onChange={handleCallbackInputChange} placeholder="Enter your phone number" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm" required />
            </div>
            <button type="submit" disabled={callbackLoading} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 w-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
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
              <input type="text" name="name" value={meetingFormData.name} onChange={handleMeetingInputChange} placeholder="Enter your name" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm" required />
            </div>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Your email address *</label>
              <input type="email" name="email" value={meetingFormData.email} onChange={handleMeetingInputChange} placeholder="Enter your email address" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm" required />
            </div>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Pick a date & time *</label>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="grid grid-cols-3 gap-3 w-full">
                  <input type="date" name="date" value={meetingFormData.date} onChange={handleMeetingInputChange} className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white text-sm" required />
                  <select name="hour" value={meetingFormData.hour} onChange={handleMeetingInputChange} className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white text-sm">
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = i + 8;
                      const display = hour.toString().padStart(2, '0');
                      return <option key={hour} value={display}>{display}:00</option>;
                    })}
                  </select>
                  <select name="minute" value={meetingFormData.minute} onChange={handleMeetingInputChange} className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white text-sm">
                    {Array.from({ length: 60 }, (_, i) => {
                      const minute = i;
                      const display = minute.toString().padStart(2, '0');
                      return <option key={minute} value={display}>{display}</option>;
                    })}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-start flex-col gap-3">
              <label className="text-gray-800 font-semibold text-sm">Message</label>
              <textarea name="message" value={meetingFormData.message} onChange={handleMeetingInputChange} placeholder="Enter your message" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm h-24 resize-none" />
            </div>
            <button type="submit" disabled={isLoading} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 w-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
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

      {/* View Tickets Modal */}
      <DialogComponent open={viewTicketsOpen} setOpen={setViewTicketsOpen} isCloseable={true}>
        <div className="w-[500px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            {/* Back Arrow */}
            <button
              onClick={() => {
                if (showTicketDetails) {
                  setShowTicketDetails(false);
                  setSelectedTicket(null);
                } else {
                  setViewTicketsOpen(false);
                  setTickerOpen(true); // Open raise support ticket when going back
                }
              }}
              aria-label="Back to Raise Support Ticket"
              className="absolute left-4 text-white hover:text-gray-200 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">
                {showTicketDetails ? 'Ticket Details' : 'My Support Tickets'}
              </h2>
            </div>
            
            <button
              onClick={() => setViewTicketsOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            {showTicketDetails ? (
              // Simple & Clean Ticket Details View
              <div className="max-w-2xl mx-auto">
                {selectedTicket && (
                  <div className="space-y-6">
                    {/* Simple Header */}
                    <div className="text-center pb-4 border-b border-gray-200">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        {selectedTicket.status || 'Open'}
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedTicket.category || 'Support Ticket'}
                      </h2>
                      <p className="text-gray-500 text-sm">
                        Created {ticketUtils.formatTicketAge(selectedTicket.createdAt)}
                      </p>
                    </div>

                    {/* Ticket Content */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3 text-lg">Query</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {selectedTicket.subject || selectedTicket.description}
                      </p>
                    </div>

                    {/* Simple Attachments with Image Preview */}
                    {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 text-lg">Files</h3>
                        <div className="space-y-4">
                          {selectedTicket.attachments.map((file, index) => (
                            <div key={index} className="space-y-3">
                              {/* File Info */}
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{file.originalName || file.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={async () => {
                                      if (confirm('Delete this file?')) {
                                        try {
                                          await deleteAttachment(selectedTicket._id || selectedTicket.id, file._id);
                                          toast("File deleted");
                                          loadUserTickets();
                                        } catch (error) {
                                          toast("Failed to delete file");
                                        }
                                      }
                                    }}
                                    className="px-3 py-1 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              
                              {/* Image Preview */}
                              {file.mimeType && file.mimeType.startsWith('image/') && file.filePath && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <img 
                                    src={file.filePath} 
                                    alt={file.originalName || file.name}
                                    className="w-full h-auto max-h-64 object-contain rounded-lg border border-gray-200"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Simple Actions */}
                    <div className="flex gap-3 pt-6">
                      <button
                        onClick={() => {
                          setViewTicketsOpen(false);
                          setTickerOpen(true);
                        }}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
                      >
                        New Ticket
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Delete this ticket permanently?')) {
                            try {
                              await deleteTicket(selectedTicket._id || selectedTicket.id);
                              toast("Ticket deleted");
                              setShowTicketDetails(false);
                              setSelectedTicket(null);
                              loadUserTickets();
                            } catch (error) {
                              toast("Failed to delete ticket");
                            }
                          }
                        }}
                        className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-medium"
                      >
                        Delete Ticket
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Ticket List View
              <>
                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={ticketSearchQuery || ''}
                      onChange={(e) => setTicketSearchQuery(e.target.value)}
                    />
                    <FileSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {ticketsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span className="ml-2 text-gray-600">Loading tickets...</span>
                  </div>
                ) : userTickets.filter(ticket => {
                  if (!ticketSearchQuery) return true;
                  const query = ticketSearchQuery.toLowerCase();
                  return (
                    ticket.subject?.toLowerCase().includes(query) ||
                    ticket.description?.toLowerCase().includes(query) ||
                    ticket.category?.toLowerCase().includes(query) ||
                    ticket.ticketId?.toLowerCase().includes(query) ||
                    ticket.status?.toLowerCase().includes(query)
                  );
                }).length === 0 ? (
                  <div className="text-center py-8">
                    <FileSearch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No tickets found matching your search</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your search terms</p>
                  </div>
                ) : userTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No support tickets found</p>
                    <p className="text-sm text-gray-400 mt-1">Create a new ticket to get help</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userTickets
                      .filter(ticket => {
                        if (!ticketSearchQuery) return true;
                        const query = ticketSearchQuery.toLowerCase();
                        return (
                          ticket.subject?.toLowerCase().includes(query) ||
                          ticket.description?.toLowerCase().includes(query) ||
                          ticket.category?.toLowerCase().includes(query) ||
                          ticket.ticketId?.toLowerCase().includes(query) ||
                          ticket.status?.toLowerCase().includes(query)
                        );
                      })
                      .map((ticket) => (
                      <div 
                        key={ticket._id || ticket.id} 
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white hover:bg-gray-50"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowTicketDetails(true);
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="mb-1">
                              <h3 className="font-semibold text-gray-900">{ticket.category}</h3>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>Created: {ticketUtils.formatTicketAge(ticket.createdAt)}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${ticketUtils.getStatusColor(ticket.status)}`}>
                                {ticket.status}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                        
                        {ticket.attachments && ticket.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Attachments: {ticket.attachments.length}</span>
                              <div className="flex gap-1">
                                {ticket.attachments.slice(0, 3).map((attachment, idx) => (
                                  <span key={idx} className="text-xs bg-gray-200 px-2 py-1 rounded">
                                    {attachment.originalName ? attachment.originalName.split('.').pop().toUpperCase() : 'FILE'}
                                  </span>
                                ))}
                                {ticket.attachments.length > 3 && (
                                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                    +{ticket.attachments.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Escalate Ticket Button */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); 
                              setSelectedTicketForChat(ticket);
                              setAdminChatOpen(true);
                            }}
                            className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-xs flex items-center justify-center gap-2"
                          >
                            <MailIcon className="w-3 h-3" />
                            Escalate Ticket
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DialogComponent>

      <AdminChatScreen 
        isOpen={adminChatOpen}
        onClose={() => {
          setAdminChatOpen(false);
          setSelectedTicketForChat(null);
        }}
        ticketInfo={selectedTicketForChat}
      />

    </DialogContext.Provider>
  );
};

export default DialogProvider;
