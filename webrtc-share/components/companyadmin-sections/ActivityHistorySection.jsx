"use client"
import { Activity, Clock, User, Video, FileImage, TrendingUp, Calendar, AlertCircle } from "lucide-react"

const ActivityCard = ({ icon: Icon, title, description, time, type, bgColor = "bg-blue-50", textColor = "text-blue-700", iconColor = "text-blue-600" }) => (
  <div className={`p-4 rounded-lg border ${bgColor} border-blue-200 hover:shadow-md transition-all duration-200`}>
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{time}</span>
          {type && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${textColor} ${bgColor}`}>
              {type}
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
)

const ActivityHistorySection = ({ companyStats, companyUsers, companyMeetings, companyUploads }) => {
  const generateActivityData = () => {
    const activities = []
    
    if (companyUsers?.length > 0) {
      companyUsers.slice(0, 3).forEach((user, index) => {
        activities.push({
          icon: User,
          title: "User Login",
          description: `${user.firstName || 'User'} ${user.lastName || ''} logged in`,
          time: user.lastLoginTime ? new Date(user.lastLoginTime).toLocaleString() : 'Recently',
          type: "Login",
          bgColor: "bg-green-50",
          textColor: "text-green-700",
          iconColor: "text-green-600"
        })
      })
    }
    
    if (companyMeetings?.length > 0) {
      companyMeetings.slice(0, 2).forEach((meeting, index) => {
        activities.push({
          icon: Video,
          title: "Meeting Created",
          description: `New meeting scheduled with ${meeting.participants?.length || 0} participants`,
          time: meeting.createdAt ? new Date(meeting.createdAt).toLocaleString() : 'Recently',
          type: "Meeting",
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          iconColor: "text-blue-600"
        })
      })
    }
    
    if (companyUploads?.length > 0) {
      companyUploads.slice(0, 2).forEach((upload, index) => {
        activities.push({
          icon: FileImage,
          title: "File Uploaded",
          description: `${upload.originalName || 'File'} was uploaded`,
          time: upload.createdAt ? new Date(upload.createdAt).toLocaleString() : 'Recently',
          type: "Upload",
          bgColor: "bg-purple-50",
          textColor: "text-purple-700",
          iconColor: "text-purple-600"
        })
      })
    }
    
    return activities.sort((a, b) => new Date(b.time) - new Date(a.time))
  }

  const activities = generateActivityData()
  const recentActivities = activities.slice(0, 8)

  return (
    <div className="space-y-8 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {companyUsers ? companyUsers.filter(user => user.role !== 'company-admin').length : 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span>+12% this week</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Video className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Meetings Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {companyMeetings?.filter(m => 
                  new Date(m.createdAt).toDateString() === new Date().toDateString()
                ).length || 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Calendar className="w-4 h-4" />
            <span>This week: {companyMeetings?.length || 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <FileImage className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Uploads Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {companyUploads?.filter(u => 
                  new Date(u.createdAt).toDateString() === new Date().toDateString()
                ).length || 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-purple-600">
            <TrendingUp className="w-4 h-4" />
            <span>+8% this week</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">System Health</p>
              <p className="text-2xl font-bold text-gray-900">98%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <AlertCircle className="w-4 h-4" />
            <span>All systems operational</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            View All
          </button>
        </div>
        
        {recentActivities.length > 0 ? (
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <ActivityCard key={index} {...activity} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No recent activity</p>
            <p className="text-sm">Activity will appear here as users interact with the system</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Peak Activity Times</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">Morning</span>
                <span className="text-sm text-blue-700">9:00 AM - 11:00 AM</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-900">Afternoon</span>
                <span className="text-sm text-green-700">2:00 PM - 4:00 PM</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Activity Distribution</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-purple-900">User Logins</span>
                <span className="text-sm text-purple-700">45%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-orange-900">File Uploads</span>
                <span className="text-sm text-orange-700">30%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                <span className="text-sm font-medium text-indigo-900">Meetings</span>
                <span className="text-sm text-indigo-700">25%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">Storage Usage Warning</p>
              <p className="text-xs text-yellow-700">Storage usage is approaching 80% capacity</p>
            </div>
            <span className="text-xs text-yellow-600">2 hours ago</span>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <AlertCircle className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">System Update Complete</p>
              <p className="text-xs text-green-700">All systems have been updated successfully</p>
            </div>
            <span className="text-xs text-green-600">1 day ago</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivityHistorySection
