import mongoose from 'mongoose';


// Define the Meeting schema
const meetingSchema = new mongoose.Schema({
    meeting_id: {type: String, required: true, unique: true},
    name: {type: String},
    address: {type: String},
    // Enhanced address fields
    address_line_1: {type: String, trim: true},
    address_line_2: {type: String, trim: true},
    address_line_3: {type: String, trim: true},
    additional_address_lines: [{type: String, trim: true}], // For dynamic address lines
    post_code: {type: String, trim: true}, // Actual postcode field
    phone_number: {type: String, trim: true}, // Phone number field
    reference: {type: String, trim: true}, // Reference field (what was previously stored in post_code)
    repair_detail: {type: String},
    // Enhanced work details with target times
    work_details: [{
        detail: {type: String, trim: true},
        target_time: {type: String, trim: true},
        timestamp: {type: Date, default: Date.now}
    }],
    target_time: {type: String}, // Keep for backward compatibility
    // Special notes field
    special_notes: {type: String, trim: true},
    owner: {type: mongoose.Schema.ObjectId, ref: "User"},
    userId: {type: mongoose.Schema.ObjectId, ref: "User", required: true}, // Added userId field
    // New fields for media storage
    recordings: [{
        url: {type: String, required: true},
        cloudinary_id: {type: String, required: true},
        timestamp: {type: Date, default: Date.now},
        duration: {type: Number}, // in seconds
        size: {type: Number}, // file size in bytes
        uploaded_by: {type: mongoose.Schema.ObjectId, ref: "User"} // Track who uploaded this recording
    }],
    screenshots: [{
        url: {type: String, required: true},
        cloudinary_id: {type: String, required: true},
        timestamp: {type: Date, default: Date.now},
        size: {type: Number}, // file size in bytes
        uploaded_by: {type: mongoose.Schema.ObjectId, ref: "User"} // Track who uploaded this screenshot
    }],
    // History field to track access
    access_history: [{
        visitor_name: {type: String, required: true},
        visitor_email: {type: String, required: true},
        access_time: {type: Date, default: Date.now},
        ip_address: {type: String},
        user_agent: {type: String},
        from_storage: {type: Boolean, default: false} // Track if access was from localStorage
    }],
    // Additional tracking fields
    created_by: {type: mongoose.Schema.ObjectId, ref: "User"}, // Who created the meeting
    last_updated_by: {type: mongoose.Schema.ObjectId, ref: "User"}, // Who last updated the meeting
    total_recordings: {type: Number, default: 0},
    total_screenshots: {type: Number, default: 0},
    total_access_count: {type: Number, default: 0}, // Track total access count
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
    }
}, {timestamps: true});




// Create model
const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
