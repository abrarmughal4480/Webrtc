import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = axios.create({
    baseURL: `${baseURL}/api/v1`,
    withCredentials: true,
    // timeout: 30000, // 30 seconds timeout
});

// // Enhanced request interceptor
// api.interceptors.request.use(
//     (config) => {
//         console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
//         return config;
//     },
//     (error) => {
//         console.error('📤 API Request Error:', error.message);
//         return Promise.reject(error);
//     }
// );

// // Enhanced response interceptor with better error handling
// api.interceptors.response.use(
//     (response) => {
//         console.log('📥 API Response Success:', response.config?.method?.toUpperCase(), response.config?.url);
//         return response;
//     },
//     (error) => {
//         // Enhanced error logging and handling
//         if (error.code === 'ECONNABORTED') {
//             console.log('ℹ️ Request timeout - this is normal for large uploads');
//         } else if (error.code === 'ERR_NETWORK') {
//             console.log('ℹ️ Network error - server may be starting up or not available');
//         } else if (error.response?.status === 404) {
//             console.log('ℹ️ Resource not found - this may be normal for new data');
//         } else if (error.response?.status === 500) {
//             console.log('ℹ️ Server error occurred - check backend logs');
//         } else {
//             console.error('📥 API Response Error:', error.response?.status, error.response?.data?.message || error.message);
//         }
//         return Promise.reject(error);
//     }
// );