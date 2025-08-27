"use client"
import { Home, Building, Bell, LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useState } from "react"

const HeaderSection = ({ 
  user, 
  hasNotifications, 
  onLogout, 
  onOpenNotifications, 
  onOpenSupportTicket, 
  onViewTickets, 
  onResetPassword, 
  onInviteUsers, 
  onAmendMessage, 
  onOpenFaq, 
  onFeedback,
  hasTemporaryPassword 
}) => {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const menuItems = [
    { label: 'Raise Support Ticket', action: onOpenSupportTicket, icon: 'ticket' },
    { label: 'View Support Tickets', action: onViewTickets, icon: 'view' },
    { 
      label: hasTemporaryPassword ? 'Change Temporary Password' : 'Reset Password', 
      action: onResetPassword, 
      icon: 'password',
      isUrgent: hasTemporaryPassword
    },
    { label: 'Invite New Users', action: onInviteUsers, icon: 'invite' },
    { label: 'Amend Company Message', action: onAmendMessage, icon: 'message' },
    { label: 'FAQs', action: onOpenFaq, icon: 'faq' },
    { label: 'Give Feedback', action: onFeedback, icon: 'feedback' }
  ]

  return (
    <>
      <div className="hidden md:flex items-center justify-between p-3 sm:p-4 relative min-h-[120px] sm:min-h-[140px]">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push('../')}
            className="bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 rounded-full p-3 flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 hover:border-gray-300 w-11 h-11"
            title="Go to Home"
          >
            <Home className="w-[18px] h-[18px]" strokeWidth="2" />
          </Button>

          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
              <Building className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-gray-600 font-medium">Company Admin</span>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center flex-col z-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Company Dashboard</h1>
          <div className="flex items-center justify-center">
            <img 
              src="/devices.svg" 
              alt="Company Dashboard" 
              className="w-32 sm:w-40 lg:w-48 h-auto object-contain" 
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            className="p-3 transition-all duration-200 flex items-center justify-center cursor-pointer"
            title="Notifications"
            onClick={onOpenNotifications}
          >
            <span className="relative inline-block">
              <Bell className="w-6 h-6 text-purple-600 hover:text-purple-700" />
              {hasNotifications && (
                <span
                  className="absolute bg-red-600 rounded-full animate-pulse border-2 border-white shadow"
                  style={{ width: '0.7rem', height: '0.7rem', top: '-3px', right: '0px', boxShadow: '0 0 4px 1px rgba(255,0,0,0.4)' }}
                />
              )}
            </span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-purple-500 text-white rounded-3xl flex items-center gap-2 text-xl">
                Actions <img src="/icons/arrow-down.svg" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border-none shadow-sm min-w-[250px]">
              {menuItems.map((item, index) => (
                <DropdownMenuItem 
                  key={index}
                  className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                >
                  <button 
                    className={`w-full text-left bg-none border-none cursor-pointer hover:text-gray-700 transition-colors duration-200 ${
                      item.isUrgent ? 'text-red-600 font-semibold' : ''
                    }`} 
                    onClick={item.action}
                  >
                    {item.isUrgent && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block mr-2"></span>
                    )}
                    {item.label}
                  </button>
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuItem className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                <button className="w-full text-left bg-none border-none cursor-pointer hover:text-gray-700 transition-colors duration-200" onClick={onLogout}>
                  <LogOut className="w-4 h-4 inline mr-2" />
                  Logout
                </button>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="bg-purple-50 text-purple-700 font-medium cursor-default">
                <span className="w-full text-left cursor-default">Company Dashboard</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="md:hidden p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('../')}
              className="bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 rounded-full p-2 flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 hover:border-gray-300 w-10 h-10"
              title="Go to Home"
            >
              <Home className="w-4 h-4" strokeWidth="2" />
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                <Building className="w-3 h-3 text-purple-600" />
              </div>
              <span className="text-gray-600 font-medium text-sm">Company Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="p-2 transition-all duration-200 flex items-center justify-center cursor-pointer"
              title="Notifications"
              onClick={onOpenNotifications}
            >
              <span className="relative inline-block">
                <Bell className="w-5 h-5 text-purple-600" />
                {hasNotifications && (
                  <span
                    className="absolute bg-red-600 rounded-full animate-pulse border-2 border-white shadow"
                    style={{ width: '0.6rem', height: '0.6rem', top: '-2px', right: '0px' }}
                  />
                )}
              </span>
            </button>

            <Button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="bg-purple-500 text-white rounded-full p-2 flex items-center justify-center transition-all duration-200 w-10 h-10"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="text-center mt-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Company Dashboard</h1>
          <div className="flex items-center justify-center">
            <img 
              src="/devices.svg" 
              alt="Company Dashboard" 
              className="w-28 h-auto object-contain" 
            />
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="mt-4 bg-white rounded-xl shadow-lg border border-gray-100 p-4">
            <div className="space-y-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 ${
                    item.isUrgent ? 'text-red-600 font-semibold bg-red-50' : 'text-gray-700'
                  }`}
                  onClick={() => {
                    item.action()
                    setIsMobileMenuOpen(false)
                  }}
                >
                  {item.isUrgent && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block mr-2"></span>
                  )}
                  {item.label}
                </button>
              ))}
              
              <button
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-gray-700 border-t border-gray-200 mt-2 pt-4"
                onClick={() => {
                  onLogout()
                  setIsMobileMenuOpen(false)
                }}
              >
                <LogOut className="w-4 h-4 inline mr-2" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default HeaderSection
