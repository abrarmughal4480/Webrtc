import mongoose from 'mongoose';

const analyzerSchema = new mongoose.Schema({
  // User information
  userEmail: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: false // Optional for guest users
  },
  demoCode: {
    type: String,
    required: false // Optional demo code for guest access
  },
  
  // Analysis session information
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Images analyzed
  images: [{
    originalName: String,
    s3Key: String,
    s3Url: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // AI Analysis results
  analysisResults: [{
    imageIndex: Number,
    summary: String,
    severity: String,
    confidence: Number,
    affected: [String],
    analysedAt: Date,
    feedback: {
      type: String,
      enum: ['thumbsUp', 'thumbsDown', null],
      default: null
    },
    feedbackAt: Date
  }],
  
  // Notes provided by user
  notes: String,
  
  // Session metadata
  totalImages: {
    type: Number,
    default: 0
  },
  analysisCompleted: {
    type: Boolean,
    default: false
  },
  
  // Access tracking
  accessLogs: [{
    ipAddress: String,
    userAgent: String,
    accessedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'analyzing', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Error tracking
  errorLogs: [{
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
  
}, { 
  timestamps: true,
  suppressReservedKeysWarning: true 
});

// Indexes for better query performance
analyzerSchema.index({ userEmail: 1, createdAt: -1 });
analyzerSchema.index({ status: 1 });

const Analyzer = mongoose.model('Analyzer', analyzerSchema);
export default Analyzer;
