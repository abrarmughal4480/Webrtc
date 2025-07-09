// utils/cookieUtils.js
export const getCookieOptions = () => ({
    expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    secure: process.env.NODE_ENV === "production",
    httpOnly: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: '/',
});

export const getClearCookieOptions = () => ({
    expires: new Date(Date.now() - 1),
    secure: process.env.NODE_ENV === "production",
    httpOnly: process.env.NODE_ENV === "production", 
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: '/',
});