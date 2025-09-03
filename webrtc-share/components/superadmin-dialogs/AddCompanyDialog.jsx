import { useState, useEffect } from 'react';
import { Building2, Plus, X, Users, AlertCircle } from "lucide-react";

export default function AddCompanyDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading = false,
  apiError = null,
  onClearApiError = null,
  mode = 'add', // 'add' or 'view'
  companyData = null // Company data for view mode
}) {
  const [formData, setFormData] = useState({
    name: '',
    house_name_number: '',
    street_road: '',
    city: '',
    country: '',
    post_code: '',
    users: [
      { id: 1, firstName: '', lastName: '', email: '', phone: '', jobTitle: '', role: 'company_admin' },
      { id: 2, firstName: '', lastName: '', email: '', phone: '', jobTitle: '', role: 'landlord' }
    ]
  });

  const [errors, setErrors] = useState({});

  // Format API error messages to be more user-friendly
  const formatApiError = (errorMessage) => {
    if (errorMessage.includes('Company with this name already exists')) {
      return 'A company with this name already exists. Please choose a different name.';
    }
    if (errorMessage.includes('Company name, address fields, and users are required')) {
      return 'Please fill in all required fields including company name, address, and user information.';
    }
    if (errorMessage.includes('Invalid role')) {
      return 'Invalid user role specified. Please check the user roles.';
    }
    if (errorMessage.includes('Failed to create user')) {
      return 'There was an issue creating one or more users. Please check the user information and try again.';
    }
    if (errorMessage.includes('email')) {
      return 'Please check the email addresses for all users. Make sure they are valid and unique.';
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
    if ((mode === 'view' || mode === 'edit') && companyData) {
      setFormData({
        name: companyData.name || '',
        house_name_number: companyData.house_name_number || '',
        street_road: companyData.street_road || '',
        city: companyData.city || '',
        country: companyData.country || '',
        post_code: companyData.post_code || '',
        users: companyData.users || [
          { id: 1, firstName: '', lastName: '', email: '', phone: '', jobTitle: '', role: 'company_admin' },
          { id: 2, firstName: '', lastName: '', email: '', phone: '', jobTitle: '', role: 'landlord' }
        ]
      });
    }
  }, [mode, companyData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Clear API error when user starts typing in company name
    if (field === 'name' && apiError && onClearApiError) {
      onClearApiError();
    }
  };

  const addUser = (role) => {
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

    // Validate address fields
    if (!formData.house_name_number?.trim()) {
      newErrors.house_name_number = 'Building/Unit is required';
    }
    if (!formData.street_road?.trim()) {
      newErrors.street_road = 'Street Address is required';
    }
    if (!formData.city?.trim()) {
      newErrors.city = 'City/Town is required';
    }
    if (!formData.country?.trim()) {
      newErrors.country = 'County is required';
    }
    if (!formData.post_code?.trim()) {
      newErrors.post_code = 'Postcode is required';
    }

    // Validate users
    formData.users.forEach((user, index) => {
      if (!user.firstName?.trim()) {
        newErrors[`user${index}FirstName`] = 'First name is required';
      }
      if (!user.lastName?.trim()) {
        newErrors[`user${index}LastName`] = 'Last name is required';
      }
      if (!user.email.trim()) {
        newErrors[`user${index}Email`] = 'User email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
        newErrors[`user${index}Email`] = 'Please enter a valid email address';
      }
      if (!user.phone?.trim()) {
        newErrors[`user${index}Phone`] = 'Phone number is required';
      }
      if (!user.jobTitle?.trim()) {
        newErrors[`user${index}JobTitle`] = 'Job title is required';
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
      // Format the data for the API
      const formattedData = {
        name: formData.name.trim(),
        house_name_number: formData.house_name_number?.trim() || '',
        street_road: formData.street_road?.trim() || '',
        city: formData.city?.trim() || '',
        country: formData.country?.trim() || '',
        post_code: formData.post_code?.trim() || '',
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
      name: '',
      house_name_number: '',
      street_road: '',
      city: '',
      country: '',
      post_code: '',
      users: [
        { id: 1, firstName: '', lastName: '', email: '', phone: '', jobTitle: '', role: 'company_admin' },
        { id: 2, firstName: '', lastName: '', email: '', phone: '', jobTitle: '', role: 'landlord' }
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
        <div className="min-w-[0] max-w-[85vw] w-full sm:w-[600px] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col mx-0">
          {/* Purple header strip above modal */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
            <div className="flex-1 flex items-center justify-center">
              <span className="text-sm sm:text-lg font-bold text-center flex items-center gap-2">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                {mode === 'view' ? 'View Company Details' : mode === 'edit' ? 'Edit Company' : 'Add New Company'}
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
            <div className="p-3 sm:p-6 flex flex-col pointer-events-auto max-h-[85vh] sm:max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                    disabled={mode === 'view'}
                    className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors.name || apiError ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors.name}</p>
                  )}
                  {apiError && (
                    <p className="text-red-500 text-xs font-semibold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{formatApiError(apiError)}</p>
                  )}
                </div>

                {/* Company Address Fields */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">
                    Company Address
                  </h4>
                  
                  {/* Building/Unit and Street - Side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 ml-1 block">
                        Building/Unit<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.house_name_number}
                        onChange={(e) => handleInputChange('house_name_number', e.target.value)}
                        placeholder="Building name, unit number, or office"
                        disabled={mode === 'view'}
                        className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors.house_name_number ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {errors.house_name_number && (
                        <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors.house_name_number}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 ml-1 block">
                        Street Address<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.street_road}
                        onChange={(e) => handleInputChange('street_road', e.target.value)}
                        placeholder="Street name and number"
                        disabled={mode === 'view'}
                        className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors.street_road ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {errors.street_road && (
                        <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors.street_road}</p>
                      )}
                    </div>
                  </div>

                  {/* City, County, and Postcode - Side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 ml-1 block">
                        City/Town<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="City or town name"
                        disabled={mode === 'view'}
                        className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors.city ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {errors.city && (
                        <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors.city}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 ml-1 block">
                        County<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        placeholder="County (e.g., Greater London)"
                        disabled={mode === 'view'}
                        className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors.country ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {errors.country && (
                        <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors.country}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 ml-1 block">
                        Postcode<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.post_code}
                        onChange={(e) => handleInputChange('post_code', e.target.value)}
                        placeholder="e.g., SW1A 1AA"
                        disabled={mode === 'view'}
                        className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors.post_code ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {errors.post_code && (
                        <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors.post_code}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* User Management */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-2 gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                    User Management
                  </h3>
                  {(mode !== 'view') && (
                    <button
                      type="button"
                      onClick={() => addUser('company_admin')}
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
                            {user.role === 'landlord' ? 'landlord officer' : user.role.replace('_', ' ')} #{displayNumber}
                          </span>
                          {user.id > 2 && (mode !== 'view') && (
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
                                className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors[`user${index}FirstName`] ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              />
                              {errors[`user${index}FirstName`] && (
                                <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors[`user${index}FirstName`]}</p>
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
                                className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors[`user${index}LastName`] ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              />
                              {errors[`user${index}LastName`] && (
                                <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors[`user${index}LastName`]}</p>
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
                                className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors[`user${index}Email`] ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              />
                              {errors[`user${index}Email`] && (
                                <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors[`user${index}Email`]}</p>
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
                                className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors[`user${index}Phone`] ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              />
                              {errors[`user${index}Phone`] && (
                                <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors[`user${index}Phone`]}</p>
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
                              className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm mt-1 ${errors[`user${index}JobTitle`] ? 'border-red-500' : ''} ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            />
                            {errors[`user${index}JobTitle`] && (
                              <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors[`user${index}JobTitle`]}</p>
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
                        {mode === 'edit' ? 'Updating Company...' : 'Creating Company...'}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {mode === 'edit' ? 'Update Company' : 'Create Company'}
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
