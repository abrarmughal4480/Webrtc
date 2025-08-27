"use client"
import { Building2, Users, Globe, Key, Settings, Edit, Save, X, AlertCircle, CheckCircle } from "lucide-react"
import { useState, useEffect } from "react"

const ProfileField = ({ label, value, isEditing, onChange, type = "text", placeholder }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    {isEditing ? (
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
      />
    ) : (
      <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
        {value || 'No information available'}
      </p>
    )}
  </div>
)

const CompanyProfileSection = ({ companyStats, companyUsers, companyData, user }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [localCompanyData, setLocalCompanyData] = useState({
    name: "",
    industry: "",
    address: "",
    email: "",
    founded: "",
    employees: 0,
    description: ""
  })

  useEffect(() => {
    // Use real company data from backend
    if (companyData && Object.keys(companyData).length > 0) {
      setLocalCompanyData({
        name: companyData.name || "Company Name Not Set",
        industry: companyData.industry || "Technology",
        address: companyData.house_name_number && companyData.street_road && companyData.city && companyData.country && companyData.post_code 
          ? `${companyData.house_name_number}, ${companyData.street_road}, ${companyData.city}, ${companyData.country} ${companyData.post_code}`
          : "Address Not Set",
        email: companyData.adminEmail || user?.email || "",
        founded: companyData.createdAt ? new Date(companyData.createdAt).getFullYear().toString() : "2025",
        employees: companyData.userCount || companyStats?.totalUsers || 0,
        description: companyData.description || "Leading technology company specializing in innovative solutions"
      })
    }
  }, [companyData, companyStats, user])

  const handleSave = async () => {
    try {
      // Here you would typically make an API call to update the company profile
      // await updateCompanyProfile(localCompanyData)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update company profile:', error)
    }
  }

  const handleCancel = () => {
    // Reset to original data
    if (companyData && Object.keys(companyData).length > 0) {
      setLocalCompanyData({
        name: companyData.name || "Company Name Not Set",
        industry: companyData.industry || "Technology",
        address: companyData.house_name_number && companyData.street_road && companyData.city && companyData.country && companyData.post_code 
          ? `${companyData.house_name_number}, ${companyData.street_road}, ${companyData.city}, ${companyData.country} ${companyData.post_code}`
          : "Address Not Set",
        email: companyData.adminEmail || user?.email || "",
        founded: companyData.createdAt ? new Date(companyData.createdAt).getFullYear().toString() : "2025",
        employees: companyData.userCount || companyStats?.totalUsers || 0,
        description: companyData.description || "Leading technology company specializing in innovative solutions"
      })
    }
    setIsEditing(false)
  }

  const handleInputChange = (field, value) => {
    setLocalCompanyData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Company Overview</h3>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProfileField
            label="Company Name"
            value={localCompanyData.name}
            isEditing={isEditing}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter company name"
          />
          
          <ProfileField
            label="Industry"
            value={localCompanyData.industry}
            isEditing={isEditing}
            onChange={(e) => handleInputChange('industry', e.target.value)}
            placeholder="Enter industry"
          />
          
          <ProfileField
            label="Founded Year"
            value={localCompanyData.founded}
            isEditing={isEditing}
            onChange={(e) => handleInputChange('founded', e.target.value)}
            type="number"
            placeholder="Enter founded year"
          />
          
          <ProfileField
            label="Email"
            value={localCompanyData.email}
            isEditing={isEditing}
            onChange={(e) => handleInputChange('email', e.target.value)}
            type="email"
            placeholder="Enter email address"
          />
        </div>

        <div className="mt-6">
          <ProfileField
            label="Address"
            value={localCompanyData.address}
            isEditing={isEditing}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Enter company address"
          />
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-gray-700">Description</label>
          {isEditing ? (
            <textarea
              value={localCompanyData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter company description"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          ) : (
            <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
              {localCompanyData.description || 'No description provided'}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">
                {companyUsers.filter(user => user.role !== 'company-admin').length}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Active users in the system
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Company Age</p>
              <p className="text-2xl font-bold text-gray-900">
                {localCompanyData.founded ? (new Date().getFullYear() - parseInt(localCompanyData.founded)) : 'N/A'} years
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {localCompanyData.founded ? `Founded in ${localCompanyData.founded}` : 'Founded year not specified'}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Globe className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-2xl font-bold text-gray-900">Active</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Company is operational
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">Enhanced security for all users</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600 font-medium">Enabled</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">API Access</p>
                <p className="text-sm text-gray-600">External integrations and API keys</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-yellow-600 font-medium">Limited</span>
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">User Management</p>
                <p className="text-sm text-gray-600">Add, remove, and manage users</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600 font-medium">Full Access</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompanyProfileSection
