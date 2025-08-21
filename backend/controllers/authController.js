import catchAsyncError from '../middlewares/catchAsyncError.js';
import UserModel from '../models/user.js'; 
import sendResponse from '../utils/sendResponse.js';
import {sendToken} from '../utils/sendToken.js';
import ErrorHandler from '../utils/errorHandler.js';
import crypto from 'crypto';
import path, {dirname} from 'path';
import {fileURLToPath} from 'url';
import { generateOTP } from '../utils/generateOTP.js';
import { sendMail } from '../services/mailService.js';
import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';


const __dirname = dirname(fileURLToPath(import.meta.url))

// S3 SETUP (copied from meetingController.js)
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

const uploadToS3 = async (data, options) => {
    // data: base64 string with header (e.g., data:image/png;base64,... or data:application/pdf;base64,...)
    let buffer, contentType, fileExtension;

    // Extract MIME type and extension from base64 header
    const matches = data.match(/^data:(.+);base64,(.*)$/);
    if (!matches) throw new Error('Invalid base64 file data');
    contentType = matches[1];
    const base64Data = matches[2];
    buffer = Buffer.from(base64Data, 'base64');

    // Guess extension from MIME type if not provided
    if (options.extension) {
        fileExtension = options.extension;
    } else {
        const mimeToExt = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/svg+xml': 'svg',
            'application/pdf': 'pdf',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'application/vnd.ms-excel': 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        };
        fileExtension = mimeToExt[contentType] || contentType.split('/')[1];
    }

    const fileKey = generateUniqueFileName(options.folder || 'uploads', options.userId, fileExtension);

    // Use single-part upload for files < 5MB
    if (buffer.length < 5 * 1024 * 1024) {
        const putCommand = new PutObjectCommand({
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
                'upload-timestamp': Date.now().toString(),
                'file-type': options.fileType || fileExtension,
                'upload-method': 'single-part'
            },
            Tagging: `Environment=${process.env.NODE_ENV || 'development'}&Service=videodesk&Type=${options.fileType || fileExtension}`
        });
        const result = await s3Client.send(putCommand);
        const region = process.env.AWS_REGION || 'ap-southeast-2';
        const url = `https://${S3_CONFIG.bucket}.s3.${region}.amazonaws.com/${fileKey}`;
        return {
            secure_url: url,
            public_id: fileKey,
            bytes: buffer.length,
            etag: result.ETag,
            key: fileKey
        };
    }

    // For larger files, use multipart upload with 5MB part size
    const upload = new Upload({
        client: s3Client,
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
                'upload-timestamp': Date.now().toString(),
                'file-type': options.fileType || fileExtension,
                'upload-method': 'multipart-optimized'
            },
            Tagging: `Environment=${process.env.NODE_ENV || 'development'}&Service=videodesk&Type=${options.fileType || fileExtension}`
        },
        partSize: 5 * 1024 * 1024, // 5MB for faster multipart
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
};

const deleteFromS3WithRetry = async (fileKey, retries = 3) => {
    if (!S3_CONFIG.enableDelete) {
        return { deleted: false, fileKey, reason: 'DeleteDisabled', message: 'S3 delete disabled in configuration', canRetry: false };
    }
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const deleteCommand = new DeleteObjectCommand({
                Bucket: S3_CONFIG.bucket,
                Key: fileKey
            });
            await s3Client.send(deleteCommand);
            return { deleted: true, fileKey, message: 'Successfully deleted from S3' };
        } catch (error) {
            if (attempt === retries) {
                return { deleted: false, fileKey, reason: error.code || 'UnknownError', message: error.message, canRetry: true };
            }
        }
    }
};

// Function to get the logo HTML for email templates
const getLogoSvg = () => {
    try {
        // Use a publicly hosted image URL instead of base64 encoding
        const logoUrl = 'https://res.cloudinary.com/dvpjxumzr/image/upload/v1748924204/logo_kawbyh.png';
        
        // Return an img tag with the URL - increased width and height
        return `<img src="${logoUrl}" alt="Videodesk Logo" style="width: 180px; height: auto;" />`;
    } catch (error) {
        console.error('Error with logo:', error);
        // Fallback to a simple text logo
        return `<div style="font-size: 28px; font-weight: bold; color: white;">VIDEODESK</div>`;
    }
}

export const register = catchAsyncError(async (req, res) => {
	const {email, password, role} = req.body;
	const isExist = await UserModel.findOne({email});
	if(isExist) return sendResponse(res, 401, false, null, 'Email already exist');
	if( !email || !password || !role){
		return sendResponse(res, 401, false, null, 'All fields are required');
	}

	const user = await UserModel.create({
		email: email,
		password: password,
        role: role
	});
	
	const OTP = generateOTP()
	
	// Log the OTP for debugging
	console.log('🔐 [REGISTER] Generated OTP:', OTP, 'for email:', email);
	
    // Get the logo SVG
    const logoSvg = getLogoSvg();
    
	const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 24px; text-align: center;">Welcome to Videodesk!</h2>
                <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">Thank you for registering with Videodesk. To complete your account verification, please use the OTP code below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background: linear-gradient(to bottom, #f8f9fa, #f0f0f0); border: 2px dashed #9452FF; padding: 20px; border-radius: 12px; display: inline-block; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #9452FF; letter-spacing: 5px;">${OTP}</p>
                    </div>
                </div>
                <p style="color: #555; line-height: 1.6; text-align: center; font-size: 16px;">Enter this code to verify your account</p>
                <p style="color: #777; font-size: 14px; margin-top: 30px;">This OTP will expire in 10 minutes for security purposes.</p>
                <p style="color: #777; font-size: 14px;">If you didn't create an account with Videodesk, please ignore this email.</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">© 2025 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `Welcome to Videodesk! Your OTP verification code is: ${OTP}`;
	
	await sendMail(email,"Videodesk - Account Verification OTP", textContent, htmlContent);
	user.OTP = OTP;
	await user.save();

	res.status(200).json({
		success: true,
		message: "OTP Sent to your email successfully"
	})
});

export const login = catchAsyncError(async (req, res, next) => {
	const {email, password} = req.body;
	if(!email || !password) return sendResponse(res, 401, false, null, 'All fields are required');
	let user = await UserModel.findOne({email});

	if (!user)
      return sendResponse(res, 401, false, null, 'Incorrect Email or Password');

	const isMatch = await user.comparePassword(password);
    if (!isMatch)
		return sendResponse(res, 401, false, null, 'Incorrect Email or Password');
	
	const OTP = generateOTP();
	
	// Log the OTP for debugging
	console.log('🔐 [LOGIN] Generated OTP:', OTP, 'for email:', email);
	
    // Get the logo SVG
    const logoSvg = getLogoSvg();
    
	const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 24px; text-align: center;">Login Verification</h2>
                <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">Hello! We noticed a login attempt to your Videodesk account. Please use the OTP code below to complete your login:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background: linear-gradient(to bottom, #f8f9fa, #f0f0f0); border: 2px dashed #9452FF; padding: 20px; border-radius: 12px; display: inline-block; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #9452FF; letter-spacing: 5px;">${OTP}</p>
                    </div>
                </div>
                <p style="color: #555; line-height: 1.6; text-align: center; font-size: 16px;">Enter this code to access your account</p>
                <p style="color: #777; font-size: 14px; margin-top: 30px;">This OTP will expire in 10 minutes for security purposes.</p>
                <p style="color: #777; font-size: 14px;">If you didn't attempt to login, please secure your account immediately.</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">© 2025 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `Videodesk Login Verification - Your OTP code is: ${OTP}`;
	
	await sendMail(email,"Videodesk - Login Verification OTP", textContent, htmlContent);
	user.OTP = OTP;
	await user.save();

	res.status(200).json({
		success: true,
		message: "OTP Sent to your email successfully"
	})
});

export const verify = catchAsyncError(async (req, res, next) => {
	const {OTP} = req.body;
	if(!OTP) return sendResponse(res, 401, false, null, 'All fields are required');
	let user = await UserModel.findOne({OTP});

	if (!user)
      return sendResponse(res, 401, false, null, 'Invalid OTP or maybe expired');

 
    
    // Shift current login time to previous login time
    if (user.currentLoginTime) {
        user.previousLoginTime = user.currentLoginTime;
    }
    // else{
    //     user.previousLoginTime = currentTime;
    // }
    
    // Set new current login time
    const currentTime = new Date();
    user.currentLoginTime = currentTime;
    
    // Clear OTP after successful verification
    user.OTP = undefined;
    
    // Save the updated user
    await user.save();
  
    sendToken(res, user, `Welcome back, ${user.email}`, 200);
});




export const loadme = catchAsyncError(async (req, res, next) => {
    const user = await UserModel.findById(req.user._id);
    if (user) {
        // User found
    }
    res.status(200).json({
        success: true,
        user: user
    });
});

export const logout = catchAsyncError(async (req, res, next) => {
    // Same cookie options as sendToken function
    const options = {
        expires: new Date(Date.now() - 1), // Set expiry to past date
        secure: process.env.NODE_ENV === "development" ? false : true,
        httpOnly: process.env.NODE_ENV === "development" ? false : true,
        sameSite: process.env.NODE_ENV === "development" ? false : "none",
        path: '/', // Explicitly set path
    };
    
    // Clear cookie with proper options
    res.clearCookie("token", options);
    
    res.status(200).json({
        success: true,
        message: "Logged Out Successfully",
    });
});

export const updateUser = catchAsyncError(async (req, res, next) => {
	const {email} = req.body;

	const user = await UserModel.findByIdAndUpdate(req.user._id,{email});
	
	sendResponse(res, 200, true, null, 'Update successfully');
});

export const changePassword = catchAsyncError(async (req, res, next) => {
	const {oldpassword, newpassword} = req.body;
	const user = await UserModel.findById(req.user._id);
	
	const isMatch = await user.comparePassword(oldpassword);
    if (!isMatch)
		return sendResponse(res, 401, false, null, 'Incorrect old password');
	
	user.password = newpassword;
	await user.save();
  
    sendResponse(res, 200, true, null, 'Password update successfully');
});

// forgot password 
export const forgotPassword = catchAsyncError(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new ErrorHandler("Email is required", 400));
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
        return next(new ErrorHandler("User not found", 400));
    }

    const resetToken = await user.getResetToken();
    await user.save();

    // Auto-detect frontend URL if not set in env
    let frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['origin'] || req.headers['host'];
        frontendUrl = `${protocol}://${host}`;
        frontendUrl = frontendUrl.replace(/\/$/, '');
    }
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
    const logoSvg = getLogoSvg();

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 24px; text-align: center;">Password Reset Request</h2>
                <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">You have requested to reset your password. Please click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; box-shadow: 0 4px 10px rgba(148,82,255,0.3); transition: all 0.3s;">Reset Password</a>
                </div>
                <p style="color: #555; line-height: 1.6; font-size: 15px;">Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #0066cc; background-color: #f5f5f5; padding: 12px 15px; border-radius: 6px; font-size: 14px;">${resetUrl}</p>
                <p style="color: #777; font-size: 14px; margin-top: 30px;">If you did not request this password reset, please ignore this email.</p>
                <p style="color: #777; font-size: 14px;">This link will expire in 10 minutes.</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">© 2025 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `You have requested to reset your password. Click on the link to reset your password: ${resetUrl}. If you have not requested this, please ignore this email.`;
    
    try {
        await sendMail(email, "Password Reset Request", textContent, htmlContent);
        sendResponse(res, 200, true, null, `Reset link has been sent to ${user.email}`);
    } catch (error) {
        console.error("[forgotPassword] Error in sendMail:", error);
        user.resetPasswordToken = undefined;
        await user.save();
        return next(new ErrorHandler("Email could not be sent", 500));
    }
});

// reset password 
export const resetPassword = catchAsyncError(async (req, res, next) => {
    const { token } = req.params;
  
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
  
    const user = await UserModel.findOne({
      resetPasswordToken,
      resetPasswordExpire: {
        $gt: Date.now(),
      },
    });
  
    if (!user)
      return next(new ErrorHandler("Token is invalid or has been expired", 401));
  
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
  
    await user.save();
	sendResponse(res, 200, true, null, "Password Changed Successfully");
});

// Reset password from dashboard (when user is logged in)
export const resetPasswordFromDashboard = catchAsyncError(async (req, res, next) => {
    const { currentPassword, newPassword, confirmPassword, recoveryWord } = req.body;
    
    // Check if user has temporary password
    const user = await UserModel.findById(req.user._id);
    const isTemporaryPassword = user.isTemporaryPassword || false;
    
    // For temporary password users, currentPassword is not required
    if (!isTemporaryPassword && !currentPassword) {
        return next(new ErrorHandler("Current password is required", 400));
    }
    
    if (!newPassword || !confirmPassword) {
        return next(new ErrorHandler("New password and confirm password are required", 400));
    }
    
    if (newPassword !== confirmPassword) {
        return next(new ErrorHandler("New passwords do not match", 400));
    }
    
    // For temporary password users, skip current password comparison
    if (!isTemporaryPassword && currentPassword === newPassword) {
        return next(new ErrorHandler("New password must be different from current password", 400));
    }
    
    if (newPassword.length < 8) {
        return next(new ErrorHandler("Password must be at least 8 characters long", 400));
    }
    
    // Verify current password only for non-temporary password users
    if (!isTemporaryPassword) {
        const isCurrentPasswordMatch = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordMatch) {
            return next(new ErrorHandler("Current password is incorrect", 400));
        }
    }
    
    // Update password and mark as permanent
    user.password = newPassword;
    user.isTemporaryPassword = false; // Mark password as permanent
    await user.save();
    
    sendResponse(res, 200, true, null, isTemporaryPassword ? "Temporary password changed successfully" : "Password updated successfully");
});









// Update user logo
export const updateUserLogo = catchAsyncError(async (req, res, next) => {
    const { logoData } = req.body;
    if (!logoData) {
        return next(new ErrorHandler("Logo data is required", 400));
    }
    try {
        // Get user's current logo URL to delete old one
        const currentUser = await UserModel.findById(req.user._id);
        const oldLogoUrl = currentUser.logo;
        // If user has an existing logo, delete it from S3
        if (oldLogoUrl) {
            // Extract S3 key from URL
            const urlParts = oldLogoUrl.split('/');
            const keyIndex = urlParts.findIndex(part => part === S3_CONFIG.bucket);
            let fileKey = null;
            if (keyIndex !== -1) {
                fileKey = urlParts.slice(keyIndex + 1).join('/');
            }
            if (fileKey) {
                await deleteFromS3WithRetry(fileKey);
            }
        }
        // Upload new logo to S3
        const uploadResult = await uploadToS3(logoData, {
            folder: 'videodesk_logos',
            userId: req.user._id,
            fileType: 'image',
            contentType: 'image/png',
            extension: 'png'
        });
        // Update user with new logo URL
        const user = await UserModel.findByIdAndUpdate(
            req.user._id, 
            { logo: uploadResult.secure_url },
            { new: true }
        );
        res.status(200).json({
            success: true,
            message: "Logo updated successfully",
            logoUrl: uploadResult.secure_url,
            user
        });
    } catch (error) {
        return next(new ErrorHandler("Failed to upload logo", 500));
    }
});

// Update landlord information
export const updateLandlordInfo = catchAsyncError(async (req, res, next) => {
    const { type, logoData, imageData, landlordName, landlordLogo, officerImage, useLandlordLogoAsProfile, profileShape, redirectUrlDefault, redirectUrlTailored } = req.body;
    const user = await UserModel.findById(req.user._id);
    if (type === 'landlordLogo') {
        try {
            // Delete old landlord logo from S3 if exists
            if (user.landlordInfo?.landlordLogo) {
                const oldLogoUrl = user.landlordInfo.landlordLogo;
                const urlParts = oldLogoUrl.split('/');
                const keyIndex = urlParts.findIndex(part => part === S3_CONFIG.bucket);
                let fileKey = null;
                if (keyIndex !== -1) {
                    fileKey = urlParts.slice(keyIndex + 1).join('/');
                }
                if (fileKey) {
                    await deleteFromS3WithRetry(fileKey);
                }
            }
            // Upload new logo to S3
            const result = await uploadToS3(logoData, {
                folder: 'landlord_logos',
                userId: user._id,
                fileType: 'image',
                // contentType and extension are now auto-detected
            });
            return res.status(200).json({
                success: true,
                message: 'Landlord logo uploaded successfully',
                logoUrl: result.secure_url
            });
        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
    else if (type === 'officerImage') {
        try {
            // Delete old officer image from S3 if exists
            if (user.landlordInfo?.officerImage) {
                const oldImageUrl = user.landlordInfo.officerImage;
                const urlParts = oldImageUrl.split('/');
                const keyIndex = urlParts.findIndex(part => part === S3_CONFIG.bucket);
                let fileKey = null;
                if (keyIndex !== -1) {
                    fileKey = urlParts.slice(keyIndex + 1).join('/');
                }
                if (fileKey) {
                    await deleteFromS3WithRetry(fileKey);
                }
            }
            // Upload new image to S3
            const result = await uploadToS3(imageData, {
                folder: 'officer_images',
                userId: user._id,
                fileType: 'image',
                // contentType and extension are now auto-detected
            });
            return res.status(200).json({
                success: true,
                message: 'Officer image uploaded successfully',
                imageUrl: result.secure_url
            });
        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
    else if (type === 'deleteLandlordLogo') {
        if (user.landlordInfo?.landlordLogo) {
            try {
                const oldLogoUrl = user.landlordInfo.landlordLogo;
                const urlParts = oldLogoUrl.split('/');
                const keyIndex = urlParts.findIndex(part => part === S3_CONFIG.bucket);
                let fileKey = null;
                if (keyIndex !== -1) {
                    fileKey = urlParts.slice(keyIndex + 1).join('/');
                }
                if (fileKey) {
                    await deleteFromS3WithRetry(fileKey);
                }
                user.landlordInfo.landlordLogo = undefined;
                if (user.landlordInfo.useLandlordLogoAsProfile) {
                    user.landlordInfo.useLandlordLogoAsProfile = false;
                }
                await user.save();
                return res.status(200).json({
                    success: true,
                    message: "Landlord logo deleted successfully",
                    user: user
                });
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to delete landlord logo"
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: "No landlord logo to delete"
            });
        }
    }
    if (type === 'deleteOfficerImage') {
        if (user.landlordInfo?.officerImage) {
            try {
                const oldImageUrl = user.landlordInfo.officerImage;
                const urlParts = oldImageUrl.split('/');
                const keyIndex = urlParts.findIndex(part => part === S3_CONFIG.bucket);
                let fileKey = null;
                if (keyIndex !== -1) {
                    fileKey = urlParts.slice(keyIndex + 1).join('/');
                }
                if (fileKey) {
                    await deleteFromS3WithRetry(fileKey);
                }
                user.landlordInfo.officerImage = undefined;
                await user.save();
                return res.status(200).json({
                    success: true,
                    message: "Officer image deleted successfully",
                    user: user
                });
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to delete officer image"
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: "No officer image to delete"
            });
        }
    }
    // Handle saving landlord info
    if (type === 'saveLandlordInfo') {
        user.landlordInfo = {
            ...user.landlordInfo,
            landlordName,
            landlordLogo,
            officerImage,
            useLandlordLogoAsProfile,
            profileShape,
            redirectUrlDefault,
            redirectUrlTailored
        };
        await user.save();
        return res.status(200).json({
            success: true,
            message: "Landlord information saved successfully",
            user: user
        });
    }
    return res.status(400).json({
        success: false,
        message: "Invalid request type"
    });
});



// Update message settings
export const updateMessageSettings = catchAsyncError(async (req, res, next) => {
    const { messageOption, tailoredMessage, defaultTextSize, tailoredTextSize, selectedButtonColor } = req.body;
    
    const user = await UserModel.findById(req.user._id);
    
    // Update message settings
    user.messageSettings = {
        messageOption: messageOption || '',
        tailoredMessage: tailoredMessage || '',
        defaultTextSize: defaultTextSize || '14px',
        tailoredTextSize: tailoredTextSize || '14px',
        selectedButtonColor: selectedButtonColor || 'bg-green-800'
    };
    
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "Message settings saved successfully",
        messageSettings: user.messageSettings,
        user: user
    });
});

// Get message settings
export const getMessageSettings = catchAsyncError(async (req, res, next) => {
    const user = await UserModel.findById(req.user._id);
    
    res.status(200).json({
        success: true,
        messageSettings: user.messageSettings || {
            messageOption: '',
            tailoredMessage: '',
            defaultTextSize: '14px',
            tailoredTextSize: '14px',
            selectedButtonColor: 'bg-green-800'
        }
    });
});

// Folder Management Functions
export const createFolder = catchAsyncError(async (req, res) => {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'Folder name is required'
        });
    }

    const user = await UserModel.findById(req.user._id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Check if folder name already exists
    const existingFolder = user.folders.find(folder => 
        folder.name.toLowerCase() === name.trim().toLowerCase()
    );
    
    if (existingFolder) {
        return res.status(400).json({
            success: false,
            message: 'Folder with this name already exists'
        });
    }

    const newFolder = {
        id: Date.now().toString(),
        name: name.trim(),
        createdAt: new Date()
    };

    user.folders.push(newFolder);
    await user.save();

    res.status(201).json({
        success: true,
        message: 'Folder created successfully',
        folder: newFolder
    });
});

export const updateFolder = catchAsyncError(async (req, res) => {
    const { folderId } = req.params;
    const { name, trashed } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'Folder name is required'
        });
    }

    const user = await UserModel.findById(req.user._id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    const folder = user.folders.find(f => f.id === folderId);
    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found'
        });
    }

    // Check if new name conflicts with existing folder
    const existingFolder = user.folders.find(f => 
        f.id !== folderId && f.name.toLowerCase() === name.trim().toLowerCase()
    );
    
    if (existingFolder) {
        return res.status(400).json({
            success: false,
            message: 'Folder with this name already exists'
        });
    }

    folder.name = name.trim();
    
    // Update trashed status if provided
    if (typeof trashed === 'boolean') {
        folder.trashed = trashed;
    }
    
    await user.save();

    res.json({
        success: true,
        message: 'Folder updated successfully',
        folder
    });
});

export const deleteFolder = catchAsyncError(async (req, res) => {
    const { folderId } = req.params;

    const user = await UserModel.findById(req.user._id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    const folderIndex = user.folders.findIndex(f => f.id === folderId);
    if (folderIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found'
        });
    }

    // Remove folder
    user.folders.splice(folderIndex, 1);

    // Remove all meeting assignments for this folder
    const meetingFolders = user.meetingFolders.toObject();
    Object.keys(meetingFolders).forEach(meetingId => {
        if (meetingFolders[meetingId] === folderId) {
            user.meetingFolders.delete(meetingId);
        }
    });

    await user.save();

    res.json({
        success: true,
        message: 'Folder deleted successfully'
    });
});

// Move folder to trash (soft delete)
export const moveFolderToTrash = catchAsyncError(async (req, res) => {
    const { folderId } = req.params;

    const user = await UserModel.findById(req.user._id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    const folder = user.folders.find(f => f.id === folderId);
    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found'
        });
    }

    // Mark folder as trashed
    folder.trashed = true;
    
    // Get all meeting IDs assigned to this folder
    const meetingFolders = user.meetingFolders.toObject();
    
    const recordsInFolder = Object.entries(meetingFolders)
        .filter(([meetingId, assignedFolderId]) => {
            return assignedFolderId === folderId;
        })
        .map(([meetingId]) => meetingId);

    await user.save();

    // Import MeetingModel for updating meeting records
    const MeetingModel = (await import('../models/meetings.js')).default;
    
    // Update all meetings in this folder to be deleted
    if (recordsInFolder.length > 0) {
        await MeetingModel.updateMany(
            { _id: { $in: recordsInFolder } },
            { $set: { deleted: true } }
        );
    }

    res.json({
        success: true,
        message: `Folder "${folder.name}" and ${recordsInFolder.length} records moved to trash`,
        recordsAffected: recordsInFolder.length
    });
});

// Restore folder from trash
export const restoreFolderFromTrash = catchAsyncError(async (req, res) => {
    const { folderId } = req.params;

    const user = await UserModel.findById(req.user._id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    const folder = user.folders.find(f => f.id === folderId);
    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found'
        });
    }

    // Mark folder as not trashed
    folder.trashed = false;
    
    // Get all meeting IDs assigned to this folder
    const meetingFolders = user.meetingFolders.toObject();
    
    const recordsInFolder = Object.entries(meetingFolders)
        .filter(([meetingId, assignedFolderId]) => {
            return assignedFolderId === folderId;
        })
        .map(([meetingId]) => meetingId);

    await user.save();

    // Import MeetingModel for updating meeting records
    const MeetingModel = (await import('../models/meetings.js')).default;
    
    // Update all meetings in this folder to be not deleted
    if (recordsInFolder.length > 0) {
        await MeetingModel.updateMany(
            { _id: { $in: recordsInFolder } },
            { $set: { deleted: false } }
        );
    }

    res.json({
        success: true,
        message: `Folder "${folder.name}" and ${recordsInFolder.length} records restored successfully`,
        recordsAffected: recordsInFolder.length
    });
});

export const getFolders = catchAsyncError(async (req, res) => {
    const user = await UserModel.findById(req.user._id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    res.json({
        success: true,
        folders: user.folders || []
    });
});

export const assignMeetingToFolder = catchAsyncError(async (req, res) => {
    const { meetingId, folderId } = req.body;

    if (!meetingId) {
        return res.status(400).json({
            success: false,
            message: 'Meeting ID is required'
        });
    }

    const user = await UserModel.findById(req.user._id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // If folderId is provided, verify it exists
    if (folderId) {
        const folder = user.folders.find(f => f.id === folderId);
        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }
    }

    // Assign or remove assignment
    if (folderId) {
        user.meetingFolders.set(meetingId, folderId);
    } else {
        user.meetingFolders.delete(meetingId);
    }

    await user.save();

    res.json({
        success: true,
        message: folderId ? 'Meeting assigned to folder' : 'Meeting removed from folder'
    });
});

export const getMeetingFolders = catchAsyncError(async (req, res) => {
    const user = await UserModel.findById(req.user._id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    res.json({
        success: true,
        meetingFolders: Object.fromEntries(user.meetingFolders)
    });
});

// Update pagination settings
export const updatePaginationSettings = catchAsyncError(async (req, res) => {
    const { itemsPerPage } = req.body;
    
    if (!itemsPerPage || ![10, 20, 30, 40, 50].includes(itemsPerPage)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid items per page value'
        });
    }

    const user = await UserModel.findById(req.user._id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Update pagination settings
    user.paginationSettings = {
        itemsPerPage: itemsPerPage
    };
    
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "Pagination settings saved successfully",
        paginationSettings: user.paginationSettings
    });
});

// Get pagination settings
export const getPaginationSettings = catchAsyncError(async (req, res) => {
    const user = await UserModel.findById(req.user._id);
    
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    res.status(200).json({
        success: true,
        paginationSettings: user.paginationSettings || {
            itemsPerPage: 10
        }
    });
});

export const registerResident = catchAsyncError(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return sendResponse(res, 400, false, null, 'Email and password are required');
    }
    const isExist = await UserModel.findOne({ email });
    if (isExist) return sendResponse(res, 409, false, null, 'Email already exists');

    const user = await UserModel.create({
        email,
        password,
        role: 'resident'
    });
    // Log the user in immediately and return token
    sendToken(res, user, 'Resident account created successfully', 201);
});

// Get all users with specific roles (landlord, resident, company-admin)
export const getAllUsersByRole = catchAsyncError(async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Only superadmin and admin can view all users.' });
        }
        
        const { deleted } = req.query;
        let filter = { role: { $in: ['landlord', 'resident', 'company-admin'] } };
        
        // Filter by deleted status
        if (deleted === 'true') {
            filter.deleted = true;
        } else {
            filter.deleted = { $ne: true };
        }
        
        const users = await UserModel.find(filter).select('-password -OTP -resetPasswordToken -resetPasswordExpire');
        const usersWithStatus = users.map(user => {
            const userObj = user.toObject();
            // Use the stored status if it exists, otherwise calculate based on login time
            if (!userObj.status || userObj.status === 'active') {
                if (user.currentLoginTime) {
                    const lastLogin = new Date(user.currentLoginTime);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    userObj.status = lastLogin > thirtyDaysAgo ? 'active' : 'inactive';
                } else {
                    userObj.status = 'inactive';
                }
            }
            userObj.lastLogin = user.currentLoginTime || user.createdAt;
            return userObj;
        });
        res.status(200).json({ success: true, users: usersWithStatus, count: usersWithStatus.length });
    } catch (error) {
        console.error('Error in getAllUsersByRole:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get user by ID
export const getUserById = catchAsyncError(async (req, res) => {
    try {
        // Check if user has permission (superadmin or admin only)
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only superadmin and admin can view user details.'
            });
        }

        const { id } = req.params;
        const user = await UserModel.findById(id).select('-password -OTP -resetPasswordToken -resetPasswordExpire');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Add status field
        const userObj = user.toObject();
        // Use the stored status if it exists, otherwise calculate based on login time
        if (!userObj.status || userObj.status === 'active') {
            if (user.currentLoginTime) {
                const lastLogin = new Date(user.currentLoginTime);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                if (lastLogin > thirtyDaysAgo) {
                    userObj.status = 'active';
                } else {
                    userObj.status = 'inactive';
                }
            } else {
                userObj.status = 'inactive';
            }
        }

        userObj.lastLogin = user.currentLoginTime || user.createdAt;

        res.status(200).json({
            success: true,
            user: userObj
        });

    } catch (error) {
        console.error('❌ Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    }
});

// Delete user by ID
export const deleteUser = catchAsyncError(async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Only superadmin and admin can delete users.' });
        }

        const { id } = req.params;

        // Prevent self-deletion
        if (id === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
        }

        // Prevent superadmin deletion
        const userToDelete = await UserModel.findById(id);
        if (!userToDelete) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (userToDelete.role === 'superadmin') {
            return res.status(400).json({ success: false, message: 'Superadmin accounts cannot be deleted.' });
        }

        // Soft delete: move to trash
        userToDelete.deleted = true;
        userToDelete.deletedAt = new Date();
        await userToDelete.save();

        sendResponse(res, 200, true, { userId: id }, "User moved to trash successfully");
    } catch (error) {
        console.error('Error in deleteUser:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export const restoreUser = catchAsyncError(async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Only superadmin and admin can restore users.' });
        }

        const { id } = req.params;
        const userToRestore = await UserModel.findById(id);
        
        if (!userToRestore) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (!userToRestore.deleted) {
            return res.status(400).json({ success: false, message: 'User is not in trash.' });
        }

        // Restore user from trash
        userToRestore.deleted = false;
        userToRestore.deletedAt = null;
        await userToRestore.save();

        sendResponse(res, 200, true, { userId: id }, "User restored successfully");
    } catch (error) {
        console.error('Error in restoreUser:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export const permanentDeleteUser = catchAsyncError(async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Only superadmin and admin can permanently delete users.' });
        }

        const { id } = req.params;

        // Prevent self-deletion
        if (id === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
        }

        const userToDelete = await UserModel.findById(id);
        if (!userToDelete) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (userToDelete.role === 'superadmin') {
            return res.status(400).json({ success: false, message: 'Superadmin accounts cannot be deleted.' });
        }

        if (!userToDelete.deleted) {
            return res.status(400).json({ success: false, message: 'User must be in trash before permanent deletion.' });
        }

        // Hard delete: permanently remove user
        await UserModel.findByIdAndDelete(id);

        sendResponse(res, 200, true, { userId: id }, "User permanently deleted");
    } catch (error) {
        console.error('Error in permanentDeleteUser:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Freeze user account
export const freezeUser = catchAsyncError(async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Only superadmin and admin can freeze users.' });
        }

        const { id } = req.params;

        // Prevent self-freezing
        if (id === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot freeze your own account.' });
        }

        const userToFreeze = await UserModel.findById(id);
        if (!userToFreeze) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (userToFreeze.role === 'superadmin') {
            return res.status(400).json({ success: false, message: 'Superadmin accounts cannot be frozen.' });
        }

        // Update user status to frozen
        userToFreeze.status = 'frozen';
        await userToFreeze.save();

        sendResponse(res, 200, true, { userId: id, status: 'frozen' }, "User account frozen successfully");
    } catch (error) {
        console.error('Error in freezeUser:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Suspend user account
export const suspendUser = catchAsyncError(async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Only superadmin and admin can suspend users.' });
        }

        const { id } = req.params;

        // Prevent self-suspension
        if (id === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot suspend your own account.' });
        }

        const userToSuspend = await UserModel.findById(id);
        if (!userToSuspend) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (userToSuspend.role === 'superadmin') {
            return res.status(400).json({ success: false, message: 'Superadmin accounts cannot be suspended.' });
        }

        // Update user status to suspended
        userToSuspend.status = 'suspended';
        await userToSuspend.save();

        sendResponse(res, 200, true, { userId: id, status: 'suspended' }, "User account suspended successfully");
    } catch (error) {
        console.error('Error in suspendUser:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Activate user account
export const activateUser = catchAsyncError(async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Only superadmin and admin can activate users.' });
        }

        const { id } = req.params;

        const userToActivate = await UserModel.findById(id);
        if (!userToActivate) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Update user status to active
        userToActivate.status = 'active';
        await userToActivate.save();

        sendResponse(res, 200, true, { userId: id, status: 'active' }, "User account activated successfully");
    } catch (error) {
        console.error('Error in activateUser:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update user details (for edit functionality)
export const updateUserDetails = catchAsyncError(async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Only superadmin and admin can update users.' });
        }

        const { id } = req.params;
        const { email, role, company, status } = req.body;

        // Prevent self-update of role
        if (id === req.user._id.toString() && role) {
            return res.status(400).json({ success: false, message: 'You cannot change your own role.' });
        }

        const userToUpdate = await UserModel.findById(id);
        if (!userToUpdate) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Prevent role changes for superadmin
        if (userToUpdate.role === 'superadmin' && role && role !== 'superadmin') {
            return res.status(400).json({ success: false, message: 'Superadmin role cannot be changed.' });
        }

        // Update user fields
        const updateData = {};
        if (email) updateData.email = email;
        if (role) updateData.role = role;
        if (company !== undefined) updateData.company = company;
        if (status) updateData.status = status;

        const updatedUser = await UserModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password -OTP -resetPasswordToken -resetPasswordExpire');

        sendResponse(res, 200, true, { user: updatedUser }, "User updated successfully");
    } catch (error) {
        console.error('Error in updateUserDetails:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get user statistics
export const getUserStats = catchAsyncError(async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Only superadmin and admin can view user statistics.' });
        }

        const { id } = req.params;
        const user = await UserModel.findById(id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Import models for statistics
        const Meeting = (await import('../models/meetings.js')).default;
        const Upload = (await import('../models/upload.js')).default;

        let stats = {
            userId: id,
            role: user.role,
            basicStats: {
                accountAge: Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)),
                lastActivity: user.currentLoginTime ? Math.floor((Date.now() - new Date(user.currentLoginTime)) / (1000 * 60 * 60 * 24)) : null,
                profileComplete: !!(user.landlordInfo?.landlordName || user.landlordInfo?.landlordLogo),
                email: user.email,
                company: user.company || 'Unassigned',
                status: user.status || 'active'
            }
        };

        // Role-specific statistics
        if (user.role === 'landlord') {
            // Get all meetings for landlord
            const meetings = await Meeting.find({ 
                userId: id, 
                deleted: { $ne: true } 
            });
            
            const archivedMeetings = await Meeting.find({ 
                userId: id, 
                archived: true,
                deleted: { $ne: true } 
            });
            
            const trashedMeetings = await Meeting.find({ 
                userId: id, 
                deleted: true 
            });
            
            // Calculate detailed statistics
            const totalRecordings = meetings.reduce((sum, m) => sum + (m.total_recordings || 0), 0);
            const totalScreenshots = meetings.reduce((sum, m) => sum + (m.total_screenshots || 0), 0);
            const totalAccessCount = meetings.reduce((sum, m) => sum + (m.total_access_count || 0), 0);
            
            stats.landlordStats = {
                totalMeetings: meetings.length,
                activeMeetings: meetings.filter(m => !m.archived).length,
                archivedMeetings: archivedMeetings.length,
                totalRecordings: totalRecordings,
                totalScreenshots: totalScreenshots,
                totalAccessCount: totalAccessCount,
                averageMeetingsPerDay: meetings.length > 0 ? Math.round((meetings.length / Math.max(1, Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)))) * 100) / 100 : 0
            };
        } else if (user.role === 'resident') {
            const uploads = await Upload.find({ 
                email: user.email, 
                deleted: { $ne: true } 
            });
            
            const trashedUploads = await Upload.find({ 
                email: user.email, 
                deleted: true 
            });
            
            // Calculate detailed statistics
            const totalImages = uploads.reduce((sum, u) => sum + (u.images?.length || 0), 0);
            const totalVideos = uploads.reduce((sum, u) => sum + (u.videos?.length || 0), 0);
            const totalAccessCount = uploads.reduce((sum, u) => sum + (u.total_access_count || 0), 0);
            
            stats.residentStats = {
                totalUploads: uploads.length,
                totalImages: totalImages,
                totalVideos: totalVideos,
                totalAccess: totalAccessCount,
                averageAccessPerUpload: uploads.length > 0 ? Math.round((totalAccessCount / uploads.length) * 100) / 100 : 0,
                trashedUploads: trashedUploads.length
            };
        } else if (user.role === 'company-admin') {
            const companyUsers = await UserModel.find({ 
                company: user.company, 
                deleted: { $ne: true } 
            });
            
            // Get company meetings and uploads
            const companyMeetings = await Meeting.find({ 
                userId: { $in: companyUsers.map(u => u._id) },
                deleted: { $ne: true } 
            });
            
            const companyUploads = await Upload.find({ 
                email: { $in: companyUsers.map(u => u.email) },
                deleted: { $ne: true } 
            });
            
            stats.companyStats = {
                companyUsers: companyUsers.length,
                companyMeetings: companyMeetings.length,
                companyUploads: companyUploads.length,
                companyRevenue: 0, // Will be implemented when billing is added
                averageUsersPerDay: companyUsers.length > 0 ? Math.round((companyUsers.length / Math.max(1, Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)))) * 100) / 100 : 0
            };
        }

        // Archive & Trash Statistics
        const archivedMeetings = await Meeting.find({ 
            userId: id, 
            archived: true,
            deleted: { $ne: true } 
        });
        
        const trashedMeetings = await Meeting.find({ 
            userId: id, 
            deleted: true 
        });
        
        const trashedUploads = await Upload.find({ 
            email: user.email, 
            deleted: true 
        });
        
        stats.archiveTrashStats = {
            archivedItems: archivedMeetings.length,
            trashItems: trashedMeetings.length + trashedUploads.length,
            totalDeleted: trashedMeetings.length + trashedUploads.length
        };

        // Media & Files Statistics
        const allMeetings = await Meeting.find({ 
            userId: id, 
            deleted: { $ne: true } 
        });
        
        const allUploads = await Upload.find({ 
            email: user.email, 
            deleted: { $ne: true } 
        });
        
        const totalScreenshots = allMeetings.reduce((sum, m) => sum + (m.total_screenshots || 0), 0) + 
                                allUploads.reduce((sum, u) => sum + (u.images?.length || 0), 0);
        
        const totalVideos = allMeetings.reduce((sum, m) => sum + (m.total_recordings || 0), 0) +
                           allUploads.reduce((sum, u) => sum + (u.videos?.length || 0), 0);
        
        // Enhanced storage calculation with real file sizes
        let totalStorageBytes = 0;
        let totalFileCount = 0;
        
        // Calculate storage from meetings (recordings and screenshots)
        allMeetings.forEach(meeting => {
            // Add recordings storage
            if (meeting.recordings && meeting.recordings.length > 0) {
                meeting.recordings.forEach(recording => {
                    if (recording.size) {
                        totalStorageBytes += recording.size;
                        totalFileCount++;
                    }
                });
            }
            
            // Add screenshots storage
            if (meeting.screenshots && meeting.screenshots.length > 0) {
                meeting.screenshots.forEach(screenshot => {
                    if (screenshot.size) {
                        totalStorageBytes += screenshot.size;
                        totalFileCount++;
                    }
                });
            }
        });
        
        // Calculate storage from uploads (images and videos)
        allUploads.forEach(upload => {
            // Add images storage
            if (upload.images && upload.images.length > 0) {
                upload.images.forEach(image => {
                    // Estimate image size if not available (average 2MB per image)
                    const imageSize = image.size || (2 * 1024 * 1024);
                    totalStorageBytes += imageSize;
                    totalFileCount++;
                });
            }
            
            // Add videos storage
            if (upload.videos && upload.videos.length > 0) {
                upload.videos.forEach(video => {
                    // Estimate video size if not available (average 50MB per video)
                    const videoSize = video.size || (50 * 1024 * 1024);
                    totalStorageBytes += videoSize;
                    totalFileCount++;
                });
            }
        });
        
        // Convert to appropriate units
        let storageUsed, storageUnit;
        if (totalStorageBytes < 1024 * 1024) {
            // Less than 1MB
            storageUsed = Math.round((totalStorageBytes / 1024) * 100) / 100;
            storageUnit = 'KB';
        } else if (totalStorageBytes < 1024 * 1024 * 1024) {
            // Less than 1GB
            storageUsed = Math.round((totalStorageBytes / (1024 * 1024)) * 100) / 100;
            storageUnit = 'MB';
        } else {
            // GB or more
            storageUsed = Math.round((totalStorageBytes / (1024 * 1024 * 1024)) * 100) / 100;
            storageUnit = 'GB';
        }
        
        // Fallback to rough estimate if no real sizes available
        if (totalStorageBytes === 0) {
            const roughEstimateMB = Math.round((totalScreenshots * 2 + totalVideos * 50) / 1024 * 100) / 100;
            storageUsed = roughEstimateMB;
            storageUnit = 'MB';
        }
        
        stats.mediaStats = {
            totalScreenshots: totalScreenshots,
            totalVideos: totalVideos,
            storageUsed: storageUsed,
            storageUnit: storageUnit,
            totalFileCount: totalFileCount,
            averageFileSize: totalFileCount > 0 ? Math.round((storageUsed / totalFileCount) * 100) / 100 : 0,
            averageFileSizeUnit: storageUnit,
            storageBreakdown: {
                meetingsStorage: allMeetings.reduce((sum, m) => {
                    let meetingStorage = 0;
                    if (m.recordings) meetingStorage += m.recordings.reduce((s, r) => s + (r.size || 0), 0);
                    if (m.screenshots) meetingStorage += m.screenshots.reduce((s, img) => s + (img.size || 0), 0);
                    return sum + meetingStorage;
                }, 0),
                uploadsStorage: allUploads.reduce((sum, u) => {
                    let uploadStorage = 0;
                    if (u.images) uploadStorage += u.images.reduce((s, img) => s + (img.size || (2 * 1024 * 1024)), 0);
                    if (u.videos) uploadStorage += u.videos.reduce((s, v) => s + (v.size || (50 * 1024 * 1024)), 0);
                    return sum + uploadStorage;
                }, 0)
            }
        };

        // Activity Statistics
        const lastLogin = user.currentLoginTime || user.createdAt;
        const daysSinceLastLogin = Math.floor((Date.now() - new Date(lastLogin)) / (1000 * 60 * 60 * 24));
        
        stats.activityStats = {
            lastLogin: lastLogin,
            daysSinceLastLogin: daysSinceLastLogin,
            isActive: daysSinceLastLogin <= 30,
            activityLevel: daysSinceLastLogin <= 1 ? 'Very Active' : 
                          daysSinceLastLogin <= 7 ? 'Active' : 
                          daysSinceLastLogin <= 30 ? 'Moderate' : 'Inactive'
        };

        res.status(200).json({
            success: true,
            message: "User statistics retrieved successfully",
            data: { stats }
        });
    } catch (error) {
        console.error('Error in getUserStats:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});