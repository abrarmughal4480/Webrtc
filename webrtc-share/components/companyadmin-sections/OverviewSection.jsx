"use client"
import { Users, Video, HardDrive, Clock, TrendingUp, Calendar } from "lucide-react"

const StatCard = ({ title, value, icon: Icon, trend, trendValue, bgColor = "bg-purple-100", textColor = "text-purple-600" }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${bgColor} group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`w-6 h-6 ${textColor}`} />
      </div>
      {trend && (
        <div className={`flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          <TrendingUp className={`w-4 h-4 mr-1 ${trend === 'down' ? 'rotate-180' : ''}`} />
          {trendValue}
        </div>
      )}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
)

const OverviewSection = ({ companyStats, companyMeetings, companyUsers }) => {
  const stats = [
    {
      title: "Total Users",
      value: companyUsers ? companyUsers.filter(user => user.role !== 'company-admin').length : 0,
      icon: Users,
      bgColor: "bg-blue-100",
      textColor: "text-blue-600"
    },
    {
      title: "Total Meetings",
      value: companyStats.totalMeetings,
      icon: Video,
      bgColor: "bg-green-100",
      textColor: "text-green-600"
    },
    {
      title: "Storage Used",
      value: `${companyStats.totalStorageUsed} MB`,
      icon: HardDrive,
      bgColor: "bg-purple-100",
      textColor: "text-purple-600"
    }
  ]

  const recentMeetings = companyMeetings?.slice(0, 5) || []

  return (
    <div className="space-y-8 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Duration Overview</h3>
        <div className="flex items-center justify-center h-32 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{companyStats.totalMeetingMinutes}</div>
            <div className="text-sm text-gray-600">Total Minutes</div>
            <div className="text-xs text-gray-500 mt-1">Avg: {companyStats.averageMeetingDuration} min/meeting</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Growth</h3>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-600" />
          <span className="text-2xl font-bold text-green-600">+{companyStats.monthlyGrowth}%</span>
          <span className="text-gray-600">this month</span>
        </div>
      </div>
    </div>
  )
}

export default OverviewSection

