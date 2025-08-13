import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = axios.create({
    baseURL: `${baseURL}/api/v1`,
    withCredentials: true,
    // timeout: 30000, // 30 seconds timeout
});

// For public endpoints (not under /api/v1)
export const publicApi = axios.create({
    baseURL: baseURL,
    withCredentials: true,
});

// Enhanced request interceptor
api.interceptors.request.use(
    (config) => {
        console.log('📤 [API Request]', config.method?.toUpperCase(), config.url);
        console.log('📤 [API Request] Headers:', config.headers);
        console.log('📤 [API Request] Data:', config.data);
        return config;
    },
    (error) => {
        console.error('📤 [API Request Error]', error.message);
        return Promise.reject(error);
    }
);

// Enhanced response interceptor with better error handling
api.interceptors.response.use(
    (response) => {
        console.log('📥 [API Response Success]', response.config?.method?.toUpperCase(), response.config?.url);
        console.log('📥 [API Response] Status:', response.status);
        console.log('📥 [API Response] Data:', response.data);
        return response;
    },
    (error) => {
        // Enhanced error logging and handling
        if (error.code === 'ECONNABORTED') {
            console.log('ℹ️ [API Response] Request timeout - this is normal for large uploads');
        } else if (error.code === 'ERR_NETWORK') {
            console.log('ℹ️ [API Response] Network error - server may be starting up or not available');
        } else if (error.response?.status === 404) {
            console.log('ℹ️ [API Response] Resource not found - this may be normal for new data');
        } else if (error.response?.status === 500) {
            console.log('ℹ️ [API Response] Server error occurred - check backend logs');
        } else {
            console.error('📥 [API Response Error]', error.response?.status, error.response?.data?.message || error.message);
        }
        console.error('📥 [API Response Error] Full error:', error);
        return Promise.reject(error);
    }
);

// Export all HTTP utilities
export * from './authHttp.js';
export * from './chatHttp.js';
export * from './companyHttp.js';
export * from './meetingHttp.js';
export * from './uploadHttp.js';
export * from './userHttp.js';

// Support Ticket HTTP utilities
export * from './supportTicketHttp.js';

// Re-export specific functions to avoid conflicts
export { recordVisitorAccessRequest as recordVisitorAccessRequestFromMeetings } from './meetingHttp.js';
export { recordVisitorAccessRequest as recordVisitorAccessRequestFromUploads } from './uploadHttp.js';