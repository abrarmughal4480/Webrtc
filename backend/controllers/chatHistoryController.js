import catchAsyncError from '../middlewares/catchAsyncError.js';
import sendResponse from '../utils/sendResponse.js';
import ChatHistory from '../models/chatHistory.js';

// Save chat session
export const saveChatSession = catchAsyncError(async (req, res, next) => {
  const { sessionId, title, preview, messages } = req.body;
  
  if (!req.user) {
    return sendResponse(res, 401, false, null, 'User not authenticated');
  }

  if (!sessionId || !preview || !messages) {
    return sendResponse(res, 400, false, null, 'Missing required fields');
  }

  try {
    // Check if session already exists
    let chatSession = await ChatHistory.findOne({ 
      userId: req.user._id, 
      sessionId: sessionId 
    });

    if (chatSession) {
      // Update existing session
      chatSession.preview = preview;
      chatSession.messages = messages;
      chatSession.updatedAt = new Date();
      // Only update title if provided and different from current
      if (title && title !== chatSession.title) {
        chatSession.title = title;
      }
      await chatSession.save();
    } else {
      // Create new session (title is required for new sessions)
      if (!title) {
        return sendResponse(res, 400, false, null, 'Title is required for new chat sessions');
      }
      
      chatSession = new ChatHistory({
        userId: req.user._id,
        sessionId,
        title,
        preview,
        messages
      });
      await chatSession.save();
    }

    return sendResponse(res, 200, true, { chatSession }, 'Chat session saved successfully');
  } catch (error) {
    console.error('Error saving chat session:', error);
    return sendResponse(res, 500, false, null, 'Failed to save chat session');
  }
});

// Get all chat sessions for user
export const getChatSessions = catchAsyncError(async (req, res, next) => {
  if (!req.user) {
    return sendResponse(res, 401, false, null, 'User not authenticated');
  }

  try {
    const chatSessions = await ChatHistory.find({ userId: req.user._id })
      .select('sessionId title preview createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);

    const formattedSessions = chatSessions.map(session => ({
      id: session._id.toString(),
      sessionId: session.sessionId,
      title: session.title,
      preview: session.preview,
      timestamp: session.updatedAt
    }));

    return sendResponse(res, 200, true, { chatSessions: formattedSessions }, 'Chat sessions retrieved successfully');
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return sendResponse(res, 500, false, null, 'Failed to fetch chat sessions');
  }
});

// Get specific chat session with messages
export const getChatSession = catchAsyncError(async (req, res, next) => {
  const { sessionId } = req.params;

  if (!req.user) {
    return sendResponse(res, 401, false, null, 'User not authenticated');
  }

  if (!sessionId) {
    return sendResponse(res, 400, false, null, 'Session ID is required');
  }

  try {
    const chatSession = await ChatHistory.findOne({ 
      userId: req.user._id, 
      sessionId: sessionId 
    });

    if (!chatSession) {
      return sendResponse(res, 404, false, null, 'Chat session not found');
    }

    return sendResponse(res, 200, true, { 
      chatSession: {
        sessionId: chatSession.sessionId,
        title: chatSession.title,
        preview: chatSession.preview,
        messages: chatSession.messages,
        createdAt: chatSession.createdAt,
        updatedAt: chatSession.updatedAt
      }
    }, 'Chat session retrieved successfully');
  } catch (error) {
    console.error('Error fetching chat session:', error);
    return sendResponse(res, 500, false, null, 'Failed to fetch chat session');
  }
});

// Delete chat session
export const deleteChatSession = catchAsyncError(async (req, res, next) => {
  const { sessionId } = req.params;

  if (!req.user) {
    return sendResponse(res, 401, false, null, 'User not authenticated');
  }

  if (!sessionId) {
    return sendResponse(res, 400, false, null, 'Session ID is required');
  }

  try {
    const chatSession = await ChatHistory.findOneAndDelete({ 
      userId: req.user._id, 
      sessionId: sessionId 
    });

    if (!chatSession) {
      return sendResponse(res, 404, false, null, 'Chat session not found');
    }

    return sendResponse(res, 200, true, null, 'Chat session deleted successfully');
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return sendResponse(res, 500, false, null, 'Failed to delete chat session');
  }
});

// Update chat session title
export const updateChatSessionTitle = catchAsyncError(async (req, res, next) => {
  const { sessionId } = req.params;
  const { title } = req.body;

  if (!req.user) {
    return sendResponse(res, 401, false, null, 'User not authenticated');
  }

  if (!sessionId || !title) {
    return sendResponse(res, 400, false, null, 'Session ID and title are required');
  }

  try {
    const chatSession = await ChatHistory.findOneAndUpdate(
      { userId: req.user._id, sessionId: sessionId },
      { title, updatedAt: new Date() },
      { new: true }
    );

    if (!chatSession) {
      return sendResponse(res, 404, false, null, 'Chat session not found');
    }

    return sendResponse(res, 200, true, { chatSession }, 'Chat session title updated successfully');
  } catch (error) {
    console.error('Error updating chat session title:', error);
    return sendResponse(res, 500, false, null, 'Failed to update chat session title');
  }
});

// Update message feedback
export const updateMessageFeedback = catchAsyncError(async (req, res, next) => {
  const { sessionId, messageId } = req.params;
  const { feedback } = req.body;

  if (!req.user) {
    return sendResponse(res, 401, false, null, 'User not authenticated');
  }

  if (!sessionId || !messageId) {
    return sendResponse(res, 400, false, null, 'Session ID and message ID are required');
  }

  if (!feedback || !['thumbsUp', 'thumbsDown', null].includes(feedback)) {
    return sendResponse(res, 400, false, null, 'Invalid feedback value');
  }

  try {
    const chatSession = await ChatHistory.findOne({ 
      userId: req.user._id, 
      sessionId: sessionId 
    });

    if (!chatSession) {
      return sendResponse(res, 404, false, null, 'Chat session not found');
    }

    // Find and update the specific message
    const messageIndex = chatSession.messages.findIndex(msg => msg.id === parseInt(messageId));
    
    if (messageIndex === -1) {
      return sendResponse(res, 404, false, null, 'Message not found');
    }

    // Update the feedback for the message
    chatSession.messages[messageIndex].feedback = feedback;
    chatSession.updatedAt = new Date();
    
    await chatSession.save();

    return sendResponse(res, 200, true, { 
      message: chatSession.messages[messageIndex] 
    }, 'Message feedback updated successfully');
  } catch (error) {
    console.error('Error updating message feedback:', error);
    return sendResponse(res, 500, false, null, 'Failed to update message feedback');
  }
}); 