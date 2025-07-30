import express from 'express';
const router = express.Router();
import {changePassword, loadme, login, logout, register, updateUser,forgotPassword,resetPassword, verify, sendFriendLink, resetPasswordFromDashboard, sendFeedback, raiseSupportTicket, updateUserLogo, updateLandlordInfo, bookDemoMeeting, requestCallback, updateMessageSettings, getMessageSettings, createFolder, updateFolder, deleteFolder, moveFolderToTrash, restoreFolderFromTrash, getFolders, assignMeetingToFolder, getMeetingFolders, updatePaginationSettings, getPaginationSettings, registerResident } from './controllers/authController.js';
import { createUpload, createUploadSession, uploadFile, completeUpload, getUploadProgress, getUploadByAccessCode, getMyUploads, getMyLatestUpload, deleteUpload, restoreUpload, permanentDeleteUpload, getMyTrashedUploads, markNotificationSent, checkNotificationStatus, searchUploads, recordVisitorAccess } from './controllers/uploadController.js';
import {isAuthenticate} from "./middlewares/auth.js"
import { create, getAllMeetings, getMeetingById, updateMeetingController, deleteMeeting, getMeetingForShare, getMeetingByMeetingId, deleteRecording, deleteScreenshot, archiveMeeting, unarchiveMeeting, getArchivedCount, recordVisitorAccess as recordMeetingVisitorAccess, restoreMeeting, permanentDeleteMeeting, searchMeetings, getSpecialNotes, saveSpecialNotes, getStructuredSpecialNotes, saveStructuredSpecialNotes } from './controllers/meetingController.js';
import { getUserRoomInfo } from './controllers/userRoomInfoController.js';
import Upload from './models/upload.js';

// auth routes
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
router.route('/send-friend-link').post(isAuthenticate, sendFriendLink);
router.route('/user/reset-password').put(isAuthenticate, resetPasswordFromDashboard);
router.route('/send-feedback').post(isAuthenticate, sendFeedback);
router.route('/raise-support-ticket').post(isAuthenticate, raiseSupportTicket);
router.route('/request-callback').post(requestCallback);
router.route('/user/update-logo').put(isAuthenticate, updateUserLogo);
router.route('/user/update-landlord-info').put(isAuthenticate, updateLandlordInfo);
router.route('/user/message-settings').put(isAuthenticate, updateMessageSettings);
router.route('/user/message-settings').get(isAuthenticate, getMessageSettings);
router.route('/user/pagination-settings').put(isAuthenticate, updatePaginationSettings);
router.route('/user/pagination-settings').get(isAuthenticate, getPaginationSettings);
router.route('/book-demo-meeting').post(bookDemoMeeting);

// Folder management routes
router.route('/folders').get(isAuthenticate, getFolders);
router.route('/folders').post(isAuthenticate, createFolder);
router.route('/folders/:folderId').put(isAuthenticate, updateFolder);
router.route('/folders/:folderId').delete(isAuthenticate, deleteFolder);
router.route('/folders/:folderId/trash').put(isAuthenticate, moveFolderToTrash);
router.route('/folders/:folderId/restore').put(isAuthenticate, restoreFolderFromTrash);
router.route('/folders/assign-meeting').post(isAuthenticate, assignMeetingToFolder);
router.route('/folders/meeting-assignments').get(isAuthenticate, getMeetingFolders);

// meeting routes
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

// Special Notes routes
router.route('/meetings/:meeting_id/special-notes')
  .get(isAuthenticate, getSpecialNotes)
  .post(isAuthenticate, saveSpecialNotes);

// Structured Special Notes routes
router.get('/meetings/:meeting_id/structured-special-notes', isAuthenticate, getStructuredSpecialNotes);
router.patch('/meetings/:meeting_id/structured-special-notes', isAuthenticate, saveStructuredSpecialNotes);

// Public route for sharing meetings (no authentication required)
router.route('/meetings/share/:id').get(getMeetingForShare);

// New public route for recording visitor access (no authentication required)
router.route('/meetings/share/:id/access').post(recordMeetingVisitorAccess);

// Add route to get token info for profile data
router.route('/get-token-info/:token').get((req, res) => {
    try {
        const { token } = req.params;
        const { landlordName, profileImage, landlordLogo } = req.query;
        
        console.log(`ℹ️ Token info request for: ${token}`);
        
        // This is a simple implementation - you might want to store token data in a database
        // For now, we'll extract from URL parameters that were sent with the token
        const tokenInfo = {};
        
        if (landlordName) tokenInfo.landlordName = landlordName;
        if (profileImage) tokenInfo.profileImage = profileImage;
        if (landlordLogo) tokenInfo.landlordLogo = landlordLogo;
        
        if (Object.keys(tokenInfo).length > 0) {
            console.log(`✅ Found token info for: ${token}`);
        } else {
            console.log(`ℹ️ No token-specific info found for: ${token} (using default profile)`);
        }
        
        res.json({
            success: true,
            tokenInfo: Object.keys(tokenInfo).length > 0 ? tokenInfo : null
        });
    } catch (error) {
        console.error('❌ Error getting token info:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving token info'
        });
    }
});

router.get('/room-user-info', getUserRoomInfo);
// upload routes
router.route('/uploads/my').get(isAuthenticate, getMyUploads);
router.route('/uploads/my-latest').get(isAuthenticate, getMyLatestUpload);
router.route('/uploads/trash').get(isAuthenticate, getMyTrashedUploads);
router.route('/uploads/:id').delete(isAuthenticate, deleteUpload);
router.route('/uploads/restore/:id').put(isAuthenticate, restoreUpload);
router.route('/uploads/permanent/:id').delete(isAuthenticate, permanentDeleteUpload);
router.route('/uploads/notification/check').get(isAuthenticate, checkNotificationStatus);
router.route('/uploads/notification/mark-sent/:accessCode').post(markNotificationSent);
router.route('/uploads/search').post(isAuthenticate, searchUploads);

// Session-based upload routes
router.route('/upload/session').post(createUploadSession);
router.route('/upload/file/:sessionId').post(uploadFile);
router.route('/upload/complete/:sessionId').post(completeUpload);
router.route('/upload/progress/:sessionId').get(getUploadProgress);

// Legacy upload route (keep for backward compatibility)
router.route('/upload').post(createUpload);
router.route('/upload/:accessCode').get(getUploadByAccessCode);

// New public route for recording visitor access to uploads (no authentication required)
router.route('/upload/:accessCode/access').post(recordVisitorAccess);

// Validate access code, house/flat, and postcode
router.post('/validate-access-code', async (req, res) => {
  const { code, house, postcode } = req.body;
  console.log('🔍 Validation request received:', { code, house, postcode });
  
  if (!code || !house || !postcode) {
    console.log('❌ Missing required fields');
    return res.status(400).json({ valid: false, message: 'All fields are required.' });
  }
  
  try {
    const upload = await Upload.findOne({ accessCode: code });
    console.log('📄 Found upload:', upload ? 'Yes' : 'No');
    
    if (!upload) {
      console.log('❌ Code not found:', code);
      return res.status(404).json({ valid: false, message: 'Code not found' });
    }
    
    console.log('📋 Upload details:', {
      accessCode: upload.accessCode,
      house_name_number: upload.house_name_number,
      flat_apartment_room: upload.flat_apartment_room,
      actualPostCode: upload.actualPostCode,
      postCode: upload.postCode
    });
    
    const houseMatch = (upload.house_name_number && upload.house_name_number.trim().toLowerCase() === house.trim().toLowerCase()) ||
                      (upload.flat_apartment_room && upload.flat_apartment_room.trim().toLowerCase() === house.trim().toLowerCase());
    
    const postcodeMatch = (upload.actualPostCode && upload.actualPostCode.trim().toLowerCase() === postcode.trim().toLowerCase()) ||
                         (upload.postCode && upload.postCode.trim().toLowerCase() === postcode.trim().toLowerCase());
    
    console.log('🏠 House matching:', {
      input: house.trim().toLowerCase(),
      house_name_number: upload.house_name_number ? upload.house_name_number.trim().toLowerCase() : 'null',
      flat_apartment_room: upload.flat_apartment_room ? upload.flat_apartment_room.trim().toLowerCase() : 'null',
      houseMatch
    });
    
    console.log('📮 Postcode matching:', {
      input: postcode.trim().toLowerCase(),
      actualPostCode: upload.actualPostCode ? upload.actualPostCode.trim().toLowerCase() : 'null',
      postCode: upload.postCode ? upload.postCode.trim().toLowerCase() : 'null',
      postcodeMatch
    });
    
    if (houseMatch && postcodeMatch) {
      console.log('✅ Validation successful');
      return res.json({ valid: true, accessCode: code });
    }
    
    console.log('❌ Validation failed - details do not match');
    return res.status(403).json({ valid: false, message: 'Details do not match' });
  } catch (err) {
    console.error('💥 Server error:', err);
    return res.status(500).json({ valid: false, message: 'Server error' });
  }
});

export default router;