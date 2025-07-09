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
        
        console.log(`📊 [Meeting: ${meetingId}] [User: ${userId}] Progress: ${overallPercentage}% (${totalProcessed}/${totalFiles}) | Success: ${successPercentage}% (${completedFiles}/${totalFiles}) | Failed: ${failedFiles}`);
        
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

    console.log(`📏 File size: ${sizeInMB.toFixed(2)}MB`);

    if (sizeInMB > maxSizeMB) {
        throw new ErrorHandler(`File size (${sizeInMB.toFixed(2)}MB) exceeds maximum (${maxSizeMB}MB)`, 413);
    }

    return sizeInMB;
};
const validateTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
        console.log(`⚠️ Invalid timestamp received: ${timestamp}, using current time`);
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
            console.log(`🚀 S3 Upload attempt ${attempt}... (${options.fileType})`);
            const startTime = Date.now();
            
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
            
            console.log(`📁 Uploading to S3 bucket: ${S3_CONFIG.bucket}`);
            console.log(`🗂️ S3 Key: ${fileKey}`);
            console.log(`📊 File size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
            console.log(`🚀 Upload settings: ${S3_CONFIG.partSize / 1024 / 1024}MB parts, ${S3_CONFIG.queueSize} parallel`);
            if (S3_CONFIG.useAccelerateEndpoint) {
                console.log(`⚡ S3 Transfer Acceleration: ENABLED`);
            }
            
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
                    console.log(`📈 Upload progress: ${percentComplete}% (${options.fileType})`);
                }
            });
            
            const result = await upload.done();
            const duration = Date.now() - startTime;
            const speedMBps = (buffer.length / 1024 / 1024) / (duration / 1000);
            
            console.log(`✅ S3 Upload successful in ${duration}ms`);
            console.log(`🚀 Upload speed: ${speedMBps.toFixed(2)} MB/s`);
            console.log(`🔗 File URL: ${result.Location}`);
            console.log(`☁️ Stored in S3 bucket: ${S3_CONFIG.bucket}`);
            
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
            console.error(`❌ S3 Upload attempt ${attempt} failed:`, error.message);
            
            if (attempt <= retries && (
                error.code === 'NetworkingError' || 
                error.code === 'TimeoutError' ||
                error.message.includes('timeout') ||
                error.message.includes('ECONNRESET')
            )) {
                console.log(`🔁 Retrying S3 upload in 1 second... (${retries - attempt + 1} retries left)`);
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
        console.warn(`⚠️ S3 cleanup disabled - ${uploadedFiles.length} files remain in S3`);
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
            console.log(`✅ S3 file deleted: ${fileKey.split('/').pop()}`);
            return { 
                deleted: true, 
                fileKey,
                message: 'Successfully deleted from S3'
            };
            
        } catch (error) {
            if (error.name === 'AccessDenied' || error.message.includes('not authorized to perform: s3:DeleteObject')) {
                console.warn(`⚠️ S3 delete permission denied - file remains in S3`);
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
                console.error(`❌ S3 delete failed: ${error.message}`);
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
    
    console.log(`🚀 [${fileType.toUpperCase()}] Starting parallel processing of ${files.length} files with max concurrency: ${maxConcurrency}`);
    
    const progressTracker = createProgressTracker(files.length, meetingId, userId);
    const results = [];
    const batches = [];
    
    for (let i = 0; i < files.length; i += maxConcurrency) {
        batches.push(files.slice(i, i + maxConcurrency));
    }
    
    console.log(`📦 [${fileType.toUpperCase()}] Created ${batches.length} batches for processing`);
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 [${fileType.toUpperCase()}] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} files)`);
        
        const batchPromises = batch.map(async (file, localIndex) => {
            const globalIndex = batchIndex * maxConcurrency + localIndex;
            
            try {
                return await uploadFunction(file, globalIndex, progressTracker.updateProgress);
            } catch (error) {
                console.error(`❌ [${fileType.toUpperCase()}] Failed to process file ${globalIndex + 1}:`, error.message);
                progressTracker.updateProgress(false);
                return null;
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        const stats = progressTracker.getStats();
        const batchProgress = Math.round(((batchIndex + 1) / batches.length) * 100);
        console.log(`✅ [${fileType.toUpperCase()}] Batch ${batchIndex + 1}/${batches.length} completed (${batchProgress}%)`);
        console.log(`📊 [${fileType.toUpperCase()}] Current stats: ${stats.completedFiles}/${stats.totalFiles} successful, ${stats.failedFiles} failed`);
    }
    
    const finalStats = progressTracker.getStats();
    console.log(`🎯 [${fileType.toUpperCase()}] Final Results: ${finalStats.completedFiles}/${finalStats.totalFiles} successful, ${finalStats.failedFiles} failed`);
    
    return results.filter(result => result !== null);
};

export const create = catchAsyncError(async (req, res, next) => {
    const { 
        meeting_id, 
        name, 
        address, 
        address_line_1,
        address_line_2, 
        address_line_3,
        additional_address_lines,
        post_code, 
        phone_number,
        reference, 
        repair_detail, 
        work_details,
        target_time, 
        special_notes,
        recordings, 
        screenshots, 
        update_mode 
    } = req.body;
    const user_id = req.user._id;

    const startTime = Date.now();
    const totalFiles = (recordings?.length || 0) + (screenshots?.length || 0);
    
    console.log(`🎬 [${new Date().toISOString()}] Starting meeting ${update_mode || 'creation'}...`);    console.log('👤 User ID:', user_id);
    console.log('📋 Meeting data:', { 
        meeting_id, 
        name, 
        address, 
        address_line_1,
        address_line_2,
        address_line_3,
        additional_address_lines,
        post_code, 
        phone_number,
        reference, 
        repair_detail, 
        work_details,
        target_time,
        special_notes
    });
    console.log(`📊 Total files to process: ${totalFiles} (${recordings?.length || 0} recordings, ${screenshots?.length || 0} screenshots)`);

    if (!meeting_id) {
        return next(new ErrorHandler("Meeting ID is required", 400));
    }

    const existingMeeting = await MeetingModel.findOne({ meeting_id });
    if (existingMeeting) {
        console.log('⚠️ Meeting exists, updating with NEW media only...');
        if (!existingMeeting.userId) {
            console.log('🔧 Setting missing userId for existing meeting...');
            existingMeeting.userId = user_id;
        }
        return await updateMeetingWithNewMediaOnly(existingMeeting, req.body, res, next, user_id, req);
    }

    const processRecording = async (recording, index, progressCallback) => {
        console.log(`📹 Processing recording ${index + 1}/${recordings.length} for user ${user_id}...`);
        
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

            console.log(`✅ Recording ${index + 1} uploaded to S3: ${uploadResult.secure_url.substring(0, 50)}...`);

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
            console.error(`❌ Recording ${index + 1} failed:`, error.message);
            throw error;
        }
    };

    const processScreenshot = async (screenshot, index, progressCallback) => {
        console.log(`🖼️ Processing screenshot ${index + 1}/${screenshots.length} for user ${user_id}...`);
        
        try {
            validateFileSize(screenshot.data, 25);

            const uploadResult = await uploadToS3(screenshot.data, {
                folder: 'videodesk_screenshots',
                meetingId: meeting_id,
                userId: user_id,
                index: index,
                fileType: 'image'
            }, 2, progressCallback);

            console.log(`✅ Screenshot ${index + 1} uploaded to S3: ${uploadResult.secure_url.substring(0, 50)}...`);

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
            console.error(`❌ Screenshot ${index + 1} failed:`, error.message);
            throw error;
        }
    };

    try {
        console.log(`🚀 Starting parallel file processing...`);
        
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

        console.log(`📊 Upload Summary - Recordings: ${savedRecordings.length}/${recordings?.length || 0}, Screenshots: ${savedScreenshots.length}/${screenshots?.length || 0}`);
        
        const finalOverallStats = overallProgressTracker.getStats();
        console.log(`🎯 [RECORDINGS] Final Results: ${savedRecordings.length}/${recordings?.length || 0} successful, ${(recordings?.length || 0) - savedRecordings.length} failed`);
        console.log(`🎯 [SCREENSHOTS] Final Results: ${savedScreenshots.length}/${screenshots?.length || 0} successful, ${(screenshots?.length || 0) - savedScreenshots.length} failed`);
        console.log(`📈 Overall Success Rate: ${finalOverallStats.totalFiles > 0 ? Math.round((finalOverallStats.completedFiles / finalOverallStats.totalFiles) * 100) : 100}% (${finalOverallStats.completedFiles}/${finalOverallStats.totalFiles} files)`);
        console.log(`⚡ Total processing time: ${Date.now() - startTime}ms`);        // Create meeting with all data
        const meeting = await MeetingModel.create({
            meeting_id,
            name,
            address,
            address_line_1,
            address_line_2,
            address_line_3,
            additional_address_lines: additional_address_lines || [],
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
            total_screenshots: savedScreenshots.length
        });

        const totalTime = Date.now() - startTime;
        const successRate = totalFiles > 0 ? Math.round(((savedRecordings.length + savedScreenshots.length) / totalFiles) * 100) : 100;
        
        console.log(`✅ Meeting created successfully in ${totalTime}ms`);
        console.log(`📈 Overall Success Rate: ${successRate}% (${savedRecordings.length + savedScreenshots.length}/${totalFiles} files)`);
        console.log(`🏷️ Meeting saved with reference: "${reference}" and post_code: "${post_code}"`);

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
        address_line_1,
        address_line_2,
        address_line_3,
        additional_address_lines,
        post_code, 
        phone_number,
        reference, 
        repair_detail, 
        work_details,
        target_time, 
        special_notes,
        recordings, 
        screenshots 
    } = data;
    const totalNewFiles = (recordings?.length || 0) + (screenshots?.length || 0);

    console.log(`🔄 Updating existing meeting with ${totalNewFiles} new files...`);
    console.log(`📋 Current state - Recordings: ${meeting.recordings.length}, Screenshots: ${meeting.screenshots.length}`);

    try {
        if (name !== undefined) meeting.name = name;
        if (address !== undefined) meeting.address = address;
        if (address_line_1 !== undefined) meeting.address_line_1 = address_line_1;
        if (address_line_2 !== undefined) meeting.address_line_2 = address_line_2;
        if (address_line_3 !== undefined) meeting.address_line_3 = address_line_3;
        if (additional_address_lines !== undefined) meeting.additional_address_lines = additional_address_lines;
        if (post_code !== undefined) meeting.post_code = post_code;
        if (phone_number !== undefined) meeting.phone_number = phone_number;
        if (reference !== undefined) meeting.reference = reference;
        if (repair_detail !== undefined) meeting.repair_detail = repair_detail;
        if (work_details !== undefined) meeting.work_details = work_details;
        if (target_time !== undefined) meeting.target_time = target_time;
        if (special_notes !== undefined) meeting.special_notes = special_notes;

        if (!meeting.userId) {
            console.log('🔧 Setting missing userId for existing meeting...');
            meeting.userId = user_id;
        }
        meeting.last_updated_by = user_id;

        const globalProgressTracker = createProgressTracker(totalNewFiles, meeting.meeting_id, user_id);
        console.log(`🎯 [UPDATE] Starting parallel processing of ${totalNewFiles} new files...`);

        let newRecordingsCount = 0;
        if (recordings && recordings.length > 0) {
            console.log(`🎥 Processing ${recordings.length} new recordings...`);
            
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
                    console.log(`✅ New recording ${i + 1} added successfully to S3`);
                } catch (error) {
                    console.error(`❌ Error uploading new recording ${i + 1}:`, error);
                    globalProgressTracker.updateProgress(false);
                }
            });

            await Promise.all(recordingPromises);
        }

        let newScreenshotsCount = 0;
        if (screenshots && screenshots.length > 0) {
            console.log(`📸 Processing ${screenshots.length} new screenshots...`);
            
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
                    console.log(`✅ New screenshot ${i + 1} added successfully to S3`);
                } catch (error) {
                    console.error(`❌ Error uploading new screenshot ${i + 1}:`, error);
                    globalProgressTracker.updateProgress(false);
                }
            });

            await Promise.all(screenshotPromises);
        }

        meeting.total_recordings = meeting.recordings.length;
        meeting.total_screenshots = meeting.screenshots.length;

        await meeting.save();

        const finalStats = globalProgressTracker.getStats();
        const successRate = totalNewFiles > 0 ? Math.round(((newRecordingsCount + newScreenshotsCount) / totalNewFiles) * 100) : 100;

        console.log(`✅ Meeting updated successfully`);
        console.log(`🎯 [UPDATE RECORDINGS] Final Results: ${newRecordingsCount}/${recordings?.length || 0} successful, ${(recordings?.length || 0) - newRecordingsCount} failed`);
        console.log(`🎯 [UPDATE SCREENSHOTS] Final Results: ${newScreenshotsCount}/${screenshots?.length || 0} successful, ${(screenshots?.length || 0) - newScreenshotsCount} failed`);
        console.log(`📈 Update Success Rate: ${successRate}% (${newRecordingsCount + newScreenshotsCount}/${totalNewFiles} new files)`);
        console.log(`📊 Final totals - Recordings: ${meeting.total_recordings}, Screenshots: ${meeting.total_screenshots}`);

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

    console.log(`📋 Fetching meetings for user: ${user_id}, archived: ${archived}, deleted: ${deleted}`);

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

    console.log(`✅ Found ${meetings.length} meetings for user ${user_id} (archived: ${archived}, deleted: ${deleted})`);

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

    console.log(`📦 Archiving meeting: ${meeting._id} by user ${req.user._id}`);

    meeting.archived = true;
    meeting.archivedAt = new Date();
    meeting.archivedBy = req.user._id;
    meeting.last_updated_by = req.user._id;

    await meeting.save();

    console.log(`✅ Meeting archived successfully: ${meeting._id}`);

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

    console.log(`📤 Unarchiving meeting: ${meeting._id} by user ${req.user._id}`);

    meeting.archived = false;
    meeting.archivedAt = null;
    meeting.archivedBy = null;
    meeting.last_updated_by = req.user._id;

    await meeting.save();

    console.log(`✅ Meeting unarchived successfully: ${meeting._id}`);

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

    sendResponse(true, 200, "Meeting retrieved successfully", res, { meeting });
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
        name: meeting.name,
        address: meeting.address,
        address_line_1: meeting.address_line_1,
        address_line_2: meeting.address_line_2,
        address_line_3: meeting.address_line_3,
        additional_address_lines: meeting.additional_address_lines,
        post_code: meeting.post_code,
        phone_number: meeting.phone_number,
        reference: meeting.reference,
        ref: meeting.reference, // Also include as 'ref' for compatibility
        repair_detail: meeting.repair_detail,
        work_details: meeting.work_details,
        special_notes: meeting.special_notes,
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
        created_by: meeting.created_by
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

    console.log(`👤 Recording visitor access for meeting: ${meetingId}`, {
        visitor_name,
        visitor_email,
        creator
    });

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

        // Keep only last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        meeting.access_history = meeting.access_history.filter(access =>
            access.access_time > twentyFourHoursAgo
        );

        await meeting.save();

        console.log(`✅ Creator access recorded:`, {
            meeting_id: meetingId,
            visitor: creatorAccess.visitor_name,
            email: creatorAccess.visitor_email,
            total_access: meeting.total_access_count
        });

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

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    meeting.access_history = meeting.access_history.filter(access =>
        access.access_time > twentyFourHoursAgo
    );

    await meeting.save();

    console.log(`✅ Visitor access recorded successfully:`, {
        meeting_id: meetingId,
        visitor: visitor_name,
        email: visitor_email,
        total_access: meeting.total_access_count
    });

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

export const updateMeeting = catchAsyncError(async (req, res, next) => {
    const { 
        name, 
        address, 
        address_line_1,
        address_line_2,
        address_line_3,
        additional_address_lines,
        post_code, 
        phone_number,
        reference, 
        repair_detail, 
        work_details,
        target_time,
        special_notes
    } = req.body;

    console.log('🔄 Updating meeting with fields:', { 
        name, 
        address, 
        address_line_1,
        address_line_2,
        address_line_3,
        additional_address_lines,
        post_code, 
        phone_number,
        reference, 
        repair_detail, 
        work_details,
        target_time,
        special_notes
    });

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
    if (address_line_1 !== undefined) meeting.address_line_1 = address_line_1;
    if (address_line_2 !== undefined) meeting.address_line_2 = address_line_2;
    if (address_line_3 !== undefined) meeting.address_line_3 = address_line_3;
    if (additional_address_lines !== undefined) meeting.additional_address_lines = additional_address_lines;
    if (post_code !== undefined) meeting.post_code = post_code; // Actual postcode
    if (phone_number !== undefined) meeting.phone_number = phone_number;
    if (reference !== undefined) meeting.reference = reference; // Reference field
    if (repair_detail !== undefined) meeting.repair_detail = repair_detail;
    if (work_details !== undefined) meeting.work_details = work_details;
    if (target_time !== undefined) meeting.target_time = target_time;
    if (special_notes !== undefined) meeting.special_notes = special_notes;

    if (!meeting.userId) {
        meeting.userId = req.user._id;
    }

    meeting.last_updated_by = req.user._id;    await meeting.save();

    console.log(`✅ Meeting updated successfully with all new fields`);

    sendResponse(true, 200, "Meeting updated successfully", res);
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

    console.log(`🗑️ Meeting moved to trash: ${meeting._id}`);

    sendResponse(true, 200, "Meeting moved to trash", res, {
        meeting_id: meeting.meeting_id
    });
});

export const getMeetingByMeetingId = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔍 Looking for meeting with ID: ${id}`);

        const meeting = await MeetingModel.findOne({ meeting_id: id });

        if (!meeting) {
            console.log(`ℹ️ No meeting found with ID: ${id} (This is normal for new meetings)`);
            return res.status(404).json({
                success: false,
                message: "Meeting not found",
                isNewMeeting: true
            });
        }

        console.log(`✅ Found meeting with ID: ${id}`);
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

    console.log(`✅ Recording deleted. Total: ${meeting.total_recordings}`);

    sendResponse(true, 200, message, res);
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
        address_line_1,
        address_line_2,
        address_line_3,
        additional_address_lines,
        post_code,
        phone_number,
        reference,
        repair_detail,
        special_notes,
        target_time,
        work_details_target_time,
        ref // support ref as alias for reference
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

    if (name) filter.$and.push({ name: { $regex: name, $options: 'i' } });
    if (address) {
        // Search across all address fields
        filter.$and.push({
            $or: [
                { address: { $regex: address, $options: 'i' } },
                { address_line_1: { $regex: address, $options: 'i' } },
                { address_line_2: { $regex: address, $options: 'i' } },
                { address_line_3: { $regex: address, $options: 'i' } },
                { additional_address_lines: { $elemMatch: { $regex: address, $options: 'i' } } }
            ]
        });
    }
    if (address_line_1) filter.$and.push({ address_line_1: { $regex: address_line_1, $options: 'i' } });
    if (address_line_2) filter.$and.push({ address_line_2: { $regex: address_line_2, $options: 'i' } });
    if (address_line_3) filter.$and.push({ address_line_3: { $regex: address_line_3, $options: 'i' } });
    if (Array.isArray(additional_address_lines) && additional_address_lines.length > 0) {
        filter.$and.push({ additional_address_lines: { $in: additional_address_lines.filter(Boolean) } });
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



