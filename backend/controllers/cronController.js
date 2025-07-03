import Meeting from '../models/meetings.js';

export const cleanupTrashMeetings = async (req, res) => {
  // Security: check secret
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const now = new Date();
    const threshold = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes
    const expiredMeetings = await Meeting.find({ deleted: true, deletedAt: { $lte: threshold } });
    let deletedCount = 0;
    for (const meeting of expiredMeetings) {
      await Meeting.deleteOne({ _id: meeting._id });
      deletedCount++;
      // TODO: Add S3 cleanup if needed
    }
    res.status(200).json({
      success: true,
      message: `Cleaned up ${deletedCount} trashed meetings.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Cleanup failed', error: err.message });
  }
}; 