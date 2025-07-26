import { api } from ".";
import axios from 'axios';

export const getMyUploadsRequest = async () => await api.get("/uploads/my");
export const getMyLatestUploadRequest = async () => await api.get("/uploads/my-latest");
export const getMyTrashedUploadsRequest = async () => await api.get("/uploads/trash");
export const deleteUploadRequest = async (id) => await api.delete(`/uploads/${id}`);
export const restoreUploadRequest = async (id) => await api.put(`/uploads/restore/${id}`);
export const permanentDeleteUploadRequest = async (id) => await api.delete(`/uploads/permanent/${id}`);

export const validateAccessCode = async ({ code, house, postcode }) => {
  console.log('🚀 Frontend: Making validation request to:', '/api/v1/validate-access-code');
  console.log('📤 Frontend: Sending data:', { code, house, postcode });
  const response = await api.post('/api/v1/validate-access-code', { code, house, postcode });
  console.log('📥 Frontend: Received response:', response.data);
  return response;
};
