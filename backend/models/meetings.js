import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
    meeting_id: {type: String, required: true, unique: true},
    name: {type: String},
    first_name: {type: String, trim: true},
    last_name: {type: String, trim: true},
    house_name_number: {type: String, trim: true},
    flat_apartment_room: {type: String, trim: true},
    street_road: {type: String, trim: true},
    city: {type: String, trim: true},
    country: {type: String, trim: true},
    post_code: {type: String, trim: true},
    phone_number: {type: String, trim: true},
    reference: {type: String, trim: true},
    repair_detail: {type: String},
    work_details: [{
        detail: {type: String, trim: true},
        target_time: {type: String, trim: true},
        timestamp: {type: Date, default: Date.now}
    }],
    target_time: {type: String},
    special_notes: { type: mongoose.Schema.Types.Mixed, default: {} },
    structured_special_notes: { type: mongoose.Schema.Types.Mixed, default: {} },
    owner: {type: mongoose.Schema.ObjectId, ref: "User"},
    userId: {type: mongoose.Schema.ObjectId, ref: "User", required: true},
    recordings: [{
        url: {type: String, required: true},
        cloudinary_id: {type: String, required: true},
        timestamp: {type: Date, default: Date.now},
        duration: {type: Number},
        size: {type: Number},
        uploaded_by: {type: mongoose.Schema.ObjectId, ref: "User"}
    }],
    screenshots: [{
        url: {type: String, required: true},
        cloudinary_id: {type: String, required: true},
        timestamp: {type: Date, default: Date.now},
        size: {type: Number},
        uploaded_by: {type: mongoose.Schema.ObjectId, ref: "User"}
    }],
    access_history: [{
        visitor_name: {type: String, required: true},
        visitor_email: {type: String, required: true},
        access_time: {type: Date, default: Date.now},
        ip_address: {type: String},
        user_agent: {type: String},
        from_storage: {type: Boolean, default: false},
        creator: {type: Boolean, default: false}
    }],
    created_by: {type: mongoose.Schema.ObjectId, ref: "User"},
    last_updated_by: {type: mongoose.Schema.ObjectId, ref: "User"},
    total_recordings: {type: Number, default: 0},
    total_screenshots: {type: Number, default: 0},
    total_access_count: {type: Number, default: 0},
    meeting_duration: {type: Number, default: 0}, // Total meeting duration in seconds
    last_connection_time: {type: Date, default: null}, // Last time user was connected
    connection_start_time: {type: Date, default: null}, // When meeting connection started
    archived: {
        type: Boolean,
        default: false
    },
    archivedAt: {
        type: Date,
        default: null
    },
    archivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    deleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    trashed: {
        type: Boolean,
        default: false
    },
    // Observer functionality
    observers: [{
        observer_id: {type: mongoose.Schema.ObjectId, ref: "User", required: true},
        observer_email: {type: String, required: true},
        observer_name: {type: String, required: true},
        joined_at: {type: Date, default: Date.now},
        left_at: {type: Date, default: null},
        is_active: {type: Boolean, default: true}
    }],
    observer_enabled: {
        type: Boolean,
        default: true
    },
    observer_permissions: {
        can_view_screen: {type: Boolean, default: true},
        can_control_camera: {type: Boolean, default: false},
        can_take_screenshots: {type: Boolean, default: false}
    }
}, {timestamps: true});

meetingSchema.index({ userId: 1, deleted: 1 });
meetingSchema.index({ deleted: 1 });
meetingSchema.index({ archived: 1 });
meetingSchema.index({ trashed: 1 });
meetingSchema.index({ createdAt: 1 });
meetingSchema.index({ owner: 1 });
meetingSchema.index({ 'recordings.uploaded_by': 1 });
meetingSchema.index({ 'screenshots.uploaded_by': 1 });

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
