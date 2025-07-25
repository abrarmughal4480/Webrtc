import User from '../models/user.js';
import { decryptUserId } from '../utils/sendToken.js';

// Fetch user info for room by userId (no longer obfuscated)
export const getUserRoomInfo = async (req, res) => {
  try {
    const { userId } = req.query;
    console.log('[room-user-info] Incoming obfuscated userId:', userId);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId (sid) is required' });
    }
    // Decrypt the obfuscated userId
    const realUserId = decryptUserId(userId);
    console.log('[room-user-info] Decrypted userId:', realUserId);
    if (!realUserId || realUserId.length !== 24) {
      return res.status(400).json({ success: false, message: 'Invalid or un-decryptable userId', decrypted: realUserId });
    }
    const user = await User.findById(realUserId).select('email landlordInfo role logo messageSettings');
    if (!user) {
      console.log('[room-user-info] User not found for userId:', realUserId);
      return res.status(404).json({ success: false, message: 'User not found', userId: realUserId });
    }
    console.log('[room-user-info] User found:', user.email);
    console.log('[room-user-info] Full user document:', JSON.stringify(user, null, 2));

    // Determine tailored or default redirect
    let isDefaultRedirectUrl = true;
    let redirectUrl = '';
    if (user.landlordInfo && user.landlordInfo.redirectUrlTailored && user.landlordInfo.redirectUrlTailored.trim() && user.landlordInfo.redirectUrlTailored.trim() !== 'www.') {
      isDefaultRedirectUrl = false;
      redirectUrl = user.landlordInfo.redirectUrlTailored.trim();
    } else if (user.landlordInfo && user.landlordInfo.redirectUrlDefault && user.landlordInfo.redirectUrlDefault.trim()) {
      isDefaultRedirectUrl = true;
      redirectUrl = user.landlordInfo.redirectUrlDefault.trim();
    } else {
      isDefaultRedirectUrl = true;
      redirectUrl = '';
    }

    res.json({ success: true, user, isDefaultRedirectUrl, redirectUrl });
  } catch (error) {
    console.error('[room-user-info] Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
}; 