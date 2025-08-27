import { api } from './index.js';

export const companyHttp = {
  // Create new company with users
  createCompany: async (companyData) => {
    try {
      const response = await api.post('/companies/create', companyData);
      return response.data;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  },

  // Get all companies
  getAllCompanies: async () => {
    try {
      const response = await api.get('/companies/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  },

  // Get company by ID
  getCompanyById: async (companyId) => {
    try {
      const response = await api.get(`/companies/${companyId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching company:', error);
      throw error;
    }
  },

  // Update company
  updateCompany: async (companyId, updateData) => {
    try {
      const response = await api.put(`/companies/${companyId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  },

  // Delete company
  deleteCompany: async (companyId) => {
    try {
      const response = await api.delete(`/companies/${companyId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  },

  getCompanyStats: async () => {
    try {
      const response = await api.get('/companies/stats');
      return response.data;
    } catch (error) {
      console.error('Error getting company stats:', error);
      throw error;
    }
  },

  // Check if current user has temporary password
  checkTemporaryPasswordStatus: async () => {
    try {
      const response = await api.get('/companies/check-temporary-password');
      return response.data;
    } catch (error) {
      console.error('Error checking temporary password status:', error);
      throw error;
    }
  },

  // Change temporary password
  changeTemporaryPassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/companies/change-temporary-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Error changing temporary password:', error);
      throw error;
    }
  },

  // Get company profile for company admin
  getCompanyProfile: async () => {
    try {
      const response = await api.get('/company-admin/dashboard/company');
      return response.data;
    } catch (error) {
      console.error('Error fetching company profile:', error);
      throw error;
    }
  }
};
