import Upload from '../models/upload.js';
import catchAsyncError from '../middlewares/catchAsyncError.js';
import sendResponse from '../utils/sendResponse.js';
import ErrorHandler from '../utils/errorHandler.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload as S3Upload } from '@aws-sdk/lib-storage';
import crypto from 'crypto';
import { sendNotification } from '../services/socketService.js';

// S3 setup (copied from meetingController.js)
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

const generateUniqueFileName = (prefix, accessCode, index, extension) => {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    return `${prefix}/${accessCode}/${timestamp}_${index}_${randomString}.${extension}`;
};

const uploadToS3 = async (data, options, retries = 2) => {
    let currentClient = s3Client;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            let buffer;
            let contentType;
            let fileExtension;
            if (options.fileType === 'video') {
                buffer = Buffer.from(data, 'base64');
                contentType = 'video/webm';
                fileExtension = 'webm';
            } else if (options.fileType === 'image') {
                const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
                buffer = Buffer.from(base64Data, 'base64');
                contentType = 'image/png';
                fileExtension = 'png';
            } else {
                throw new Error(`Unsupported file type: ${options.fileType}`);
            }
            const fileKey = generateUniqueFileName(
                options.folder || 'uploads',
                options.accessCode,
                options.index,
                fileExtension
            );
            const upload = new S3Upload({
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
                        'uploaded-by': options.accessCode,
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
            const result = await upload.done();
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
            throw error;
        }
    }
};

export const createUpload = catchAsyncError(async (req, res, next) => {
  const {
    first_name, last_name, house_name_number, flat_apartment_room, street_road, city, country, postCode, actualPostCode, phoneNumber, email: bodyEmail, images, videos, accessCode
  } = req.body;

  // Use logged-in user's email if available
  const email = req.user?.email || bodyEmail;

  // Check for duplicate accessCode
  const existing = await Upload.findOne({ accessCode });
  if (existing) {
    return next(new ErrorHandler('Access code already exists. Please try again.', 409));
  }

  // Check if this email already has an upload
  const alreadyUploaded = await Upload.exists({ email });

  // Upload images to S3
  const uploadedImages = images && images.length > 0 ? await Promise.all(images.map(async (img, i) => {
    if (!img.data) return null;
    const uploadResult = await uploadToS3(img.data, {
      folder: 'upload_images',
      accessCode,
      index: i,
      fileType: 'image'
    });
    return {
      url: uploadResult.secure_url,
      name: img.name,
      label: img.label,
      timestamp: new Date(),
      s3_key: uploadResult.key,
      size: uploadResult.bytes || 0,
      etag: uploadResult.etag
    };
  })) : [];

  // Upload videos to S3
  const uploadedVideos = videos && videos.length > 0 ? await Promise.all(videos.map(async (vid, i) => {
    if (!vid.data) return null;
    const uploadResult = await uploadToS3(vid.data, {
      folder: 'upload_videos',
      accessCode,
      index: i,
      fileType: 'video'
    });
    return {
      url: uploadResult.secure_url,
      name: vid.name,
      label: vid.label,
      duration: vid.duration,
      timestamp: new Date(),
      s3_key: uploadResult.key,
      size: uploadResult.bytes || 0,
      etag: uploadResult.etag
    };
  })) : [];

  const upload = await Upload.create({
    first_name, last_name, house_name_number, flat_apartment_room, street_road, city, country, postCode, actualPostCode, phoneNumber, email, images: uploadedImages, videos: uploadedVideos, accessCode
  });

  console.log(`✅ Upload successful in DB. AccessCode: ${upload.accessCode}`);

  sendResponse(res, 201, true, { upload, alreadyUploaded: !!alreadyUploaded }, 'Upload created successfully');
});

export const getUploadByAccessCode = catchAsyncError(async (req, res, next) => {
  const { accessCode } = req.params;
  const upload = await Upload.findOne({ accessCode });
  if (!upload) {
    return next(new ErrorHandler('No upload found for this access code.', 404));
  }
  sendResponse(res, 200, true, { upload }, 'Upload fetched successfully');
}); 

export const getMyUploads = catchAsyncError(async (req, res, next) => {
  const email = req.user.email;
  const role = req.user.role;
  if (!email) {
    return sendResponse(res, 400, false, null, 'No email found for user');
  }
  if (role === 'resident') {
    console.log(`[getMyUploads] Resident user: ${email}`);
  }
  const uploads = await Upload.find({ email, deleted: { $ne: true } });
  if (role === 'resident') {
    console.log(`[getMyUploads] Uploads found for resident: ${uploads.length}`);
  }
  sendResponse(res, 200, true, { uploads }, 'User uploads fetched successfully');
}); 

export const getMyLatestUpload = catchAsyncError(async (req, res, next) => {
  const email = req.user.email;
  if (!email) {
    return sendResponse(res, 400, false, null, 'No email found for user');
  }
  const latestUpload = await Upload.findOne({ email, deleted: { $ne: true } }).sort({ createdAt: -1 });
  sendResponse(res, 200, true, { upload: latestUpload }, 'Latest upload fetched successfully');
}); 

export const deleteUpload = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const email = req.user.email;
  
  const upload = await Upload.findOne({ _id: id, email });
  if (!upload) {
    return next(new ErrorHandler('Upload not found or access denied.', 404));
  }

  // Soft delete - mark as deleted
  upload.deleted = true;
  upload.deletedAt = new Date();
  await upload.save();

  sendResponse(res, 200, true, { upload }, 'Upload moved to trash successfully');
});

export const restoreUpload = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const email = req.user.email;
  
  const upload = await Upload.findOne({ _id: id, email });
  if (!upload) {
    return next(new ErrorHandler('Upload not found or access denied.', 404));
  }

  // Restore from trash
  upload.deleted = false;
  upload.deletedAt = undefined;
  await upload.save();

  sendResponse(res, 200, true, { upload }, 'Upload restored successfully');
});

export const permanentDeleteUpload = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const email = req.user.email;
  
  const upload = await Upload.findOne({ _id: id, email });
  if (!upload) {
    return next(new ErrorHandler('Upload not found or access denied.', 404));
  }

  // Delete from S3
  if (upload.images && upload.images.length > 0) {
    for (const image of upload.images) {
      if (image.s3_key) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_CONFIG.bucket,
            Key: image.s3_key
          }));
        } catch (error) {
          console.error('Error deleting image from S3:', error);
        }
      }
    }
  }

  if (upload.videos && upload.videos.length > 0) {
    for (const video of upload.videos) {
      if (video.s3_key) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_CONFIG.bucket,
            Key: video.s3_key
          }));
        } catch (error) {
          console.error('Error deleting video from S3:', error);
        }
      }
    }
  }

  // Delete from database
  await Upload.findByIdAndDelete(id);

  sendResponse(res, 200, true, null, 'Upload permanently deleted successfully');
});

export const getMyTrashedUploads = catchAsyncError(async (req, res, next) => {
  const email = req.user.email;
  if (!email) {
    return sendResponse(res, 400, false, null, 'No email found for user');
  }
  
  const trashedUploads = await Upload.find({ email, deleted: true });
  sendResponse(res, 200, true, { uploads: trashedUploads }, 'Trashed uploads fetched successfully');
});

export const markNotificationSent = catchAsyncError(async (req, res, next) => {
  const { accessCode } = req.params;
  
  const upload = await Upload.findOne({ accessCode });
  if (!upload) {
    return next(new ErrorHandler('Upload not found.', 404));
  }

  // Only mark as sent if it hasn't been sent before
  if (!upload.notificationSent) {
    upload.notificationSent = true;
    upload.firstAccessedAt = new Date();
    await upload.save();
    console.log(`✅ Notification marked as sent for upload: ${accessCode}`);
    
    // Send real-time notification via socket
    try {
      sendNotification(upload.email, {
        _id: upload._id,
        accessCode: upload.accessCode,
        firstAccessedAt: upload.firstAccessedAt,
        message: 'Your shared information has been viewed successfully!'
      });
      console.log(`📡 Real-time notification sent to: ${upload.email}`);
    } catch (error) {
      console.log('⚠️ Could not send socket notification:', error.message);
    }
  }

  sendResponse(res, 200, true, { notificationSent: upload.notificationSent }, 'Notification status updated');
});

export const checkNotificationStatus = catchAsyncError(async (req, res, next) => {
  const email = req.user.email;
  if (!email) {
    return sendResponse(res, 400, false, null, 'No email found for user');
  }

  // Find uploads that have been accessed but notification not sent
  const pendingNotifications = await Upload.find({ 
    email, 
    deleted: { $ne: true },
    notificationSent: true,
    firstAccessedAt: { $exists: true }
  }).sort({ firstAccessedAt: -1 });

  sendResponse(res, 200, true, { 
    hasNotifications: pendingNotifications.length > 0,
    notifications: pendingNotifications 
  }, 'Notification status checked');
});