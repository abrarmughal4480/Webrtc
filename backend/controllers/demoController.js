import catchAsyncError from '../middlewares/catchAsyncError.js';
import sendResponse from '../utils/sendResponse.js';
import { sendMail } from '../services/mailService.js';

// Demo codes for different use cases
const DEMO_CODES = {
    karla: '7002',
    analyzer: '6868'
};

const getLogoSvg = () => {
    try {
        // Use a publicly hosted image URL instead of base64 encoding
        const logoUrl = 'https://res.cloudinary.com/dvpjxumzr/image/upload/v1748924204/logo_kawbyh.png';

        // Return an img tag with the URL - increased width and height
        return `<img src="${logoUrl}" alt="Karla AI Logo" style="width: 180px; height: auto;" />`;
    } catch (error) {
        console.error('Error with logo:', error);
        // Fallback to a simple text logo
        return `<div style="font-size: 28px; font-weight: bold; color: white;">KARLA AI</div>`;
    }
}

export const requestDemo = catchAsyncError(async (req, res, next) => {
    const { name, email, useCase = 'karla' } = req.body;

    if (!name || !email) {
        return sendResponse(res, 400, false, null, 'Name and email are required');
    }

    // Get the appropriate demo code based on use case
    const demoCode = DEMO_CODES[useCase] || DEMO_CODES.karla;
    const useCaseName = useCase === 'analyzer' ? 'Image Analyzer' : 'Chat Karla';

    try {
        const emailSubject = `Your Demo Code - ${useCaseName}`;

        // Get the logo SVG
        const logoSvg = getLogoSvg();

        const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #8b5cf6; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 24px; text-align: center;">Hello ${name}!</h2>
                <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">Thank you for requesting a demo of ${useCaseName}. Here's your demo code to access the service:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background: linear-gradient(to bottom, #f8fafc, #e0e7ff); border: 2px dashed #8b5cf6; padding: 20px; border-radius: 12px; display: inline-block; box-shadow: 0 2px 5px rgba(139, 92, 246, 0.1);">
                        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #8b5cf6; letter-spacing: 5px;">${demoCode}</p>
                    </div>
                </div>
                <p style="color: #555; line-height: 1.6; text-align: center; font-size: 16px;">Enter this code to access ${useCaseName}</p>
                <div style="background: #f3f4f6; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="color: #4c1d95; margin: 0; font-weight: 500;">
                        <strong>What you can do with ${useCaseName}:</strong><br>
                        ${useCase === 'analyzer'
                ? '• Upload photos for AI-powered damp and mould analysis<br>• Get detailed reports and recommendations<br>• 24/7 automated monitoring and insights'
                : '• Get advice on Damp and Mould issues<br>• Receive personalized solutions<br>• 24/7 instant support and guidance'
            }
                    </p>
                </div>
                <p style="color: #777; font-size: 14px; margin-top: 30px;">If you have any questions, please don't hesitate to contact us.</p>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e0e7ff;">
                                        <p style="margin: 0; color: #777; font-size: 13px;">© 2025 Karla AI. All rights reserved.</p>
            </div>
        </div>
    `;

        const textContent = `Hello ${name}! Your demo code for ${useCaseName} is: ${demoCode}. Use this code to access the demo.`;

        // Send email
        await sendMail(email, emailSubject, textContent, htmlContent);

        return sendResponse(res, 200, true, null, 'Demo code sent successfully to your email');

    } catch (error) {
        console.error('Error sending demo email:', error);
        return sendResponse(res, 500, false, null, 'Failed to send demo code. Please try again.');
    }
}); 