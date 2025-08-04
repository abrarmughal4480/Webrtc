import catchAsyncError from '../middlewares/catchAsyncError.js';
import sendResponse from '../utils/sendResponse.js';
import { sendMail } from '../services/mailService.js';

// Demo code - you can change this
const DEMO_CODE = '7002';

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
  const { name, email } = req.body;

  if (!name || !email) {
    return sendResponse(res, 400, false, null, 'Name and email are required');
  }

  try {
    const emailSubject = 'Your Demo Code - Karla AI Assistant';
    
    // Get the logo SVG
    const logoSvg = getLogoSvg();
    
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #f59e0b; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 24px; text-align: center;">Hello ${name}!</h2>
                <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">Thank you for requesting a demo of Karla AI Assistant. Here's your demo code to access the chat:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background: linear-gradient(to bottom, #f8f9fa, #f0f0f0); border: 2px dashed #f59e0b; padding: 20px; border-radius: 12px; display: inline-block; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #f59e0b; letter-spacing: 5px;">${DEMO_CODE}</p>
                    </div>
                </div>
                <p style="color: #555; line-height: 1.6; text-align: center; font-size: 16px;">Enter this code to start chatting with Karla</p>
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="color: #92400e; margin: 0; font-weight: 500;">
                        <strong>What you can do with Karla:</strong><br>
                        • Get advice on Damp and Mould issues<br>
                        • Receive personalized solutions<br>
                        • 24/7 instant support and guidance
                    </p>
                </div>
                <p style="color: #777; font-size: 14px; margin-top: 30px;">If you have any questions, please don't hesitate to contact us.</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">© 2024 Karla AI. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `Hello ${name}! Your demo code is: ${DEMO_CODE}. Use this code to access the demo chat with Karla.`;

    // Send email
    await sendMail(email, emailSubject, textContent, htmlContent);

    return sendResponse(res, 200, true, null, 'Demo code sent successfully to your email');

  } catch (error) {
    console.error('Error sending demo email:', error);
    return sendResponse(res, 500, false, null, 'Failed to send demo code. Please try again.');
  }
}); 