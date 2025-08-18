import SupportTicket from '../models/supportTicket.js';
import User from '../models/user.js';
import Company from '../models/company.js';
import catchAsyncError  from '../middlewares/catchAsyncError.js';
import sendResponse from '../utils/sendResponse.js';
import ErrorHandler  from '../utils/errorHandler.js';
import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import crypto from 'crypto';

// S3 SETUP (same as authController.js)
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-2',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    maxAttempts: parseInt(process.env.S3_MAX_RETRIES) || 3,
    retryMode: 'adaptive',
    forcePathStyle: false,
    requestHandler: {
        connectionTimeout: parseInt(process.env.S3_CONNECTION_TIMEOUT) || 3000,
        socketTimeout: parseInt(process.env.S3_SOCKET_TIMEOUT) || 120000,
        http2: true,
    },
    endpoint: process.env.S3_USE_ACCELERATE === 'true' 
        ? `https://s3-accelerate.amazonaws.com` 
        : undefined,
});

const S3_CONFIG = {
    bucket: process.env.S3_BUCKET_NAME,
    partSize: parseInt(process.env.S3_PART_SIZE) || 16 * 1024 * 1024,
    queueSize: parseInt(process.env.S3_QUEUE_SIZE) || 6,
    leavePartsOnError: false,
    useAccelerateEndpoint: process.env.S3_USE_ACCELERATE === 'true',
    storageClass: process.env.S3_STORAGE_CLASS || 'STANDARD',
    enableDelete: process.env.S3_ENABLE_DELETE !== 'false',
};

const generateUniqueFileName = (prefix, userId, extension) => {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    return `${prefix}/${userId}/${timestamp}_${randomString}.${extension}`;
};

const uploadFileToS3 = async (file, userId, folder = 'support-tickets') => {
    try {
        const fileExtension = file.name.split('.').pop();
        const fileKey = generateUniqueFileName(folder, userId, fileExtension);
        
        // Use single-part upload for files < 5MB
        if (file.size < 5 * 1024 * 1024) {
            const putCommand = new PutObjectCommand({
                Bucket: S3_CONFIG.bucket,
                Key: fileKey,
                Body: file.data,
                ContentType: file.mimetype,
                StorageClass: S3_CONFIG.storageClass,
                ServerSideEncryption: 'AES256',
                CacheControl: 'public, max-age=31536000, immutable',
                ContentDisposition: 'inline',
                Metadata: {
                    'uploaded-by': userId.toString(),
                    'upload-timestamp': Date.now().toString(),
                    'file-type': fileExtension,
                    'upload-method': 'single-part',
                    'original-name': file.name
                },
                Tagging: `Environment=${process.env.NODE_ENV || 'development'}&Service=videodesk&Type=support-ticket`
            });
            const result = await s3Client.send(putCommand);
            const region = process.env.AWS_REGION || 'ap-southeast-2';
            const url = `https://${S3_CONFIG.bucket}.s3.${region}.amazonaws.com/${fileKey}`;
            return {
                key: fileKey,
                url: url,
                originalName: file.name,
                fileSize: file.size,
                mimeType: file.mimetype
            };
        }

        // For larger files, use multipart upload
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: S3_CONFIG.bucket,
                Key: fileKey,
                Body: file.data,
                ContentType: file.mimetype,
                StorageClass: S3_CONFIG.storageClass,
                ServerSideEncryption: 'AES256',
                CacheControl: 'public, max-age=31536000, immutable',
                ContentDisposition: 'inline',
                Metadata: {
                    'uploaded-by': userId.toString(),
                    'upload-timestamp': Date.now().toString(),
                    'file-type': fileExtension,
                    'upload-method': 'multipart-optimized',
                    'original-name': file.name
                },
                Tagging: `Environment=${process.env.NODE_ENV || 'development'}&Service=videodesk&Type=support-ticket`
            },
            partSize: 5 * 1024 * 1024, // 5MB for faster multipart
            queueSize: S3_CONFIG.queueSize,
            leavePartsOnError: S3_CONFIG.leavePartsOnError,
        });
        const result = await upload.done();
        return {
            key: fileKey,
            url: result.Location,
            originalName: file.name,
            fileSize: file.size,
            mimeType: file.mimetype
        };
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error('Failed to upload file to S3');
    }
};

const deleteFileFromS3 = async (fileKey) => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: S3_CONFIG.bucket,
            Key: fileKey
        });
        await s3Client.send(command);
        return true;
    } catch (error) {
        console.error('S3 delete error:', error);
        throw new Error('Failed to delete file from S3');
    }
};

// Create a new support ticket
export const createSupportTicket = catchAsyncError(async (req, res, next) => {
    const {
        category,
        priority,
        subject,
        description,
        tags,
        source,
        estimatedResolutionTime
    } = req.body;

    const userId = req.user.id;
    const companyId = req.user.companyId || null;

    // Get user agent and IP from request
    const userAgent = req.get('User-Agent');
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Validate required fields
    if (!subject || !description) {
        return next(new ErrorHandler('Subject and description are required', 400));
    }

    // Handle file uploads if any
    let attachments = [];
    if (req.files && req.files.files) {
        // express-fileupload stores files in req.files.files when key is 'files'
        const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
        
        try {
            for (const file of files) {
                // Validate file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    return next(new ErrorHandler(`File ${file.name} is too large. Maximum size is 10MB.`, 400));
                }

                // Validate file type
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
                if (!allowedTypes.includes(file.mimetype)) {
                    return next(new ErrorHandler(`File type ${file.mimetype} is not allowed.`, 400));
                }

                // Upload file to S3
                const uploadResult = await uploadFileToS3(file, userId);
                
                attachments.push({
                    filename: uploadResult.key,
                    originalName: uploadResult.originalName,
                    filePath: uploadResult.url,
                    fileSize: uploadResult.fileSize,
                    mimeType: uploadResult.mimeType,
                    uploadedAt: new Date()
                });
            }
        } catch (error) {
            console.error('File upload error:', error);
            return next(new ErrorHandler('Failed to upload attachments', 500));
        }
    }

    // Create ticket data
    const ticketData = {
        userId,
        companyId,
        category: category || 'General Inquiry',
        priority: priority || 'Medium',
        subject: subject.trim(),
        description: description.trim(),
        tags: tags || [],
        source: source || 'Web',
        userAgent,
        ipAddress,
        attachments
    };

    // Add estimated resolution time if provided
    if (estimatedResolutionTime) {
        ticketData.estimatedResolutionTime = new Date(estimatedResolutionTime);
    }

    const ticket = await SupportTicket.create(ticketData);

    // Populate user information
    await ticket.populate('userId', 'email role landlordInfo.landlordName');

    res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: ticket
    });
});

// Get all tickets for a user
export const getUserTickets = catchAsyncError(async (req, res, next) => {
    const userId = req.user.id;
    const { page = 1, limit = 10, status, category, priority, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build filter
    const filter = { userId, deleted: false };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    const tickets = await SupportTicket.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('assignedTo', 'email role landlordInfo.landlordName');

        // Convert tickets to plain objects for response
    const ticketsData = tickets.map(ticket => ticket.toObject ? ticket.toObject() : ticket);

    const total = await SupportTicket.countDocuments(filter);

    res.status(200).json({
        success: true,
        data: ticketsData,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalTickets: total,
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1
        }
    });
});

// Get a single ticket by ID
export const getTicketById = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;

    const ticket = await SupportTicket.findOne({
        _id: id,
        userId,
        deleted: false
    }).populate([
        { path: 'userId', select: 'email role landlordInfo.landlordName' },
        { path: 'assignedTo', select: 'email role landlordInfo.landlordName' },
        { path: 'companyId', select: 'name' }
    ]);

    if (!ticket) {
        return next(new ErrorHandler('Ticket not found', 404));
    }

    // Convert ticket to plain object for response
    let ticketData = ticket.toObject();

    res.status(200).json({
        success: true,
        data: ticketData
    });
});

// Update a ticket
export const updateTicket = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated by users
    delete updateData.ticketId;
    delete updateData.userId;
    delete updateData.companyId;
    delete updateData.assignedTo;
    delete updateData.assignedAt;
    delete updateData.resolvedAt;
    delete updateData.closedAt;
    delete updateData.internalNotes;
    delete updateData.lastUpdatedBy;

    const ticket = await SupportTicket.findOneAndUpdate(
        { _id: id, userId, deleted: false },
        { ...updateData, lastUpdatedBy: userId },
        { new: true, runValidators: true }
    ).populate('userId', 'email role landlordInfo.landlordName');

    if (!ticket) {
        return next(new ErrorHandler('Ticket not found', 404));
    }

    res.status(200).json({
        success: true,
        message: 'Ticket updated successfully',
        data: ticket
    });
});

// Delete a ticket (soft delete)
export const deleteTicket = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;

    const ticket = await SupportTicket.findOne({
        _id: id,
        userId,
        deleted: false
    });

    if (!ticket) {
        return next(new ErrorHandler('Ticket not found', 404));
    }

    // Delete attachments from S3 if any
    if (ticket.attachments && ticket.attachments.length > 0) {
        try {
            await Promise.all(ticket.attachments.map(async (attachment) => {
                await deleteFileFromS3(attachment.filename);
            }));
        } catch (error) {
            console.error('Error deleting attachments from S3:', error);
            // Continue with ticket deletion even if S3 deletion fails
        }
    }

    // Soft delete the ticket
    ticket.deleted = true;
    ticket.deletedAt = new Date();
    ticket.deletedBy = userId;
    await ticket.save();

    res.status(200).json({
        success: true,
        message: 'Ticket deleted successfully'
    });
});

// Admin: Get all tickets (for admin/support staff)
export const getAllTickets = catchAsyncError(async (req, res, next) => {
    const { page = 1, limit = 20, status, category, priority, assignedTo, companyId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Check if user has admin privileges
    if (!['admin', 'superadmin', 'company-admin'].includes(req.user.role)) {
        return next(new ErrorHandler('Access denied. Admin privileges required.', 403));
    }

    // Build filter
    const filter = { deleted: false };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (companyId) filter.companyId = companyId;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    const tickets = await SupportTicket.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate([
            { path: 'userId', select: 'email role landlordInfo.landlordName' },
            { path: 'assignedTo', select: 'email role landlordInfo.landlordName' },
            { path: 'companyId', select: 'name' }
        ]);

    const total = await SupportTicket.countDocuments(filter);

    res.status(200).json({
        success: true,
        data: tickets,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalTickets: total,
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1
        }
    });
});

// Admin: Update ticket status and assign
export const adminUpdateTicket = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const { status, assignedTo, internalNotes, resolution, estimatedResolutionTime } = req.body;
    const adminId = req.user.id;

    // Check if user has admin privileges
    if (!['admin', 'superadmin', 'company-admin'].includes(req.user.role)) {
        return next(new ErrorHandler('Access denied. Admin privileges required.', 403));
    }

    const updateData = { lastUpdatedBy: adminId };
    
    if (status) updateData.status = status;
    if (assignedTo) {
        updateData.assignedTo = assignedTo;
        updateData.assignedAt = new Date();
    }
    if (internalNotes) updateData.internalNotes = internalNotes;
    if (resolution) updateData.resolution = resolution;
    if (estimatedResolutionTime) updateData.estimatedResolutionTime = new Date(estimatedResolutionTime);

    // Set resolved/closed timestamps
    if (status === 'Resolved') {
        updateData.resolvedAt = new Date();
    } else if (status === 'Closed') {
        updateData.closedAt = new Date();
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate([
        { path: 'userId', select: 'email role landlordInfo.landlordName' },
        { path: 'assignedTo', select: 'email role landlordInfo.landlordName' },
        { path: 'companyId', select: 'name' }
    ]);

    if (!ticket) {
        return next(new ErrorHandler('Ticket not found', 404));
    }

    res.status(200).json({
        success: true,
        message: 'Ticket updated successfully',
        data: ticket
    });
});

// Get ticket statistics
export const getTicketStats = catchAsyncError(async (req, res, next) => {
    const { companyId, timeRange } = req.query;
    const userId = req.user.id;

    let filters = { deleted: false };
    
    // Add company filter if user is not superadmin
    if (req.user.role !== 'superadmin' && companyId) {
        filters.companyId = companyId;
    }

    // Add time range filter
    if (timeRange) {
        const now = new Date();
        let startDate;
        
        switch (timeRange) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        }
        
        filters.createdAt = { $gte: startDate };
    }

    const stats = await SupportTicket.aggregate([
        { $match: filters },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgPriority: { $avg: { $indexOfArray: ['$priority', ['Low', 'Medium', 'High', 'Critical']] } }
            }
        }
    ]);

    // Get total counts by category and priority
    const categoryStats = await SupportTicket.aggregate([
        { $match: filters },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 }
            }
        }
    ]);

    const priorityStats = await SupportTicket.aggregate([
        { $match: filters },
        {
            $group: {
                _id: '$priority',
                count: { $sum: 1 }
            }
        }
    ]);

    // Get overdue tickets count
    const overdueCount = await SupportTicket.countDocuments({
        ...filters,
        estimatedResolutionTime: { $lt: new Date() },
        status: { $nin: ['Resolved', 'Closed'] }
    });

    res.status(200).json({
        success: true,
        data: {
            statusStats: stats,
            categoryStats,
            priorityStats,
            overdueCount,
            totalTickets: stats.reduce((sum, stat) => sum + stat.count, 0)
        }
    });
});

// Bulk operations for admin
export const bulkUpdateTickets = catchAsyncError(async (req, res, next) => {
    const { ticketIds, updates } = req.body;
    const adminId = req.user.id;

    // Check if user has admin privileges
    if (!['admin', 'superadmin', 'company-admin'].includes(req.user.role)) {
        return next(new ErrorHandler('Access denied. Admin privileges required.', 403));
    }

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
        return next(new ErrorHandler('Ticket IDs array is required', 400));
    }

    // Remove fields that shouldn't be updated in bulk
    const safeUpdates = { ...updates };
    delete safeUpdates.ticketId;
    delete safeUpdates.userId;
    delete safeUpdates.companyId;
    delete safeUpdates.createdAt;

    safeUpdates.lastUpdatedBy = adminId;

    // Set resolved/closed timestamps if status is being updated
    if (updates.status === 'Resolved') {
        safeUpdates.resolvedAt = new Date();
    } else if (updates.status === 'Closed') {
        safeUpdates.closedAt = new Date();
    }

    const result = await SupportTicket.updateMany(
        { _id: { $in: ticketIds }, deleted: false },
        safeUpdates
    );

    res.status(200).json({
        success: true,
        message: `${result.modifiedCount} tickets updated successfully`,
        data: {
            modifiedCount: result.modifiedCount,
            totalCount: ticketIds.length
        }
    });
});

// Search tickets
export const searchTickets = catchAsyncError(async (req, res, next) => {
    const { q, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    if (!q || q.trim().length < 2) {
        return next(new ErrorHandler('Search query must be at least 2 characters long', 400));
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    
    let filter = { deleted: false };
    
    // If user is not admin, only search their tickets
    if (!['admin', 'superadmin', 'company-admin'].includes(req.user.role)) {
        filter.userId = userId;
    }

    const searchFilter = {
        ...filter,
        $or: [
            { subject: searchRegex },
            { description: searchRegex },
            { ticketId: searchRegex },
            { tags: { $in: [searchRegex] } }
        ]
    };

    const skip = (page - 1) * limit;

    const tickets = await SupportTicket.find(searchFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate([
            { path: 'userId', select: 'email role landlordInfo.landlordName' },
            { path: 'assignedTo', select: 'email role landlordInfo.landlordName' }
        ]);

    const total = await SupportTicket.countDocuments(searchFilter);

    res.status(200).json({
        success: true,
        data: tickets,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalTickets: total,
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1
        }
    });
});

// Admin: Update ticket with comprehensive fields
export const adminUpdateTicketComprehensive = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const updateData = req.body;
    const adminId = req.user.id;

    // Check if user has admin privileges
    if (!['admin', 'superadmin'].includes(req.user.role)) {
        return next(new ErrorHandler('Access denied. Admin privileges required.', 403));
    }

    // Modern approach: Use object destructuring and spread operator
    const {
        status,
        priority,
        assignedTo,
        internalNotes,
        resolution,
        estimatedResolutionTime,
        escalationLevel
    } = updateData;

    // Build update object dynamically
    const updates = { lastUpdatedBy: adminId };
    
    // Only add fields that are provided
    if (status !== undefined) {
        updates.status = status;
        // Auto-set timestamps based on status
        if (status === 'Resolved') updates.resolvedAt = new Date();
        if (status === 'Closed') updates.closedAt = new Date();
    }
    
    if (priority !== undefined) updates.priority = priority;
    if (assignedTo !== undefined) {
        updates.assignedTo = assignedTo;
        updates.assignedAt = new Date();
    }
    if (internalNotes !== undefined) updates.internalNotes = internalNotes;
    if (resolution !== undefined) updates.resolution = resolution;
    if (estimatedResolutionTime !== undefined) updates.estimatedResolutionTime = new Date(estimatedResolutionTime);
    if (escalationLevel !== undefined) updates.escalationLevel = escalationLevel;

    // Use findOneAndUpdate with modern options
    const ticket = await SupportTicket.findOneAndUpdate(
        { _id: id, deleted: false },
        { $set: updates },
        { 
            new: true, 
            runValidators: true,
            lean: true // Faster performance
        }
    ).populate([
        { path: 'userId', select: 'email role landlordInfo.landlordName' },
        { path: 'assignedTo', select: 'email role landlordInfo.landlordName' },
        { path: 'companyId', select: 'name' }
    ]);

    if (!ticket) {
        return next(new ErrorHandler('Ticket not found', 404));
    }

    res.status(200).json({
        success: true,
        message: 'Ticket updated successfully',
        data: ticket
    });
});

// Super Admin: Get ALL tickets without any restrictions
export const getSuperAdminAllTickets = catchAsyncError(async (req, res, next) => {
    // Only superadmin can access this
    if (req.user.role !== 'superadmin') {
        return next(new ErrorHandler('Access denied. Superadmin privileges required.', 403));
    }

    const { page = 1, limit = 50, status, category, priority, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build filter - only filter by deleted status, no user/company restrictions
    const filter = { deleted: false };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get ALL tickets without any user/company restrictions
    const tickets = await SupportTicket.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate([
            { path: 'userId', select: 'email role landlordInfo.landlordName' },
            { path: 'assignedTo', select: 'email role landlordInfo.landlordName' },
            { path: 'companyId', select: 'name' }
        ]);

    const total = await SupportTicket.countDocuments(filter);

    res.status(200).json({
        success: true,
        data: tickets,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalTickets: total,
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1
        }
    });
});

// Admin: Get dashboard statistics
export const getDashboardStats = catchAsyncError(async (req, res, next) => {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
        return next(new ErrorHandler('Access denied. Admin privileges required.', 403));
    }

    // Use Promise.all for parallel execution - much faster!
    const [totalTickets, openTickets, criticalTickets, statusStats] = await Promise.all([
        SupportTicket.countDocuments({ deleted: false }),
        SupportTicket.countDocuments({ deleted: false, status: 'Open' }),
        SupportTicket.countDocuments({ deleted: false, status: { $in: ['Open', 'In Progress'] }, priority: 'Critical' }),
        SupportTicket.aggregate([
            { $match: { deleted: false } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ])
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalTickets,
            openTickets,
            criticalTickets,
            statusBreakdown: statusStats,
            timestamp: new Date().toISOString()
        }
    });
});

// Export tickets (for admin)
export const exportTickets = catchAsyncError(async (req, res, next) => {
    const { format = 'json', filters = {} } = req.query;

    // Check if user has admin privileges
    if (!['admin', 'superadmin', 'company-admin'].includes(req.user.role)) {
        return next(new ErrorHandler('Access denied. Admin privileges required.', 403));
    }

    const queryFilter = { deleted: false, ...filters };
    
    const tickets = await SupportTicket.find(queryFilter)
        .populate([
            { path: 'userId', select: 'email role landlordInfo.landlordName' },
            { path: 'assignedTo', select: 'email role landlordInfo.landlordName' },
            { path: 'companyId', select: 'name' }
        ])
        .sort({ createdAt: -1 });

    if (format === 'csv') {
        // Convert to CSV format
        const csvData = tickets.map(ticket => ({
            'Ticket ID': ticket.ticketId,
            'Subject': ticket.subject,
            'Category': ticket.category,
            'Priority': ticket.priority,
            'Status': ticket.status,
            'Created': ticket.createdAt,
            'User': ticket.userId?.email || 'N/A',
            'Assigned To': ticket.assignedTo?.email || 'Unassigned',
            'Company': ticket.companyId?.name || 'N/A'
        }));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=support-tickets.csv');
        
        // Simple CSV conversion
        const csvString = [
            Object.keys(csvData[0]).join(','),
            ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
        ].join('\n');
        
        res.send(csvString);
    } else {
        res.status(200).json({
            success: true,
            data: tickets,
            exportFormat: 'json',
            totalTickets: tickets.length
        });
    }
});

// Delete a specific attachment from a ticket
export const deleteAttachment = catchAsyncError(async (req, res, next) => {
    const { ticketId, attachmentId } = req.params;
    const userId = req.user.id;

    const ticket = await SupportTicket.findOne({
        _id: ticketId,
        userId,
        deleted: false
    });

    if (!ticket) {
        return next(new ErrorHandler('Ticket not found', 404));
    }

    const attachment = ticket.attachments.id(attachmentId);
    if (!attachment) {
        return next(new ErrorHandler('Attachment not found', 404));
    }

    try {
        // Delete from S3
        await deleteFileFromS3(attachment.filename);
        
        // Remove from ticket
        ticket.attachments.pull(attachmentId);
        await ticket.save();

        res.status(200).json({
            success: true,
            message: 'Attachment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting attachment:', error);
        return next(new ErrorHandler('Failed to delete attachment', 500));
    }
});
