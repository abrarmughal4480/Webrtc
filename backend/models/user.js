import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import validator from 'validator';
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        validation: validator.isEmail
    },
    // New user fields
    firstName: {
        type: String,
        required: false, // Not required initially to avoid breaking existing users
        trim: true,
        default: 'Unknown'
    },
    lastName: {
        type: String,
        required: false, // Not required initially to avoid breaking existing users
        trim: true,
        default: 'User'
    },
    phone: {
        type: String,
        required: false, // Not required initially to avoid breaking existing users
        trim: true,
        default: 'Not provided'
    },
    jobTitle: {
        type: String,
        required: false, // Not required initially to avoid breaking existing users
        trim: true,
        default: 'Not specified'
    },
    password: {
        type: String,
        required: true,
        default: undefined
    },
    isTemporaryPassword: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        required: true,
        enum:['landlord', 'resident', 'admin', 'company-admin', 'superadmin'], 
        default: 'landlord'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'frozen', 'suspended'],
        default: 'active'
    },
    company: {
        type: String,
        default: undefined
    },
    lastLogin: {
        type: Date,
        default: undefined
    },
    OTP: {
        type: String,
        default: undefined
    },
    logo: {
        type: String,
        default: undefined
    },
    currentLoginTime: {
        type: Date,
        default: undefined
    },
    previousLoginTime: {
        type: Date,
        default: undefined
    },
    landlordInfo: {
        landlordName: { type: String, default: undefined },
        landlordLogo: { type: String, default: undefined },
        officerImage: { type: String, default: undefined },
        useLandlordLogoAsProfile: { type: Boolean, default: false },
        profileShape: { type: String, enum: ['square', 'circle'], default: undefined },
        redirectUrlDefault: { type: String, default: '' }, // Empty string means use current frontend URL
        redirectUrlTailored: { type: String, default: 'www.' }
    },
    messageSettings: {
        messageOption: { type: String, enum: ['', 'default', 'tailored'], default: '' },
        tailoredMessage: { type: String, default: '' },
        defaultTextSize: { type: String, default: '14px' },
        tailoredTextSize: { type: String, default: '14px' },
        selectedButtonColor: { type: String, default: 'bg-green-800' }
    },
    paginationSettings: {
        itemsPerPage: { type: Number, default: 10, min: 10, max: 50 }
    },
    // Folder management for archive organization
    folders: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        trashed: { type: Boolean, default: false }
    }],
    meetingFolders: { type: Map, of: String, default: {} }, // meetingId -> folderId mapping
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // Trash functionality
    deleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    // Data cleanup tracking
    dataCleaned: {
        type: Boolean,
        default: false
    },
    cleanupDate: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.getJWTToken = function () {
    return jwt.sign({ _id: this._id }, process.env.JWT_SECRET, {
        expiresIn: '15d'
    });
};

userSchema.methods.getResetToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");

    this.resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
};

const User = mongoose.model('User', userSchema);

export default User;
