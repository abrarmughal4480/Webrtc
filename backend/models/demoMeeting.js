import mongoose from 'mongoose';

const demoMeetingSchema = new mongoose.Schema({
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
    requestedDate: {
        type: Date,
        required: [true, 'Meeting date is required']
    },
    requestedTime: {
        hour: {
            type: String,
            required: [true, 'Hour is required']
        },
        minute: {
            type: String,
            required: [true, 'Minute is required']
        }
    },
    message: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'rescheduled', 'cancelled', 'completed'],
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
    meetingLink: {
        type: String,
        default: ''
    },
    meetingNotes: {
        type: String,
        trim: true,
        default: ''
    },
    followUpRequired: {
        type: Boolean,
        default: false
    },
    followUpDate: {
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
    },
    company: {
        type: String,
        trim: true,
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    timestamps: true
});

demoMeetingSchema.index({ status: 1, requestedDate: 1 });
demoMeetingSchema.index({ email: 1 });
demoMeetingSchema.index({ assignedTo: 1 });
demoMeetingSchema.index({ createdAt: -1 });

const DemoMeeting = mongoose.model('DemoMeeting', demoMeetingSchema);

export default DemoMeeting;
