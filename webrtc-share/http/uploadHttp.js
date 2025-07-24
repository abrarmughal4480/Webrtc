import { api } from ".";

export const getMyUploadsRequest = async () => await api.get("/uploads/my");
export const getMyLatestUploadRequest = async () => await api.get("/uploads/my-latest");
