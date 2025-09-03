import { api } from './index.js';

// Observer Management APIs
export const observerApi = {
    // Enable observer mode for a meeting
    enableObserverMode: async (meetingId, permissions) => {
        try {
            const response = await api.post(`/meeting/${meetingId}/observer/enable`, {
                permissions
            });
            return response.data;
        } catch (error) {
            console.error('Error enabling observer mode:', error);
            throw error;
        }
    },

    // Disable observer mode for a meeting
    disableObserverMode: async (meetingId) => {
        try {
            const response = await api.post(`/meeting/${meetingId}/observer/disable`);
            return response.data;
        } catch (error) {
            console.error('Error disabling observer mode:', error);
            throw error;
        }
    },

    // Add observer to a meeting
    addObserver: async (meetingId, observerEmail) => {
        try {
            const response = await api.post(`/meeting/${meetingId}/observer/add`, {
                observer_email: observerEmail
            });
            return response.data;
        } catch (error) {
            console.error('Error adding observer:', error);
            throw error;
        }
    },

    // Remove observer from a meeting
    removeObserver: async (meetingId, observerId) => {
        try {
            const response = await api.delete(`/meeting/${meetingId}/observer/${observerId}/remove`);
            return response.data;
        } catch (error) {
            console.error('Error removing observer:', error);
            throw error;
        }
    },

    // Get meeting observers
    getMeetingObservers: async (meetingId) => {
        try {
            const response = await api.get(`/meeting/${meetingId}/observers`);
            return response.data;
        } catch (error) {
            console.error('Error getting meeting observers:', error);
            throw error;
        }
    },

    // Join meeting as observer
    joinAsObserver: async (meetingId) => {
        try {
            const response = await api.post(`/meeting/${meetingId}/observer/join`);
            return response.data;
        } catch (error) {
            console.error('Error joining as observer:', error);
            throw error;
        }
    },

    // Leave meeting as observer
    leaveAsObserver: async (meetingId) => {
        try {
            const response = await api.post(`/meeting/${meetingId}/observer/leave`);
            return response.data;
        } catch (error) {
            console.error('Error leaving as observer:', error);
            throw error;
        }
    },

    // Get meetings where user can observe
    getObservableMeetings: async () => {
        try {
            const response = await api.get('/meetings/observable');
            return response.data;
        } catch (error) {
            console.error('Error getting observable meetings:', error);
            throw error;
        }
    }
};

export default observerApi;
