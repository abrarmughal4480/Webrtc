import catchAsyncError from '../middlewares/catchAsyncError.js';
import MeetingModel from '../models/meetings.js';
import UserModel from '../models/user.js';
import sendResponse from '../utils/sendResponse.js';
import ErrorHandler from '../utils/errorHandler.js';

// Enable observer mode for a meeting
export const enableObserverMode = catchAsyncError(async (req, res, next) => {
    const { meetingId } = req.params;
    const { permissions } = req.body;
    const user_id = req.user._id;

    const meeting = await MeetingModel.findOne({
        meeting_id: meetingId,
        $or: [
            { owner: user_id },
            { userId: user_id },
            { created_by: user_id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    // Enable observer mode
    meeting.observer_enabled = true;
    
    // Set permissions if provided
    if (permissions) {
        meeting.observer_permissions = {
            can_view_screen: permissions.can_view_screen !== undefined ? permissions.can_view_screen : true,
            can_control_camera: permissions.can_control_camera !== undefined ? permissions.can_control_camera : false,
            can_take_screenshots: permissions.can_take_screenshots !== undefined ? permissions.can_take_screenshots : false
        };
    }

    meeting.last_updated_by = user_id;
    await meeting.save();

    sendResponse(res, 200, true, {
        meeting_id: meeting.meeting_id,
        observer_enabled: meeting.observer_enabled,
        observer_permissions: meeting.observer_permissions
    }, "Observer mode enabled successfully");
});

// Disable observer mode for a meeting
export const disableObserverMode = catchAsyncError(async (req, res, next) => {
    const { meetingId } = req.params;
    const user_id = req.user._id;

    const meeting = await MeetingModel.findOne({
        meeting_id: meetingId,
        $or: [
            { owner: user_id },
            { userId: user_id },
            { created_by: user_id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    // Disable observer mode and remove all observers
    meeting.observer_enabled = false;
    meeting.observers = [];
    meeting.last_updated_by = user_id;
    await meeting.save();

    sendResponse(res, 200, true, {
        meeting_id: meeting.meeting_id,
        observer_enabled: meeting.observer_enabled
    }, "Observer mode disabled successfully");
});

// Add observer to a meeting
export const addObserver = catchAsyncError(async (req, res, next) => {
    const { meetingId } = req.params;
    const { observer_email } = req.body;
    const user_id = req.user._id;

    if (!observer_email) {
        return next(new ErrorHandler("Observer email is required", 400));
    }

    const meeting = await MeetingModel.findOne({
        meeting_id: meetingId,
        $or: [
            { owner: user_id },
            { userId: user_id },
            { created_by: user_id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    if (!meeting.observer_enabled) {
        return next(new ErrorHandler("Observer mode is not enabled for this meeting", 400));
    }

    // Find the observer user
    const observerUser = await UserModel.findOne({ email: observer_email });
    if (!observerUser) {
        return next(new ErrorHandler("Observer user not found", 404));
    }

    // Check if observer is already added
    const existingObserver = meeting.observers.find(obs => obs.observer_email === observer_email);
    if (existingObserver) {
        return next(new ErrorHandler("Observer is already added to this meeting", 400));
    }

    // Add observer
    meeting.observers.push({
        observer_id: observerUser._id,
        observer_email: observerUser.email,
        observer_name: `${observerUser.firstName} ${observerUser.lastName}`,
        joined_at: new Date(),
        is_active: true
    });

    meeting.last_updated_by = user_id;
    await meeting.save();

    sendResponse(res, 200, true, {
        meeting_id: meeting.meeting_id,
        observer: {
            observer_id: observerUser._id,
            observer_email: observerUser.email,
            observer_name: `${observerUser.firstName} ${observerUser.lastName}`,
            joined_at: new Date()
        }
    }, "Observer added successfully");
});

// Remove observer from a meeting
export const removeObserver = catchAsyncError(async (req, res, next) => {
    const { meetingId, observerId } = req.params;
    const user_id = req.user._id;

    const meeting = await MeetingModel.findOne({
        meeting_id: meetingId,
        $or: [
            { owner: user_id },
            { userId: user_id },
            { created_by: user_id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    // Find and remove observer
    const observerIndex = meeting.observers.findIndex(obs => obs.observer_id.toString() === observerId);
    if (observerIndex === -1) {
        return next(new ErrorHandler("Observer not found in this meeting", 404));
    }

    const removedObserver = meeting.observers[observerIndex];
    meeting.observers.splice(observerIndex, 1);
    meeting.last_updated_by = user_id;
    await meeting.save();

    sendResponse(res, 200, true, {
        meeting_id: meeting.meeting_id,
        removed_observer: removedObserver
    }, "Observer removed successfully");
});

// Get meeting observers
export const getMeetingObservers = catchAsyncError(async (req, res, next) => {
    const { meetingId } = req.params;
    const user_id = req.user._id;

    const meeting = await MeetingModel.findOne({
        meeting_id: meetingId,
        $or: [
            { owner: user_id },
            { userId: user_id },
            { created_by: user_id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    sendResponse(res, 200, true, {
        meeting_id: meeting.meeting_id,
        observer_enabled: meeting.observer_enabled,
        observer_permissions: meeting.observer_permissions,
        observers: meeting.observers
    }, "Meeting observers retrieved successfully");
});

// Join meeting as observer
export const joinAsObserver = catchAsyncError(async (req, res, next) => {
    const { meetingId } = req.params;
    const user_id = req.user._id;
    const user_role = req.user.role;

    // For company admins, allow joining any room without requiring database meeting record
    if (user_role === 'company-admin') {
        sendResponse(res, 200, true, {
            meeting_id: meetingId,
            observer_permissions: {
                can_view_screen: true,
                can_take_screenshots: true,
                can_control_mouse: false,
                can_control_keyboard: false
            },
            can_observe: true
        }, "Successfully joined as company admin observer");
        return;
    }

    const meeting = await MeetingModel.findOne({ meeting_id: meetingId });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    if (!meeting.observer_enabled) {
        return next(new ErrorHandler("Observer mode is not enabled for this meeting", 400));
    }

    // Check if user is authorized to observe
    let isAuthorizedObserver = false;
    
    // Company admins can observe any meeting in their company
    if (user_role === 'company-admin') {
        // Check if the meeting belongs to the same company as the admin
        const adminCompany = req.user.company;
        
        if (adminCompany && meeting.userId) {
            // Get the meeting creator's company
            const UserModel = (await import('../models/user.js')).default;
            const meetingCreator = await UserModel.findById(meeting.userId);
            
            if (meetingCreator && meetingCreator.company === adminCompany) {
                isAuthorizedObserver = true;
            }
        }
    }
    
    // Check if user is explicitly added as observer
    if (!isAuthorizedObserver) {
        isAuthorizedObserver = meeting.observers.some(obs => 
            obs.observer_id.toString() === user_id.toString() && obs.is_active
        );
    }

    if (!isAuthorizedObserver) {
        return next(new ErrorHandler("You are not authorized to observe this meeting", 403));
    }

    // Update observer status if user is in observers list
    const observer = meeting.observers.find(obs => obs.observer_id.toString() === user_id.toString());
    if (observer) {
        observer.joined_at = new Date();
        observer.is_active = true;
        meeting.last_updated_by = user_id;
        await meeting.save();
    }

    sendResponse(res, 200, true, {
        meeting_id: meeting.meeting_id,
        observer_permissions: meeting.observer_permissions,
        can_observe: true
    }, "Successfully joined as observer");
});

// Leave meeting as observer
export const leaveAsObserver = catchAsyncError(async (req, res, next) => {
    const { meetingId } = req.params;
    const user_id = req.user._id;

    const meeting = await MeetingModel.findOne({ meeting_id: meetingId });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    // Update observer status
    const observer = meeting.observers.find(obs => obs.observer_id.toString() === user_id.toString());
    if (observer) {
        observer.left_at = new Date();
        observer.is_active = false;
        meeting.last_updated_by = user_id;
        await meeting.save();
    }

    sendResponse(res, 200, true, {
        meeting_id: meeting.meeting_id,
        left_at: new Date()
    }, "Successfully left as observer");
});

// Get meetings where user can observe
export const getObservableMeetings = catchAsyncError(async (req, res, next) => {
    const user_id = req.user._id;

    const meetings = await MeetingModel.find({
        observer_enabled: true,
        'observers.observer_id': user_id,
        'observers.is_active': true,
        deleted: { $ne: true }
    }).populate('userId', 'firstName lastName email')
      .populate('created_by', 'firstName lastName email')
      .select('meeting_id name first_name last_name observer_permissions observers createdAt');

    const observableMeetings = meetings.map(meeting => {
        const observerInfo = meeting.observers.find(obs => obs.observer_id.toString() === user_id.toString());
        return {
            meeting_id: meeting.meeting_id,
            name: meeting.name,
            first_name: meeting.first_name,
            last_name: meeting.last_name,
            observer_permissions: meeting.observer_permissions,
            observer_info: observerInfo,
            created_at: meeting.createdAt,
            created_by: meeting.created_by,
            user: meeting.userId
        };
    });

    sendResponse(res, 200, true, {
        meetings: observableMeetings,
        total_count: observableMeetings.length
    }, "Observable meetings retrieved successfully");
});
