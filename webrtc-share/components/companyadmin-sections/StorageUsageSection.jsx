"use client"
import { HardDrive, FileImage, Upload, Download, TrendingUp, AlertTriangle } from "lucide-react"

const StorageCard = ({ title, value, icon: Icon, bgColor = "bg-blue-100", textColor = "text-blue-600", subtitle, trend }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${bgColor} group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`w-6 h-6 ${textColor}`} />
      </div>
      {trend && (
        <div className={`flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          <TrendingUp className={`w-4 h-4 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
          {trend > 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  </div>
)

const StorageUsageSection = ({ companyStats, companyUploads }) => {
  const storageStats = [
    {
      title: "Total Uploads",
      value: companyStats.totalUploads,
      icon: FileImage,
      bgColor: "bg-blue-100",
      textColor: "text-blue-600",
      subtitle: "Files uploaded"
    },
    {
      title: "Storage Used",
      value: `${companyStats.totalStorageUsed} MB`,
      icon: HardDrive,
      bgColor: "bg-green-100",
      textColor: "text-green-600",
      subtitle: "Current usage"
    }
  ]

  const recentUploads = companyUploads?.slice(0, 5) || []
  const storagePercentage = Math.min((companyStats.totalStorageUsed / 1000) * 100, 100)

  return (
    <div className="space-y-8 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {storageStats.map((stat, index) => (
          <StorageCard key={index} {...stat} />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Usage</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Used Space</span>
            <span className="text-sm text-gray-600">
              {companyStats.totalStorageUsed} MB / 1000 MB
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                storagePercentage > 80 ? 'bg-red-500' : 
                storagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${storagePercentage}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{storagePercentage.toFixed(1)}% used</span>
            <span className="text-gray-600">
              {1000 - companyStats.totalStorageUsed} MB available
            </span>
          </div>
          
          {storagePercentage > 80 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-700 font-medium">
                Storage usage is high. Consider cleaning up old files.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Uploads</h3>
        {recentUploads.length > 0 ? (
          <div className="space-y-3">
            {recentUploads.map((upload, index) => (
              <div key={upload._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {upload.originalName || `File ${index + 1}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {upload.createdAt ? new Date(upload.createdAt).toLocaleDateString() : 'Unknown date'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {(upload.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-gray-500">
                    {upload.uploadedBy?.firstName || 'Unknown'} {upload.uploadedBy?.lastName || 'User'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Upload className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No recent uploads</p>
            <p className="text-sm">Uploads will appear here once files are uploaded</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-900">Avg File Size</span>
              <span className="text-sm text-blue-700">
                {companyStats.totalUploads > 0 
                  ? (companyStats.totalStorageUsed / companyStats.totalUploads).toFixed(2) 
                  : '0'} MB
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-900">Upload Rate</span>
              <span className="text-sm text-green-700">12/day</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-purple-900">Storage Growth</span>
              <span className="text-sm text-purple-700">+15%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium text-orange-900">Cleanup Needed</span>
              <span className="text-sm text-orange-700">
                {storagePercentage > 80 ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StorageUsageSection
