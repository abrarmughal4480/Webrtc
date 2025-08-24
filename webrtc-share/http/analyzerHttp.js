import { api, publicApi } from './index.js';

// Create a new analyzer session
export const createAnalyzerSession = async (data) => {
  try {
    const response = await api.post('/analyzer/session', data);
    return response.data;
  } catch (error) {
    console.error('Error creating analyzer session:', error);
    throw error;
  }
};

// Upload images for analysis
export const uploadAnalyzerImages = async (sessionId, images) => {
  try {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    
    // Handle both File objects and other image data
    images.forEach((image, index) => {
      if (image instanceof File) {
        formData.append('images', image);
      } else {
        // If it's not a File object, skip it for now
        console.warn('Skipping non-File object:', image);
      }
    });
    
    const response = await api.post('/analyzer/upload-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading analyzer images:', error);
    throw error;
  }
};

// Save analysis results
export const saveAnalysisResults = async (sessionId, results) => {
  try {
    const response = await api.post('/analyzer/save-results', {
      sessionId,
      results
    });
    return response.data;
  } catch (error) {
    console.error('Error saving analysis results:', error);
    throw error;
  }
};

// Update feedback for a specific analysis
export const updateAnalysisFeedback = async (sessionId, imageIndex, feedback) => {
  try {
    const response = await api.post('/analyzer/feedback', {
      sessionId,
      imageIndex,
      feedback
    });
    return response.data;
  } catch (error) {
    console.error('Error updating analysis feedback:', error);
    throw error;
  }
};

// Get analyzer session by ID
export const getAnalyzerSession = async (sessionId) => {
  try {
    const response = await api.get(`/analyzer/session/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting analyzer session:', error);
    throw error;
  }
};

// Get user's analyzer sessions
export const getUserAnalyzerSessions = async (userEmail) => {
  try {
    const response = await api.get(`/analyzer/sessions/${userEmail}`);
    return response.data;
  } catch (error) {
    console.error('Error getting user analyzer sessions:', error);
    throw error;
  }
};

// Delete analyzer session
export const deleteAnalyzerSession = async (sessionId) => {
  try {
    const response = await api.delete(`/analyzer/session/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting analyzer session:', error);
    throw error;
  }
};

// Test backend connection
export const testBackendConnection = async () => {
  try {
    const response = await api.get('/analyzer/test');
    return response.data;
  } catch (error) {
    console.error('Error testing backend connection:', error);
    throw error;
  }
};
