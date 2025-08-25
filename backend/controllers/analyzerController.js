import Analyzer from '../models/analyzer.js';
import { uploadToS3, deleteFromS3 } from '../services/s3Service.js';
import sendResponse from '../utils/sendResponse.js';
import catchAsyncError from '../middlewares/catchAsyncError.js';

// Create a new analyzer session
export const createSession = catchAsyncError(async (req, res) => {
  try {
    const { userEmail, notes, demoCode } = req.body;
    
    // Either userEmail or demoCode is required
    if (!userEmail && !demoCode) {
      return sendResponse(res, 400, false, "Either user email or demo code is required");
    }

    // Generate unique session ID
    const sessionId = `analyzer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const analyzer = new Analyzer({
      userEmail: userEmail || `demo_${demoCode}@analyzer.com`,
      notes,
      sessionId,
      status: 'pending',
      demoCode: demoCode || null // Store demo code if provided
    });

    await analyzer.save();

    sendResponse(res, 201, true, "Analyzer session created successfully", {
      sessionId: analyzer.sessionId,
      analyzer
    });
  } catch (error) {
    throw error; // Re-throw for catchAsyncError to handle
  }
});

// Upload images for analysis
export const uploadImages = catchAsyncError(async (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return sendResponse(res, 400, false, "Session ID is required");
  }

  const analyzer = await Analyzer.findOne({ sessionId });
  if (!analyzer) {
    return sendResponse(res, 404, false, "Analyzer session not found");
  }

  // Handle different file upload formats
  let files = [];
  if (req.files && req.files.images) {
    // If images is an array
    if (Array.isArray(req.files.images)) {
      files = req.files.images;
    } else {
      // If images is a single file
      files = [req.files.images];
    }
  } else if (req.files && Array.isArray(req.files)) {
    // If req.files is directly an array
    files = req.files;
  }

  if (files.length === 0) {
    return sendResponse(res, 400, false, "No images provided");
  }

  const uploadedImages = [];
  
  for (const file of files) {
    try {
      // Upload to S3
      const s3Result = await uploadToS3(file, 'analyzer-images');
      
      const imageData = {
        originalName: file.originalname,
        s3Key: s3Result.Key,
        s3Url: s3Result.Location,
        fileSize: file.size,
        mimeType: file.mimetype
      };
      
      uploadedImages.push(imageData);
      
      // Add to analyzer images array
      analyzer.images.push(imageData);
      
    } catch (error) {
      return sendResponse(res, 500, false, "Error uploading image to S3");
    }
  }

  analyzer.totalImages = analyzer.images.length;
  analyzer.status = 'analyzing';
  await analyzer.save();

  sendResponse(res, 200, true, "Images uploaded successfully", {
    uploadedImages,
    totalImages: analyzer.totalImages
  });
});

// Save analysis results
export const saveResults = catchAsyncError(async (req, res) => {
  const { sessionId, results } = req.body;
  
  if (!sessionId || !results) {
    return sendResponse(res, 400, false, "Session ID and results are required");
  }

  const analyzer = await Analyzer.findOne({ sessionId });
  if (!analyzer) {
    return sendResponse(res, 404, false, "Analyzer session not found");
  }

  // Update analysis results
  analyzer.analysisResults = results.map(result => ({
    ...result,
    analysedAt: new Date(result.analysedAt || Date.now())
  }));
  
  analyzer.status = 'completed';
  analyzer.analysisCompleted = true;
  
  await analyzer.save();

  sendResponse(res, 200, true, "Analysis results saved successfully", {
    analyzer
  });
});

// Update feedback for analysis
export const updateFeedback = catchAsyncError(async (req, res) => {
  const { sessionId, imageIndex, feedback } = req.body;
  
  if (!sessionId || imageIndex === undefined || !feedback) {
    return sendResponse(res, 400, false, "Session ID, image index, and feedback are required");
  }

  const analyzer = await Analyzer.findOne({ sessionId });
  if (!analyzer) {
    return sendResponse(res, 404, false, "Analyzer session not found");
  }

  // Find and update the specific analysis result
  const analysisResult = analyzer.analysisResults.find(result => result.imageIndex === imageIndex);
  if (!analysisResult) {
    return sendResponse(res, 404, false, "Analysis result not found");
  }

  analysisResult.feedback = feedback;
  analysisResult.feedbackAt = new Date();
  
  await analyzer.save();

  sendResponse(res, 200, true, "Feedback updated successfully", {
    updatedResult: analysisResult
  });
});

// Get analyzer session by ID
export const getSession = catchAsyncError(async (req, res) => {
  const { sessionId } = req.params;
  
  const analyzer = await Analyzer.findOne({ sessionId });
  if (!analyzer) {
    return sendResponse(res, 404, false, "Analyzer session not found");
  }

  sendResponse(res, 200, true, "Session retrieved successfully", {
    analyzer
  });
});

// Get user's analyzer sessions
export const getUserSessions = catchAsyncError(async (req, res) => {
  const { userEmail } = req.params;
  
  const analyzers = await Analyzer.find({ userEmail })
    .sort({ createdAt: -1 })
    .limit(50); // Limit to last 50 sessions

  sendResponse(res, 200, true, "User sessions retrieved successfully", {
    analyzers,
    total: analyzers.length
  });
});

// Delete analyzer session
export const deleteSession = catchAsyncError(async (req, res) => {
  const { sessionId } = req.params;
  
  const analyzer = await Analyzer.findOne({ sessionId });
  if (!analyzer) {
    return sendResponse(res, 404, false, "Analyzer session not found");
  }

  // Delete images from S3
  for (const image of analyzer.images) {
    try {
      await deleteFromS3(image.s3Key);
    } catch (error) {
      // Continue with deletion even if S3 deletion fails
    }
  }

  await Analyzer.findByIdAndDelete(analyzer._id);

  sendResponse(res, 200, true, "Session deleted successfully");
});

// Get all analyzer sessions (for superadmin)
export const getAllSessions = catchAsyncError(async (req, res) => {

  
  try {
    const sessions = await Analyzer.find({})
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();
    

    
    sendResponse(res, 200, true, "All sessions retrieved successfully", sessions);
  } catch (error) {
    throw error;
  }
});

// Get analyzer statistics
export const getStats = catchAsyncError(async (req, res) => {
  try {
    // First get basic stats
    const basicStats = await Analyzer.aggregate([
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalImages: { $sum: '$totalImages' },
          completedAnalyses: { $sum: { $cond: ['$analysisCompleted', 1, 0] } }
        }
      }
    ]);

    // Then get confidence stats separately
    const confidenceStats = await Analyzer.aggregate([
      {
        $match: {
          'analysisResults.confidence': { $exists: true, $ne: null }
        }
      },
      {
        $unwind: '$analysisResults'
      },
      {
        $match: {
          'analysisResults.confidence': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          averageConfidence: { $avg: '$analysisResults.confidence' }
        }
      }
    ]);

    const finalStats = {
      totalSessions: basicStats[0]?.totalSessions || 0,
      totalImages: basicStats[0]?.totalImages || 0,
      completedAnalyses: basicStats[0]?.completedAnalyses || 0,
      averageConfidence: confidenceStats[0]?.averageConfidence || 0
    };

    sendResponse(res, 200, true, "Statistics retrieved successfully", finalStats);
  } catch (error) {
    console.error('Error getting stats:', error);
    const finalStats = {
      totalSessions: 0,
      totalImages: 0,
      completedAnalyses: 0,
      averageConfidence: 0
    };
    sendResponse(res, 200, true, "Statistics retrieved successfully", finalStats);
  }
});


