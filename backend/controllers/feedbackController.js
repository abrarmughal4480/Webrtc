import Feedback from '../models/feedback.js';
import { uploadToS3, deleteFromS3 } from '../services/s3Service.js';
import catchAsyncError from '../middlewares/catchAsyncError.js';
import sendResponse from '../utils/sendResponse.js';

// Save feedback with image to S3
export const saveFeedback = catchAsyncError(async (req, res) => {
  const { userEmail, imageIndex, analysisId, feedbackType, imageData, analysisResponse } = req.body;

  if (!userEmail || imageIndex === undefined || !analysisId || !feedbackType || !imageData) {
    return sendResponse(res, 400, false, "Missing required fields");
  }

  try {
    // Temporarily store image data directly instead of S3 for testing
    const s3Url = `data:image/jpeg;base64,${Buffer.from(imageData).toString('base64')}`;
    
    // TODO: Uncomment when S3 is properly configured
    // const s3Key = `feedback-images/${userEmail}/${analysisId}/${imageIndex}-${Date.now()}.jpg`;
    // const s3Url = await uploadToS3(imageData, s3Key);

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({
      userEmail,
      imageIndex,
      analysisId
    });

    if (existingFeedback) {
      // Update existing feedback
      existingFeedback.feedbackType = feedbackType;
      existingFeedback.imageData = s3Url;
      existingFeedback.analysisResponse = analysisResponse;
      existingFeedback.updatedAt = new Date();
      
      await existingFeedback.save();
      
      return sendResponse(res, 200, true, "Feedback updated successfully", {
        feedbackId: existingFeedback._id,
        s3Url
      });
    } else {
      // Create new feedback
      const feedback = new Feedback({
        userEmail,
        imageIndex,
        analysisId,
        feedbackType,
        imageData: s3Url,
        analysisResponse
      });

      await feedback.save();
      
      return sendResponse(res, 201, true, "Feedback saved successfully", {
        feedbackId: feedback._id,
        s3Url
      });
    }
  } catch (error) {
    return sendResponse(res, 500, false, "Error saving feedback");
  }
});

// Remove feedback (delete from DB and S3)
export const removeFeedback = catchAsyncError(async (req, res) => {
  const { userEmail, imageIndex, analysisId } = req.body;

  if (!userEmail || imageIndex === undefined || !analysisId) {
    return sendResponse(res, 400, false, "Missing required fields");
  }

  try {
    const feedback = await Feedback.findOne({
      userEmail,
      imageIndex,
      analysisId
    });

    if (!feedback) {
      return sendResponse(res, 404, false, "Feedback not found");
    }

    // Delete image from S3
    if (feedback.imageData && feedback.imageData.includes('amazonaws.com')) {
      try {
        await deleteFromS3(feedback.imageData);
      } catch (s3Error) {
        // Continue with DB deletion even if S3 fails
      }
    }

    // Delete from database
    await Feedback.findByIdAndDelete(feedback._id);
    
    return sendResponse(res, 200, true, "Feedback removed successfully");
  } catch (error) {
    return sendResponse(res, 500, false, "Error removing feedback");
  }
});

// Get user's feedback history
export const getUserFeedback = catchAsyncError(async (req, res) => {
  const { userEmail } = req.params;

  if (!userEmail) {
    return sendResponse(res, 400, false, "User email is required");
  }

  try {
    const feedback = await Feedback.find({ userEmail }).sort({ createdAt: -1 });
    
    return sendResponse(res, 200, true, "Feedback retrieved successfully", feedback);
  } catch (error) {
    return sendResponse(res, 500, false, "Error retrieving feedback");
  }
});

// Get feedback statistics
export const getFeedbackStats = catchAsyncError(async (req, res) => {
  try {
    const totalFeedback = await Feedback.countDocuments();
    const thumbsUpCount = await Feedback.countDocuments({ feedbackType: 'thumbsUp' });
    const thumbsDownCount = await Feedback.countDocuments({ feedbackType: 'thumbsDown' });
    
    const stats = {
      total: totalFeedback,
      thumbsUp: thumbsUpCount,
      thumbsDown: thumbsDownCount,
      positiveRate: totalFeedback > 0 ? ((thumbsUpCount / totalFeedback) * 100).toFixed(2) : 0
    };
    
    return sendResponse(res, 200, true, "Feedback stats retrieved successfully", stats);
  } catch (error) {
    return sendResponse(res, 500, false, "Error retrieving feedback stats");
  }
});
