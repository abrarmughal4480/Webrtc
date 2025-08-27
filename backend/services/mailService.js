import "dotenv/config";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
    secure: process.env.MAIL_PORT == 465 // true for 465, false for 587
});

export const sendMail = async (to, subject, text, html = null, buttonColor = null) => {
    try {
        let finalHtml = html;
        if (html && buttonColor && buttonColor.bg) {
            // Replace a placeholder in the HTML with the color, or replace the default background color
            finalHtml = html.replace(/background: #[0-9a-fA-F]{6}|background: #[0-9a-fA-F]{3}|background: [^;]+;/g, (match) => {
                // Only replace the first button background
                if (match.includes('background:') && match.includes('#')) {
                    return `background: ${buttonColor.bg};`;
                }
                return match;
            });
        }
        const mailOptions = {
            from: process.env.MAIL_FROM,
            to,
            subject,
            text,
            ...(finalHtml && { html: finalHtml })
        };
        await transporter.sendMail(mailOptions);
        // Email sent successfully
    } catch (error) {
        console.error("Error sending email:", error);
        throw error; // Re-throw error for better upstream error handling
    }
};

// Helper function to get logo for emails
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

export const sendFriendLinkEmail = async (fromName, fromEmail, toEmail, message, websiteLink) => {
    try {
        // Validate required fields
        if (!fromName || !fromEmail || !toEmail || !message || !websiteLink) {
            throw new Error('All fields are required: fromName, fromEmail, toEmail, message, websiteLink');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(fromEmail) || !emailRegex.test(toEmail)) {
            throw new Error('Invalid email format');
        }

        const subject = `${fromName} has shared a video platform with you!`;
        
        const htmlMessage = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                    <div style="margin-bottom: 15px;">
                        ${getLogoSvg()}
                    </div>
                    <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
                </div>                
                <div style="padding: 40px 30px; background-color: #ffffff;">
                    <h2 style="color: #333; margin-bottom: 25px; font-weight: 600; font-size: 24px; text-align: center;">🎥 Platform Recommendation</h2>
                    <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px; text-align: center;">
                        <strong>${fromName}</strong> (${fromEmail}) has recommended this video platform to you!
                    </p>
                    <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); padding: 25px; border-radius: 15px; margin: 30px 0; box-shadow: 0 3px 10px rgba(148,82,255,0.1);">
                        <div style="text-align: center; margin-bottom: 8px;">
                            <span style="background:rgb(177, 150, 221); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;">PERSONAL MESSAGE</span>
                        </div>
                        <p style="margin: 0; color: #555; font-size: 17px; line-height: 1.6; text-align: center; font-weight: 500;">${message}</p>
                    </div>
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${websiteLink}" style="background: #16a34a; color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 6px 20px rgba(0,0,0,0.25); transition: all 0.3s; border: none; letter-spacing: 0.5px;">Visit Platform</a>
                    </div>
                    <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 10px;">
                        <p style="color: #777; font-size: 14px; margin: 0; line-height: 1.5;">
                            <strong>🚀 Ready to explore?</strong><br>
                            Click the button above to check out this video platform!
                        </p>
                    </div>
                </div>
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                    <p style="margin: 0; color: #777; font-size: 13px;">© 2025 Videodesk. All rights reserved.</p>
                </div>
            </div>
        `;

        const emailTextMessage = `${fromName} has recommended this video platform to you! Message: ${message}\n\nVisit: ${websiteLink}`;
        
        // Send email using the existing sendMail function
        await sendMail(toEmail, subject, emailTextMessage, htmlMessage);
        
        return {
            success: true,
            message: 'Friend link sent successfully!'
        };
        
    } catch (error) {
        console.error('Error in sendFriendLinkEmail:', error);
        throw error;
    }
};

