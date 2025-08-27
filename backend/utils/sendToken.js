export const sendToken = (res, user, message, statusCode = 200) => {
    const token = user.getJWTToken();
    const options = {
      expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      secure: process.env.NODE_ENV === "development" ? false : true,
      httpOnly: process.env.NODE_ENV === "development" ? false : true,
      sameSite: process.env.NODE_ENV === "development" ? false : "none",
      // sameSite: "none",
    };
  
    res.status(statusCode).cookie("token", token, options).json({
      success: true,
      message,
      user,
    });
  };

// Utility to obfuscate/encrypt a user object ID (simple reverse + random letters)
export function encryptUserId(userId) {
  const shuffled = userId.split('').reverse().join('');
  const randomLetters = (len) => Array.from({length: len}, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
  const prefix = randomLetters(3 + Math.floor(Math.random() * 3));
  const suffix = randomLetters(3 + Math.floor(Math.random() * 3));
  return `${prefix}${shuffled}${suffix}`;
}

// Utility to decrypt the obfuscated/encrypted user object ID
export function decryptUserId(obfuscated) {
  for (let i = 3; i <= 5; i++) {
    for (let j = 3; j <= 5; j++) {
      const core = obfuscated.slice(i, obfuscated.length - j);
      const reversed = core.split('').reverse().join('');
      if (/^[a-f\d]{24}$/i.test(reversed)) {
        return reversed;
      }
    }
  }
  return null;
}