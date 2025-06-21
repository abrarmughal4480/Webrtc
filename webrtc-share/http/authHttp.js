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
