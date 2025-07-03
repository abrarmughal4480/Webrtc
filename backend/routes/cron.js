import express from 'express';
import { cleanupTrashMeetings } from '../controllers/cronController.js';

const router = express.Router();

router.post('/api/cron/cleanup-trash', cleanupTrashMeetings);

export default router; 