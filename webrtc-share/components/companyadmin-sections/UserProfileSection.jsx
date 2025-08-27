"use client"
import { Clock, User } from "lucide-react"

const UserProfileSection = ({ user, getInitials, getDisplayName, formatDate }) => {
  return (
    <div className="flex items-center">
      <div className="flex items-start gap-2 bg-white p-3 sm:p-4 flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center border border-purple-300">
            <span className="text-purple-600 font-semibold text-lg">
              {getInitials(getDisplayName())}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Hello,</p>
            <p className="font-semibold">{getDisplayName()}</p>
          </div>
        </div>

        <div className="space-y-2 w-full">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 min-w-[80px]">Logged in:</span>
            <span className="font-mono text-sm">{formatDate(user?.currentLoginTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 min-w-[80px]">Last Login:</span>
            <span className="font-mono text-sm">{formatDate(user?.previousLoginTime || user?.currentLoginTime)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfileSection


