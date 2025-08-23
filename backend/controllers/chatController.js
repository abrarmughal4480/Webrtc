import SupportTicket from '../models/supportTicket.js';
import sendResponse from '../utils/sendResponse.js';

// Get chat history for a ticket
export const getChatHistory = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { userId } = req.query; // To check user permissions

        if (!ticketId) {
            return sendResponse(res, 400, false, 'Ticket ID is required');
        }

        // Find the ticket
        const ticket = await SupportTicket.findById(ticketId)
            .populate('userId', 'email role')
            .populate('assignedTo', 'email role');

        if (!ticket) {
            return sendResponse(res, 404, false, 'Support ticket not found');
        }

        // Check if user has access to this ticket
        const hasAccess = ticket.userId._id.toString() === userId || 
                         ticket.assignedTo?._id.toString() === userId ||
                         req.user.role === 'superadmin';

        if (!hasAccess) {
            return sendResponse(res, 403, false, 'Access denied to this ticket');
        }

        // Get chat messages from the ticket
        const chatMessages = ticket.chatMessages || [];

        return sendResponse(res, 200, true, 'Chat history retrieved successfully', {
            ticketId: ticketId,
            messages: chatMessages,
            ticketInfo: {
                subject: ticket.subject,
                status: ticket.status,
                priority: ticket.priority,
                category: ticket.category
            }
        });

    } catch (error) {
        console.error('❌ Error getting chat history:', error);
        return sendResponse(res, 500, false, 'Failed to get chat history');
    }
};

// Save a new chat message to database
export const saveChatMessage = async (req, res) => {
    try {
        const { ticketId, message, senderId, senderEmail, senderRole, media } = req.body;

        if (!ticketId || !message || !senderId || !senderEmail || !senderRole) {
            return sendResponse(res, 400, false, 'Missing required fields');
        }

        // Find the ticket
        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            return sendResponse(res, 404, false, 'Support ticket not found');
        }

        // Create message object
        const messageObj = {
            messageId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message,
            senderId,
            senderEmail,
            senderRole,
            timestamp: new Date(),
            media: media || null
        };

        // Add message to ticket's chat messages
        if (!ticket.chatMessages) {
            ticket.chatMessages = [];
        }
        ticket.chatMessages.push({
            messageId: messageObj.messageId,
            message: messageObj.message,
            senderId: messageObj.senderId,
            senderEmail: messageObj.senderEmail,
            senderRole: messageObj.senderRole,
            timestamp: messageObj.timestamp,
            media: messageObj.media
        });

        // Save the ticket
        await ticket.save();

        console.log('✅ Chat message saved to database:', {
            ticketId,
            messageId: messageObj.id,
            sender: senderEmail,
            hasMedia: !!media
        });

        return sendResponse(res, 200, true, 'Message saved successfully', {
            messageId: messageObj.id,
            timestamp: messageObj.timestamp
        });

    } catch (error) {
        console.error('❌ Error saving chat message:', error);
        return sendResponse(res, 500, false, 'Failed to save message');
    }
};

// Save media message to database
export const saveMediaMessage = async (req, res) => {
    try {
        const { ticketId, fileName, fileType, fileSize, fileData, senderId, senderEmail, senderRole } = req.body;

        if (!ticketId || !fileName || !fileType || !senderId || !senderEmail || !senderRole) {
            return sendResponse(res, 400, false, 'Missing required fields');
        }

        // Find the ticket
        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            return sendResponse(res, 404, false, 'Support ticket not found');
        }

        // Create media message object
        const mediaMessage = {
            messageId: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message: '', // No text message for media
            senderId,
            senderEmail,
            senderRole,
            timestamp: new Date(),
            media: {
                type: fileType.startsWith('image/') ? 'image' : 'video',
                name: fileName,
                size: fileSize,
                mimeType: fileType,
                localStorageKey: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Use localStorageKey instead of data
            }
        };

        // Add message to ticket's chat messages
        if (!ticket.chatMessages) {
            ticket.chatMessages = [];
        }
        ticket.chatMessages.push({
            messageId: mediaMessage.messageId,
            message: mediaMessage.message,
            senderId: mediaMessage.senderId,
            senderEmail: mediaMessage.senderEmail,
            senderRole: mediaMessage.senderRole,
            timestamp: mediaMessage.timestamp,
            media: mediaMessage.media
        });

        // Save the ticket
        await ticket.save();

        console.log('✅ Media message saved to database:', {
            ticketId,
            messageId: mediaMessage.id,
            sender: senderEmail,
            mediaType: mediaMessage.media.type,
            fileName
        });

        return sendResponse(res, 200, true, 'Media message saved successfully', {
            messageId: mediaMessage.id,
            uploadId: mediaMessage.media.uploadId,
            timestamp: mediaMessage.timestamp
        });

    } catch (error) {
        console.error('❌ Error saving media message:', error);
        return sendResponse(res, 500, false, 'Failed to save media message');
    }
};

// Get chat statistics for a ticket
export const getChatStats = async (req, res) => {
    try {
        const { ticketId } = req.params;

        if (!ticketId) {
            return sendResponse(res, 400, false, 'Ticket ID is required');
        }

        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            return sendResponse(res, 404, false, 'Support ticket not found');
        }

        const chatMessages = ticket.chatMessages || [];
        const textMessages = chatMessages.filter(msg => msg.message && !msg.media);
        const mediaMessages = chatMessages.filter(msg => msg.media);

        return sendResponse(res, 200, true, 'Chat statistics retrieved successfully', {
            ticketId,
            totalMessages: chatMessages.length,
            textMessages: textMessages.length,
            mediaMessages: mediaMessages.length,
            lastMessage: chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null
        });

    } catch (error) {
        console.error('❌ Error getting chat stats:', error);
        return sendResponse(res, 500, false, 'Failed to get chat statistics');
    }
};
