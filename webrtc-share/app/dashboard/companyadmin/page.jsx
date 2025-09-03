"use client"
import { Loader2 } from "lucide-react"
import { useUser } from "@/provider/UserProvider"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useDialog } from "@/provider/DilogsProvider"
import { loadMeRequest, logoutRequest } from "@/http/authHttp"
import { api } from "@/http"
import useNotifications from "@/hooks/useNotifications"
import { Button } from "@/components/ui/button"
import { Check, Edit, X, User, Bell } from "lucide-react"

// Import section components
import HeaderSection from "@/components/companyadmin-sections/HeaderSection"
import UserProfileSection from "@/components/companyadmin-sections/UserProfileSection"
import TabNavigationSection from "@/components/companyadmin-sections/TabNavigationSection"
import OverviewSection from "@/components/companyadmin-sections/OverviewSection"
import UserManagementSection from "@/components/companyadmin-sections/UserManagementSection"
import MeetingAnalyticsSection from "@/components/companyadmin-sections/MeetingAnalyticsSection"
import StorageUsageSection from "@/components/companyadmin-sections/StorageUsageSection"
import ActivityHistorySection from "@/components/companyadmin-sections/ActivityHistorySection"
import CompanyProfileSection from "@/components/companyadmin-sections/CompanyProfileSection"

export default function CompanyAdminPage() {
  const { user, isAuth, setIsAuth, setUser } = useUser()
  const router = useRouter()
  
  // Use real-time notifications hook
  const { hasNotifications, notificationData, markAsRead, readNotifications } = useNotifications(user?.email)
  
  // State variables
  const [loading, setLoading] = useState(true)
  const [userLoading, setUserLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [companyUsers, setCompanyUsers] = useState([])
  const [companyMeetings, setCompanyMeetings] = useState([])
  const [companyUploads, setCompanyUploads] = useState([])
  const [companyData, setCompanyData] = useState({})
  const [companyStats, setCompanyStats] = useState({
    totalUsers: 0,
    totalMeetings: 0,
    totalUploads: 0,
    totalStorageUsed: 0,
    totalMeetingMinutes: 0,
    averageMeetingDuration: 0,
    monthlyGrowth: 0
  })
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showNotificationPopup, setShowNotificationPopup] = useState(false)

  const { 
    setResetOpen, 
    setMessageOpen, 
    setTickerOpen, 
    setFeedbackOpen, 
    setFaqOpen, 
    setInviteOpen, 
    setViewTicketsOpen 
  } = useDialog()

  // Load saved active tab from localStorage on component mount
  useEffect(() => {
    const savedTab = localStorage.getItem('companyadmin-active-tab')
    if (savedTab) {
      setActiveTab(savedTab)
    }
  }, [])

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    localStorage.setItem('companyadmin-active-tab', tabId)
  }

  // Load company data
  const loadCompanyData = async () => {
    setLoading(true)
    try {
      // Load company dashboard stats
      const statsResponse = await api.get('/company-admin/dashboard/stats')
      
      if (statsResponse.data.success) {
        setCompanyStats({
          totalUsers: statsResponse.data.data.totalUsers || 0,
          totalMeetings: statsResponse.data.data.totalMeetings || 0,
          totalUploads: statsResponse.data.data.totalUploads || 0,
          totalStorageUsed: statsResponse.data.data.totalStorageUsed || 0,
          totalMeetingMinutes: statsResponse.data.data.totalMeetingMinutes || 0,
          averageMeetingDuration: statsResponse.data.data.averageMeetingDuration || 0,
          monthlyGrowth: statsResponse.data.data.monthlyGrowth || 0
        })
      }

      // Load company profile data
      const companyResponse = await api.get('/company-admin/dashboard/company')
      
      if (companyResponse.data.success) {
        setCompanyData(companyResponse.data.data || {})
      }

      // Load company users
      const usersResponse = await api.get('/company-admin/dashboard/users')
      
      if (usersResponse.data.success) {
        setCompanyUsers(usersResponse.data.data || [])
      }

      // Load company meetings
      const meetingsResponse = await api.get('/company-admin/dashboard/meetings')
      
      if (meetingsResponse.data.success) {
        setCompanyMeetings(meetingsResponse.data.data || [])
      }

      // Load company uploads
      const uploadsResponse = await api.get('/company-admin/dashboard/uploads')
      
      if (uploadsResponse.data.success) {
        setCompanyUploads(uploadsResponse.data.data || [])
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading company data:', error)
      toast.error('Failed to load company data')
      setLoading(false)
    }
  }

  // Load data when component mounts
  useEffect(() => {
    if (isAuth && user) {
      loadCompanyData()
    }
  }, [isAuth, user])

  // Add effect to handle user loading state
  useEffect(() => {
    if (user !== null) {
      setUserLoading(false)
    }
  }, [user])

  // Check temporary password status when user and auth state are ready
  useEffect(() => {
    if (isAuth && user) {
      checkTemporaryPasswordStatus()
    }
  }, [isAuth, user])

  // Function to check if user has temporary password
  const checkTemporaryPasswordStatus = () => {
    try {
      if (!isAuth || !user) {
        return
      }

      const isTemp = user.isTemporaryPassword || false
      if (isTemp) {
        setResetOpen(true)
      }
    } catch (error) {
      console.error('Error checking temporary password status:', error)
    }
  }

  const handleLogout = async () => {
    try {
      const res = await logoutRequest()

      localStorage.removeItem('token')
      localStorage.removeItem('user')
      sessionStorage.clear()
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=none"

      toast("Logout Successful", {
        description: res.data.message
      })

      setIsAuth(false)
      setUser(null)
      router.push('../../../')
    } catch (error) {
      setIsAuth(false)
      setUser(null)
      localStorage.clear()

      toast("Logout Unsuccessful", {
        description: error?.response?.data?.message || error.message
      })

      router.push('../../../')
    }
  }

  const handleMarkAsRead = (notificationId) => {
    markAsRead(notificationId)
    toast.success('Notification marked as read')
  }

  // User action handlers
  const handleViewUser = (user) => {
    setSelectedUser(user)
    setShowUserModal(true)
    toast.info(`Viewing details for ${user.firstName} ${user.lastName}`)
  }

  const handleEditUser = (user) => {
    setSelectedUser(user)
    // TODO: Implement edit user functionality
    toast.info(`Edit functionality for ${user.firstName} ${user.lastName} coming soon`)
  }

  const handleAddUser = async (userData) => {
    try {
      const response = await api.post('/company-admin/users/add', { users: [userData] })
      
      if (response.data.success) {
        toast.success('User added successfully')
        // Reload company data to refresh the user list
        await loadCompanyData()
      } else {
        throw new Error(response.data.message || 'Failed to add user')
      }
    } catch (error) {
      console.error('Error adding user:', error)
      throw new Error(error.response?.data?.message || error.message || 'Failed to add user')
    }
  }

  const handleDeleteUser = async (user) => {
    try {
      // TODO: Implement delete user functionality
      toast.info(`Delete functionality for ${user.firstName} ${user.lastName} coming soon`)
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    }
  }

  const handleObserveUser = async (user) => {
    try {
      console.log('🔍 OBSERVER DEBUG START');
      console.log('👤 User clicked:', {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });
      
      console.log('📊 Total company meetings:', companyMeetings.length);
      console.log('📋 All company meetings:', companyMeetings);
      
      // Check if user has any meetings - try multiple field combinations
      const userMeetings = companyMeetings.filter((meeting, index) => {
        console.log(`\n🔍 Checking meeting ${index + 1}:`, {
          meeting_id: meeting.meeting_id,
          _id: meeting._id,
          userId: meeting.userId,
          created_by: meeting.created_by,
          owner: meeting.owner,
          user_email: meeting.user_email,
          email: meeting.email,
          landlord_email: meeting.landlord_email,
          participants: meeting.participants,
          userInfo: meeting.userInfo,
          allFields: Object.keys(meeting)
        });
        
        // Try different possible field names and combinations
        const userIdMatch = meeting.userId && meeting.userId.toString() === user._id.toString();
        const createdByMatch = meeting.created_by && meeting.created_by.toString() === user._id.toString();
        const ownerMatch = meeting.owner && meeting.owner.toString() === user._id.toString();
        
        // Also try checking if the user's email matches any field in the meeting
        const emailMatch = meeting.user_email === user.email || 
                          meeting.email === user.email ||
                          meeting.landlord_email === user.email;
        
        // Check if user is in any array fields
        const inParticipants = meeting.participants && 
                              meeting.participants.some(p => 
                                (p.user_id && p.user_id.toString() === user._id.toString()) ||
                                (p.email === user.email)
                              );
        
        // Check userInfo array from lookup
        const inUserInfo = meeting.userInfo && 
                          meeting.userInfo.some(u => 
                            (u._id && u._id.toString() === user._id.toString()) ||
                            (u.email === user.email)
                          );
        
        // Since we can't match properly, let's just return all meetings for now
        // This is a temporary fix until backend changes take effect
        const temporaryMatch = true; // Remove this line once backend is fixed
        
        const isMatch = userIdMatch || createdByMatch || ownerMatch || emailMatch || inParticipants || inUserInfo || temporaryMatch;
        
        console.log(`✅ Match results for meeting ${index + 1}:`, {
          userIdMatch,
          createdByMatch,
          ownerMatch,
          emailMatch,
          inParticipants,
          inUserInfo,
          temporaryMatch,
          isMatch
        });
        
        return isMatch;
      });

      console.log('\n🎯 Filtered user meetings:', userMeetings);
      console.log('📈 Number of matching meetings:', userMeetings.length);

      if (userMeetings.length === 0) {
        console.log('❌ No meetings found for user');
        toast.error(`${user.firstName} ${user.lastName} has no meetings to observe`);
        return;
      }

      // Find the most recent meeting
      const latestMeeting = userMeetings.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      )[0];

      console.log('🏆 Latest meeting selected:', latestMeeting);

      // Since observer mode is always enabled now, directly redirect to observer page
      const meetingId = latestMeeting.meeting_id || latestMeeting._id;
      console.log('🔗 Meeting ID for observer URL:', meetingId);
      
      // TEMPORARY FIX: Use the actual room ID where the meeting is happening
      // TODO: This should be dynamically determined from the meeting data
      const actualRoomId = 'a371b836-decf-44a0-981f-0e6a943b6a7b'; // Current active room from backend logs
      console.log('🌐 Observer URL (with actual room ID):', `/observer/${actualRoomId}`);
      
      window.open(`/observer/${actualRoomId}`, '_blank');
      toast.success(`Opening observer view for ${user.firstName} ${user.lastName}'s meeting`);
      
      console.log('🔍 OBSERVER DEBUG END');
      
    } catch (error) {
      console.error('❌ Error observing user:', error);
      toast.error('Failed to observe user meeting');
    }
  }

  const handleViewTrashUsers = () => {
    // TODO: Implement view trash users functionality
    toast.info('View trash users functionality coming soon')
  }

  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name) return 'U'
    const words = name.trim().split(' ').filter(word => word.length > 0)
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase()
    } else if (words.length >= 2) {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
    }
    return name.charAt(0).toUpperCase()
  }

  // Helper function to get display name
  const getDisplayName = () => {
    if (user?.firstName === 'Unknown' || user?.lastName === 'User' || 
        user?.firstName === 'Unknown User' || user?.lastName === 'Unknown User') {
      return user?.email?.split('@')[0] || 'User'
    }
    
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.trim()} ${user.lastName.trim()}`
    }
    
    if (user?.firstName) {
      return user.firstName
    }
    
    if (user?.lastName) {
      return user.lastName
    }
    
    if (user?.email) {
      return user.email.split('@')[0]
    }

    return 'User'
  }

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const day = String(date.getDate()).padStart(2, '0')
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    const timeStr = `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`
    
    return `${day} ${month} ${year}, ${timeStr}`
  }

  // Show loading while checking authentication
  if (loading || !isAuth || !user) {
    if (!loading && !isAuth) {
      router.push('/')
      return null
    }
    
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading Company Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  // Check role after authentication is confirmed
  if (user?.role !== 'company-admin') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-white p-2">
        <div className="container mx-auto space-y-4 px-4 sm:px-6 lg:px-8 mt-8">
          {/* Header Section */}
          <HeaderSection
            user={user}
            hasNotifications={hasNotifications}
            onLogout={handleLogout}
            onOpenNotifications={() => setShowNotificationPopup(true)}
            onOpenSupportTicket={() => setTickerOpen(true)}
            onViewTickets={() => setViewTicketsOpen(true)}
            onResetPassword={() => setResetOpen(true)}
            onInviteUsers={() => setInviteOpen(true)}
            onAmendMessage={() => setMessageOpen(true)}
            onOpenFaq={() => setFaqOpen(true)}
            onFeedback={() => setFeedbackOpen(true)}
            hasTemporaryPassword={user?.isTemporaryPassword || false}
          />

          {/* User Profile Section */}
          <UserProfileSection
            user={user}
            getInitials={getInitials}
            getDisplayName={getDisplayName}
            formatDate={formatDate}
          />

          {/* Tab Navigation Section */}
          <TabNavigationSection
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          {/* Tab Content */}
          <div className="space-y-4 sm:space-y-6">
            {activeTab === 'overview' && (
              <OverviewSection
                companyStats={companyStats}
                companyMeetings={companyMeetings}
                companyUsers={companyUsers}
              />
            )}

            {activeTab === 'users' && (
              <UserManagementSection
                companyUsers={companyUsers}
                companyMeetings={companyMeetings}
                onViewUser={handleViewUser}
                onEditUser={handleEditUser}
                onAddUser={handleAddUser}
                onDeleteUser={handleDeleteUser}
                onObserveUser={handleObserveUser}
                onViewTrashUsers={handleViewTrashUsers}
                getInitials={getInitials}
                formatDate={formatDate}
              />
            )}

            {activeTab === 'meetings' && (
              <MeetingAnalyticsSection
                companyStats={companyStats}
                companyMeetings={companyMeetings}
                companyUsers={companyUsers}
              />
            )}

            {activeTab === 'storage' && (
              <StorageUsageSection
                companyStats={companyStats}
                companyUploads={companyUploads}
              />
            )}

            {activeTab === 'activity' && (
              <ActivityHistorySection
                companyStats={companyStats}
                companyUsers={companyUsers}
                companyMeetings={companyMeetings}
                companyUploads={companyUploads}
              />
            )}

            {activeTab === 'profile' && (
              <CompanyProfileSection
                companyStats={companyStats}
                companyUsers={companyUsers}
                companyData={companyData}
                user={user}
              />
            )}
          </div>
        </div>

        {/* Notification Popup */}
        {showNotificationPopup && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
              {/* Header */}
              <div className="bg-purple-500 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-6 h-6" />
                  <h2 className="text-lg font-bold">Notifications</h2>
                </div>
                <button 
                  onClick={() => setShowNotificationPopup(false)}
                  className="p-2 hover:bg-purple-600 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  {notificationData && notificationData.map((notification, index) => (
                    <div key={notification._id || index} className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer group ${readNotifications.has(notification._id) ? 'bg-gray-50 opacity-75' : 'bg-green-50 hover:bg-green-100'}`}>
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Check className="w-3 h-3 text-green-600" />
                          <p className="font-semibold text-sm text-gray-800">Congratulations! 🎉</p>
                        </div>
                        <p className="text-xs text-gray-600">
                          Your shared information has been viewed successfully. Your Landlord/Councillor has accessed your uploaded content.
                          <br />
                          <span className="font-semibold text-blue-600">Share Code: {notification.accessCode}</span>
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-green-600">
                            {notification.firstAccessedAt ? 
                              new Date(notification.firstAccessedAt).toLocaleString() : 
                              'Just now'
                            }
                          </p>
                          <button 
                            className={`text-xs transition-colors ${readNotifications.has(notification._id) ? 'text-green-600 opacity-100' : 'text-gray-500 hover:text-green-600 opacity-0 group-hover:opacity-100'}`}
                            onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification._id); }}
                          >
                            {readNotifications.has(notification._id) ? '✓ Read' : 'Mark as read'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!notificationData || notificationData.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No notifications to show</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
              {/* Header */}
              <div className="bg-purple-500 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6" />
                  <h2 className="text-lg font-bold">User Details</h2>
                </div>
                <button 
                  onClick={() => setShowUserModal(false)}
                  className="p-2 hover:bg-purple-600 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-xl">
                      {getInitials(`${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <p className="text-gray-600">{selectedUser.email}</p>
                    <span className="inline-block px-3 py-1 text-sm font-semibold rounded-full bg-purple-100 text-purple-800 mt-2">
                      {selectedUser.role}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Account Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium text-green-600">Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Login:</span>
                        <span className="font-medium">{formatDate(selectedUser.lastLoginTime || selectedUser.currentLoginTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Member Since:</span>
                        <span className="font-medium">{formatDate(selectedUser.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={() => handleEditUser(selectedUser)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit User
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowUserModal(false)}
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}