import express from 'express';
// ...existing imports...
import { 
    create, 
    getAllMeetings, 
    getMeetingById, 
    updateMeeting, 
    deleteMeeting,
    getMeetingForShare 
} from '../controllers/meetingController.js';

const router = express.Router();

// ...existing routes...

// Meeting routes - Protected routes (require authentication)
router.post('/meetings/create', isAuthenticated, create);
router.get('/meetings/all', isAuthenticated, getAllMeetings);
router.get('/meetings/:id', isAuthenticated, getMeetingById);
router.put('/meetings/:id', isAuthenticated, updateMeeting);
router.delete('/meetings/:id', isAuthenticated, deleteMeeting);

// Meeting routes - Public route for sharing
router.get('/meetings/share/:id', getMeetingForShare);

export default router;
