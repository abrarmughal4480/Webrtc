import { api } from './index.js';

// Chat History API calls
export const getChatSessions = async () => {
  console.log('🌐 Making GET request to /chat/sessions');
  const response = await api.get("/chat/sessions");
  console.log('📥 GET /chat/sessions response:', response);
  return response.data;
};

export const saveChatSession = async (formData) => {
  console.log('🌐 Making POST request to /chat/sessions with data:', formData);
  const response = await api.post("/chat/sessions", formData);
  console.log('📥 POST /chat/sessions response:', response);
  return response.data;
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