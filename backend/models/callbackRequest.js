import mongoose from 'mongoose';

const callbackRequestSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    preferredDay: {
        type: String,
        enum: ['today', 'tomorrow', 'custom'],
        default: 'today'
    },
    customDate: {
        type: Date,
        default: null
    },
    preferredTime: {
        hour: {
            type: String,
            default: '09'
        },
        minute: {
            type: String,
            default: '00'
        }
    },
    message: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'contacted', 'completed', 'cancelled'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    contactAttempts: {
        type: Number,
        default: 0
    },
    lastContactAttempt: {
        type: Date,
        default: null
    },
    source: {
        type: String,
        default: 'footer-form'
    },
    userAgent: {
        type: String,
        default: ''
    },
    ipAddress: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

callbackRequestSchema.index({ status: 1, createdAt: -1 });
callbackRequestSchema.index({ email: 1 });
callbackRequestSchema.index({ assignedTo: 1 });

const CallbackRequest = mongoose.model('CallbackRequest', callbackRequestSchema);

export default CallbackRequest;
