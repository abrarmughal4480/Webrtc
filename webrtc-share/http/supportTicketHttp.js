import { api } from './index.js';

// Support Ticket API endpoints
const SUPPORT_TICKET_BASE_URL = '/support-tickets';

// Create a new support ticket
export const createSupportTicket = async (ticketData, files = []) => {
    try {
        const formData = new FormData();
        
        // Add ticket data
        Object.keys(ticketData).forEach(key => {
            if (ticketData[key] !== undefined && ticketData[key] !== null) {
                formData.append(key, ticketData[key]);
            }
        });
        
        // Add files
        if (files && files.length > 0) {
            files.forEach(file => {
                formData.append('files', file);
            });
        }
        
        const response = await api.post(`${SUPPORT_TICKET_BASE_URL}/create`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Get user's tickets with pagination and filters
export const getUserTickets = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        
        // Add pagination params
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        
        // Add filter params
        if (params.status) queryParams.append('status', params.status);
        if (params.category) queryParams.append('category', params.category);
        if (params.priority) queryParams.append('priority', params.priority);
        
        // Add sorting params
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        
        const url = `${SUPPORT_TICKET_BASE_URL}/my-tickets?${queryParams.toString()}`;
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Get a single ticket by ID
export const getTicketById = async (ticketId) => {
    try {
        const response = await api.get(`${SUPPORT_TICKET_BASE_URL}/ticket/${ticketId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Update a ticket
export const updateTicket = async (ticketId, updateData) => {
    try {
        const response = await api.put(`${SUPPORT_TICKET_BASE_URL}/ticket/${ticketId}`, updateData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Delete a ticket (soft delete)
export const deleteTicket = async (ticketId) => {
    try {
        const response = await api.delete(`${SUPPORT_TICKET_BASE_URL}/ticket/${ticketId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Delete a specific attachment from a ticket
export const deleteAttachment = async (ticketId, attachmentId) => {
    try {
        const response = await api.delete(`${SUPPORT_TICKET_BASE_URL}/${ticketId}/attachments/${attachmentId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Search tickets
export const searchTickets = async (query, params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append('q', query);
        
        // Add pagination params
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        
        const url = `${SUPPORT_TICKET_BASE_URL}/search?${queryParams.toString()}`;
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Admin: Get all tickets
export const getAllTickets = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        
        // Add pagination params
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        
        // Add filter params
        if (params.status) queryParams.append('status', params.status);
        if (params.category) queryParams.append('category', params.category);
        if (params.priority) queryParams.append('priority', params.priority);
        if (params.assignedTo) queryParams.append('assignedTo', params.assignedTo);
        if (params.companyId) queryParams.append('companyId', params.companyId);
        
        // Add sorting params
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        
        const url = `${SUPPORT_TICKET_BASE_URL}/admin/all?${queryParams.toString()}`;
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Admin: Update ticket status and assign
export const adminUpdateTicket = async (ticketId, updateData) => {
    try {
        const response = await api.put(`${SUPPORT_TICKET_BASE_URL}/admin/ticket/${ticketId}`, updateData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Admin: Get ticket statistics
export const getTicketStats = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        
        if (params.companyId) queryParams.append('companyId', params.companyId);
        if (params.timeRange) queryParams.append('timeRange', params.timeRange);
        
        const url = `${SUPPORT_TICKET_BASE_URL}/admin/stats?${queryParams.toString()}`;
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Admin: Bulk update tickets
export const bulkUpdateTickets = async (ticketIds, updates) => {
    try {
        const response = await api.put(`${SUPPORT_TICKET_BASE_URL}/admin/bulk-update`, {
            ticketIds,
            updates
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Admin: Export tickets
export const exportTickets = async (format = 'json', filters = {}) => {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append('format', format);
        
        // Add filters
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null) {
                queryParams.append(key, filters[key]);
            }
        });
        
        const url = `${SUPPORT_TICKET_BASE_URL}/admin/export?${queryParams.toString()}`;
        const response = await api.get(url, {
            responseType: format === 'csv' ? 'blob' : 'json'
        });
        
        if (format === 'csv') {
            // Handle CSV download
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'support-tickets.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            return { success: true, message: 'CSV downloaded successfully' };
        }
        
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Utility functions for ticket management
export const ticketUtils = {
    // Get priority color class
    getPriorityColor: (priority) => {
        switch (priority) {
            case 'Critical': return 'text-red-600 bg-red-100';
            case 'High': return 'text-orange-600 bg-orange-100';
            case 'Medium': return 'text-yellow-600 bg-yellow-100';
            case 'Low': return 'text-green-600 bg-green-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    },
    
    // Get status color class
    getStatusColor: (status) => {
        switch (status) {
            case 'Open': return 'text-blue-600 bg-blue-100';
            case 'In Progress': return 'text-yellow-600 bg-yellow-100';
            case 'Resolved': return 'text-green-600 bg-green-100';
            case 'Closed': return 'text-gray-600 bg-gray-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    },
    
    // Get category icon
    getCategoryIcon: (category) => {
        switch (category) {
            case 'Accessibility (eg. font size, button size, colour or contrast issues)': return '♿';
            case "'Actions' button issue": return '🔘';
            case 'Amending Message issue': return '✏️';
            case 'Dashboard issue': return '📊';
            case 'Delete/Archive issue': return '🗑️';
            case 'Export issue': return '📤';
            case 'History issue': return '📚';
            case 'Log in/Log out issue': return '🔑';
            case 'Payment/account queries': return '💳';
            case 'Password/Security issue': return '🔒';
            case 'Saving videos or screenshots query': return '💾';
            case 'Sending shared links to third parties': return '🔗';
            case 'Sending a text/email link to customers': return '📧';
            case 'Uploading logo or profile image issue': return '🖼️';
            case 'Video viewing page issue': return '🎥';
            case 'Any Other issue not listed above': return '❓';
            default: return '📋';
        }
    },
    
    // Format ticket age
    formatTicketAge: (createdAt) => {
        const now = new Date();
        const created = new Date(createdAt);
        const diffInMs = now - created;
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        
        if (diffInDays > 0) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        } else if (diffInHours > 0) {
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        } else if (diffInMinutes > 0) {
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    },
    
    // Check if ticket is overdue
    isTicketOverdue: (estimatedResolutionTime, status) => {
        if (!estimatedResolutionTime || status === 'Resolved' || status === 'Closed') {
            return false;
        }
        return new Date() > new Date(estimatedResolutionTime);
    }
};
