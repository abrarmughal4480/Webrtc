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
import cron from 'node-cron';
import Meeting from './models/meetings.js';
import { permanentDeleteMeeting as permanentDeleteMeetingController } from './controllers/meetingController.js';
import mongoose from 'mongoose';
import pino from 'pino';
import compression from 'compression';
import cluster from 'cluster';
import os from 'os';
import process from 'process';
import Redis from 'ioredis';

// Add global error handlers for better debugging
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

const logger = pino({
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

logger.info('🚀 Starting server initialization...');

connectDB();
const app = express();
const PORT = process.env.PORT || 4000;

// Allow all origins for CORS (wildcard)
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(cookieParser());

// Add compression middleware for gzip/brotli
app.use(compression());

// Lowered payload size limits and parameter limits for performance
const MAX_SIZE = process.env.MAX_FILE_SIZE || '100mb';
const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT) || 60000; // 60 seconds default

app.use(express.json({ 
    limit: MAX_SIZE,
    parameterLimit: 2000
}));

app.use(express.urlencoded({ 
    limit: MAX_SIZE,
    extended: true,
    parameterLimit: 2000
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
        logger.error(`❌ Request timeout after ${duration}ms - ${req.method} ${req.path}`);
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
        logger.error(`❌ Response timeout after ${duration}ms`);
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                message: 'Response timeout'
            });
        }
    });
    
    // Log request with timestamp
    const contentLength = req.get('Content-Length');
    logger.info(`📊 [${new Date().toISOString()}] ${req.method} ${req.path} - Size: ${contentLength ? (contentLength / 1024 / 1024).toFixed(2) + 'MB' : 'unknown'} - Timeout: ${operationTimeout}ms`);
    next();
});

// Enhanced error handling middleware for payload issues
app.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') {
        logger.error('❌ Payload too large error:', {
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
        logger.error('❌ Connection error:', error.code);
        return res.status(408).json({
            success: false,
            message: 'Connection timeout. Please try again with a stable internet connection.'
        });
    }
    
    next(error);
});

const server = http.createServer(app);

// Lowered server timeouts for better resource utilization
server.timeout = TIMEOUT;
server.keepAliveTimeout = TIMEOUT - 1000;
server.headersTimeout = TIMEOUT + 1000;

logger.info(`🔧 Server timeouts configured: ${TIMEOUT}ms`);

// --- CLUSTERING: Use all CPU cores in production ---
if (
  process.env.NODE_ENV === 'development' ||
  process.env.ENABLE_CLUSTER === 'true'
) {
  // Clustering logic for local/dev or if explicitly enabled
  if (cluster.isPrimary) {
    const numCPUs = os.cpus().length;
    logger.info(`🚦 Primary process running. Forking ${numCPUs} workers...`);
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
      logger.error(`❌ Worker ${worker.process.pid} died. Restarting...`);
      cluster.fork();
    });
    // Do not start server in primary
  } else {
    // Worker process: start server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });
  }
} else {
  // Production/cloud: single process
  server.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
  });
}

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
        'bg-orange-400': { bg: '#fb923c', hover: '#ea580c' },
        'bg-yellow-500': { bg: '#eab308', hover: '#ca8a04' }
    };
    
    logger.info(`🎨 Button color requested: "${tailwindClass}"`);
    
    if (colorMap[tailwindClass]) {
        logger.info(`✅ Button color found: ${tailwindClass} -> ${colorMap[tailwindClass].bg}`);
        return colorMap[tailwindClass];
    } else {
        logger.warn(`⚠️ Button color not found: "${tailwindClass}", falling back to bg-green-800`);
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
        logger.error('Error with logo:', error);
        return `<div style="font-size: 28px; font-weight: bold; color: white;">VIDEODESK</div>`;
    }
};

app.get('/send-token', async (req, res) => {
    try {
        const { number, email, senderId } = req.query;
        logger.info('📞 Received token request:', { number, email, senderId });
        // Log the original senderId (user's real MongoDB _id)
        logger.info('[send-token] Original senderId (user _id):', senderId);
        
        if (!number && !email) {
            return res.status(400).json({ error: 'Either phone number or email is required' });
        }
        if (!senderId) {
            return res.status(400).json({ error: 'Sender ID is required' });
        }
        const token = uuidv4();
        logger.info('🎫 Generated meeting token:', token);

        // Encrypt senderId
        const encryptedSenderId = encryptUserId(senderId);
        // Build minimal URL: /room/{token}?sid={encryptedSenderId}
        let url = `${process.env.FRONTEND_URL}/room/${token}?sid=${encodeURIComponent(encryptedSenderId)}`;

        // --- UK Phone Normalization Helper ---
        function normalizeUKPhoneNumber(number) {
            if (!number) return number;
            let cleaned = number.replace(/[\s\-()]/g, '');
            if (cleaned.startsWith('+')) {
                return cleaned;
            }
            if (cleaned.startsWith('0')) {
                // 07123456789 => +447123456789
                return '+44' + cleaned.slice(1);
            }
            if (cleaned.length === 10 && cleaned.startsWith('7')) {
                // 7123456789 => +447123456789
                return '+44' + cleaned;
            }
            // fallback: just return as is
            return cleaned;
        }
        // --- END UK Phone Normalization Helper ---

        // Send SMS
        if (number) {
            const normalizedNumber = normalizeUKPhoneNumber(number);
            logger.info('📱 Sending SMS to:', normalizedNumber);
            const textMessage = `Please click on the link below to connect: ${url}`;
            // Respond to user immediately
            res.json({ token, url });

            // Send SMS in background
            setImmediate(() => {
                sendMessage(normalizedNumber, textMessage)
                    .catch(err => logger.error('SMS send error:', err));
            });
        }
        // Send Email with previous HTML template and branding
        if (email) {
            logger.info('📧 Sending enhanced HTML email to:', email);
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
                logger.error('Error fetching sender user for button color or landlord name:', err);
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
            // Always set invitationMsg to greeting only, never tailoredMsg
            if (landlordDisplay === 'Landlord') {
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
                            <p style="margin: 0; color: #fff; font-size: 17px; line-height: 1.6; text-align: center; font-weight: 500;">${useTailored ? tailoredMsg : 'Please click on the link below to connect with your landlord.'}</p>
                        </div>
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${url}" style="background: ${buttonColor.bg}; color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 6px 20px rgba(0,0,0,0.25); transition: all 0.3s; border: none; letter-spacing: 0.5px;">Join Video Session</a>
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
            // Respond to user immediately
            res.json({ token, url });

            // Send Email in background
            setImmediate(() => {
                sendMail(email, subject, emailTextMessage, htmlMessage, buttonColor)
                    .catch(err => logger.error('Email send error:', err));
            });
        }
    } catch (error) {
        logger.error('❌ Error in send-token:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Resend token endpoint - uses existing token
app.get('/resend-token', async (req, res) => {
    try {
        const { number, email, token, senderId } = req.query;
        logger.info('📞 Received resend token request:', { number, email, token, senderId });
        
        if (!number && !email) {
            return res.status(400).json({ error: 'Either phone number or email is required' });
        }
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Use the existing token instead of generating a new one
        logger.info('🎫 Using existing meeting token:', token);

        // Build URL with existing token and senderId
        let url = `${process.env.FRONTEND_URL}/room/${token}`;
        
        // Add senderId to URL if available
        if (senderId) {
            const encryptedSenderId = encryptUserId(senderId);
            url += `?sid=${encodeURIComponent(encryptedSenderId)}`;
            logger.info('🔗 Resend URL with senderId:', url);
        } else {
            logger.warn('⚠️ No senderId provided for resend, URL:', url);
        }

        // --- UK Phone Normalization Helper ---
        function normalizeUKPhoneNumber(number) {
            if (!number) return number;
            let cleaned = number.replace(/[\s\-()]/g, '');
            if (cleaned.startsWith('+')) {
                return cleaned;
            }
            if (cleaned.startsWith('0')) {
                // 07123456789 => +447123456789
                return '+44' + cleaned.slice(1);
            }
            if (cleaned.length === 10 && cleaned.startsWith('7')) {
                // 7123456789 => +447123456789
                return '+44' + cleaned;
            }
            // fallback: just return as is
            return cleaned;
        }
        // --- END UK Phone Normalization Helper ---

        // Send SMS
        if (number) {
            const normalizedNumber = normalizeUKPhoneNumber(number);
            logger.info('📱 Resending SMS to:', normalizedNumber);
            const textMessage = `Please click on the link below to connect: ${url}`;
            // Respond to user immediately
            res.json({ success: true, message: 'Link resent successfully', token, url });

            // Send SMS in background
            setImmediate(() => {
                sendMessage(normalizedNumber, textMessage)
                    .catch(err => logger.error('SMS send error:', err));
            });
        }

        // Send Email
        if (email) {
            logger.info('📧 Resending email to:', email);
            const subject = "Video Call from Your Landlord";
            
            // Fetch user and button color if senderId is provided
            let buttonColor = getButtonColorFromTailwind('bg-green-800'); // default
            let landlordDisplay = 'Landlord';
            let invitationMsg = 'Hello! Your <strong>Landlord</strong> has invited you to a video call.';
            let tailoredMsg = '';
            let useTailored = false;
            
            if (senderId) {
                try {
                    const senderUser = await User.findById(senderId).select('messageSettings landlordInfo');
                    if (senderUser && senderUser.messageSettings && senderUser.messageSettings.selectedButtonColor) {
                        buttonColor = getButtonColorFromTailwind(senderUser.messageSettings.selectedButtonColor);
                    }
                    if (senderUser && senderUser.landlordInfo && senderUser.landlordInfo.landlordName && senderUser.landlordInfo.landlordName !== 'Videodesk') {
                        landlordDisplay = senderUser.landlordInfo.landlordName;
                        invitationMsg = `Hello! <strong>${landlordDisplay}</strong> has invited you to a video call.`;
                    }
                    if (senderUser && senderUser.messageSettings) {
                        if (senderUser.messageSettings.messageOption === 'tailored' && senderUser.messageSettings.tailoredMessage) {
                            tailoredMsg = senderUser.messageSettings.tailoredMessage;
                            useTailored = true;
                        }
                    }
                } catch (err) {
                    logger.error('Error fetching sender user for button color or landlord name:', err);
                }
            }
            
            // Use the same HTML template as send-token
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
                            <p style="margin: 0; color: #fff; font-size: 17px; line-height: 1.6; text-align: center; font-weight: 500;">${useTailored ? tailoredMsg : 'Please click on the link below to connect with your landlord.'}</p>
                        </div>
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${url}" style="background: ${buttonColor.bg}; color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 6px 20px rgba(0,0,0,0.25); transition: all 0.3s; border: none; letter-spacing: 0.5px;">Join Video Session</a>
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
            // Respond to user immediately
            res.json({ success: true, message: 'Link resent successfully', token, url });

            // Send Email in background
            setImmediate(() => {
                sendMail(email, subject, emailTextMessage, htmlMessage, buttonColor)
                    .catch(err => logger.error('Email send error:', err));
            });
        }
    } catch (error) {
        logger.error('❌ Error in resend-token:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

app.use("/api/v1", router);
app.use(ErrorMiddleware);

// --- REDIS CACHING SETUP (stub, ready for use) ---
let redis;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
  logger.info('🔗 Connected to Redis for caching.');
} else {
  logger.warn('⚠️ No REDIS_URL set. Caching is disabled.');
}
// Example usage: await redis.set('key', 'value'); await redis.get('key');

// --- GRACEFUL SHUTDOWN LOGIC ---
function shutdown(signal) {
  logger.info(`🛑 Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('✅ HTTP server closed.');
    if (redis) redis.quit();
    process.exit(0);
  }, 10000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// --- CRON JOB: Auto-delete trashed meetings after 10 days (for auto-delete) ---
cron.schedule('* * * * *', async () => {
  logger.info('⏰ [CRON] Auto-delete job running at', new Date().toLocaleString());
  try {
    const now = new Date();
    // 10 days ago (for auto-delete)
    const threshold = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    // Find meetings in trash older than threshold
    const expiredMeetings = await Meeting.find({ deleted: true, deletedAt: { $lte: threshold } });
    if (expiredMeetings.length > 0) {
      logger.info(`🗑️ Auto-deleting ${expiredMeetings.length} trashed meetings...`);
    }
    for (const meeting of expiredMeetings) {
      // Use the controller logic for permanent delete
      // Simulate req/res/next for controller
      await Meeting.deleteOne({ _id: meeting._id }); // Remove from DB
      // If you want to reuse S3 cleanup, you can refactor permanentDeleteMeeting logic into a service and call it here
      // For now, just log
      logger.info(`✅ Permanently deleted trashed meeting: ${meeting._id}`);
    }
  } catch (err) {
    logger.error('❌ Error in auto-delete cron job:', err);
  }
});

// --- SOCKETSERVICE OPTIMIZATION (stub) ---
// In SocketService, tune pingInterval/pingTimeout, compress signaling, and handle disconnects efficiently.
// Example: io.opts.pingInterval = 10000; io.opts.pingTimeout = 20000;

