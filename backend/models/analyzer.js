import mongoose from 'mongoose';

const analyzerSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: false
  },
  demoCode: {
    type: String,
    required: false
  },
  
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  
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
  
  notes: String,
  
  totalImages: {
    type: Number,
    default: 0
  },
  analysisCompleted: {
    type: Boolean,
    default: false
  },
  
  accessLogs: [{
    ipAddress: String,
    userAgent: String,
    accessedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  status: {
    type: String,
    enum: ['pending', 'analyzing', 'completed', 'failed'],
    default: 'pending'
  },
  
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

analyzerSchema.index({ userEmail: 1, createdAt: -1 });
analyzerSchema.index({ status: 1 });

const Analyzer = mongoose.model('Analyzer', analyzerSchema);
export default Analyzer;
