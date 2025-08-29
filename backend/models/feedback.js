import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  imageIndex: {
    type: Number,
    required: true
  },
  analysisId: {
    type: String,
    required: true,
    index: true
  },
  feedbackType: {
    type: String,
    enum: ['thumbsUp', 'thumbsDown'],
    required: true
  },
  imageData: {
    type: String,
    required: true
  },
  analysisResponse: {
    summary: String,
    severity: String,
    confidence: Number,
    affected: [String],
    analysedAt: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for unique feedback per user per image per analysis
feedbackSchema.index({ userEmail: 1, imageIndex: 1, analysisId: 1 }, { unique: true });

// Update timestamp on save
feedbackSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Feedback', feedbackSchema);
