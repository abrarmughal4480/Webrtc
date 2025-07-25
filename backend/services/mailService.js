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
        console.log("Email sent successfully");
    } catch (error) {
        console.error("Error sending email:", error);
        throw error; // Re-throw error for better upstream error handling
    }
};

