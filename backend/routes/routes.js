import express from 'express';
import { isAuthenticate as isAuthenticated } from '../middlewares/auth.js';
// ...existing imports...
import { 
    create, 
    getAllMeetings, 
    getMeetingById, 
    updateMeeting, 
    deleteMeeting,
    getMeetingForShare,
    getMeetingByMeetingId,
    deleteRecording,
    deleteScreenshot,
    archiveMeeting,
    unarchiveMeeting,
    getArchivedCount,
    recordVisitorAccess,
    restoreMeeting,
    permanentDeleteMeeting,
    searchMeetings,
    getStructuredSpecialNotes, 
    saveStructuredSpecialNotes 
} from '../controllers/meetingController.js';

const router = express.Router();

// ...existing routes...

// Meeting routes - Protected routes (require authentication)
router.post('/meetings/create', isAuthenticated, create);
router.get('/meetings/all', isAuthenticated, getAllMeetings);
router.get('/meetings/:id', isAuthenticated, getMeetingById);
router.put('/meetings/:id', isAuthenticated, updateMeeting);
router.delete('/meetings/:id', isAuthenticated, deleteMeeting);
router.post('/meetings/search', isAuthenticated, searchMeetings);

// Meeting routes - Public route for sharing
router.get('/meetings/share/:id', getMeetingForShare);

router.put('/meetings/restore/:id', isAuthenticated, restoreMeeting);
router.delete('/meetings/permanent/:id', isAuthenticated, permanentDeleteMeeting);

// Structured Special Notes routes
router.get('/meetings/:meeting_id/structured-special-notes', getStructuredSpecialNotes);
router.patch('/meetings/:meeting_id/structured-special-notes', saveStructuredSpecialNotes);

export default router;
