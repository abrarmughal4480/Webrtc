import { api } from './index.js';

// Get chat history for a ticket from database
export const getChatHistory = async (ticketId, userId) => {
  console.log('🌐 [getChatHistory] Making GET request to /chat/history/' + ticketId);
  try {
    const response = await api.get(`/chat/history/${ticketId}?userId=${userId}`);
    console.log('📥 [getChatHistory] Response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [getChatHistory] Error:', error);
    throw error;
  }
};

// Chat History API calls for AI Chat (ChatBot.jsx)
export const getChatSessions = async () => {
  console.log('🌐 [getChatSessions] Making GET request to /chat/sessions');
  try {
    const response = await api.get("/chat/sessions");
    console.log('📥 [getChatSessions] Response received:', response);
    console.log('📥 [getChatSessions] Response data:', response.data);
    console.log('📥 [getChatSessions] Response status:', response.status);
    return response.data;
  } catch (error) {
    console.error('❌ [getChatSessions] Error:', error);
    console.error('❌ [getChatSessions] Error response:', error.response);
    console.error('❌ [getChatSessions] Error status:', error.response?.status);
    console.error('❌ [getChatSessions] Error data:', error.response?.data);
    throw error;
  }
};

export const saveChatSession = async (formData) => {
  console.log('🌐 [saveChatSession] Making POST request to /chat/sessions with data:', formData);
  try {
    const response = await api.post("/chat/sessions", formData);
    console.log('📥 [saveChatSession] Response received:', response);
    console.log('📥 [saveChatSession] Response data:', response.data);
    console.log('📥 [saveChatSession] Response status:', response.status);
    return response.data;
  } catch (error) {
    console.error('❌ [saveChatSession] Error:', error);
    console.error('❌ [saveChatSession] Error response:', error.response);
    console.error('❌ [saveChatSession] Error status:', error.response?.status);
    console.error('❌ [saveChatSession] Error data:', error.response?.data);
    throw error;
  }
};

export const getChatSession = async (sessionId) => {
  console.log('🌐 Making GET request to /chat/sessions/' + sessionId);
  const response = await api.get(`/chat/sessions/${sessionId}`);
  console.log('📥 GET /chat/sessions/' + sessionId + ' response:', response);
  return response.data;
};

export const deleteChatSession = async (sessionId) => {
  console.log('🌐 Making DELETE request to /chat/sessions/' + sessionId);
  const response = await api.delete(`/chat/sessions/${sessionId}`);
  console.log('📥 DELETE /chat/sessions/' + sessionId + ' response:', response);
  return response.data;
};

export const updateChatSessionTitle = async (sessionId, title) => {
  console.log('🌐 Making PUT request to /chat/sessions/' + sessionId + '/title');
  const response = await api.put(`/chat/sessions/${sessionId}/title`, { title });
  console.log('📥 PUT /chat/sessions/' + sessionId + '/title response:', response);
  return response.data;
};

export const updateMessageFeedback = async (sessionId, messageId, feedback) => {
  console.log('🌐 Making PUT request to /chat/sessions/' + sessionId + '/messages/' + messageId + '/feedback');
  const response = await api.put(`/chat/sessions/${sessionId}/messages/${messageId}/feedback`, { feedback });
  console.log('📥 PUT /chat/sessions/' + sessionId + '/messages/' + messageId + '/feedback response:', response);
  return response.data;
}; 