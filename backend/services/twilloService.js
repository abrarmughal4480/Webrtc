import "dotenv/config";
import twilio from 'twilio';

const accountSid = process.env.TWILLIO_ACCOUNT_SID;    
const authToken = process.env.TWILLIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// List of regions that might have SMS restrictions
const RESTRICTED_REGIONS = [
    '+92', // Pakistan
    '+91', // India (sometimes restricted)
    '+880', // Bangladesh
    // Add other restricted regions as needed
];

// List of regions that need specific Twilio configuration when using US number
const SPECIAL_CONFIG_REGIONS = [
    '+44', // UK - needs geo permissions enabled
    '+49', // Germany
    '+33', // France
    '+39', // Italy
    '+81', // Japan
];

// Check if a phone number is in a restricted region
const isRestrictedRegion = (phoneNumber) => {
    return RESTRICTED_REGIONS.some(region => phoneNumber.startsWith(region));
};

// Check if number needs special configuration
const needsSpecialConfig = (phoneNumber) => {
    return SPECIAL_CONFIG_REGIONS.some(region => phoneNumber.startsWith(region));
};

// Helper function to create SMS message based on user preferences
const createSMSMessage = (url, messageSettings, landlordName) => {
    let smsMessage = '';
    
    if (messageSettings && messageSettings.messageOption) {
        if (messageSettings.messageOption === 'default') {
            // Use default landlord connection message
            smsMessage = `Please click on the link below to connect with your landlord: ${url}`;
            console.log('📱 Using default SMS message option');
        } else if (messageSettings.messageOption === 'tailored' && messageSettings.tailoredMessage) {
            // Use tailored message with URL appended
            smsMessage = `${messageSettings.tailoredMessage}\n\nVideo Link: ${url}`;
            console.log('📱 Using tailored SMS message option');
        } else {
            // Fallback to default landlord message
            smsMessage = `Please click on the link below to connect with your landlord: ${url}`;
            console.log('📱 Using fallback default SMS message (no message option selected)');
        }
    } else {
        // No message settings - use default landlord message
        smsMessage = `Please click on the link below to connect with your landlord: ${url}`;
        console.log('📱 Using default SMS message (no message settings provided)');
    }
    
    return smsMessage;
};

const sendMessage = async (to, text, messageSettings = null, url = null, landlordName = null) => {
    try {
        // Check if the region is restricted
        if (isRestrictedRegion(to)) {
            console.log(`⚠️ SMS not sent to ${to} - Region restrictions apply. Email will be used instead.`);
            return {
                success: false,
                reason: 'region_restricted',
                message: 'SMS not available for this region, email used instead'
            };
        }

        // Check if number needs special configuration (like UK numbers)
        if (needsSpecialConfig(to)) {
            console.log(`📋 Special configuration required for ${to} - attempting to send...`);
        }

        // If messageSettings and url are provided, create dynamic message
        let finalMessage = text;
        console.log(finalMessage,"finalMessage")
        if (messageSettings && url) {
            finalMessage = createSMSMessage(url, messageSettings, landlordName);
        }
        console.log(finalMessage,"finalMessage")

        console.log(`📱 Attempting SMS from ${process.env.TWILLIO_PHONE_NUMBER} to ${to}`);

        const message = await client.messages.create({
            body: finalMessage,
            from: process.env.TWILLIO_PHONE_NUMBER,
            to: to
        });

        console.log('✅ SMS sent successfully with SID:', message.sid);
        return {
            success: true,
            sid: message.sid,
            message: 'SMS sent successfully'
        };

    } catch (error) {
        console.error('❌ Error sending SMS:', error.message);
        
        // Handle specific Twilio errors
        if (error.message.includes('Permission to send an SMS has not been enabled')) {
            console.log(`⚠️ SMS permissions not enabled for region: ${to}`);
            console.log('💡 Enable geo permissions in Twilio Console: Messaging → Settings → Geo permissions');
            return {
                success: false,
                reason: 'permission_denied',
                message: 'SMS permissions not enabled for this region'
            };
        }
        
        if (error.message.includes('is not a valid phone number')) {
            console.log(`⚠️ Invalid phone number format: ${to}`);
            return {
                success: false,
                reason: 'invalid_number',
                message: 'Invalid phone number format'
            };
        }

        // Handle "To" and "From" parameter combination errors
        if (error.message.includes('current combination of \'To\'') || error.message.includes('\'From\' parameters')) {
            console.log(`⚠️ SMS routing issue for ${to} - Twilio configuration needed`);
            if (to.startsWith('+44')) {
                console.log('💡 For UK numbers: Enable UK geo permissions in Twilio Console');
                console.log('💡 Or add +447577306256 to verified numbers if using trial account');
            }
            return {
                success: false,
                reason: 'routing_configuration',
                message: 'SMS routing not configured for this number combination'
            };
        }

        // For trial accounts
        if (error.message.includes('trial')) {
            console.log(`⚠️ Trial account limitation for: ${to}`);
            console.log('💡 Verify this number in Twilio Console or upgrade to paid account');
            return {
                success: false,
                reason: 'trial_limitation',
                message: 'Trial account limitations apply'
            };
        }

        // Handle unverified numbers in trial accounts
        if (error.message.includes('not a verified phone number') || error.message.includes('verify')) {
            console.log(`⚠️ Unverified phone number in trial account: ${to}`);
            console.log('💡 Add this number to verified caller IDs in Twilio Console');
            return {
                success: false,
                reason: 'unverified_number',
                message: 'Phone number not verified in trial account'
            };
        }
        
        return {
            success: false,
            reason: 'unknown_error',
            message: error.message
        };
    }
};

export default sendMessage;
