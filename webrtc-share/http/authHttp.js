import { api } from ".";

export const loginRequest = async (formData) => await api.post("/login", formData);
export const registerRequest = async (formData) => await api.post("/register", formData);
export const verifyRequest = async (formData) => await api.post("/verify", formData);
export const loadMeRequest = async () => await api.get("/me");
export const logoutRequest = async () => await api.get("/logout");
export const updateUserRequest = async (formData) => await api.put("/user/update", formData);
export const changePasswordRequest = async (formData) => await api.put("/user/change-password", formData);
export const forgotPasswordRequest = async (formData) => await api.post("/forgot-password", formData);
export const resetPasswordRequest = async (token, formData) => await api.put(`/reset-password/${token}`, formData);
export const sendFriendLinkRequest = async (formData) => await api.post("/send-friend-link", formData);
export const resetPasswordFromDashboardRequest = async (formData) => await api.put("/user/reset-password", formData);
export const sendFeedbackRequest = async (formData) => await api.post("/send-feedback", formData);
export const updateUserLogoRequest = async (formData) => await api.put("/user/update-logo", formData);
export const raiseSupportTicketRequest = async (formData) => await api.post("/raise-support-ticket", formData);
export const requestCallbackRequest = async (formData) => await api.post("/request-callback", formData);
export const updateLandlordInfoRequest = async (data) => await api.put("/user/update-landlord-info", data);
export const updateMessageSettingsRequest = async (data) => await api.put("/user/message-settings", data);
export const getMessageSettingsRequest = async () => await api.get("/user/message-settings");
export const getLandlordInfoRequest = async () => await api.get("/user/landlord-info");
// The existing bookDemoMeetingRequest function will handle the new videoToken parameter
export const bookDemoMeetingRequest = async (formData) => await api.post("/book-demo-meeting", formData);

// Folder Management Functions
export const createFolderRequest = async (folderName) => {
    console.log('📁 [createFolderRequest] Sending request:', folderName);
    try {
        const response = await api.post("/folders", { name: folderName });
        console.log('✅ [createFolderRequest] Success:', response.data);
        return response;
    } catch (error) {
        console.error('❌ [createFolderRequest] Error:', error.response?.data || error.message);
        throw error;
    }
};

export const updateFolderRequest = async (folderId, folderName, trashed = null) => {
    try {
        const requestData = { name: folderName };
        if (typeof trashed === 'boolean') {
            requestData.trashed = trashed;
        }
        const response = await api.put(`/folders/${folderId}`, requestData);
        return response;
    } catch (error) {
        throw error;
    }
};

export const deleteFolderRequest = async (folderId) => {
    try {
        const response = await api.delete(`/folders/${folderId}`);
        return response;
    } catch (error) {
        throw error;
    }
};

export const moveFolderToTrashRequest = async (folderId) => {
    try {
        const response = await api.put(`/folders/${folderId}/trash`);
        return response;
    } catch (error) {
        throw error;
    }
};

export const restoreFolderFromTrashRequest = async (folderId) => {
    try {
        const response = await api.put(`/folders/${folderId}/restore`);
        return response;
    } catch (error) {
        throw error;
    }
};

export const getFoldersRequest = async () => {
    console.log('📁 [getFoldersRequest] Sending request');
    try {
        const response = await api.get("/folders");
        console.log('✅ [getFoldersRequest] Success:', response.data);
        return response;
    } catch (error) {
        console.error('❌ [getFoldersRequest] Error:', error.response?.data || error.message);
        throw error;
    }
};

export const assignMeetingToFolderRequest = async (meetingId, folderId) => {
    try {
        const response = await api.post("/folders/assign-meeting", { 
            meetingId, 
            folderId: folderId || null 
        });
        return response;
    } catch (error) {
        throw error;
    }
};

export const getMeetingFoldersRequest = async () => {
    try {
        const response = await api.get("/folders/meeting-assignments");
        return response;
    } catch (error) {
        throw error;
    }
};

// Pagination Settings Functions
export const updatePaginationSettings = async (data) => {
    try {
        const response = await api.put("/user/pagination-settings", data);
        return response;
    } catch (error) {
        throw error;
    }
};

export const getPaginationSettings = async () => {
    try {
        const response = await api.get("/user/pagination-settings");
        return response;
    } catch (error) {
        throw error;
    }
};

export const registerResidentRequest = async (formData) => await api.post("/register-resident", formData);

// Demo functionality
export const requestDemoRequest = async (formData) => await api.post("/request-demo", formData);
