import "dotenv/config";
import express from 'express';
import cors from 'cors';
import http from 'http';
import { SocketService } from "./services/socketService.js";
import { v4 as uuidv4 } from 'uuid';
import sendMessage from "./services/twilloService.js";
import { sendMail } from "./services/mailService.js";
import { connectDB } from "./utils/database.js";
import ErrorMiddleware from "./middlewares/error.js";
import router from "./route.js";
import cookieParser from "cookie-parser"
import { encryptUserId } from "./utils/sendToken.js";
import User from "./models/user.js";

console.log('🚀 Starting server initialization...');

connectDB();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.use(cookieParser());

// Optimized payload size limits for faster uploads
console.log('📦 Setting up optimized payload limits...');
const MAX_SIZE = process.env.MAX_FILE_SIZE || '100mb';
const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT) || 120000; // 2 minutes default

app.use(express.json({ 
    limit: MAX_SIZE,
    parameterLimit: 50000
}));

app.use(express.urlencoded({ 
    limit: MAX_SIZE,
    extended: true,
    parameterLimit: 50000
}));

// Optimized timeout middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    
    // Set different timeouts based on operation type
    let operationTimeout = TIMEOUT;
    
    // Shorter timeout for delete operations
    if (req.method === 'DELETE') {
        operationTimeout = 30000; // 30 seconds for delete operations
    }
    
    // Set shorter timeout for better performance
    req.setTimeout(operationTimeout, () => {
        const duration = Date.now() - startTime;
        console.error(`❌ Request timeout after ${duration}ms - ${req.method} ${req.path}`);
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                message: req.method === 'DELETE' ? 'Delete operation timeout. The item may have been deleted.' : 'Upload timeout. Please try with smaller files or check your connection.',
                timeout_duration: `${duration}ms`
            });
        }
    });
    
    res.setTimeout(operationTimeout, () => {
        const duration = Date.now() - startTime;
        console.error(`❌ Response timeout after ${duration}ms`);
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                message: 'Response timeout'
            });
        }
    });
    
    // Log request with timestamp
    const contentLength = req.get('Content-Length');
    console.log(`📊 [${new Date().toISOString()}] ${req.method} ${req.path} - Size: ${contentLength ? (contentLength / 1024 / 1024).toFixed(2) + 'MB' : 'unknown'} - Timeout: ${operationTimeout}ms`);
    next();
});

// Enhanced error handling middleware for payload issues
app.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') {
        console.error('❌ Payload too large error:', {
            url: req.path,
            method: req.method,
            contentLength: req.get('Content-Length')
        });
        return res.status(413).json({
            success: false,
            message: `File size too large. Maximum allowed size is ${MAX_SIZE}. Please compress your files.`,
            details: `Current limit: ${MAX_SIZE}`
        });
    }
    
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        console.error('❌ Connection error:', error.code);
        return res.status(408).json({
            success: false,
            message: 'Connection timeout. Please try again with a stable internet connection.'
        });
    }
    
    next(error);
});

const server = http.createServer(app);

// Optimized server timeouts
server.timeout = TIMEOUT;
server.keepAliveTimeout = TIMEOUT - 1000;
server.headersTimeout = TIMEOUT + 1000;

console.log(`🔧 Server timeouts configured: ${TIMEOUT}ms`);

const socketService = new SocketService(server);
socketService.setupSocketListeners();

app.get('/', (req, res) => {
    res.json({
        message: 'Server is running with AWS S3 optimized upload support',
        config: {
            max_file_size: MAX_SIZE,
            timeout: `${TIMEOUT}ms`,
            s3_upload_settings: {
                bucket: process.env.S3_BUCKET_NAME,
                region: process.env.AWS_REGION || 'us-east-1',
                part_size: `${parseInt(process.env.S3_PART_SIZE || 16777216) / 1024 / 1024}MB`,
                queue_size: process.env.S3_QUEUE_SIZE || 6,
                transfer_acceleration: process.env.S3_USE_ACCELERATE === 'true'
            }
        }
    });
});

// Helper function to convert Tailwind button color classes to CSS colors
const getButtonColorFromTailwind = (tailwindClass) => {
    const colorMap = {
        'bg-green-600': { bg: '#16a34a', hover: '#15803d' },
        'bg-green-800': { bg: '#166534', hover: '#14532d' },
        'bg-blue-800': { bg: '#1e40af', hover: '#1d4ed8' },
        'bg-red-800': { bg: '#dc2626', hover: '#b91c1c' },
        'bg-purple-800': { bg: '#7c3aed', hover: '#6d28d9' },
        'bg-orange-800': { bg: '#ea580c', hover: '#c2410c' }
    };
    
    console.log(`🎨 Button color requested: "${tailwindClass}"`);
    
    if (colorMap[tailwindClass]) {
        console.log(`✅ Button color found: ${tailwindClass} -> ${colorMap[tailwindClass].bg}`);
        return colorMap[tailwindClass];
    } else {
        console.log(`⚠️ Button color not found: "${tailwindClass}", falling back to bg-green-800`);
        return colorMap['bg-green-800']; // Default to green
    }
};

// Helper function to get logo for video link emails
const getLogoSvg = () => {
    try {
        // Use direct Cloudinary logo link
        const logoUrl = 'https://res.cloudinary.com/dvpjxumzr/image/upload/v1748924204/logo_kawbyh.png';
        return `<img src="${logoUrl}" alt="Videodesk Logo" style="width: 180px; height: auto;" />`;
    } catch (error) {
        console.error('Error with logo:', error);
        return `<div style="font-size: 28px; font-weight: bold; color: white;">VIDEODESK</div>`;
    }
};

app.get('/send-token', async (req, res) => {
    try {
        const { number, email, senderId } = req.query;
        console.log('📞 Received token request:', { number, email, senderId });
        // Log the original senderId (user's real MongoDB _id)
        console.log('[send-token] Original senderId (user _id):', senderId);
        
        if (!number && !email) {
            return res.status(400).json({ error: 'Either phone number or email is required' });
        }
        if (!senderId) {
            return res.status(400).json({ error: 'Sender ID is required' });
        }
        const token = uuidv4();
        console.log('🎫 Generated meeting token:', token);

        // Encrypt senderId
        const encryptedSenderId = encryptUserId(senderId);
        // Build minimal URL: /room/{token}?sid={encryptedSenderId}
        let url = `${process.env.FRONTEND_URL}/room/${token}?sid=${encodeURIComponent(encryptedSenderId)}`;

        // Send SMS
        if (number) {
            console.log('📱 Sending SMS to:', number);
            const textMessage = `Please click on the link below to connect: ${url}`;
            await sendMessage(number, textMessage);
        }
        // Send Email with previous HTML template and branding
        if (email) {
            console.log('📧 Sending enhanced HTML email to:', email);
            const subject = "Video Call from Your Landlord";
            // Fetch user and button color
            let buttonColor = getButtonColorFromTailwind('bg-green-800'); // default
            let landlordDisplay = 'Landlord';
            let senderUser; // <-- declare here
            try {
                senderUser = await User.findById(senderId).select('messageSettings landlordInfo');
                if (senderUser && senderUser.messageSettings && senderUser.messageSettings.selectedButtonColor) {
                    buttonColor = getButtonColorFromTailwind(senderUser.messageSettings.selectedButtonColor);
                }
                if (senderUser && senderUser.landlordInfo && senderUser.landlordInfo.landlordName && senderUser.landlordInfo.landlordName !== 'Videodesk') {
                    landlordDisplay = senderUser.landlordInfo.landlordName;
                }
            } catch (err) {
                console.error('Error fetching sender user for button color or landlord name:', err);
            }
            // Set invitation message
            let invitationMsg = '';
            let tailoredMsg = '';
            let useTailored = false;
            if (senderUser && senderUser.messageSettings) {
                if (senderUser.messageSettings.messageOption === 'tailored' && senderUser.messageSettings.tailoredMessage) {
                    tailoredMsg = senderUser.messageSettings.tailoredMessage;
                    useTailored = true;
                }
            }
            if (useTailored) {
                invitationMsg = tailoredMsg;
            } else if (landlordDisplay === 'Landlord') {
                invitationMsg = 'Hello! Your <strong>Landlord</strong> has invited you to a video call.';
            } else {
                invitationMsg = `Hello! <strong>${landlordDisplay}</strong> has invited you to a video call.`;
            }
            // Use the same HTML template as before, but update the link only
            const htmlMessage = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                        <div style="margin-bottom: 15px;">
                            <img src='https://res.cloudinary.com/dvpjxumzr/image/upload/v1748924204/logo_kawbyh.png' alt='Videodesk Logo' style='width: 180px; height: auto;' />
                        </div>
                        <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
                    </div>                
                    <div style="padding: 40px 30px; background-color: #ffffff;">
                        <h2 style="color: #333; margin-bottom: 25px; font-weight: 600; font-size: 24px; text-align: center;">🎥 Video Call Invitation</h2>
                        <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px; text-align: center;">${invitationMsg}</p>
                        <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); padding: 25px; border-radius: 15px; margin: 30px 0; box-shadow: 0 3px 10px rgba(148,82,255,0.1);">
                            <div style="text-align: center; margin-bottom: 8px;">
                                <span style="background:rgb(177, 150, 221); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;">MESSAGE</span>
                            </div>
                            <p style="margin: 0; color: #333; font-size: 17px; line-height: 1.6; text-align: center; font-weight: 500;">${useTailored ? tailoredMsg : `Please click the button below to join the video call${landlordDisplay !== 'Landlord' ? ` with <strong>${landlordDisplay}</strong>` : ' with <strong>your landlord</strong>'}.`}</p>
                        </div>
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${url}" style="background: #16a34a; color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 6px 20px rgba(0,0,0,0.25); transition: all 0.3s; border: none; letter-spacing: 0.5px;">Join Video Session</a>
                        </div>
                        <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 10px;">
                            <p style="color: #777; font-size: 14px; margin: 0; line-height: 1.5;">
                                <strong>📱 Ready to connect?</strong><br>
                                Click the button above to join your video session instantly.
                            </p>
                        </div>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                        <p style="margin: 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
                    </div>
                </div>
            `;
            const emailTextMessage = `Please click on the link below to connect: ${url}`;
            await sendMail(email, subject, emailTextMessage, htmlMessage, buttonColor);
        }
        res.json({ token, url });
    } catch (error) {
        console.error('❌ Error in send-token:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

app.use("/api/v1", router);
app.use(ErrorMiddleware);

server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT} with AWS S3 optimized upload support`);
    console.log(`📊 Max file size: ${MAX_SIZE}`);
    console.log(`⏱️ Request timeout: ${TIMEOUT}ms`);
    console.log(`☁️ S3 Upload Configuration:`);
    console.log(`   🪣 Bucket: ${process.env.S3_BUCKET_NAME}`);
    console.log(`   🌍 Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    console.log(`   📦 Part Size: ${parseInt(process.env.S3_PART_SIZE || 16777216) / 1024 / 1024}MB`);
    console.log(`   🚄 Queue Size: ${process.env.S3_QUEUE_SIZE || 6} parallel uploads`);
    console.log(`   ⚡ Transfer Acceleration: ${process.env.S3_USE_ACCELERATE === 'true' ? 'ENABLED' : 'DISABLED'}`);
    
    if (process.env.S3_USE_ACCELERATE !== 'true') {
        console.log(`💡 Tip: Enable S3 Transfer Acceleration for even faster uploads:`);
        console.log(`   1. Enable Transfer Acceleration on your S3 bucket`);
        console.log(`   2. Set S3_USE_ACCELERATE=true in .env`);
    }
});
