import catchAsyncError from '../middlewares/catchAsyncError.js';
import MeetingModel from '../models/meetings.js';
import sendResponse from '../utils/sendResponse.js';
import ErrorHandler from '../utils/errorHandler.js';
import sendEmail from '../utils/sendEmail.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import path from "path"
import fs from "fs"
import os from "os"
import crypto from 'crypto';
import UserModel from '../models/user.js';

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

const createProgressTracker = (totalFiles, meetingId, userId) => {
    let completedFiles = 0;
    let failedFiles = 0;
    
    const updateProgress = (success = true) => {
        if (success) {
            completedFiles++;
        } else {
            failedFiles++;
        }
        
        const totalProcessed = completedFiles + failedFiles;
        const successPercentage = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 100;
        const overallPercentage = totalFiles > 0 ? Math.round((totalProcessed / totalFiles) * 100) : 100;
        
        return {
            totalFiles,
            completedFiles,
            failedFiles,
            totalProcessed,
            successPercentage,
            overallPercentage,
            isComplete: totalProcessed >= totalFiles
        };
    };
    
    return { updateProgress, getStats: () => ({ completedFiles, failedFiles, totalFiles }) };
};

const validateFileSize = (base64Data, maxSizeMB = 50) => {
    const sizeInBytes = (base64Data.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > maxSizeMB) {
        throw new ErrorHandler(`File size (${sizeInMB.toFixed(2)}MB) exceeds maximum (${maxSizeMB}MB)`, 413);
    }

    return sizeInMB;
};
const validateTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
        return new Date();
    }
    return date;
};

const generateUniqueFileName = (prefix, meetingId, userId, index, extension) => {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    return `${prefix}/${meetingId}/${userId}/${timestamp}_${index}_${randomString}.${extension}`;
};

const uploadToS3 = async (data, options, retries = 2, progressCallback = null) => {
    let currentClient = s3Client;
    
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            let buffer;
            let contentType;
            let fileExtension;
            
            // Handle different file types
            if (options.fileType === 'video') {
                // For video files, create buffer from base64
                buffer = Buffer.from(data, 'base64');
                contentType = 'video/webm';
                fileExtension = 'webm';
            } else if (options.fileType === 'image') {
                // For images, handle base64 data
                const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
                buffer = Buffer.from(base64Data, 'base64');
                contentType = 'image/png';
                fileExtension = 'png';
            } else {
                throw new Error(`Unsupported file type: ${options.fileType}`);
            }
            
            // Generate unique file key
            const fileKey = generateUniqueFileName(
                options.folder || 'uploads',
                options.meetingId,
                options.userId,
                options.index,
                fileExtension
            );
            
            const upload = new Upload({
                client: currentClient,
                params: {
                    Bucket: S3_CONFIG.bucket,
                    Key: fileKey,
                    Body: buffer,
                    ContentType: contentType,
                    StorageClass: S3_CONFIG.storageClass,
                    ServerSideEncryption: 'AES256',
                    CacheControl: 'public, max-age=31536000, immutable',
                    ContentDisposition: 'inline',
                    Metadata: {
                        'uploaded-by': options.userId.toString(),
                        'meeting-id': options.meetingId.toString(),
                        'upload-timestamp': Date.now().toString(),
                        'file-type': options.fileType,
                        'upload-method': 'multipart-optimized'
                    },
                    Tagging: `Environment=${process.env.NODE_ENV || 'development'}&Service=videodesk&Type=${options.fileType}`
                },
                partSize: S3_CONFIG.partSize,
                queueSize: S3_CONFIG.queueSize,
                leavePartsOnError: S3_CONFIG.leavePartsOnError,
            });
            
            upload.on('httpUploadProgress', (progress) => {
                if (progress.total) {
                    const percentComplete = Math.round((progress.loaded / progress.total) * 100);
                }
            });
            
            const result = await upload.done();
            
            if (progressCallback) {
                progressCallback(true);
            }
            
            return {
                secure_url: result.Location,
                public_id: fileKey,
                bytes: buffer.length,
                etag: result.ETag,
                key: fileKey
            };
            
        } catch (error) {
            if (attempt <= retries && (
                error.code === 'NetworkingError' || 
                error.code === 'TimeoutError' ||
                error.message.includes('timeout') ||
                error.message.includes('ECONNRESET')
            )) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            
            if (progressCallback) {
                progressCallback(false);
            }
            
            throw error;
        }
    }
};

const cleanupS3Files = async (uploadedFiles) => {
    if (uploadedFiles.length === 0) return;
    
    if (!S3_CONFIG.enableDelete) {
        return;
    }
    
    let successCount = 0;
    let failedCount = 0;
    
    const deletePromises = uploadedFiles.map(async (file) => {
        const fileKey = file.public_id || file.key;
        try {
            const deleteCommand = new DeleteObjectCommand({
                Bucket: S3_CONFIG.bucket,
                Key: fileKey
            });
            
            await s3Client.send(deleteCommand);
            successCount++;
        } catch (error) {
            failedCount++;
        }
    });
    
    await Promise.all(deletePromises);
    
    if (failedCount > 0) {
        console.warn(`⚠️ S3 cleanup: ${successCount} deleted, ${failedCount} failed`);
    } else {
        console.log(`✅ S3 cleanup: ${successCount} files deleted`);
    }
};

const deleteFromS3WithRetry = async (fileKey, retries = 3) => {
    if (!S3_CONFIG.enableDelete) {
        return { 
            deleted: false, 
            fileKey,
            reason: 'DeleteDisabled',
            message: 'S3 delete disabled in configuration',
            canRetry: false
        };
    }
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const deleteCommand = new DeleteObjectCommand({
                Bucket: S3_CONFIG.bucket,
                Key: fileKey
            });
            
            await s3Client.send(deleteCommand);
            return { 
                deleted: true, 
                fileKey,
                message: 'Successfully deleted from S3'
            };
            
        } catch (error) {
            if (error.name === 'AccessDenied' || error.message.includes('not authorized to perform: s3:DeleteObject')) {
                return { 
                    deleted: false, 
                    fileKey,
                    reason: 'AccessDenied',
                    message: 'Delete permission not available - file remains in S3',
                    canRetry: false
                };
            }
            
            if (error.code === 'NoSuchKey') {
                return { 
                    deleted: true, 
                    fileKey,
                    reason: 'NoSuchKey',
                    message: 'File was already deleted or does not exist'
                };
            }
            
            if (attempt < retries && (
                error.code === 'NetworkingError' || 
                error.code === 'TimeoutError' ||
                error.message.includes('timeout') ||
                error.message.includes('ECONNRESET')
            )) {
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                continue;
            }
            
            if (attempt === retries) {
                return { 
                    deleted: false, 
                    fileKey,
                    reason: error.code || 'UnknownError',
                    message: error.message,
                    canRetry: true
                };
            }
        }
    }
};

const processFilesInParallel = async (files, fileType, meetingId, userId, uploadFunction, maxConcurrency = 3) => {
    if (!files || files.length === 0) return [];
    
    const progressTracker = createProgressTracker(files.length, meetingId, userId);
    const results = [];
    const batches = [];
    
    for (let i = 0; i < files.length; i += maxConcurrency) {
        batches.push(files.slice(i, i + maxConcurrency));
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        const batchPromises = batch.map(async (file, localIndex) => {
            const globalIndex = batchIndex * maxConcurrency + localIndex;
            
            try {
                return await uploadFunction(file, globalIndex, progressTracker.updateProgress);
            } catch (error) {
                progressTracker.updateProgress(false);
                return null;
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        const stats = progressTracker.getStats();
    }
    
    const finalStats = progressTracker.getStats();
    
    return results.filter(result => result !== null);
};

export const create = catchAsyncError(async (req, res, next) => {
    const { 
        meeting_id, 
        name, 
        address, 
        post_code, 
        phone_number,
        reference, 
        repair_detail, 
        work_details,
        target_time, 
        special_notes,
        recordings, 
        screenshots, 
        update_mode,
        house_name_number,
        flat_apartment_room,
        street_road,
        city,
        first_name,
        last_name,
        country
    } = req.body;
    const user_id = req.user._id;

    const startTime = Date.now();
    const totalFiles = (recordings?.length || 0) + (screenshots?.length || 0);
    
    if (!meeting_id) {
        return next(new ErrorHandler("Meeting ID is required", 400));
    }

    const existingMeeting = await MeetingModel.findOne({ meeting_id });
    if (existingMeeting) {
        if (!existingMeeting.userId) {
            existingMeeting.userId = user_id;
        }
        return await updateMeetingWithNewMediaOnly(existingMeeting, req.body, res, next, user_id, req);
    }

    const processRecording = async (recording, index, progressCallback) => {
        
        try {
            validateFileSize(recording.data, 100);
            const recordingData = recording.data.split(",")[2];
            
            const uploadResult = await uploadToS3(recordingData, {
                folder: 'videodesk_recordings',
                meetingId: meeting_id,
                userId: user_id,
                index: index,
                fileType: 'video'
            }, 2, progressCallback);

            return {
                url: uploadResult.secure_url,
                cloudinary_id: uploadResult.public_id, // Using same field name for compatibility
                s3_key: uploadResult.key,
                timestamp: validateTimestamp(recording.timestamp),
                duration: recording.duration || 0,
                size: uploadResult.bytes || 0,
                uploaded_by: user_id,
                etag: uploadResult.etag
            };
        } catch (error) {
            throw error;
        }
    };

    const processScreenshot = async (screenshot, index, progressCallback) => {
        
        try {
            validateFileSize(screenshot.data, 25);

            const uploadResult = await uploadToS3(screenshot.data, {
                folder: 'videodesk_screenshots',
                meetingId: meeting_id,
                userId: user_id,
                index: index,
                fileType: 'image'
            }, 2, progressCallback);

            return {
                url: uploadResult.secure_url,
                cloudinary_id: uploadResult.public_id, // Using same field name for compatibility
                s3_key: uploadResult.key,
                timestamp: validateTimestamp(screenshot.timestamp),
                size: uploadResult.bytes || 0,
                uploaded_by: user_id,
                etag: uploadResult.etag
            };
        } catch (error) {
            throw error;
        }
    };

    try {
        
        const overallProgressTracker = createProgressTracker(totalFiles, meeting_id, user_id);
        
        const processRecordingWithOverallProgress = async (recording, index, localProgressCallback) => {
            const result = await processRecording(recording, index, (success) => {
                localProgressCallback(success);
                overallProgressTracker.updateProgress(success);
            });
            return result;
        };
        
        const processScreenshotWithOverallProgress = async (screenshot, index, localProgressCallback) => {
            const result = await processScreenshot(screenshot, index, (success) => {
                localProgressCallback(success);
                overallProgressTracker.updateProgress(success);
            });
            return result;
        };
        
        const [savedRecordings, savedScreenshots] = await Promise.all([
            processFilesInParallel(recordings, 'recordings', meeting_id, user_id, processRecordingWithOverallProgress, 2),
            processFilesInParallel(screenshots, 'screenshots', meeting_id, user_id, processScreenshotWithOverallProgress, 3)
        ]);

        const finalOverallStats = overallProgressTracker.getStats();
        const totalTime = Date.now() - startTime;
        const successRate = totalFiles > 0 ? Math.round(((savedRecordings.length + savedScreenshots.length) / totalFiles) * 100) : 100;
        
        // Create meeting with all data
        const meeting = await MeetingModel.create({
            meeting_id,
            name,
            address,
            post_code,
            phone_number,
            reference,
            repair_detail,
            work_details: work_details || [],
            target_time,
            special_notes,
            owner: user_id,
            userId: user_id,
            created_by: user_id,
            last_updated_by: user_id,
            recordings: savedRecordings,
            screenshots: savedScreenshots,
            total_recordings: savedRecordings.length,
            total_screenshots: savedScreenshots.length,
            house_name_number,
            flat_apartment_room,
            street_road,
            city,
            first_name,
            last_name,
            country
        });

        res.status(201).json({
            success: true,
            message: "Meeting created successfully",
            meeting: meeting,
            upload_summary: {
                total_time: `${totalTime}ms`,
                success_rate: `${successRate}%`,
                recordings_uploaded: savedRecordings.length,
                recordings_attempted: recordings?.length || 0,
                screenshots_uploaded: savedScreenshots.length,
                screenshots_attempted: screenshots?.length || 0,
                total_files_processed: savedRecordings.length + savedScreenshots.length,
                total_files_attempted: totalFiles,
                created_by: user_id
            },
            user_message_settings: req.user?.messageSettings
        });

    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`❌ Meeting creation failed after ${totalTime}ms:`, error.message);

        const allUploaded = [...(savedRecordings || []), ...(savedScreenshots || [])];
        await cleanupS3Files(allUploaded); // Using S3 cleanup instead of Cloudinary

        if (error.statusCode === 413) {
            return next(error);
        }

        return next(new ErrorHandler(`Upload failed after ${totalTime}ms. Please try with smaller files.`, 500));
    }
});

const updateMeetingWithNewMediaOnly = async (meeting, data, res, next, user_id, req) => {
    const { 
        name, 
        address, 
        post_code, 
        phone_number,
        reference, 
        repair_detail, 
        work_details,
        target_time, 
        special_notes,
        recordings, 
        screenshots,
        house_name_number,
        flat_apartment_room,
        street_road,
        city,
        first_name,
        last_name,
        country
    } = data;
    const totalNewFiles = (recordings?.length || 0) + (screenshots?.length || 0);

    try {
        if (name !== undefined) meeting.name = name;
        if (address !== undefined) meeting.address = address;
        if (post_code !== undefined) meeting.post_code = post_code;
        if (phone_number !== undefined) meeting.phone_number = phone_number;
        if (reference !== undefined) meeting.reference = reference;
        if (repair_detail !== undefined) meeting.repair_detail = repair_detail;
        if (work_details !== undefined) meeting.work_details = work_details;
        if (target_time !== undefined) meeting.target_time = target_time;
        if (special_notes !== undefined) meeting.special_notes = special_notes;
        if (house_name_number !== undefined) meeting.house_name_number = house_name_number;
        if (flat_apartment_room !== undefined) meeting.flat_apartment_room = flat_apartment_room;
        if (street_road !== undefined) meeting.street_road = street_road;
        if (city !== undefined) meeting.city = city;
        if (first_name !== undefined) meeting.first_name = first_name;
        if (last_name !== undefined) meeting.last_name = last_name;
        if (country !== undefined) meeting.country = country;

        if (!meeting.userId) {
            meeting.userId = user_id;
        }
        meeting.last_updated_by = user_id;

        const globalProgressTracker = createProgressTracker(totalNewFiles, meeting.meeting_id, user_id);
        
        let newRecordingsCount = 0;
        if (recordings && recordings.length > 0) {
            
            const recordingPromises = recordings.map(async (recording, i) => {
                try {
                    validateFileSize(recording.data, 100);
                    const recordingData = recording.data.split(",")[2];
                    
                    const uploadResult = await uploadToS3(recordingData, {
                        folder: 'videodesk_recordings',
                        meetingId: meeting.meeting_id,
                        userId: user_id,
                        index: i,
                        fileType: 'video'
                    }, 2, globalProgressTracker.updateProgress);

                    meeting.recordings.push({
                        url: uploadResult.secure_url,
                        cloudinary_id: uploadResult.public_id, // Using same field name for compatibility
                        s3_key: uploadResult.key,
                        timestamp: validateTimestamp(recording.timestamp),
                        duration: recording.duration || 0,
                        size: uploadResult.bytes || 0,
                        uploaded_by: user_id,
                        etag: uploadResult.etag
                    });

                    newRecordingsCount++;
                } catch (error) {
                }
            });

            await Promise.all(recordingPromises);
        }

        let newScreenshotsCount = 0;
        if (screenshots && screenshots.length > 0) {
            
            const screenshotPromises = screenshots.map(async (screenshot, i) => {
                try {
                    validateFileSize(screenshot.data, 25);

                    const uploadResult = await uploadToS3(screenshot.data, {
                        folder: 'videodesk_screenshots',
                        meetingId: meeting.meeting_id,
                        userId: user_id,
                        index: i,
                        fileType: 'image'
                    }, 2, globalProgressTracker.updateProgress);

                    meeting.screenshots.push({
                        url: uploadResult.secure_url,
                        cloudinary_id: uploadResult.public_id, // Using same field name for compatibility
                        s3_key: uploadResult.key,
                        timestamp: validateTimestamp(screenshot.timestamp),
                        size: uploadResult.bytes || 0,
                        uploaded_by: user_id,
                        etag: uploadResult.etag
                    });

                    newScreenshotsCount++;
                } catch (error) {
                }
            });

            await Promise.all(screenshotPromises);
        }

        meeting.total_recordings = meeting.recordings.length;
        meeting.total_screenshots = meeting.screenshots.length;

        await meeting.save();

        const finalStats = globalProgressTracker.getStats();
        const successRate = totalNewFiles > 0 ? Math.round(((newRecordingsCount + newScreenshotsCount) / totalNewFiles) * 100) : 100;

        res.status(200).json({
            success: true,
            message: "Meeting updated successfully with new media files",
            meeting: meeting,
            media_summary: {
                success_rate: `${successRate}%`,
                total_recordings_count: meeting.recordings.length,
                total_screenshots_count: meeting.screenshots.length,
                new_recordings_added: newRecordingsCount,
                new_screenshots_added: newScreenshotsCount,
                new_files_attempted: totalNewFiles,
                new_files_successful: newRecordingsCount + newScreenshotsCount,
                updated_by: user_id,
                meeting_userId: meeting.userId
            },
            user_message_settings: req.user?.messageSettings
        });

    } catch (error) {
        console.error(`❌ Error updating meeting:`, error);
        if (error.statusCode === 413) {
            return next(error);
        }
        return next(new ErrorHandler("Failed to update meeting with new media. Please try with smaller files.", 500));
    }
};


export const getAllMeetings = catchAsyncError(async (req, res, next) => {
    const user_id = req.user._id;
    const { archived, deleted } = req.query;

    const filter = {
        $or: [
            { owner: user_id },
            { userId: user_id },
            { created_by: user_id }
        ]
    };

    if (deleted === 'true') {
        filter.deleted = true;
    } else {
        filter.deleted = { $ne: true };
    }

    if (archived === 'true') {
        filter.archived = true;
    } else if (archived === 'false') {
        filter.archived = { $ne: true };
    }

    const meetings = await MeetingModel.find(filter)
        .populate('created_by', 'email')
        .populate('last_updated_by', 'email')
        .populate('archivedBy', 'email');

    res.status(200).json({
        success: true,
        meetings,
        total_meetings: meetings.length,
        user_id: user_id,
        filter: archived ? `archived: ${archived}` : 'all meetings'
    });
});

export const archiveMeeting = catchAsyncError(async (req, res, next) => {
    const meeting = await MeetingModel.findOne({
        _id: req.params.id,
        $or: [
            { owner: req.user._id },
            { userId: req.user._id },
            { created_by: req.user._id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    if (meeting.archived) {
        return next(new ErrorHandler("Meeting is already archived", 400));
    }

    meeting.archived = true;
    meeting.archivedAt = new Date();
    meeting.archivedBy = req.user._id;
    meeting.last_updated_by = req.user._id;

    await meeting.save();

    res.status(200).json({
        success: true,
        message: "Meeting archived successfully",
        meeting: meeting
    });
});

export const unarchiveMeeting = catchAsyncError(async (req, res, next) => {
    const meeting = await MeetingModel.findOne({
        _id: req.params.id,
        $or: [
            { owner: req.user._id },
            { userId: req.user._id },
            { created_by: req.user._id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    if (!meeting.archived) {
        return next(new ErrorHandler("Meeting is not archived", 400));
    }

    meeting.archived = false;
    meeting.archivedAt = null;
    meeting.archivedBy = null;
    meeting.last_updated_by = req.user._id;

    await meeting.save();

    // Remove meeting from folder assignment (meetingFolders) for the owner
    // Try all possible owner fields (owner, userId, created_by)
    const ownerId = meeting.owner || meeting.userId || meeting.created_by;
    if (ownerId) {
        const ownerUser = await UserModel.findById(ownerId);
        if (ownerUser && ownerUser.meetingFolders) {
            ownerUser.meetingFolders.delete(meeting._id.toString());
            await ownerUser.save();
        }
    }

    res.status(200).json({
        success: true,
        message: "Meeting unarchived successfully",
        meeting: meeting
    });
});

export const getArchivedCount = catchAsyncError(async (req, res, next) => {
    const user_id = req.user._id;

    const archivedCount = await MeetingModel.countDocuments({
        $or: [
            { owner: user_id },
            { userId: user_id },
            { created_by: user_id }
        ],
        archived: true
    });

    const totalCount = await MeetingModel.countDocuments({
        $or: [
            { owner: user_id },
            { userId: user_id },
            { created_by: user_id }
        ]
    });

    res.status(200).json({
        success: true,
        archivedCount,
        totalCount,
        activeCount: totalCount - archivedCount
    });
});

export const getMeetingById = catchAsyncError(async (req, res, next) => {
    const meeting = await MeetingModel.findOne({
        _id: req.params.id,
        $or: [
            { owner: req.user._id },
            { userId: req.user._id },
            { created_by: req.user._id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    // Ensure access_history is included in the response
    const meetingData = {
        ...meeting.toObject(),
        access_history: meeting.access_history || [],
        total_access_count: meeting.total_access_count || 0
    };

    sendResponse(res, 200, true, { meeting: meetingData }, "Meeting retrieved successfully");
});

export const getMeetingForShare = catchAsyncError(async (req, res, next) => {
    const meeting = await MeetingModel.findOne({
        meeting_id: req.params.id
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    // Log creator access if the user is the creator/owner
    if (req.user && (
        (meeting.owner && meeting.owner.toString() === req.user._id.toString()) ||
        (meeting.userId && meeting.userId.toString() === req.user._id.toString()) ||
        (meeting.created_by && meeting.created_by.toString() === req.user._id.toString())
    )) {
        const ip_address = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || (req.connection?.socket ? req.connection.socket.remoteAddress : null);
        const user_agent = req.get ? req.get('User-Agent') : (req.headers['user-agent'] || 'Unknown');
        meeting.access_history.push({
            visitor_name: 'You',
            visitor_email: req.user.email || 'creator@system',
            access_time: new Date(),
            ip_address,
            user_agent,
            creator: true
        });
        meeting.total_access_count = (meeting.total_access_count || 0) + 1;
        await meeting.save();
    }

    const shareData = {
        meeting_id: meeting.meeting_id,
        name: meeting.name, // Keep for backward compatibility
        first_name: meeting.first_name,
        last_name: meeting.last_name,
        address: meeting.address,
        post_code: meeting.post_code,
        phone_number: meeting.phone_number,
        reference: meeting.reference,
        ref: meeting.reference, // Also include as 'ref' for compatibility
        repair_detail: meeting.repair_detail,
        work_details: meeting.work_details,
        special_notes: meeting.special_notes,
        structured_special_notes: meeting.structured_special_notes, // Include structured special notes
        target_time: meeting.target_time,
        recordings: meeting.recordings,
        screenshots: meeting.screenshots,
        createdAt: meeting.createdAt,
        total_recordings: meeting.total_recordings,
        total_screenshots: meeting.total_screenshots,
        total_access_count: meeting.total_access_count || 0,
        access_history: meeting.access_history || [],
        owner: meeting.owner,
        userId: meeting.userId,
        created_by: meeting.created_by,
        // Include new address fields
        house_name_number: meeting.house_name_number,
        flat_apartment_room: meeting.flat_apartment_room,
        street_road: meeting.street_road,
        city: meeting.city,
        country: meeting.country
    };

    res.status(200).json({
        success: true,
        message: "Meeting data retrieved for sharing",
        meeting: shareData
    });
});

export const recordVisitorAccess = catchAsyncError(async (req, res, next) => {
    const { visitor_name, visitor_email, creator } = req.body;
    const meetingId = req.params.id;

    // If creator flag is set, auto-log as creator
    if (creator === true || creator === 'true') {
        const meeting = await MeetingModel.findOne({
            meeting_id: meetingId
        });

        if (!meeting) {
            return next(new ErrorHandler("Meeting not found", 404));
        }

        const ip_address = req.ip || req.connection.remoteAddress || req.socket.remoteAddress ||
            (req.connection.socket ? req.connection.socket.remoteAddress : null);
        const user_agent = req.get('User-Agent') || 'Unknown';

        const creatorAccess = {
            visitor_name: visitor_name || 'You',
            visitor_email: visitor_email || 'creator@system',
            access_time: new Date(),
            ip_address: ip_address,
            user_agent: user_agent,
            creator: true
        };

        if (!meeting.access_history) {
            meeting.access_history = [];
        }

        meeting.access_history.push(creatorAccess);
        meeting.total_access_count = (meeting.total_access_count || 0) + 1;

        // Keep all access logs (removed 24-hour filter)
        await meeting.save();

        return res.status(200).json({
            success: true,
            message: "Creator access recorded successfully",
            access_count: meeting.total_access_count,
            visitor_info: {
                name: creatorAccess.visitor_name,
                email: creatorAccess.visitor_email,
                access_time: creatorAccess.access_time
            }
        });
    }

    if (!visitor_name || !visitor_email) {
        return next(new ErrorHandler("Visitor name and email are required", 400));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(visitor_email)) {
        return next(new ErrorHandler("Please enter a valid email address", 400));
    }

    const meeting = await MeetingModel.findOne({
        meeting_id: meetingId
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    const ip_address = req.ip || req.connection.remoteAddress || req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
    const user_agent = req.get('User-Agent') || 'Unknown';

    const visitorAccess = {
        visitor_name: visitor_name.trim(),
        visitor_email: visitor_email.trim().toLowerCase(),
        access_time: new Date(),
        ip_address: ip_address,
        user_agent: user_agent
    };

    if (!meeting.access_history) {
        meeting.access_history = [];
    }

    meeting.access_history.push(visitorAccess);
    meeting.total_access_count = (meeting.total_access_count || 0) + 1;

    // Keep all access logs (removed 24-hour filter)
    await meeting.save();

    res.status(200).json({
        success: true,
        message: "Visitor access recorded successfully",
        access_count: meeting.total_access_count,
        visitor_info: {
            name: visitor_name,
            email: visitor_email,
            access_time: visitorAccess.access_time
        }
    });
});

export const updateMeetingController = catchAsyncError(async (req, res, next) => {
    const { 
        name, 
        address, 
        post_code, 
        phone_number,
        reference, 
        repair_detail, 
        work_details,
        target_time,
        special_notes,
        house_name_number,
        flat_apartment_room,
        street_road,
        city,
        first_name,
        last_name,
        country
    } = req.body;

    const meeting = await MeetingModel.findOne({
        _id: req.params.id,
        $or: [
            { owner: req.user._id },
            { userId: req.user._id },
            { created_by: req.user._id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    if (name !== undefined) meeting.name = name;
    if (address !== undefined) meeting.address = address;
    if (post_code !== undefined) meeting.post_code = post_code; // Actual postcode
    if (phone_number !== undefined) meeting.phone_number = phone_number;
    if (reference !== undefined) meeting.reference = reference; // Reference field
    if (repair_detail !== undefined) meeting.repair_detail = repair_detail;
    if (work_details !== undefined) meeting.work_details = work_details;
    if (target_time !== undefined) meeting.target_time = target_time;
    if (special_notes !== undefined) meeting.special_notes = special_notes;
    if (house_name_number !== undefined) meeting.house_name_number = house_name_number;
    if (flat_apartment_room !== undefined) meeting.flat_apartment_room = flat_apartment_room;
    if (street_road !== undefined) meeting.street_road = street_road;
    if (city !== undefined) meeting.city = city;
    if (first_name !== undefined) meeting.first_name = first_name;
    if (last_name !== undefined) meeting.last_name = last_name;
    if (country !== undefined) meeting.country = country;

    if (!meeting.userId) {
        meeting.userId = req.user._id;
    }

    meeting.last_updated_by = req.user._id;    await meeting.save();

    sendResponse(res, 200, true, null, "Meeting updated successfully");
});

export const deleteMeeting = catchAsyncError(async (req, res, next) => {
    const meeting = await MeetingModel.findOne({
        _id: req.params.id,
        $or: [
            { owner: req.user._id },
            { userId: req.user._id },
            { created_by: req.user._id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    // Soft delete: set deleted to true
    meeting.deleted = true;
    meeting.deletedAt = new Date();
    await meeting.save();

    sendResponse(res, 200, true, {
        meeting_id: meeting.meeting_id
    }, "Meeting moved to trash");
});

export const getMeetingByMeetingId = async (req, res) => {
    try {
        const { id } = req.params;

        const meeting = await MeetingModel.findOne({ meeting_id: id });

        if (!meeting) {
            // Instead of treating this as an error, return a success response indicating no meeting found
            // This prevents the error logging and treats it as a normal case for new meetings
            return res.status(200).json({
                success: true,
                meeting: null,
                isNewMeeting: true,
                message: "No existing meeting found - ready for new meeting creation"
            });
        }

        res.status(200).json({
            success: true,
            meeting
        });

    } catch (error) {
        console.error('❌ Error in getMeetingByMeetingId:', error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching meeting",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const deleteRecording = catchAsyncError(async (req, res, next) => {
    const { meetingId, recordingId } = req.params;
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

    const recordingIndex = meeting.recordings.findIndex(rec => rec._id.toString() === recordingId);

    if (recordingIndex === -1) {
        return next(new ErrorHandler("Recording not found", 404));
    }

    const recording = meeting.recordings[recordingIndex];
    let s3DeleteResult = { deleted: true }; // Default for cases with no S3 file

    if (recording.cloudinary_id || recording.s3_key) {
        const fileKey = recording.s3_key || recording.cloudinary_id;
        s3DeleteResult = await deleteFromS3WithRetry(fileKey);
    }

    meeting.recordings.splice(recordingIndex, 1);
    meeting.total_recordings = meeting.recordings.length;
    meeting.last_updated_by = user_id;

    await meeting.save();

    let message = "Recording deleted successfully";
    if (!s3DeleteResult.deleted && s3DeleteResult.reason === 'AccessDenied') {
        message = "Recording deleted from database (S3 file remains due to permissions)";
    }

    sendResponse(res, 200, true, null, message);
});

export const deleteScreenshot = catchAsyncError(async (req, res, next) => {
    const { meetingId, screenshotId } = req.params;
    const user_id = req.user._id;

    // Validate parameters
    if (!meetingId || !screenshotId) {
        return next(new ErrorHandler("Meeting ID and Screenshot ID are required", 400));
    }

    // Validate screenshotId format (should be a valid MongoDB ObjectId)
    if (!screenshotId.match(/^[0-9a-fA-F]{24}$/)) {
        return next(new ErrorHandler("Invalid screenshot ID format", 400));
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

    const screenshot = meeting.screenshots.find(s => s._id.toString() === screenshotId);

    if (!screenshot) {
        return next(new ErrorHandler("Screenshot not found", 404));
    }

    // Remove the screenshot from the meeting
    meeting.screenshots = meeting.screenshots.filter(s => s._id.toString() !== screenshotId);
    await meeting.save();

    res.status(200).json({
        success: true,
        message: "Screenshot deleted successfully",
        timeout: false
    });
});

export const restoreMeeting = catchAsyncError(async (req, res, next) => {
    const meeting = await MeetingModel.findOne({
        _id: req.params.id,
        $or: [
            { owner: req.user._id },
            { userId: req.user._id },
            { created_by: req.user._id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    if (!meeting.deleted) {
        return next(new ErrorHandler("Meeting is not in trash", 400));
    }

    meeting.deleted = false;
    meeting.deletedAt = null;
    await meeting.save();

    res.status(200).json({
        success: true,
        message: "Meeting restored successfully",
        meeting
    });
});

export const permanentDeleteMeeting = catchAsyncError(async (req, res, next) => {
    const meeting = await MeetingModel.findOne({
        _id: req.params.id,
        $or: [
            { owner: req.user._id },
            { userId: req.user._id },
            { created_by: req.user._id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    // Collect all S3 file keys from recordings and screenshots
    const s3Files = [];
    if (Array.isArray(meeting.recordings)) {
        for (const rec of meeting.recordings) {
            if (rec.s3_key || rec.cloudinary_id) {
                s3Files.push({ public_id: rec.s3_key || rec.cloudinary_id });
            }
        }
    }
    if (Array.isArray(meeting.screenshots)) {
        for (const shot of meeting.screenshots) {
            if (shot.s3_key || shot.cloudinary_id) {
                s3Files.push({ public_id: shot.s3_key || shot.cloudinary_id });
            }
        }
    }

    // Delete all S3 files
    if (s3Files.length > 0) {
        await cleanupS3Files(s3Files);
    }

    // Actually delete the meeting from the database
    await meeting.deleteOne();

    res.status(200).json({
        success: true,
        message: "Meeting permanently deleted (including S3 files)"
    });
});

// --- SEARCH MEETINGS ENDPOINT ---
export const searchMeetings = catchAsyncError(async (req, res, next) => {
    const user_id = req.user._id;
    const {
        name,
        address,
        post_code,
        phone_number,
        reference,
        repair_detail,
        special_notes,
        target_time,
        work_details_target_time,
        ref, // support ref as alias for reference
        house_name_number,
        flat_apartment_room,
        street_road,
        city,
        first_name,
        last_name,
        country,
        date_from,
        date_to,
        archived, // New parameter for archive view
        deleted    // New parameter for trash view
    } = req.body;

    // Build dynamic filter
    const filter = {
        $and: [
            {
                $or: [
                    { owner: user_id },
                    { userId: user_id },
                    { created_by: user_id }
                ]
            }
        ]
    };

    // Handle view mode filtering
    if (archived !== undefined) {
        filter.$and.push({ archived: archived });
    }
    if (deleted !== undefined) {
        filter.$and.push({ deleted: deleted });
    }

    if (name) filter.$and.push({ name: { $regex: name, $options: 'i' } });
    if (address) {
        // Search across all address fields
        filter.$and.push({
            $or: [
                { address: { $regex: address, $options: 'i' } },
            ]
        });
    }
    if (post_code) filter.$and.push({ post_code: { $regex: post_code, $options: 'i' } });
    if (phone_number) filter.$and.push({ phone_number: { $regex: phone_number, $options: 'i' } });
    if (reference) filter.$and.push({ reference: { $regex: reference, $options: 'i' } });
    if (ref) filter.$and.push({ reference: { $regex: ref, $options: 'i' } });
    if (repair_detail) filter.$and.push({ repair_detail: { $regex: repair_detail, $options: 'i' } });
    if (special_notes) filter.$and.push({ special_notes: { $regex: special_notes, $options: 'i' } });
    if (target_time) {
        // Search both top-level and inside work_details array
        filter.$and.push({ $or: [
            { target_time: { $regex: target_time, $options: 'i' } },
            { 'work_details.target_time': { $regex: target_time, $options: 'i' } }
        ] });
    }
    if (work_details_target_time) {
        filter.$and.push({ 'work_details.target_time': { $regex: work_details_target_time, $options: 'i' } });
    }
    if (house_name_number) filter.$and.push({ house_name_number: { $regex: house_name_number, $options: 'i' } });
    if (flat_apartment_room) filter.$and.push({ flat_apartment_room: { $regex: flat_apartment_room, $options: 'i' } });
    if (street_road) filter.$and.push({ street_road: { $regex: street_road, $options: 'i' } });
    if (city) filter.$and.push({ city: { $regex: city, $options: 'i' } });
    if (first_name) filter.$and.push({ first_name: { $regex: first_name, $options: 'i' } });
    if (last_name) filter.$and.push({ last_name: { $regex: last_name, $options: 'i' } });
    if (country) filter.$and.push({ country: { $regex: country, $options: 'i' } });

    // Handle date range filtering
    if (date_from || date_to) {
        const dateFilter = {};
        if (date_from) {
            const fromDate = new Date(date_from);
            if (!isNaN(fromDate.getTime())) {
                dateFilter.$gte = fromDate;
            }
        }
        if (date_to) {
            const toDate = new Date(date_to);
            if (!isNaN(toDate.getTime())) {
                // Set to end of day for inclusive search
                toDate.setHours(23, 59, 59, 999);
                dateFilter.$lte = toDate;
            }
        }
        if (Object.keys(dateFilter).length > 0) {
            filter.$and.push({ createdAt: dateFilter });
        }
    }

    // Remove $and if only user filter present (no search fields)
    if (filter.$and.length === 1) delete filter.$and;

    const meetings = await MeetingModel.find(filter)
        .populate('created_by', 'email')
        .populate('last_updated_by', 'email')
        .populate('archivedBy', 'email');

    res.status(200).json({
        success: true,
        meetings,
        total_meetings: meetings.length,
        user_id: user_id,
        filter: 'search'
    });
});

// --- Special Notes API ---
export const saveSpecialNotes = catchAsyncError(async (req, res, next) => {
  const { meeting_id } = req.params;
  const { special_notes } = req.body;
  const user_id = req.user._id;

  if (!special_notes) {
    return next(new ErrorHandler("Special notes data is required", 400));
  }

  const meeting = await MeetingModel.findOne({ meeting_id });
  if (!meeting) {
    return next(new ErrorHandler("Meeting not found", 404));
  }

  meeting.special_notes = special_notes;
  meeting.last_updated_by = user_id;
  await meeting.save();

  res.status(200).json({
    success: true,
    message: "Special notes updated successfully",
    special_notes: meeting.special_notes,
  });
});

export const getSpecialNotes = catchAsyncError(async (req, res, next) => {
  const { meeting_id } = req.params;

  const meeting = await MeetingModel.findOne({ meeting_id });
  if (!meeting) {
    return next(new ErrorHandler("Meeting not found", 404));
  }

  res.status(200).json({
    success: true,
    special_notes: meeting.special_notes || {},
  });
});

// --- Structured Special Notes API ---
export const saveStructuredSpecialNotes = catchAsyncError(async (req, res, next) => {
  const { meeting_id } = req.params;
  const { structured_special_notes } = req.body;
  const user_id = req.user._id;

  if (!structured_special_notes || typeof structured_special_notes !== 'object') {
    return next(new ErrorHandler("Structured special notes data is required and must be an object", 400));
  }

  const meeting = await MeetingModel.findOne({ meeting_id });
  if (!meeting) {
    return next(new ErrorHandler("Meeting not found", 404));
  }

  try {
    meeting.structured_special_notes = structured_special_notes;
    meeting.last_updated_by = user_id;
    await meeting.save();

    res.status(200).json({
      success: true,
      message: "Structured special notes updated successfully",
      structured_special_notes: meeting.structured_special_notes,
    });
  } catch (error) {
    console.error('❌ Error saving structured special notes:', error);
    res.status(500).json({
      success: false,
      message: "Failed to save structured special notes",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export const getStructuredSpecialNotes = catchAsyncError(async (req, res, next) => {
  const { meeting_id } = req.params;

  const meeting = await MeetingModel.findOne({ meeting_id });
  if (!meeting) {
    return next(new ErrorHandler("Meeting not found", 404));
  }

  res.status(200).json({
    success: true,
    structured_special_notes: meeting.structured_special_notes || {},
  });
});



