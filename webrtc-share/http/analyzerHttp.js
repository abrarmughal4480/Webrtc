// Analyser HTTP functions for superadmin dashboard

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Get all analyser sessions (superadmin only)
export const getAllAnalyserSessions = async () => {
  try {
    const response = await fetch(`${API_BASE}/analyzer/sessions/all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Use cookies for authentication
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching analyser sessions:', error);
    throw error;
  }
};

// Get analyser statistics (superadmin only)
export const getAnalyserStats = async () => {
  try {
    const response = await fetch(`${API_BASE}/analyzer/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Use cookies for authentication
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching analyser stats:', error);
    throw error;
  }
};

// Delete analyser session (superadmin only)
export const deleteAnalyserSession = async (sessionId) => {
  try {
    const response = await fetch(`${API_BASE}/analyzer/session/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Use cookies for authentication
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting analyser session:', error);
    throw error;
  }
};

// Get specific analyser session details
export const getAnalyserSession = async (sessionId) => {
  try {
    const response = await fetch(`${API_BASE}/analyzer/session/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching analyser session:', error);
    throw error;
  }
};

// Create analyser session (for demo users)
export const createAnalyserSession = async (data) => {
  try {
    const response = await fetch(`${API_BASE}/analyzer/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    throw error;
  }
};

// Upload images for analysis
export const uploadAnalyserImages = async (sessionId, images) => {
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
    
    const response = await fetch(`${API_BASE}/analyzer/upload-images`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading analyser images:', error);
    throw error;
  }
};

// Save analysis results
export const saveAnalysisResults = async (sessionId, results) => {
  try {
    const response = await fetch(`${API_BASE}/analyzer/save-results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        results
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving analysis results:', error);
    throw error;
  }
};

// Update feedback for a specific analysis
export const updateAnalysisFeedback = async (sessionId, imageIndex, feedback) => {
  try {
    const response = await fetch(`${API_BASE}/analyzer/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        imageIndex,
        feedback
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating analysis feedback:', error);
    throw error;
  }
};
