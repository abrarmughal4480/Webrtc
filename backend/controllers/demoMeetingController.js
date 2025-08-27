import DemoMeeting from '../models/demoMeeting.js';
import catchAsyncError from '../middlewares/catchAsyncError.js';
import sendResponse from '../utils/sendResponse.js';
import ErrorHandler from '../utils/errorHandler.js';

// Create a new demo meeting request
export const createDemoMeetingRequest = catchAsyncError(async (req, res, next) => {
    const {
        name,
        email,
        date,
        hour,
        minute,
        message,
        company,
        phone
    } = req.body;

    // Validate required fields
    if (!name || !email || !date) {
        return next(new ErrorHandler('Name, email, and date are required', 400));
    }

    // Validate date (must be future date)
    const requestedDate = new Date(date);
    const now = new Date();
    if (requestedDate <= now) {
        return next(new ErrorHandler('Meeting date must be in the future', 400));
    }

    // Prepare data for database
    const demoMeetingData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        requestedDate: requestedDate,
        requestedTime: {
            hour: hour || '08',
            minute: minute || '00'
        },
        message: message ? message.trim() : '',
        company: company ? company.trim() : '',
        phone: phone ? phone.trim() : ''
    };

    // Add metadata
    demoMeetingData.userAgent = req.get('User-Agent') || '';
    demoMeetingData.ipAddress = req.ip || req.connection.remoteAddress || '';

    // Create demo meeting request
    const demoMeeting = await DemoMeeting.create(demoMeetingData);

    sendResponse(res, 201, true, 'Demo meeting request submitted successfully', demoMeeting);
});

// Get all demo meeting requests (for admin/superadmin)
export const getAllDemoMeetingRequests = catchAsyncError(async (req, res, next) => {
    const { page = 1, limit = 10, status, priority, search, dateFrom, dateTo } = req.query;

    // Build query
    const query = {};
    
    if (status && status !== 'all') {
        query.status = status;
    }
    
    if (priority && priority !== 'all') {
        query.priority = priority;
    }
    
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } }
        ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
        query.requestedDate = {};
        if (dateFrom) {
            query.requestedDate.$gte = new Date(dateFrom);
        }
        if (dateTo) {
            query.requestedDate.$lte = new Date(dateTo);
        }
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [demoMeetings, total] = await Promise.all([
        DemoMeeting.find(query)
            .sort({ requestedDate: 1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('assignedTo', 'email firstName lastName'),
        DemoMeeting.countDocuments(query)
    ]);

    sendResponse(res, 200, true, 'Demo meeting requests retrieved successfully', {
        demoMeetings,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: parseInt(limit)
        }
    });
});

// Get demo meeting request by ID
export const getDemoMeetingRequestById = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;

    const demoMeeting = await DemoMeeting.findById(id)
        .populate('assignedTo', 'email firstName lastName');

    if (!demoMeeting) {
        return next(new ErrorHandler('Demo meeting request not found', 404));
    }

    sendResponse(res, 200, true, 'Demo meeting request retrieved successfully', demoMeeting);
});

// Update demo meeting request
export const updateDemoMeetingRequest = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const { 
        status, 
        priority, 
        assignedTo, 
        meetingLink, 
        meetingNotes, 
        followUpRequired, 
        followUpDate 
    } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
    if (meetingNotes !== undefined) updateData.meetingNotes = meetingNotes;
    if (followUpRequired !== undefined) updateData.followUpRequired = followUpRequired;
    if (followUpDate !== undefined) updateData.followUpDate = followUpDate;

    const demoMeeting = await DemoMeeting.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate('assignedTo', 'email firstName lastName');

    if (!demoMeeting) {
        return next(new ErrorHandler('Demo meeting request not found', 404));
    }

    sendResponse(res, 200, true, 'Demo meeting request updated successfully', demoMeeting);
});

// Reschedule demo meeting
export const rescheduleDemoMeeting = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const { newDate, newHour, newMinute, reason } = req.body;

    if (!newDate) {
        return next(new ErrorHandler('New date is required for rescheduling', 400));
    }

    const requestedDate = new Date(newDate);
    const now = new Date();
    if (requestedDate <= now) {
        return next(new ErrorHandler('New meeting date must be in the future', 400));
    }

    const updateData = {
        requestedDate: requestedDate,
        requestedTime: {
            hour: newHour || '08',
            minute: newMinute || '00'
        },
        status: 'rescheduled'
    };

    if (reason) {
        updateData.meetingNotes = `${new Date().toISOString()}: Rescheduled - ${reason}`;
    }

    const demoMeeting = await DemoMeeting.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    );

    if (!demoMeeting) {
        return next(new ErrorHandler('Demo meeting request not found', 404));
    }

    sendResponse(res, 200, true, 'Demo meeting rescheduled successfully', demoMeeting);
});

// Delete demo meeting request
export const deleteDemoMeetingRequest = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;

    const demoMeeting = await DemoMeeting.findByIdAndDelete(id);

    if (!demoMeeting) {
        return next(new ErrorHandler('Demo meeting request not found', 404));
    }

    sendResponse(res, 200, true, 'Demo meeting request deleted successfully');
});

// Get demo meeting statistics
export const getDemoMeetingStats = catchAsyncError(async (req, res, next) => {
    const stats = await DemoMeeting.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const total = await DemoMeeting.countDocuments();
    const pending = await DemoMeeting.countDocuments({ status: 'pending' });
    const confirmed = await DemoMeeting.countDocuments({ status: 'confirmed' });
    const completed = await DemoMeeting.countDocuments({ status: 'completed' });

    // Get upcoming meetings (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcoming = await DemoMeeting.countDocuments({
        requestedDate: { $gte: new Date(), $lte: nextWeek },
        status: { $in: ['pending', 'confirmed'] }
    });

    sendResponse(res, 200, true, 'Statistics retrieved successfully', {
        total,
        pending,
        confirmed,
        completed,
        upcoming,
        breakdown: stats
    });
});
