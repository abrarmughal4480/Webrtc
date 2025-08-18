import CallbackRequest from '../models/callbackRequest.js';
import catchAsyncError from '../middlewares/catchAsyncError.js';
import sendResponse from '../utils/sendResponse.js';
import ErrorHandler from '../utils/errorHandler.js';

// Create a new callback request
export const createCallbackRequest = catchAsyncError(async (req, res, next) => {
    const {
        name,
        email,
        phone,
        day,
        customDate,
        customHour,
        customMinute,
        message
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
        return next(new ErrorHandler('Name, email, and phone are required', 400));
    }

    // Prepare data for database
    const callbackData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        message: message ? message.trim() : '',
        preferredDay: day || 'today',
        preferredTime: {
            hour: customHour || '09',
            minute: customMinute || '00'
        }
    };

    // Handle custom date if provided
    if (day === 'custom' && customDate) {
        callbackData.customDate = new Date(customDate);
    }

    // Add metadata
    callbackData.userAgent = req.get('User-Agent') || '';
    callbackData.ipAddress = req.ip || req.connection.remoteAddress || '';

    // Create callback request
    const callbackRequest = await CallbackRequest.create(callbackData);

    sendResponse(res, 201, true, 'Callback request submitted successfully', callbackRequest);
});

// Get all callback requests (for admin/superadmin)
export const getAllCallbackRequests = catchAsyncError(async (req, res, next) => {
    const { page = 1, limit = 10, status, priority, search } = req.query;

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
            { phone: { $regex: search, $options: 'i' } }
        ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [callbackRequests, total] = await Promise.all([
        CallbackRequest.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('assignedTo', 'email firstName lastName'),
        CallbackRequest.countDocuments(query)
    ]);

    sendResponse(res, 200, true, 'Callback requests retrieved successfully', {
        callbackRequests,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: parseInt(limit)
        }
    });
});

// Get callback request by ID
export const getCallbackRequestById = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;

    const callbackRequest = await CallbackRequest.findById(id)
        .populate('assignedTo', 'email firstName lastName');

    if (!callbackRequest) {
        return next(new ErrorHandler('Callback request not found', 404));
    }

    sendResponse(res, 200, true, 'Callback request retrieved successfully', callbackRequest);
});

// Update callback request status
export const updateCallbackRequestStatus = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const { status, priority, assignedTo, notes } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (notes !== undefined) updateData.notes = notes;

    const callbackRequest = await CallbackRequest.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate('assignedTo', 'email firstName lastName');

    if (!callbackRequest) {
        return next(new ErrorHandler('Callback request not found', 404));
    }

    sendResponse(res, 200, true, 'Callback request updated successfully', callbackRequest);
});

// Add contact attempt note
export const addContactAttempt = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const { notes } = req.body;

    if (!notes) {
        return next(new ErrorHandler('Notes are required for contact attempt', 400));
    }

    const callbackRequest = await CallbackRequest.findByIdAndUpdate(
        id,
        {
            $inc: { contactAttempts: 1 },
            $set: { lastContactAttempt: new Date() },
            $push: { notes: `${new Date().toISOString()}: ${notes}` }
        },
        { new: true, runValidators: true }
    );

    if (!callbackRequest) {
        return next(new ErrorHandler('Callback request not found', 404));
    }

    sendResponse(res, 200, true, 'Contact attempt recorded successfully', callbackRequest);
});

// Delete callback request
export const deleteCallbackRequest = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;

    const callbackRequest = await CallbackRequest.findByIdAndUpdate(id);

    if (!callbackRequest) {
        return next(new ErrorHandler('Callback request not found', 404));
    }

    sendResponse(res, 200, true, 'Callback request deleted successfully');
});

// Get callback request statistics
export const getCallbackRequestStats = catchAsyncError(async (req, res, next) => {
    const stats = await CallbackRequest.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const total = await CallbackRequest.countDocuments();
    const pending = await CallbackRequest.countDocuments({ status: 'pending' });
    const contacted = await CallbackRequest.countDocuments({ status: 'contacted' });
    const completed = await CallbackRequest.countDocuments({ status: 'completed' });

    sendResponse(res, 200, true, 'Statistics retrieved successfully', {
        total,
        pending,
        contacted,
        completed,
        breakdown: stats
    });
});
