import { api } from ".";

// Helper to get the full API URL with optional NEXT_PUBLIC_BACKEND_URL
const getApiUrl = (path) => {
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    // Remove trailing slash from base and leading slash from path
    return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
};

export const createRequest = async (formData) => await api.post("/meetings/create", formData);
export const getAllMeetings = async (archived = null, deleted = null) => {
    let url = "/meetings/all";
    const params = [];
    if (archived !== null) params.push(`archived=${archived}`);
    if (deleted !== null) params.push(`deleted=${deleted}`);
    if (params.length > 0) url += `?${params.join("&")}`;
    console.log('🌐 Making request to:', url);
    const response = await api.get(url);
    
    console.log('📊 Meetings response:', {
        total: response.data.meetings?.length || 0,
        archived: archived,
        deleted: deleted,
        meetings: response.data.meetings?.map(m => ({ 
            id: m._id, 
            name: m.name, 
            archived: m.archived,
            deleted: m.deleted
        })) || []
    });
    
    return response;
};
export const getMeetingById = async (id) => await api.get(`/meetings/${id}`);
export const updateMeeting = async (id, formData) => await api.put(`/meetings/${id}`, formData);
export const deleteMeeting = async (id) => {
    try {
        console.log(`🗑️ Deleting complete meeting: ${id} (including all media)`);
        const response = await api.delete(`/meetings/${id}`);
        
        // Log deletion summary
        if (response.data.deletion_summary) {
            const summary = response.data.deletion_summary;
            console.log(`✅ Meeting deletion complete:`, {
                recordings: `${summary.recordings_deleted}/${summary.recordings_total}`,
                screenshots: `${summary.screenshots_deleted}/${summary.screenshots_total}`,
                failed_cloudinary: summary.failed_cloudinary_deletions
            });
        }
        
        return response;
    } catch (error) {
        console.error('❌ Complete meeting deletion failed:', error);
        throw error;
    }
};
// Add public endpoint for sharing - no authentication required
export const getMeetingForShare = async (id) => {
    try {
        const response = await fetch(getApiUrl(`/api/v1/meetings/share/${id}`), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error('Meeting not found');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching meeting for share:', error);
        throw error;
    }
};
// Add new function to fetch meeting by meeting_id for admin
export const getMeetingByMeetingId = async (meetingId) => await api.get(`/meetings/by-meeting-id/${meetingId}`);

// Enhanced delete functions with better error handling and Cloudinary tracking
export const deleteRecordingRequest = async (meetingId, recordingId) => {
    try {
        console.log(`🗑️ Deleting recording ${recordingId} from meeting ${meetingId} (including Cloudinary)`);
        const response = await api.delete(`/meetings/${meetingId}/recordings/${recordingId}`);
        
        // Log Cloudinary deletion status
        if (response.data.cloudinary_deleted) {
            console.log(`✅ Recording deleted from both database and Cloudinary`);
        } else {
            console.log(`⚠️ Recording deleted from database but Cloudinary deletion failed`);
        }
        
        return response;
    } catch (error) {
        console.error('❌ Delete recording request failed:', error);
        
        // If it's a timeout, still consider it potentially successful
        if (error.response?.status === 408 || error.message.includes('timeout')) {
            console.log('⚠️ Timeout occurred, but deletion may have succeeded');
            return {
                data: {
                    success: true,
                    message: "Delete request sent (may take time to complete Cloudinary removal)",
                    timeout: true,
                    cloudinary_deleted: false
                }
            };
        }
        
        throw error;
    }
};

export const deleteScreenshotRequest = async (meetingId, screenshotId) => {
    try {
        console.log(`🗑️ Deleting screenshot ${screenshotId} from meeting ${meetingId} (including Cloudinary)`);
        const response = await api.delete(`/meetings/${meetingId}/screenshots/${screenshotId}`);
        
        // Log Cloudinary deletion status
        if (response.data.cloudinary_deleted) {
            console.log(`✅ Screenshot deleted from both database and Cloudinary`);
        } else {
            console.log(`⚠️ Screenshot deleted from database but Cloudinary deletion failed`);
        }
        
        return response;
    } catch (error) {
        console.error('❌ Delete screenshot request failed:', error);
        
        // If it's a timeout, still consider it potentially successful
        if (error.response?.status === 408 || error.message.includes('timeout')) {
            console.log('⚠️ Timeout occurred, but deletion may have succeeded');
            return {
                data: {
                    success: true,
                    message: "Delete request sent (may take time to complete Cloudinary removal)",
                    timeout: true,
                    cloudinary_deleted: false
                }
            };
        }
        
        throw error;
    }
};

export const archiveMeeting = async (id) => {
    try {
        console.log(`📦 Archiving meeting: ${id}`);
        const response = await api.put(`/meetings/${id}/archive`);
        console.log(`✅ Meeting archived successfully`);
        return response;
    } catch (error) {
        console.error('❌ Archive meeting failed:', error);
        throw error;
    }
};

export const unarchiveMeeting = async (id) => {
    try {
        console.log(`📤 Unarchiving meeting: ${id}`);
        const response = await api.put(`/meetings/${id}/unarchive`);
        console.log(`✅ Meeting unarchived successfully`);
        return response;
    } catch (error) {
        console.error('❌ Unarchive meeting failed:', error);
        throw error;
    }
};

export const getArchivedCount = async () => {
    try {
        const response = await api.get("/meetings/archived-count");
        return response;
    } catch (error) {
        console.error('❌ Get archived count failed:', error);
        throw error;
    }
};

// Add function to record visitor access to shared meeting
export const recordVisitorAccessRequest = async (meetingId, visitorData) => {
    try {
        const response = await fetch(getApiUrl(`/api/v1/meetings/share/${meetingId}/access`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(visitorData),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to record visitor access');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error recording visitor access:', error);
        throw error;
    }
};

export const restoreMeeting = async (id) => {
    return await api.put(`/meetings/restore/${id}`);
};

export const permanentDeleteMeeting = async (id) => {
    return await api.delete(`/meetings/permanent/${id}`);
};

export const searchMeetings = async (searchParams) => {
    // POST to /meetings/search with searchParams as body
    const response = await api.post('/meetings/search', searchParams);
    return response;
};

// Special Notes API
export const getSpecialNotes = async (meetingId) => {
  return await api.get(`/meetings/${meetingId}/special-notes`);
};

export const saveSpecialNotes = async (meetingId, specialNotes) => {
  return await api.post(`/meetings/${meetingId}/special-notes`, { special_notes: specialNotes });
};

// Structured Special Notes API
export const getStructuredSpecialNotes = async (meetingId) =>
  api.get(`/meetings/${meetingId}/structured-special-notes`);

export const saveStructuredSpecialNotes = async (meetingId, structured_special_notes) =>
  api.patch(`/meetings/${meetingId}/structured-special-notes`, { structured_special_notes });
