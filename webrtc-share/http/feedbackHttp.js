import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const api = axios.create({
    baseURL: `${baseURL}/api/v1`,
    withCredentials: true,
});

export const saveFeedbackRequest = async (feedbackData) => {
  try {
    const response = await api.post("/feedback/save", feedbackData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeFeedbackRequest = async (feedbackData) => {
  try {
    const response = await api.post("/feedback/remove", feedbackData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getUserFeedbackRequest = async (userEmail) => {
  try {
    const response = await api.get(`/feedback/user/${userEmail}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getFeedbackStatsRequest = async () => {
  try {
    const response = await api.get("/feedback/stats");
    return response.data;
  } catch (error) {
    throw error;
  }
};
