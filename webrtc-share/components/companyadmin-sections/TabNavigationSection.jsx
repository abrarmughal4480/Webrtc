"use client"
import { BarChart3, Users, Video, HardDrive, Activity, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const TabButton = ({ id, label, icon: Icon, activeTab, onClick, badge }) => (
  <Button
    onClick={() => onClick(id)}
    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium border ${
      activeTab === id
        ? 'bg-purple-600 border-purple-600 text-white shadow-lg scale-105'
        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
    {badge && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
        {badge}
      </span>
    )}
  </Button>
)

const TabNavigationSection = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'meetings', label: 'Meeting Analytics', icon: Video },
    { id: 'storage', label: 'Storage & Usage', icon: HardDrive },
    { id: 'activity', label: 'Activity History', icon: Activity },
    { id: 'profile', label: 'Company Profile', icon: Building2 }
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
      <div className="flex flex-wrap gap-2 justify-center">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            id={tab.id}
            label={tab.label}
            icon={tab.icon}
            activeTab={activeTab}
            onClick={onTabChange}
          />
        ))}
      </div>
    </div>
  )
}

export default TabNavigationSection
