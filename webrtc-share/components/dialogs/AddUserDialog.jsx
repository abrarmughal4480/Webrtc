import { useState, useEffect } from 'react';
import { UserPlus, X, AlertCircle, Plus } from "lucide-react";

export default function AddUserDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading = false,
  apiError = null,
  onClearApiError = null,
  mode = 'add', // 'add' or 'view'
  userData = null // User data for view mode
}) {
  const [formData, setFormData] = useState({
    users: [
      { id: 1, firstName: '', lastName: '', email: '', phone: '', jobTitle: '', role: 'landlord' }
    ]
  });

  const [errors, setErrors] = useState({});

  // Format API error messages to be more user-friendly
  const formatApiError = (errorMessage) => {
    if (errorMessage.includes('User with this email already exists')) {
      return 'A user with this email already exists. Please use a different email address.';
    }
    if (errorMessage.includes('Invalid role')) {
      return 'Invalid user role specified. Please check the user role.';
    }
    if (errorMessage.includes('Failed to create user')) {
      return 'There was an issue creating the user. Please check the information and try again.';
    }
    if (errorMessage.includes('email')) {
      return 'Please check the email address. Make sure it is valid and unique.';
    }
    return errorMessage;
  };

  // Prevent background scrolling when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Populate form data when in view or edit mode
  useEffect(() => {
    if ((mode === 'view' || mode === 'edit') && userData) {
      setFormData({
        users: [{
          id: 1,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          jobTitle: userData.jobTitle || '',
          role: userData.role || 'landlord'
        }]
      });
    }
  }, [mode, userData]);

  const addUser = () => {
    const newUser = {
      id: Date.now(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      jobTitle: '',
      role: 'landlord'
    };
    setFormData(prev => ({
      ...prev,
      users: [...prev.users, newUser]
    }));
  };

  const removeUser = (userId) => {
    // Don't allow removing the first user
    if (userId === 1) return;
    
    setFormData(prev => ({
      ...prev,
      users: prev.users.filter(user => user.id !== userId)
    }));
  };

  const updateUser = (userId, field, value) => {
    setFormData(prev => ({
      ...prev,
      users: prev.users.map(user => 
        user.id === userId ? { ...user, [field]: value } : user
      )
    }));
    // Clear error when user starts typing
    if (errors[`user${userId}${field}`]) {
      setErrors(prev => ({ ...prev, [`user${userId}${field}`]: '' }));
    }
    // Clear API error when user starts typing in email
    if (field === 'email' && apiError && onClearApiError) {
      onClearApiError();
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate each user
    formData.users.forEach((user, index) => {
      if (!user.firstName?.trim()) {
        newErrors[`user${user.id}firstName`] = 'First name is required';
      }
      if (!user.lastName?.trim()) {
        newErrors[`user${user.id}lastName`] = 'Last name is required';
      }
      if (!user.email.trim()) {
        newErrors[`user${user.id}email`] = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
        newErrors[`user${user.id}email`] = 'Please enter a valid email address';
      }
      if (!user.phone?.trim()) {
        newErrors[`user${user.id}phone`] = 'Phone number is required';
      }
      if (!user.jobTitle?.trim()) {
        newErrors[`user${user.id}jobTitle`] = 'Job title is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Don't submit if in view mode
    if (mode === 'view') {
      return;
    }
    
    if (validateForm()) {
      // Format the data for the API - submit all users
      const formattedData = {
        users: formData.users.map(user => ({
          firstName: user.firstName?.trim() || '',
          lastName: user.lastName?.trim() || '',
          name: `${user.firstName?.trim() || ''} ${user.lastName?.trim() || ''}`.trim(), // Keep name for backward compatibility
          email: user.email.trim().toLowerCase(),
          phone: user.phone?.trim() || '',
          jobTitle: user.jobTitle?.trim() || '',
          role: user.role
        }))
      };
      
      onSubmit(formattedData);
    }
  };

  const handleClose = () => {
    setFormData({
      users: [
        { id: 1, firstName: '', lastName: '', email: '', phone: '', jobTitle: '', role: 'landlord' }
      ]
    });
    setErrors({});
    if (onClearApiError) {
      onClearApiError();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-full bg-black/40 backdrop-blur-sm z-[9999] pointer-events-none"></div>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2">
        <div className="min-w-[0] max-w-[90vw] w-full sm:w-[600px] lg:w-[700px] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col mx-0">
          {/* Purple header strip above modal */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
            <div className="flex-1 flex items-center justify-center">
              <span className="text-sm sm:text-lg font-bold text-center flex items-center gap-2">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                {mode === 'view' ? 'View User Details' : mode === 'edit' ? 'Edit User' : 'Add New Landlord Officer'}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="absolute right-2 sm:right-4 bg-purple-500 hover:bg-purple-700 text-white transition p-1.5 sm:p-2 rounded-full shadow"
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          
          <div className="w-full bg-white rounded-b-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div 
              className="p-3 sm:p-6 flex flex-col pointer-events-auto max-h-[85vh] sm:max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* User Management */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-2 gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                    Landlord Officer Management
                  </h3>
                  {(mode !== 'view') && (
                    <button
                      type="button"
                      onClick={addUser}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">Add More</span>
                    </button>
                  )}
                </div>
                
                {/* Users List */}
                <div className="space-y-3 sm:space-y-4">
                  {formData.users.map((user, index) => {
                    return (
                      <div key={user.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-medium text-gray-600 capitalize bg-white px-2 py-1 rounded-full border">
                            landlord officer #{index + 1}
                          </span>
                          {user.id !== 1 && (mode !== 'view') && (
                            <button
                              type="button"
                              onClick={() => removeUser(user.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 sm:p-2 rounded-full transition-colors"
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          {/* First Name and Last Name side by side */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-gray-600 ml-1 block">
                                First Name<span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={user.firstName || ''}
                                onChange={(e) => updateUser(user.id, 'firstName', e.target.value)}
                                placeholder="Enter first name"
                                disabled={mode === 'view'}
                                className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors[`user${user.id}firstName`] ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              />
                              {errors[`user${user.id}firstName`] && (
                                <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors[`user${user.id}firstName`]}</p>
                              )}
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-gray-600 ml-1 block">
                                Last Name<span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={user.lastName || ''}
                                onChange={(e) => updateUser(user.id, 'lastName', e.target.value)}
                                placeholder="Enter last name"
                                disabled={mode === 'view'}
                                className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors[`user${user.id}lastName`] ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              />
                              {errors[`user${user.id}lastName`] && (
                                <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors[`user${user.id}lastName`]}</p>
                              )}
                            </div>
                          </div>

                          {/* Email and Phone Number side by side */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-gray-600 ml-1 block">
                                Email<span className="text-red-500">*</span>
                              </label>
                              <input
                                type="email"
                                value={user.email}
                                onChange={(e) => updateUser(user.id, 'email', e.target.value)}
                                placeholder="Enter user email"
                                disabled={mode === 'view'}
                                className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors[`user${user.id}email`] || apiError ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              />
                              {errors[`user${user.id}email`] && (
                                <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors[`user${user.id}email`]}</p>
                              )}
                              {apiError && index === 0 && (
                                <p className="text-red-500 text-xs font-semibold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{formatApiError(apiError)}</p>
                              )}
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-gray-600 ml-1 block">
                                Phone Number<span className="text-red-500">*</span>
                              </label>
                              <input
                                type="tel"
                                value={user.phone || ''}
                                onChange={(e) => updateUser(user.id, 'phone', e.target.value)}
                                placeholder="Enter phone number"
                                disabled={mode === 'view'}
                                className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors[`user${user.id}phone`] ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              />
                              {errors[`user${user.id}phone`] && (
                                <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors[`user${user.id}phone`]}</p>
                              )}
                            </div>
                          </div>

                          {/* Job Title - Full width */}
                          <div>
                            <label className="text-xs font-semibold text-gray-600 ml-1 block">
                              Job Title<span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={user.jobTitle || ''}
                              onChange={(e) => updateUser(user.id, 'jobTitle', e.target.value)}
                              placeholder="Enter job title"
                              disabled={mode === 'view'}
                              className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors[`user${user.id}jobTitle`] ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            />
                            {errors[`user${user.id}jobTitle`] && (
                              <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors[`user${user.id}jobTitle`]}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dialog Footer */}
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full px-4 py-3 sm:py-2 border border-gray-300 text-gray-700 font-semibold rounded-full transition-all hover:bg-gray-50 disabled:opacity-60"
                  disabled={isLoading}
                >
                  {mode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {mode !== 'view' && (
                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-3 sm:py-2 rounded-full transition-all disabled:opacity-60"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {mode === 'edit' ? 'Updating User...' : 'Creating User...'}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        {mode === 'edit' ? 'Update User' : 'Add User'}
                      </div>
                    )}
                  </button>
                )}
              </div>
            </form>
            
            {/* Required field indicator */}
            <div className="text-center mt-3 sm:mt-4">
              <p className="text-xs text-gray-500">
                <span className="text-red-500">*</span>required
              </p>
            </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
