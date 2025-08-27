import express from 'express';
const router = express.Router();
import {changePassword, loadme, login, logout, register, updateUser,forgotPassword,resetPassword, verify, resetPasswordFromDashboard, updateUserLogo, updateLandlordInfo, updateMessageSettings, getMessageSettings, createFolder, updateFolder, deleteFolder, moveFolderToTrash, restoreFolderFromTrash, getFolders, assignMeetingToFolder, getMeetingFolders, updatePaginationSettings, getPaginationSettings, registerResident, getAllUsersByRole, getUserById, deleteUser, restoreUser, permanentDeleteUser, freezeUser, suspendUser, activateUser, updateUserDetails, getUserStats } from './controllers/authController.js';
import { requestDemo } from './controllers/demoController.js';
import { saveChatSession, getChatSessions, getChatSession, deleteChatSession, updateChatSessionTitle, updateMessageFeedback } from './controllers/chatHistoryController.js';
import { createUpload, createUploadSession, uploadFile, completeUpload, getUploadProgress, getUploadByAccessCode, getMyUploads, getMyLatestUpload, deleteUpload, restoreUpload, permanentDeleteUpload, getMyTrashedUploads, markNotificationSent, checkNotificationStatus, searchUploads, recordVisitorAccess } from './controllers/uploadController.js';
import {isAuthenticate} from "./middlewares/auth.js"
import { create, getAllMeetings, getMeetingById, updateMeetingController, deleteMeeting, getMeetingForShare, getMeetingByMeetingId, deleteRecording, deleteScreenshot, archiveMeeting, unarchiveMeeting, getArchivedCount, recordVisitorAccess as recordMeetingVisitorAccess, restoreMeeting, permanentDeleteMeeting, searchMeetings, getSpecialNotes, saveSpecialNotes, getStructuredSpecialNotes, saveStructuredSpecialNotes } from './controllers/meetingController.js';
import { saveFeedback, removeFeedback, getUserFeedback, getFeedbackStats } from './controllers/feedbackController.js';
import { getUserRoomInfo } from './controllers/userRoomInfoController.js';
import Upload from './models/upload.js';

// Company controller import
import { createCompany, getAllCompanies, getCompanyById, updateCompany, deleteCompany, getCompanyStats, changeTemporaryPassword, checkTemporaryPasswordStatus, testCompanyController, migrateExistingUsers, getCompanyUsers, getCompanyMeetings, getCompanyUploads, getCompanyDashboardStats, getCompanyProfile } from './controllers/companyController.js';

// Support Ticket controller import
import { createSupportTicket, getUserTickets, getTicketById, updateTicket, deleteTicket, getAllTickets, adminUpdateTicket, adminUpdateTicketComprehensive, getSuperAdminAllTickets, getDashboardStats, getTicketStats, bulkUpdateTickets, searchTickets, exportTickets, deleteAttachment } from './controllers/supportTicketController.js';

// Analyzer controller import
import { createSession, uploadImages, saveResults, updateFeedback, getSession, getUserSessions, deleteSession, getStats, getAllSessions } from './controllers/analyzerController.js';

// Chat controller import
import { getChatHistory, saveChatMessage, saveMediaMessage, getChatStats } from './controllers/chatController.js';

// Callback Request controller import
import { createCallbackRequest, getAllCallbackRequests, getCallbackRequestById, updateCallbackRequestStatus, addContactAttempt, deleteCallbackRequest, getCallbackRequestStats } from './controllers/callbackRequestController.js';

// Demo Meeting controller import
import { createDemoMeetingRequest, getAllDemoMeetingRequests, getDemoMeetingRequestById, updateDemoMeetingRequest, rescheduleDemoMeeting, deleteDemoMeetingRequest, getDemoMeetingStats } from './controllers/demoMeetingController.js';

// Socket service import for online users
import { getOnlineUsersForSuperadmin, getAdminWaitingRooms } from './services/socketService.js';

router.route('/register').post(register);
router.route('/register-resident').post(registerResident);
router.route('/login').post(login);
router.route('/verify').post(verify);
router.route('/me').get(isAuthenticate,loadme);
router.route('/logout').get(logout);
router.route('/user/update').put(isAuthenticate,updateUser);
router.route('/user/change-password').put(isAuthenticate,changePassword);
router.route('/forgot-password').post(forgotPassword);
router.route('/reset-password/:token').put(resetPassword);
router.route('/user/reset-password').put(isAuthenticate, resetPasswordFromDashboard);
router.route('/user/update-logo').put(isAuthenticate, updateUserLogo);
router.route('/user/update-landlord-info').put(isAuthenticate, updateLandlordInfo);
router.route('/user/message-settings').put(isAuthenticate, updateMessageSettings);
router.route('/user/message-settings').get(isAuthenticate, getMessageSettings);
router.route('/user/pagination-settings').put(isAuthenticate, updatePaginationSettings);
router.route('/user/pagination-settings').get(isAuthenticate, getPaginationSettings);
router.route('/users/all').get(isAuthenticate, getAllUsersByRole);
router.route('/users/online').get(isAuthenticate, (req, res) => {
  // Only superadmins can access online users
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Only superadmins can access online users'
    });
  }
  
  try {
    const onlineUsers = getOnlineUsersForSuperadmin();
    res.json({
      success: true,
      data: onlineUsers
    });
  } catch (error) {
    console.error('Error getting online users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching online users'
    });
  }
});

// Debug endpoint for socket status (development only)
router.route('/debug/socket-status').get((req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      message: 'Debug endpoint only available in development'
    });
  }
  
  try {
    const adminWaitingRooms = getAdminWaitingRooms();
    res.json({
      success: true,
      data: {
        adminWaitingRooms,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting socket status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching socket status'
    });
  }
});
router.route('/users/:id').get(isAuthenticate, getUserById);
router.route('/users/:id').put(isAuthenticate, updateUser);
router.route('/users/:id').delete(isAuthenticate, deleteUser);
router.route('/users/restore/:id').put(isAuthenticate, restoreUser);
router.route('/users/permanent/:id').delete(isAuthenticate, permanentDeleteUser);
router.route('/users/:id/freeze').put(isAuthenticate, freezeUser);
router.route('/users/:id/suspend').put(isAuthenticate, suspendUser);
router.route('/users/:id/activate').put(isAuthenticate, activateUser);
router.route('/users/:id/details').put(isAuthenticate, updateUserDetails);
router.route('/users/:id/stats').get(isAuthenticate, getUserStats);
router.route('/dashboard/stats').get(isAuthenticate, async (req, res) => {
  // Only superadmins can access dashboard stats
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Only superadmins can access dashboard stats'
    });
  }
  
  try {
    // Import models
    const User = (await import('./models/user.js')).default;
    const Company = (await import('./models/company.js')).default;
    const Meeting = (await import('./models/meetings.js')).default;
    const Upload = (await import('./models/upload.js')).default;
    const SupportTicket = (await import('./models/supportTicket.js')).default;
    
    // Get counts in parallel for better performance
    const [totalUsers, totalCompanies, totalMeetings, totalUploads, totalTickets, systemHealth] = await Promise.all([
      User.countDocuments({ deleted: { $ne: true } }),
      Company.countDocuments({ deleted: { $ne: true } }),
      Meeting.countDocuments({ deleted: { $ne: true } }),
      Upload.countDocuments({ deleted: { $ne: true } }),
      SupportTicket.countDocuments({ deleted: { $ne: true } }),
      Promise.resolve('healthy') // You can add real system health check here
    ]);
    
    res.json({
      success: true,
      data: {
        totalUsers,
        totalCompanies,
        totalMeetings,
        totalUploads,
        totalTickets,
        systemHealth,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats'
    });
  }
});
router.route('/request-demo').post(requestDemo);

router.route('/chat/sessions').get(isAuthenticate, getChatSessions);
router.route('/chat/sessions').post(isAuthenticate, saveChatSession);
router.route('/chat/sessions/:sessionId').get(isAuthenticate, getChatSession);
router.route('/chat/sessions/:sessionId').delete(isAuthenticate, deleteChatSession);
router.route('/chat/sessions/:sessionId/title').put(isAuthenticate, updateChatSessionTitle);
router.route('/chat/sessions/:sessionId/messages/:messageId/feedback').put(isAuthenticate, updateMessageFeedback);

router.route('/folders').get(isAuthenticate, getFolders);
router.route('/folders').post(isAuthenticate, createFolder);
router.route('/folders/:folderId').put(isAuthenticate, updateFolder);
router.route('/folders/:folderId').delete(isAuthenticate, deleteFolder);
router.route('/folders/:folderId/trash').put(isAuthenticate, moveFolderToTrash);
router.route('/folders/:folderId/restore').put(isAuthenticate, restoreFolderFromTrash);
router.route('/folders/assign-meeting').post(isAuthenticate, assignMeetingToFolder);
router.route('/folders/meeting-assignments').get(isAuthenticate, getMeetingFolders);

router.route('/meetings/create').post(isAuthenticate, create);
router.route('/meetings/all').get(isAuthenticate, getAllMeetings);
router.route('/meetings/archived-count').get(isAuthenticate, getArchivedCount);
router.route('/meetings/search').post(isAuthenticate, searchMeetings);
router.route('/meetings/:id').get(isAuthenticate, getMeetingById);
router.route('/meetings/:id').put(isAuthenticate, updateMeetingController);
router.route('/meetings/:id').delete(isAuthenticate, deleteMeeting);
router.route('/meetings/:id/archive').put(isAuthenticate, archiveMeeting);
router.route('/meetings/:id/unarchive').put(isAuthenticate, unarchiveMeeting);
router.route('/meetings/restore/:id').put(isAuthenticate, restoreMeeting);
router.route('/meetings/permanent/:id').delete(isAuthenticate, permanentDeleteMeeting);
router.route('/meetings/by-meeting-id/:id').get(isAuthenticate, getMeetingByMeetingId);
router.route('/meetings/:meetingId/recordings/:recordingId').delete(isAuthenticate, deleteRecording);
router.route('/meetings/:meetingId/screenshots/:screenshotId').delete(isAuthenticate, deleteScreenshot);

router.route('/meetings/:meeting_id/special-notes')
  .get(isAuthenticate, getSpecialNotes)
  .post(isAuthenticate, saveSpecialNotes);

router.get('/meetings/:meeting_id/structured-special-notes', isAuthenticate, getStructuredSpecialNotes);
router.patch('/meetings/:meeting_id/structured-special-notes', isAuthenticate, saveStructuredSpecialNotes);

router.route('/meetings/share/:id').get(getMeetingForShare);

router.route('/meetings/share/:id/access').post(recordMeetingVisitorAccess);

router.route('/get-token-info/:token').get((req, res) => {
    try {
        const { token } = req.params;
        const { landlordName, profileImage, landlordLogo } = req.query;
        
        const tokenInfo = {};
        
        if (landlordName) tokenInfo.landlordName = landlordName;
        if (profileImage) tokenInfo.profileImage = profileImage;
        if (landlordLogo) tokenInfo.landlordLogo = landlordLogo;
        
        res.json({
            success: true,
            tokenInfo: Object.keys(tokenInfo).length > 0 ? tokenInfo : null
        });
    } catch (error) {
        console.error('Error getting token info:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving token info'
        });
    }
});

router.get('/room-user-info', getUserRoomInfo);
router.route('/uploads/my').get(isAuthenticate, getMyUploads);
router.route('/uploads/my-latest').get(isAuthenticate, getMyLatestUpload);
router.route('/uploads/trash').get(isAuthenticate, getMyTrashedUploads);
router.route('/uploads/:id').delete(isAuthenticate, deleteUpload);
router.route('/uploads/restore/:id').put(isAuthenticate, restoreUpload);
router.route('/uploads/permanent/:id').delete(isAuthenticate, permanentDeleteUpload);
router.route('/uploads/notification/check').get(isAuthenticate, checkNotificationStatus);
router.route('/uploads/notification/mark-sent/:accessCode').post(markNotificationSent);
router.route('/uploads/search').post(isAuthenticate, searchUploads);

router.route('/upload/session').post(createUploadSession);
router.route('/upload/file/:sessionId').post(uploadFile);
router.route('/upload/complete/:sessionId').post(completeUpload);
router.route('/upload/progress/:sessionId').get(getUploadProgress);

router.route('/upload').post(createUpload);
router.route('/upload/:accessCode').get(getUploadByAccessCode);

router.route('/upload/:accessCode/access').post(recordVisitorAccess);

router.post('/validate-access-code', async (req, res) => {
  const { code, house, postcode } = req.body;
  
  if (!code || !house || !postcode) {
    return res.status(400).json({ valid: false, message: 'All fields are required.' });
  }
  
  try {
    const upload = await Upload.findOne({ accessCode: code });
    
    if (!upload) {
      return res.status(404).json({ valid: false, message: 'Code not found' });
    }
    
    const houseMatch = (upload.house_name_number && upload.house_name_number.trim().toLowerCase() === house.trim().toLowerCase()) ||
                      (upload.flat_apartment_room && upload.flat_apartment_room.trim().toLowerCase() === house.trim().toLowerCase());
    
    const postcodeMatch = (upload.actualPostCode && upload.actualPostCode.trim().toLowerCase() === postcode.trim().toLowerCase()) ||
                         (upload.postCode && upload.postCode.trim().toLowerCase() === postcode.trim().toLowerCase());
    
    if (houseMatch && postcodeMatch) {
      return res.json({ valid: true, accessCode: code });
    }
    
    return res.status(403).json({ valid: false, message: 'Details do not match' });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ valid: false, message: 'Server error' });
  }
});

// Test route for company controller
router.get('/companies/test', testCompanyController);

// Company routes - Admin or Superadmin only
router.post('/companies/create', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin or superadmin can perform this operation'
        });
    }
}, createCompany);

router.get('/companies/all', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin or superadmin can perform this operation'
        });
    }
}, getAllCompanies);

router.get('/companies/stats', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin or superadmin can perform this operation'
        });
    }
}, getCompanyStats);

router.get('/companies/:id', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin or superadmin can perform this operation'
        });
    }
}, getCompanyById);

router.put('/companies/:id', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin or superadmin can perform this operation'
        });
    }
}, updateCompany);

router.delete('/companies/:id', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin or superadmin can perform this operation'
        });
    }
}, deleteCompany);

// Route for users to change their temporary passwords
router.post('/companies/change-temporary-password', isAuthenticate, changeTemporaryPassword);

// Route for users to check their temporary password status
router.get('/companies/check-temporary-password', isAuthenticate, checkTemporaryPasswordStatus);

// Migration route for existing users (Superadmin only)
router.post('/companies/migrate-users', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'superadmin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only superadmin can perform user migration'
        });
    }
}, migrateExistingUsers);

// Company Admin Dashboard Routes
router.get('/company-admin/dashboard/stats', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'company-admin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only company-admin can access this dashboard'
        });
    }
}, getCompanyDashboardStats);

router.get('/company-admin/dashboard/users', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'company-admin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only company-admin can access this dashboard'
        });
    }
}, getCompanyUsers);

router.get('/company-admin/dashboard/meetings', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'company-admin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only company-admin can access this dashboard'
        });
    }
}, getCompanyMeetings);

router.get('/company-admin/dashboard/uploads', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'company-admin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only company-admin can access this dashboard'
        });
    }
}, getCompanyUploads);

router.get('/company-admin/dashboard/company', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'company-admin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only company-admin can access this dashboard'
        });
    }
}, getCompanyProfile);

// Support Ticket Routes
// User routes (authenticated users)
router.post('/support-tickets/create', isAuthenticate, createSupportTicket);
router.get('/support-tickets/my-tickets', isAuthenticate, getUserTickets);
router.get('/support-tickets/ticket/:id', isAuthenticate, getTicketById);
router.put('/support-tickets/ticket/:id', isAuthenticate, updateTicket);
router.delete('/support-tickets/ticket/:id', isAuthenticate, deleteTicket);
router.delete('/support-tickets/:ticketId/attachments/:attachmentId', isAuthenticate, deleteAttachment);

// Admin routes (admin, superadmin, company-admin)
router.get('/support-tickets/admin/all', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'company-admin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin, superadmin, or company-admin can perform this operation'
        });
    }
}, getAllTickets);

// New admin update route for super admin
router.put('/support-tickets/admin/update/:id', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin or superadmin can perform this operation'
        });
    }
}, adminUpdateTicketComprehensive);

// Super admin: Get ALL tickets without restrictions
router.get('/support-tickets/superadmin/all', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'superadmin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only superadmin can perform this operation'
        });
    }
}, getSuperAdminAllTickets);

// Fast stats route for super admin
router.get('/support-tickets/admin/fast-stats', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin or superadmin can perform this operation'
        });
    }
}, getDashboardStats);

router.put('/support-tickets/admin/ticket/:id', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'company-admin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin, superadmin, or company-admin can perform this operation'
        });
    }
}, adminUpdateTicket);

router.get('/support-tickets/admin/stats', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'company-admin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin, superadmin, or company-admin can perform this operation'
        });
    }
}, getTicketStats);

router.put('/support-tickets/admin/bulk-update', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'company-admin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin, superadmin, or company-admin can perform this operation'
        });
    }
}, bulkUpdateTickets);

router.get('/support-tickets/admin/search', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'company-admin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin, superadmin, or company-admin can perform this operation'
        });
    }
}, searchTickets);

router.get('/support-tickets/admin/export', isAuthenticate, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'company-admin') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Only admin, superadmin, or company-admin can perform this operation'
        });
    }
}, exportTickets);

// Search route (available to all authenticated users)
router.get('/support-tickets/search', isAuthenticate, searchTickets);

// Callback Request routes
router.post('/callback-requests', createCallbackRequest); // Public route
router.get('/callback-requests', isAuthenticate, getAllCallbackRequests); // Protected route
router.get('/callback-requests/:id', isAuthenticate, getCallbackRequestById);
router.put('/callback-requests/:id', isAuthenticate, updateCallbackRequestStatus);
router.post('/callback-requests/:id/contact-attempt', isAuthenticate, addContactAttempt);
router.delete('/callback-requests/:id', isAuthenticate, deleteCallbackRequest);
router.get('/callback-requests/stats', isAuthenticate, getCallbackRequestStats);

// Demo Meeting routes
router.post('/demo-meetings', createDemoMeetingRequest); // Public route
router.get('/demo-meetings', isAuthenticate, getAllDemoMeetingRequests); // Protected route
router.get('/demo-meetings/:id', isAuthenticate, getDemoMeetingRequestById);
router.put('/demo-meetings/:id', isAuthenticate, updateDemoMeetingRequest);
router.post('/demo-meetings/:id/reschedule', isAuthenticate, rescheduleDemoMeeting);
router.delete('/demo-meetings/:id', isAuthenticate, deleteDemoMeetingRequest);
router.get('/demo-meetings/stats', isAuthenticate, getDemoMeetingStats);

// Feedback routes
router.post('/feedback/save', isAuthenticate, saveFeedback);
router.post('/feedback/remove', isAuthenticate, removeFeedback);
router.get('/feedback/user/:userEmail', isAuthenticate, getUserFeedback);
router.get('/feedback/stats', isAuthenticate, getFeedbackStats);

// Chat routes
router.get('/chat/history/:ticketId', isAuthenticate, getChatHistory);
router.post('/chat/message', isAuthenticate, saveChatMessage);
router.post('/chat/media', isAuthenticate, saveMediaMessage);
router.get('/chat/stats/:ticketId', isAuthenticate, getChatStats);

// Backup routes (only for superadmin)
import { createBackup, listBackups, downloadBackup, deleteBackup, getBackupStats } from './controllers/backupController.js';

router.post('/backup/create', isAuthenticate, (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Only superadmin can perform backup operations'
        });
    }
    next();
}, createBackup);

router.get('/backup/list', isAuthenticate, (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Only superadmin can access backup information'
        });
    }
    next();
}, listBackups);

router.get('/backup/download/:filename', isAuthenticate, (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Only superadmin can download backups'
        });
    }
    next();
}, downloadBackup);

router.delete('/backup/:filename', isAuthenticate, (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Only superadmin can delete backups'
        });
    }
    next();
}, deleteBackup);

router.get('/backup/stats', isAuthenticate, (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Only superadmin can access backup statistics'
        });
    }
    next();
}, getBackupStats);

// Analyzer routes
router.post('/analyzer/session', createSession); // Public route
router.post('/analyzer/upload-images', uploadImages); // Public route
router.post('/analyzer/save-results', saveResults); // Public route
router.post('/analyzer/feedback', updateFeedback); // Public route
router.get('/analyzer/session/:sessionId', getSession); // Public route
router.delete('/analyzer/session/:sessionId', deleteSession); // Public route

// Superadmin analyzer routes (MUST come before the more general route)
router.get('/analyzer/sessions/all', isAuthenticate, (req, res, next) => {
  if (req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Only superadmin can access all analyzer sessions'
    });
  }
}, getAllSessions);

router.get('/analyzer/sessions/:userEmail', getUserSessions); // Public route - MUST come after /all

router.get('/analyzer/stats', isAuthenticate, (req, res, next) => {
  if (req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Only superadmin can access analyzer statistics'
    });
  }
}, getStats); // Protected route for superadmin stats


export default router;