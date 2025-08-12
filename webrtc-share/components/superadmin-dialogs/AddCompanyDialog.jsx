import { useState, useEffect } from 'react';
import { Building2, Plus, X, Users } from "lucide-react";

export default function AddCompanyDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading = false 
}) {
  const [formData, setFormData] = useState({
    name: '',
    users: [
      { id: 1, name: '', email: '', role: 'company_admin' },
      { id: 2, name: '', email: '', role: 'landlord' }
    ]
  });

  const [errors, setErrors] = useState({});

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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addUser = (role) => {
    const newUser = {
      id: Date.now(),
      name: '',
      email: '',
      role: 'landlord'
    };
    setFormData(prev => ({
      ...prev,
      users: [...prev.users, newUser]
    }));
  };

  const removeUser = (userId) => {
    // Don't allow removing the first two default users
    if (userId <= 2) return;
    
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
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    }

    // Validate users
    formData.users.forEach((user, index) => {
      if (!user.name.trim()) {
        newErrors[`user${index}Name`] = 'User name is required';
      }
      if (!user.email.trim()) {
        newErrors[`user${index}Email`] = 'User email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
        newErrors[`user${index}Email`] = 'Please enter a valid email address';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Format the data for the API
      const formattedData = {
        name: formData.name.trim(),
        users: formData.users.map(user => ({
          name: user.name.trim(),
          email: user.email.trim().toLowerCase(),
          role: user.role
        }))
      };
      
      onSubmit(formattedData);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      users: [
        { id: 1, name: '', email: '', role: 'company_admin' },
        { id: 2, name: '', email: '', role: 'landlord' }
      ]
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-full bg-black/40 backdrop-blur-sm z-[9999] pointer-events-none"></div>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2">
        <div className="min-w-[0] max-w-[85vw] w-full sm:w-[600px] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col mx-0">
          {/* Purple header strip above modal */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
            <div className="flex-1 flex items-center justify-center">
              <span className="text-sm sm:text-lg font-bold text-center flex items-center gap-2">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                Add New Company
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
          
          <div className="w-full bg-white rounded-b-2xl shadow-2xl border border-gray-200 p-3 sm:p-6 flex flex-col pointer-events-auto max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Company Basic Info */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Company Information
                </h3>
                
                <div>
                  <label htmlFor="name" className="text-xs font-semibold text-gray-600 ml-1 block">
                    Company Name<span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter company name"
                    className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors.name ? 'border-red-500' : ''}`}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors.name}</p>
                  )}
                </div>
              </div>

              {/* User Management */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-2 gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                    User Management
                  </h3>
                  <button
                    type="button"
                    onClick={() => addUser('company_admin')}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add More</span>
                  </button>
                </div>
                
                {/* Users List */}
                <div className="space-y-3 sm:space-y-4">
                  {formData.users.map((user, index) => {
                    // Calculate display number based on role and position
                    let displayNumber = 1;
                    if (user.role === 'landlord') {
                      // Count how many landlords come before this one
                      const landlordIndex = formData.users
                        .filter(u => u.role === 'landlord')
                        .findIndex(u => u.id === user.id);
                      displayNumber = landlordIndex + 1;
                    } else if (user.role === 'company_admin') {
                      // Count how many company admins come before this one
                      const adminIndex = formData.users
                        .filter(u => u.role === 'company_admin')
                        .findIndex(u => u.id === user.id);
                      displayNumber = adminIndex + 1;
                    }
                    
                    return (
                      <div key={user.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-medium text-gray-600 capitalize bg-white px-2 py-1 rounded-full border">
                            {user.role.replace('_', ' ')} #{displayNumber}
                          </span>
                          {user.id > 2 && (
                            <button
                              type="button"
                              onClick={() => removeUser(user.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 sm:p-2 rounded-full transition-colors"
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 ml-1 block">
                              Name<span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={user.name}
                              onChange={(e) => updateUser(user.id, 'name', e.target.value)}
                              placeholder="Enter user name"
                              className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors[`user${index}Name`] ? 'border-red-500' : ''}`}
                            />
                            {errors[`user${index}Name`] && (
                              <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors[`user${index}Name`]}</p>
                            )}
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-600 ml-1 block">
                              Email<span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              value={user.email}
                              onChange={(e) => updateUser(user.id, 'email', e.target.value)}
                              placeholder="Enter user email"
                              className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors[`user${index}Email`] ? 'border-red-500' : ''}`}
                            />
                            {errors[`user${index}Email`] && (
                              <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors[`user${index}Email`]}</p>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-3 sm:py-2 rounded-full transition-all disabled:opacity-60"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating Company...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Create Company
                    </div>
                  )}
                </button>
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
    </>
  );
}
