import { sendMail } from './mailService.js';

// Function to get the logo HTML for email templates (matching authController.js style)
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
};

export const sendTemporaryPasswordEmail = async (userEmail, userName, temporaryPassword, companyName, userRole) => {
  const subject = `Your Temporary Password - ${companyName}`;
  
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
        <div style="margin-bottom: 15px;">
          ${getLogoSvg()}
        </div>
        <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
        <h2 style="margin: 15px 0 0 0; font-size: 24px;">Welcome to ${companyName}!</h2>
      </div>
      
      <div style="padding: 40px 30px; background-color: #ffffff;">
        <h2 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 24px; text-align: center;">Your Account is Ready!</h2>
        <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">Hello <strong>${userName}</strong>, your account has been created successfully with the role of <strong>${userRole.replace('_', ' ')}</strong> in <strong>${companyName}</strong>.</p>
        
        <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">Here is your temporary password to access your account:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="background: linear-gradient(to bottom, #f8f9fa, #f0f0f0); border: 2px dashed #9452FF; padding: 20px; border-radius: 12px; display: inline-block; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #9452FF; letter-spacing: 5px; font-family: 'Courier New', monospace;">${temporaryPassword}</p>
          </div>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px; font-weight: 500;">
            <strong>⚠️ Important:</strong> This is a temporary password. Please change it immediately after your first login for security reasons.
          </p>
        </div>
        
        <div style="background-color: #f0f7ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h4 style="color: #1e40af; margin: 0 0 15px 0; font-weight: 600;">📋 Next Steps:</h4>
          <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">
            <li style="margin-bottom: 8px;">Login to your account using your email and the temporary password above</li>
            <li style="margin-bottom: 8px;">Navigate to your profile settings</li>
            <li style="margin-bottom: 8px;">Change your password to something secure and memorable</li>
            <li>Complete your profile information</li>
          </ul>
        </div>
        
        <p style="color: #555; line-height: 1.6; font-size: 16px; text-align: center;">If you have any questions or need assistance, please contact your system administrator.</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
        <p style="margin: 0; color: #777; font-size: 13px;">This is an automated message. Please do not reply to this email.</p>
        <p style="margin: 5px 0 0 0; color: #777; font-size: 13px;">© ${new Date().getFullYear()} Videodesk. All rights reserved.</p>
      </div>
    </div>
  `;
  
  const text = `
Welcome to ${companyName}, ${userName}!

Your account has been created successfully with the role of ${userRole.replace('_', ' ')}.

Your temporary password is: ${temporaryPassword}

IMPORTANT: This is a temporary password. Please change it immediately after your first login.

Next Steps:
1. Login to your account using your email and the temporary password above
2. Navigate to your profile settings
3. Change your password to something secure and memorable
4. Complete your profile information

If you have any questions, please contact your system administrator.

Best regards,
The Videodesk Team
  `;
  
  try {
    await sendMail(userEmail, subject, text, html);
    console.log(`Temporary password email sent successfully to ${userEmail}`);
    return true;
  } catch (error) {
    console.error(`Failed to send temporary password email to ${userEmail}:`, error);
    throw error;
  }
};

export const sendExistingUserRoleUpdateEmail = async (userEmail, userName, companyName, newRole) => {
  const subject = `Role Updated - ${companyName}`;
  
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
        <div style="margin-bottom: 15px;">
          ${getLogoSvg()}
        </div>
        <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
        <h2 style="margin: 15px 0 0 0; font-size: 24px;">Role Update Notification</h2>
      </div>
      
      <div style="padding: 40px 30px; background-color: #ffffff;">
        <h2 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 24px; text-align: center;">Hello, ${userName}!</h2>
        <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">Your role has been updated in <strong>${companyName}</strong>.</p>
        
        <div style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <div style="font-size: 18px; font-weight: bold; color: #10b981; text-transform: capitalize;">
            New Role: ${newRole.replace('_', ' ')}
          </div>
        </div>
        
        <div style="background-color: #f0f7ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h4 style="color: #1e40af; margin: 0 0 15px 0; font-weight: 600;">ℹ️ What this means:</h4>
          <p style="margin: 0; color: #555; line-height: 1.6; font-size: 16px;">You now have access to additional features and permissions based on your new role. You can continue using your existing account credentials.</p>
        </div>
        
        <p style="color: #555; line-height: 1.6; font-size: 16px; text-align: center;">If you have any questions about your new role or need assistance, please contact your system administrator.</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
        <p style="margin: 0; color: #777; font-size: 13px;">This is an automated message. Please do not reply to this email.</p>
        <p style="margin: 5px 0 0 0; color: #777; font-size: 13px;">© ${new Date().getFullYear()} Videodesk. All rights reserved.</p>
      </div>
    </div>
  `;
  
  const text = `
Hello ${userName}!

Your role has been updated in ${companyName}.

New Role: ${newRole.replace('_', ' ')}

What this means:
You now have access to additional features and permissions based on your new role. You can continue using your existing account credentials.

If you have any questions about your new role or need assistance, please contact your system administrator.

Best regards,
The Videodesk Team
  `;
  
  try {
    await sendMail(userEmail, subject, text, html);
    console.log(`Role update email sent successfully to ${userEmail}`);
    return true;
  } catch (error) {
    console.error(`Failed to send role update email to ${userEmail}:`, error);
    throw error;
  }
};
