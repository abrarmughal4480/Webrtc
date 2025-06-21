import ErrorHandler from "../utils/errorHandler.js";

const ErrorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message ||= "Internal Server Error";

  console.log('🚨 Error caught in middleware:', {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack?.split('\n')[0]
  });

  // Handle payload too large error
  if (err.type === 'entity.too.large') {
    const message = 'File size too large. Maximum allowed size is 500MB. Please compress your files and try again.';
    err = new ErrorHandler(message, 413);
  }

  // Wrong Mongodb Id error
  if (err.name === "CastError") {
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} Entered`;
    err = new ErrorHandler(message, 400);
  }

  // Wrong JWT error
  if (err.name === "JsonWebTokenError") {
    const message = `Json Web Token is invalid, Try again `;
    err = new ErrorHandler(message, 400);
  }

  // JWT EXPIRE error
  if (err.name === "TokenExpiredError") {
    const message = `Json Web Token is Expired, Try again `;
    err = new ErrorHandler(message, 400);
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large. Please choose a smaller file.';
    err = new ErrorHandler(message, 413);
  }

  // Network timeout error
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
    const message = 'Request timeout. Please check your connection and try again.';
    err = new ErrorHandler(message, 408);
  }

  // Cloudinary specific errors
  if (err.message && err.message.includes('timeout')) {
    const message = 'Upload timeout. Please try with smaller files or check your internet connection.';
    err = new ErrorHandler(message, 408);
  }

  // Connection reset errors
  if (err.code === 'ECONNRESET') {
    const message = 'Connection was reset during upload. Please try again.';
    err = new ErrorHandler(message, 408);
  }

  // Cloudinary upload errors
  if (err.message && err.message.includes('Upload failed')) {
    const message = 'File upload failed. Please try again with smaller files.';
    err = new ErrorHandler(message, 500);
  }

  console.log('📤 Sending error response:', {
    success: false,
    message: err.message,
    statusCode: err.statusCode
  });

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

export default ErrorMiddleware;