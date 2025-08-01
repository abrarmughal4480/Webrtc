import catchAsyncError from '../middlewares/catchAsyncError.js';
import UserModel from '../models/user.js'; 
import sendResponse from '../utils/sendResponse.js';
import {sendToken} from '../utils/sendToken.js';
import ErrorHandler from '../utils/errorHandler.js';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';
import fs from 'fs';
import path, {dirname} from 'path';
import {fileURLToPath} from 'url';
import { generateOTP } from '../utils/generateOTP.js';
import { sendMail } from '../services/mailService.js';
import { v2 as cloudinary } from 'cloudinary';
import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// Configure cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

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
	console.log('Generated OTP (register):', OTP);
	
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
                <p style="margin: 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
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
	console.log('Generated OTP (login):', OTP);
	
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
                <p style="margin: 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
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
        console.log('📅 Previous login time updated:', user.previousLoginTime);
    }
    // else{
    //     user.previousLoginTime = currentTime;
    // }
    
    // Set new current login time
    const currentTime = new Date();
    user.currentLoginTime = currentTime;
    console.log('📅 Current login time updated:', user.currentLoginTime);
    
    // Clear OTP after successful verification
    user.OTP = undefined;
    
    // Save the updated user
    await user.save();
    
    console.log('✅ Login times successfully updated for user:', user.email);
  
    sendToken(res, user, `Welcome back, ${user.email}`, 200);
});




export const loadme = catchAsyncError(async (req, res, next) => {
    const user = await UserModel.findById(req.user._id);
    if (user) {
        console.log('Dashboard loadme: user role is', user.role);
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
    console.log("[forgotPassword] Request for:", email);

    if (!email) {
        console.log("[forgotPassword] No email provided");
        return next(new ErrorHandler("Email is required", 400));
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
        console.log("[forgotPassword] User not found for email:", email);
        return next(new ErrorHandler("User not found", 400));
    }

    const resetToken = await user.getResetToken();
    await user.save();
    console.log("[forgotPassword] Reset token generated and user saved");

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
                <p style="margin: 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `You have requested to reset your password. Click on the link to reset your password: ${resetUrl}. If you have not requested this, please ignore this email.`;
    
    try {
        await sendMail(email, "Password Reset Request", textContent, htmlContent);
        console.log("[forgotPassword] sendMail completed");
        sendResponse(res, 200, true, null, `Reset link has been sent to ${user.email}`);
    } catch (error) {
        console.log("[forgotPassword] Error in sendMail:", error);
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
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        return next(new ErrorHandler("All fields are required", 400));
    }
    
    if (newPassword !== confirmPassword) {
        return next(new ErrorHandler("New passwords do not match", 400));
    }
    
    if (currentPassword === newPassword) {
        return next(new ErrorHandler("New password must be different from current password", 400));
    }
    
    if (newPassword.length < 8) {
        return next(new ErrorHandler("Password must be at least 8 characters long", 400));
    }
    
    const user = await UserModel.findById(req.user._id);
    
    // Verify current password
    const isCurrentPasswordMatch = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordMatch) {
        return next(new ErrorHandler("Current password is incorrect", 400));
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    	sendResponse(res, 200, true, null, "Password updated successfully");
});

// Send friend link
export const sendFriendLink = catchAsyncError(async (req, res, next) => {
    const { fromName, fromEmail, toEmail, message, websiteLink } = req.body;
    
    if (!fromName || !fromEmail || !toEmail || !message) {
        return next(new ErrorHandler("All fields are required", 400));
    }
    
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
                <h2 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 24px; text-align: center;">You've been invited to check out Videodesk!</h2>
                <p style="color: #555; line-height: 1.6; font-size: 16px;">Hi there,</p>
                <p style="color: #555; line-height: 1.6; font-size: 16px;"><strong>${fromName}</strong> (${fromEmail}) wanted to share Videodesk with you.</p>
                <div style="background-color: #f7f4ff; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #9452FF;">
                    <p style="font-style: italic; margin: 0; color: #333; font-size: 16px;">"${message}"</p>
                </div>
                <p style="color: #555; line-height: 1.6; font-size: 16px;">Videodesk is a revolutionary video calling platform that makes remote communication easier than ever.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${websiteLink}" style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; box-shadow: 0 4px 10px rgba(148,82,255,0.3); transition: all 0.3s;">Visit Videodesk</a>
                </div>
                <p style="color: #555; line-height: 1.6; font-size: 16px;">Best regards,<br>The Videodesk Team</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `${fromName} (${fromEmail}) invited you to check out Videodesk: ${message}. Visit: ${websiteLink}`;
    
    try {
        await sendMail(toEmail, `${fromName} invited you to check out Videodesk`, textContent, htmlContent);
        	sendResponse(res, 200, true, null, `Link sent successfully to ${toEmail}`);
    } catch (error) {
        return next(new ErrorHandler("Email could not be sent", 500));
    }
});

// Send Feedback
export const sendFeedback = catchAsyncError(async (req, res, next) => {
    const { feedback } = req.body;
    
    if (!feedback || feedback.trim() === '') {
        return next(new ErrorHandler("Feedback message is required", 400));
    }
    
    const user = req.user;
    
    // Get the logo SVG
    const logoSvg = getLogoSvg();
    
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
                <h2 style="margin: 15px 0 0 0; font-size: 20px;">📝 New Feedback Received</h2>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h3 style="color: #333; margin-bottom: 15px; font-weight: 600;">User Information:</h3>
                <div style="background-color: #f7f4ff; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Email:</strong> ${user.email}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Role:</strong> ${user.role}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                </div>
                
                <h3 style="color: #333; margin-bottom: 15px; font-weight: 600;">Feedback Message:</h3>
                <div style="background-color: #f7f4ff; padding: 20px; border-radius: 12px; border-left: 4px solid #9452FF; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #555;">${feedback}</p>
                </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">This feedback was sent from Videodesk platform</p>
                <p style="margin: 5px 0 0 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `New Feedback from ${user.email} (${user.role}): ${feedback}`;
    
    try {
        await sendMail(process.env.FEEDBACK_EMAIL, `New Feedback from ${user.email}`, textContent, htmlContent);
        	sendResponse(res, 200, true, null, "Feedback sent successfully");
    } catch (error) {
        return next(new ErrorHandler("Failed to send feedback", 500));
    }
});

// Raise Support Ticket
export const raiseSupportTicket = catchAsyncError(async (req, res, next) => {
    const { category, query } = req.body;
    
    if (!category || category.trim() === '') {
        return next(new ErrorHandler("Support category is required", 400));
    }
    
    if (!query || query.trim() === '') {
        return next(new ErrorHandler("Support query is required", 400));
    }
    
    const user = req.user;
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Get the logo SVG
    const logoSvg = getLogoSvg();
    
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
                <h2 style="margin: 15px 0 0 0; font-size: 22px;">🎫 New Support Ticket</h2>
                <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">${ticketId}</p>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h3 style="color: #333; margin-bottom: 15px; font-weight: 600;">Customer Information:</h3>
                <div style="background-color: #f7f4ff; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Email:</strong> ${user.email}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Role:</strong> ${user.role}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Ticket Created:</strong> ${new Date().toLocaleString()}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Priority:</strong> <span style="color: #F59E0B; font-weight: bold;">Normal</span></p>
                </div>
                
                <h3 style="color: #333; margin-bottom: 15px; font-weight: 600;">Support Category:</h3>
                <div style="background-color: #e0f2fe; padding: 15px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #0288d1; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <p style="font-size: 16px; margin: 0; color: #0277bd; font-weight: 600;">${category}</p>
                </div>
                
                <h3 style="color: #333; margin-bottom: 15px; font-weight: 600;">Support Query:</h3>
                <div style="background-color: #f7f4ff; padding: 20px; border-radius: 12px; border-left: 4px solid #9452FF; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 25px;">
                    <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #555;">${query}</p>
                </div>
                
                <div style="margin-top: 25px; padding: 20px; background-color: #f0f7ff; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <h4 style="color: #3b82f6; margin: 0 0 15px 0; font-weight: 600;">Next Steps:</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #555;">
                        <li style="margin-bottom: 8px;">Our support team will review this ticket within 24 hours</li>
                        <li style="margin-bottom: 8px;">You will receive a response at ${user.email}</li>
                        <li>Ticket Reference: ${ticketId}</li>
                    </ul>
                </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">This support ticket was generated from Videodesk platform</p>
                <p style="margin: 5px 0 0 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `New Support Ticket ${ticketId} from ${user.email} (${user.role})
    
Category: ${category}
Query: ${query}`;
    
    try {
        await sendMail(process.env.SUPPORT_TICKET_EMAIL, `Support Ticket ${ticketId} - ${category} - ${user.email}`, textContent, htmlContent);
        	sendResponse(res, 200, true, null, `Support ticket ${ticketId} created successfully`);
    } catch (error) {
        return next(new ErrorHandler("Failed to create support ticket", 500));
    }
});

// Book Demo Meeting with Video Link Integration
export const bookDemoMeeting = catchAsyncError(async (req, res, next) => {
    const { name, email, date, hour, minute, message } = req.body;
    if (!name || !email || !date || !hour || !minute) {
        return next(new ErrorHandler("Name, email, date and time are required", 400));
    }
    // Format the date and time
    const selectedDate = new Date(date);
    const formattedDate = selectedDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = `${hour}:${minute}`;
    const meetingId = `DEMO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    // Get the logo SVG
    const logoSvg = getLogoSvg();
    // Admin email content without video link
    const adminHtmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
                <h2 style="margin: 15px 0 0 0; font-size: 24px;">🎯 New Demo Meeting Request</h2>
                <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold; background-color: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 25px; display: inline-block;">${meetingId}</p>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h3 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 20px; text-align: center;">📋 Meeting Request Details</h3>
                <div style="background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 2px solid #e5e7ff; box-shadow: 0 2px 8px rgba(148,82,255,0.1);">
                    <div style="display: grid; gap: 15px;">
                        <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #e5e7ff;">
                            <span style="font-size: 18px; margin-right: 12px;">👤</span>
                            <div>
                                <strong style="color: #333; font-size: 15px;">Client Name:</strong>
                                <p style="margin: 2px 0 0 0; font-size: 16px; color: #9452FF; font-weight: 600;">${name}</p>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #e5e7ff;">
                            <span style="font-size: 18px; margin-right: 12px;">📧</span>
                            <div>
                                <strong style="color: #333; font-size: 15px;">Email Address:</strong>
                                <p style="margin: 2px 0 0 0; font-size: 16px; color: #0066cc; font-weight: 500;">${email}</p>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #e5e7ff;">
                            <span style="font-size: 18px; margin-right: 12px;">📅</span>
                            <div>
                                <strong style="color: #333; font-size: 15px;">Preferred Date:</strong>
                                <p style="margin: 2px 0 0 0; font-size: 16px; color: #333; font-weight: 600;">${formattedDate}</p>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; padding: 12px 0;">
                            <span style="font-size: 18px; margin-right: 12px;">🕐</span>
                            <div>
                                <strong style="color: #333; font-size: 15px;">Preferred Time:</strong>
                                <p style="margin: 2px 0 0 0; font-size: 16px; color: #333; font-weight: 600;">${formattedTime}</p>
                            </div>
                        </div>
                    </div>
                </div>
                ${message ? `
                <h3 style="color: #333; margin-bottom: 15px; font-weight: 600; font-size: 18px;">💬 Additional Message:</h3>
                <div style="background-color: #f7f4ff; padding: 20px; border-radius: 12px; border-left: 4px solid #9452FF; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 25px;">
                    <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #555; font-style: italic;">"${message}"</p>
                </div>
                ` : ''}
                <div style="text-align: center; margin-top: 30px;">
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #856404; font-size: 14px; font-weight: 500;">
                            <strong>⏰ Request submitted on:</strong> ${new Date().toLocaleString('en-GB', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    // User confirmation email content without video link
    const userHtmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
                <h2 style="margin: 15px 0 0 0; font-size: 24px;">✅ Demo Meeting Request Received</h2>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 24px; text-align: center;">Thank you, ${name}!</h2>
                <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">We have successfully received your demo meeting request. Our team will review your request and contact you shortly to confirm the meeting details.</p>
                <div style="background-color: #f0f7ff; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6; margin-bottom: 25px;">
                    <h4 style="color: #1e40af; margin: 0 0 12px 0; font-weight: 600;">🔍 What happens next?</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">
                        <li style="margin-bottom: 6px;">Our team will review your request within 24 hours</li>
                        <li style="margin-bottom: 6px;">We'll contact you to confirm the meeting time and send joining details</li>
                        <li>You'll receive a calendar invitation with the meeting link</li>
                    </ul>
                </div>
                <p style="color: #555; line-height: 1.6; font-size: 16px; text-align: center;">If you have any questions, feel free to reply to this email or contact our support team.</p>
                <div style="text-align: center; margin-top: 25px;">
                    <p style="color: #777; font-size: 14px; margin: 0;">We're excited to show you what Videodesk can do!</p>
                </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    const adminTextContent = `New Demo Meeting Request - ${meetingId}
    Client Details:
    Name: ${name}
    Email: ${email}
    Preferred Schedule:
    Date: ${formattedDate}
    Time: ${formattedTime}
    ${message ? `Message: ${message}` : ''}
    Please contact ${email} to confirm and schedule the demo meeting.`;
    const userTextContent = `Demo Meeting Request Confirmation - ${meetingId}
    Thank you ${name}! We have received your demo meeting request.
    Our team will contact you shortly to confirm the meeting details.
    Reference: ${meetingId}`;
    try {
        // Send email to admin
        await sendMail(process.env.DEMO_MEETING_EMAIL, `🎯 Demo Meeting Request ${meetingId} - ${name}`, adminTextContent, adminHtmlContent);
        // Send confirmation email to user
        await sendMail(email, `✅ Demo Meeting Request Confirmed - ${meetingId}`, userTextContent, userHtmlContent);
        	sendResponse(res, 200, true, null, `Demo meeting request sent successfully! Reference: ${meetingId}`);
    } catch (error) {
        return next(new ErrorHandler("Failed to send demo meeting request", 500));
    }
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

// Request Callback
export const requestCallback = catchAsyncError(async (req, res, next) => {
    const { name, email, phone, day, customDate, timeSlot, customHour, customMinute, message } = req.body;
    
    if (!name || name.trim() === '') {
        return next(new ErrorHandler("Name is required", 400));
    }
    
    if (!email || email.trim() === '') {
        return next(new ErrorHandler("Email is required", 400));
    }
    
    if (!phone || phone.trim() === '') {
        return next(new ErrorHandler("Phone number is required", 400));
    }
    
    const callbackId = `CALLBACK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Format the preferred time
    let preferredTime = '';
    if (day === 'today') {
        preferredTime = 'Today';
    } else if (day === 'tomorrow') {
        preferredTime = 'Tomorrow';
    } else if (customDate) {
        const date = new Date(customDate);
        preferredTime = date.toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    if (timeSlot) {
        const timeSlotMap = {
            'morning': '9:00 AM - 12:00 PM',
            'lunch': '12:00 PM - 2:00 PM',
            'afternoon': '2:00 PM - 5:00 PM',
            'evening': '5:00 PM - 6:00 PM'
        };
        preferredTime += ` at ${timeSlotMap[timeSlot]}`;
    } else if (customHour && customMinute) {
        preferredTime += ` at ${customHour}:${customMinute}`;
    }
    
    // Get the logo SVG
    const logoSvg = getLogoSvg();
    
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
                <h2 style="margin: 15px 0 0 0; font-size: 22px;">📞 New Callback Request</h2>
                <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">${callbackId}</p>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h3 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 20px; text-align: center;">📋 Callback Request Details</h3>
                
                <div style="background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 2px solid #e5e7ff; box-shadow: 0 2px 8px rgba(148,82,255,0.1);">
                    <div style="display: grid; gap: 15px;">
                        <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #e5e7ff;">
                            <span style="font-size: 18px; margin-right: 12px;">👤</span>
                            <div>
                                <strong style="color: #333; font-size: 15px;">Name:</strong>
                                <p style="margin: 2px 0 0 0; font-size: 16px; color: #9452FF; font-weight: 600;">${name}</p>
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #e5e7ff;">
                            <span style="font-size: 18px; margin-right: 12px;">📧</span>
                            <div>
                                <strong style="color: #333; font-size: 15px;">Email:</strong>
                                <p style="margin: 2px 0 0 0; font-size: 16px; color: #0066cc; font-weight: 500;">${email}</p>
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #e5e7ff;">
                            <span style="font-size: 18px; margin-right: 12px;">📱</span>
                            <div>
                                <strong style="color: #333; font-size: 15px;">Phone:</strong>
                                <p style="margin: 2px 0 0 0; font-size: 16px; color: #333; font-weight: 600;">${phone}</p>
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: center; padding: 12px 0;">
                            <span style="font-size: 18px; margin-right: 12px;">🕐</span>
                            <div>
                                <strong style="color: #333; font-size: 15px;">Preferred Time:</strong>
                                <p style="margin: 2px 0 0 0; font-size: 16px; color: #333; font-weight: 600;">${preferredTime || 'Not specified'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${message ? `
                <h3 style="color: #333; margin-bottom: 15px; font-weight: 600;">💬 Additional Message:</h3>
                <div style="background-color: #f7f4ff; padding: 20px; border-radius: 12px; border-left: 4px solid #9452FF; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 25px;">
                    <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #555; font-style: italic;">"${message}"</p>
                </div>
                ` : ''}
                
                <div style="margin-top: 25px; padding: 20px; background-color: #f0f7ff; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <h4 style="color: #3b82f6; margin: 0 0 15px 0; font-weight: 600;">📞 Next Steps:</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #555;">
                        <li style="margin-bottom: 8px;">Our team will contact ${name} at ${phone}</li>
                        <li style="margin-bottom: 8px;">Preferred contact time: ${preferredTime || 'Any time'}</li>
                        <li style="margin-bottom: 8px;">Backup email contact: ${email}</li>
                        <li>Reference: ${callbackId}</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px;">
                        <p style="margin: 0; color: #856404; font-size: 14px; font-weight: 500;">
                            <strong>⏰ Request submitted on:</strong> ${new Date().toLocaleString('en-GB', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">This callback request was generated from Videodesk platform</p>
                <p style="margin: 5px 0 0 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `New Callback Request ${callbackId}
    
Name: ${name}
Email: ${email}
Phone: ${phone}
Preferred Time: ${preferredTime || 'Not specified'}
${message ? `Message: ${message}` : ''}

Please contact ${name} at ${phone} at their preferred time.`;
    
    try {
        await sendMail(process.env.CALLBACK_REQUEST_EMAIL || process.env.DEMO_MEETING_EMAIL, `📞 Callback Request ${callbackId} - ${name}`, textContent, htmlContent);
        	sendResponse(res, 200, true, null, `Callback request ${callbackId} sent successfully`);
    } catch (error) {
        return next(new ErrorHandler("Failed to send callback request", 500));
    }
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
    
    console.log('✅ Message settings updated for user:', user.email);
    console.log('📝 Message settings:', user.messageSettings);
    
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
    console.log('📁 [createFolder] Request received:', { body: req.body, user: req.user._id });
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
        console.log('❌ [createFolder] Validation failed: empty name');
        return res.status(400).json({
            success: false,
            message: 'Folder name is required'
        });
    }

    const user = await UserModel.findById(req.user._id);
    if (!user) {
        console.log('❌ [createFolder] User not found:', req.user._id);
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
        console.log('❌ [createFolder] Folder already exists:', name);
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

    console.log('✅ [createFolder] Folder created successfully:', newFolder);
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
    console.log('🔍 [moveFolderToTrash] Meeting folders:', meetingFolders);
    console.log('🔍 [moveFolderToTrash] Looking for folderId:', folderId);
    
    const recordsInFolder = Object.entries(meetingFolders)
        .filter(([meetingId, assignedFolderId]) => {
            console.log(`🔍 [moveFolderToTrash] Checking: meetingId=${meetingId}, assignedFolderId=${assignedFolderId}, folderId=${folderId}, match=${assignedFolderId === folderId}`);
            return assignedFolderId === folderId;
        })
        .map(([meetingId]) => meetingId);
    
    console.log('🔍 [moveFolderToTrash] Records in folder:', recordsInFolder);

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
    console.log('🔍 [restoreFolderFromTrash] Meeting folders:', meetingFolders);
    console.log('🔍 [restoreFolderFromTrash] Looking for folderId:', folderId);
    
    const recordsInFolder = Object.entries(meetingFolders)
        .filter(([meetingId, assignedFolderId]) => {
            console.log(`🔍 [restoreFolderFromTrash] Checking: meetingId=${meetingId}, assignedFolderId=${assignedFolderId}, folderId=${folderId}, match=${assignedFolderId === folderId}`);
            return assignedFolderId === folderId;
        })
        .map(([meetingId]) => meetingId);
    
    console.log('🔍 [restoreFolderFromTrash] Records in folder:', recordsInFolder);

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
    console.log('📁 [getFolders] Request received from user:', req.user._id);
    const user = await UserModel.findById(req.user._id);
    if (!user) {
        console.log('❌ [getFolders] User not found:', req.user._id);
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    console.log('✅ [getFolders] Returning folders:', user.folders?.length || 0);
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
    
    console.log('✅ Pagination settings updated for user:', user.email);
    console.log('📊 Items per page set to:', itemsPerPage);
    
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
    console.log('registerResident typeof res.status:', typeof res.status);
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
    console.log('About to call sendToken. typeof res.status:', typeof res.status);
    console.log('About to call sendToken. typeof user.getJWTToken:', typeof user.getJWTToken);
    // Log the user in immediately and return token
    sendToken(res, user, 'Resident account created successfully', 201);
});
