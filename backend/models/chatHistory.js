import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  feedback: {
    type: String,
    enum: ['thumbsUp', 'thumbsDown', null],
    default: null
  }
});

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  preview: {
    type: String,
    required: true
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

chatHistorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

chatHistorySchema.index({ userId: 1, createdAt: -1 });
chatHistorySchema.index({ userId: 1, sessionId: 1 }, { unique: true });

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

export default ChatHistory; 