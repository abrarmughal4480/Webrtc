import { api } from './index.js';

// Get all users with specific roles (landlord, resident, company-admin)
export const getAllUsers = async (includeTrashed = false) => {
  try {
    const params = includeTrashed ? { deleted: 'true' } : {};
    const response = await api.get('/users/all', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Delete user by ID (move to trash)
export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Restore user from trash
export const restoreUser = async (userId) => {
  try {
    const response = await api.put(`/users/restore/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error restoring user:', error);
    throw error;
  }
};

// Permanently delete user from trash
export const permanentDeleteUser = async (userId) => {
  try {
    const response = await api.delete(`/users/permanent/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error permanently deleting user:', error);
    throw error;
  }
};

// Update user by ID
export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};
