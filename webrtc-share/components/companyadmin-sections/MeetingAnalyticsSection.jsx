"use client"
import { Video, Clock, BarChart3, TrendingUp, Calendar, Users } from "lucide-react"

const MeetingStatCard = ({ title, value, icon: Icon, bgColor = "bg-blue-100", textColor = "text-blue-600", subtitle }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${bgColor} group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`w-6 h-6 ${textColor}`} />
      </div>
    </div>
    <div>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  </div>
)

const MeetingAnalyticsSection = ({ companyStats, companyMeetings, companyUsers }) => {
  const meetingStats = [
    {
      title: "Total Meetings",
      value: companyStats.totalMeetings || 0,
      icon: Video,
      bgColor: "bg-blue-100",
      textColor: "text-blue-600"
    },
    {
      title: "Total Minutes",
      value: companyStats.totalMeetingMinutes || 0,
      icon: Clock,
      bgColor: "bg-green-100",
      textColor: "text-green-600"
    },
    {
      title: "Avg Duration (min)",
      value: companyStats.averageMeetingDuration || 0,
      icon: BarChart3,
      bgColor: "bg-purple-100",
      textColor: "text-purple-600"
    }
  ]

  const recentMeetings = companyMeetings?.slice(0, 5) || []

  return (
    <div className="space-y-8 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {meetingStats.map((stat, index) => (
          <MeetingStatCard key={index} {...stat} />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Monthly Growth</h4>
            </div>
            <div className="text-3xl font-bold text-blue-600">+{companyStats.monthlyGrowth}%</div>
            <p className="text-sm text-blue-700">vs last month</p>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-6 h-6 text-green-600" />
              <h4 className="font-semibold text-green-900">Active Participants</h4>
            </div>
            <div className="text-3xl font-bold text-green-600">
              {companyUsers ? companyUsers.filter(user => user.role !== 'company-admin').length : 0}
            </div>
            <p className="text-sm text-green-700">total users</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Meetings</h3>
        {recentMeetings.length > 0 ? (
          <div className="space-y-3">
            {recentMeetings.map((meeting, index) => (
              <div key={meeting._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Video className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Meeting #{meeting._id?.slice(-6) || index + 1}
                    </p>
                    <p className="text-sm text-gray-600">
                      {meeting.createdAt ? new Date(meeting.createdAt).toLocaleDateString() : 'Unknown date'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {meeting.meeting_duration ? Math.round(meeting.meeting_duration / 60) : 0} min
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No recent meetings</p>
            <p className="text-sm">Meetings will appear here once they're created</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-900">Peak Meeting Time</span>
              <span className="text-sm text-blue-700">2:00 PM</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-900">Most Active Day</span>
              <span className="text-sm text-green-700">Wednesday</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-purple-900">Avg Participants</span>
              <span className="text-sm text-purple-700">4.2</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium text-orange-900">Success Rate</span>
              <span className="text-sm text-orange-700">94%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MeetingAnalyticsSection 