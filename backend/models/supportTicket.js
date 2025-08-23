import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        required: false,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        default: null
    },
    category: {
        type: String,
        required: true,
        enum: [
            'Accessibility (eg. font size, button size, colour or contrast issues)',
            "'Actions' button issue",
            'Amending Message issue',
            'Dashboard issue',
            'Delete/Archive issue',
            'Export issue',
            'History issue',
            'Log in/Log out issue',
            'Payment/account queries',
            'Password/Security issue',
            'Saving videos or screenshots query',
            'Sending shared links to third parties',
            'Sending a text/email link to customers',
            'Uploading logo or profile image issue',
            'Video viewing page issue',
            'Any Other issue not listed above'
        ],
        default: 'General Inquiry'
    },
    priority: {
        type: String,
        required: true,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    status: {
        type: String,
        required: true,
        enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
        default: 'Open'
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    attachments: [{
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        filePath: { type: String, required: true },
        fileSize: { type: Number, required: true },
        mimeType: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
    }],
    
    // Chat conversation messages
    chatMessages: [{
        messageId: { type: String, required: true, unique: true },
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        senderEmail: { type: String, required: true },
        senderRole: { type: String, required: true },
        message: { type: String, default: '' },
        media: {
            type: { type: String, enum: ['image', 'video'] },
            name: { type: String },
            size: { type: Number },
            mimeType: { type: String },
            localStorageKey: { type: String } // Key for local storage
        },
        timestamp: { type: Date, default: Date.now },
        isRead: { type: Boolean, default: false },
        readAt: { type: Date, default: null }
    }],
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assignedAt: {
        type: Date,
        default: null
    },
    resolvedAt: {
        type: Date,
        default: null
    },
    closedAt: {
        type: Date,
        default: null
    },
    resolution: {
        type: String,
        default: null,
        trim: true
    },
    internalNotes: {
        type: String,
        default: null,
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    source: {
        type: String,
        enum: ['Web', 'Mobile', 'Email', 'Phone', 'Chat'],
        default: 'Web'
    },
    userAgent: {
        type: String,
        default: null
    },
    ipAddress: {
        type: String,
        default: null
    },
    estimatedResolutionTime: {
        type: Date,
        default: null
    },
    escalationLevel: {
        type: Number,
        default: 1,
        min: 1,
        max: 5
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Trash functionality
    deleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// Indexes for better query performance
supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ companyId: 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: 1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });
supportTicketSchema.index({ createdAt: -1 });

// Pre-save middleware to generate ticket ID
supportTicketSchema.pre('save', function(next) {
    if (this.isNew && !this.ticketId) {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substr(2, 5);
        this.ticketId = `TKT-${timestamp}-${random}`.toUpperCase();
    }
    next();
});

// Virtual for ticket age
supportTicketSchema.virtual('age').get(function() {
    return Date.now() - this.createdAt;
});

// Virtual for isOverdue
supportTicketSchema.virtual('isOverdue').get(function() {
    if (this.estimatedResolutionTime && this.status !== 'Resolved' && this.status !== 'Closed') {
        return Date.now() > this.estimatedResolutionTime;
    }
    return false;
});

// Method to update status
supportTicketSchema.methods.updateStatus = function(newStatus, updatedBy) {
    this.status = newStatus;
    this.lastUpdatedBy = updatedBy;
    
    if (newStatus === 'Resolved') {
        this.resolvedAt = new Date();
    } else if (newStatus === 'Closed') {
        this.closedAt = new Date();
    }
    
    return this.save();
};

// Method to assign ticket
supportTicketSchema.methods.assignTicket = function(assignedTo) {
    this.assignedTo = assignedTo;
    this.assignedAt = new Date();
    this.status = 'In Progress';
    return this.save();
};

// Method to add internal note
supportTicketSchema.methods.addInternalNote = function(note, updatedBy) {
    this.internalNotes = note;
    this.lastUpdatedBy = updatedBy;
    return this.save();
};

// Static method to get ticket statistics
supportTicketSchema.statics.getTicketStats = async function(filters = {}) {
    const stats = await this.aggregate([
        { $match: { deleted: false, ...filters } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgPriority: { $avg: { $indexOfArray: ['$priority', ['Low', 'Medium', 'High', 'Critical']] } }
            }
        }
    ]);
    return stats;
};

// Method to add chat message
supportTicketSchema.methods.addChatMessage = function(messageData) {
    const newMessage = {
        messageId: messageData.messageId,
        senderId: messageData.senderId,
        senderEmail: messageData.senderEmail,
        senderRole: messageData.senderRole,
        message: messageData.message || '',
        media: messageData.media ? {
            type: messageData.media.type,
            name: messageData.media.name,
            size: messageData.media.size,
            mimeType: messageData.media.mimeType,
            localStorageKey: messageData.media.localStorageKey
        } : null,
        timestamp: new Date(),
        isRead: false
    };
    
    this.chatMessages.push(newMessage);
    return this.save();
};

// Method to get chat messages
supportTicketSchema.methods.getChatMessages = function() {
    return this.chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

// Method to mark message as read
supportTicketSchema.methods.markMessageAsRead = function(messageId, userId) {
    const message = this.chatMessages.find(msg => msg.messageId === messageId);
    if (message && message.senderId.toString() !== userId.toString()) {
        message.isRead = true;
        message.readAt = new Date();
        return this.save();
    }
    return Promise.resolve(this);
};

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

export default SupportTicket;
