import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = axios.create({
    baseURL: `${baseURL}/api/v1`,
    withCredentials: true,
});

export const publicApi = axios.create({
    baseURL: baseURL,
    withCredentials: true,
});

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

api.interceptors.response.use(
    (response) => {
        console.log('📥 [API Response Success]', response.config?.method?.toUpperCase(), response.config?.url);
        console.log('📥 [API Response] Status:', response.status);
        console.log('📥 [API Response] Data:', response.data);
        return response;
    },
    (error) => {
        if (error.code === 'ECONNABORTED') {
            console.log('ℹ️ [API Response] Request timeout - this is normal for large uploads');
        } else if (error.code === 'ERR_NETWORK') {
            console.log('ℹ️ [API Response] Network error - server may be starting up or not available');
        } else if (error.response?.status === 404) {
            console.log('ℹ️ [API Response] Resource not found - this may be normal for new data');
        } else if (error.response?.status === 401) {
            // Don't log 401 errors as errors - they're expected for unauthenticated users
            console.log('ℹ️ [API Response] User not authenticated - this is normal for new visitors');
        } else if (error.response?.status === 500) {
            console.log('📥 [API Response] Server error occurred - check backend logs');
        } else {
            console.error('📥 [API Response Error]', error.response?.status, error.response?.data?.message || error.message);
        }
        console.error('📥 [API Response Error] Full error:', error);
        return Promise.reject(error);
    }
);

export * from './authHttp.js';
export * from './chatHttp.js';
export * from './companyHttp.js';
export * from './userHttp.js';
export * from './supportTicketHttp.js';
export * from './feedbackHttp.js';
export * from './analyzerHttp.js';

export { 
    recordVisitorAccessRequest as recordMeetingVisitorAccess,
} from './meetingHttp.js';

export { 
    recordVisitorAccessRequest as recordUploadVisitorAccess,
} from './uploadHttp.js';
