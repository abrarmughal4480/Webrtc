import { api } from ".";
import axios from 'axios';
import { publicApi } from './index.js';

export const getMyUploadsRequest = async () => await api.get("/uploads/my");
export const getMyLatestUploadRequest = async () => await api.get("/uploads/my-latest");
export const getMyTrashedUploadsRequest = async () => await api.get("/uploads/trash");
export const deleteUploadRequest = async (id) => await api.delete(`/uploads/${id}`);
export const restoreUploadRequest = async (id) => await api.put(`/uploads/restore/${id}`);
export const permanentDeleteUploadRequest = async (id) => await api.delete(`/uploads/permanent/${id}`);
export const searchUploadsRequest = async (searchParams) => await api.post("/uploads/search", searchParams);

export const validateAccessCode = async (data) => {
  return await publicApi.post('/api/v1/validate-access-code', data);
};

export const recordVisitorAccessRequest = async (accessCode, visitorData) => {
  return await publicApi.post(`/api/v1/upload/${accessCode}/access`, visitorData);
};
