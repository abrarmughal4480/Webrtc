"use client"
import { Button } from "@/components/ui/button"
import { FileText, Archive, Trash2, Monitor, Smartphone, Save, History, ArchiveRestore, ExternalLink, FileSearch, MailIcon, Loader2, Maximize2, Home, RotateCcw, XCircle, Undo2, Info, Search, X, User, Wrench, Clock, ChevronDown, Plus, Check, Image as ImageIcon, Video as VideoIcon, LogOut, Bell, Users, Building2, Settings, BarChart3, Shield, Activity, Database, Globe, Key, Eye, Edit, Trash, UserPlus, Building, Crown, AlertTriangle, CheckCircle, XCircle as XCircleIcon } from "lucide-react"
import OverviewSection from "@/components/superadmin-sections/OverviewSection"
import UserManagementSection from "@/components/superadmin-sections/UserManagementSection"
import CompanyManagementSection from "@/components/superadmin-sections/CompanyManagementSection"
import SystemSettingsSection from "@/components/superadmin-sections/SystemSettingsSection"
import MonitoringSection from "@/components/superadmin-sections/MonitoringSection"
import SupportTicketManagementSection from "@/components/superadmin-sections/SupportTicketManagementSection"
import AnalyzerHistorySection from "@/components/superadmin-sections/AnalyzerHistorySection"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logoutRequest } from "@/http/authHttp"
import { companyHttp } from "@/http/companyHttp"
import { useUser } from "@/provider/UserProvider"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useDialog } from "@/provider/DilogsProvider"

export default function SuperAdminPage() {
  const { user, isAuth, setIsAuth, setUser } = useUser();
  const router = useRouter();
  const { setResetOpen, setMessageOpen, setLandlordDialogOpen, setTickerOpen, setFeedbackOpen, setFaqOpen, setExportOpen, setHistoryOpen, setInviteOpen } = useDialog();
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [companies, setCompanies] = useState([]);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    totalMeetings: 0,
    totalUploads: 0,
    activeUsers: 0,
    systemHealth: 'healthy',
    serverUptime: '99.9%',
    responseTime: '45ms',
    errorRate: '0.1%',
    cpuUsage: '23%',
    memoryUsage: '67%',
    diskUsage: '45%'
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Load saved active tab from localStorage on component mount
  useEffect(() => {
    const savedTab = localStorage.getItem('superadmin-active-tab');
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem('superadmin-active-tab', tabId);
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load companies from API using configured HTTP client
      try {
        const companiesData = await companyHttp.getAllCompanies();
        if (companiesData.success) {
          setCompanies(companiesData.data);
        }
      } catch (error) {
        console.error('Error loading companies:', error);
        // Set empty array if companies fail to load
        setCompanies([]);
      }

      // Mock data for other sections - replace with actual API calls
      // setUsers([
      //   {
      //     _id: '1',
      //     email: 'admin@videodesk.co.uk',
      //     role: 'admin',
      //     createdAt: '2024-01-15',
      //     lastLogin: '2024-01-20',
      //     status: 'active',
      //     company: 'Videodesk Ltd'
      //   },
      //   {
      //     _id: '2',
      //     email: 'landlord1@example.com',
      //     role: 'landlord',
      //     createdAt: '2024-01-10',
      //     lastLogin: '2024-01-19',
      //     status: 'active',
      //     company: 'Property Management Co'
      //   },
      //   {
      //     _id: '3',
      //     email: 'resident1@example.com',
      //     role: 'resident',
      //     createdAt: '2024-01-12',
      //     lastLogin: '2024-01-18',
      //     status: 'active',
      //     company: 'Property Management Co'
      //   }
      // ]);

      setSystemStats({
        totalUsers: 195,
        totalCompanies: companies.length,
        totalMeetings: 1250,
        totalUploads: 890,
        activeUsers: 180,
        systemHealth: 'healthy',
        serverUptime: '99.9%',
        responseTime: '45ms',
        errorRate: '0.1%',
        cpuUsage: '23%',
        memoryUsage: '67%',
        diskUsage: '45%'
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
      setLoading(false);
    }
  };

  // Mock data for demonstration - replace with actual API calls
  useEffect(() => {
    if (isAuth && user) {
      loadDashboardData();
    }
  }, [isAuth, user]);

  // Show loading while checking authentication
  if (loading || !isAuth || !user) {
    // If not loading and not authenticated, redirect to home page
    if (!loading && !isAuth) {
      router.push('/');
      return null;
    }
    
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  // Check role after authentication is confirmed
  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logoutRequest();
      setIsAuth(false);
      setUser(null);
      router.push('/');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const handleUserAction = (action, userId) => {
    // Implement user actions (suspend, delete, edit, etc.)
    toast.success(`User ${action} action initiated`);
  };

  const handleCompanyAction = (action, companyId) => {
    // Implement company actions (suspend, delete, edit, etc.)
    toast.success(`Company ${action} action initiated`);
  };



  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'superadmin': return 'bg-purple-600 text-white font-bold';
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'landlord': return 'bg-blue-100 text-blue-800';
      case 'resident': return 'bg-green-100 text-green-800';
      case 'company-admin': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="min-h-screen bg-white p-2">
        <div className="w-full space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-8 xl:px-12 2xl:px-16">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 relative gap-4 sm:gap-0">
            {/* Top row - Home Icon and Profile on same line for mobile */}
            <div className="flex items-center justify-between sm:hidden px-1 ">
              {/* Left side - Home Icon */}
              <div className="flex items-center">
                <Button
                  onClick={() => router.push('../')}
                  className="bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 rounded-full p-2 flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 hover:border-gray-300 w-10 h-10"
                  title="Go to Home"
                >
                  <Home style={{ width: '16px', height: '16px', strokeWidth: '2' }} />
                </Button>
              </div>

              {/* Right side - Profile Section for mobile */}
              <div className="flex items-center">
                <div className="flex items-center gap-1 p-1 pr-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900 truncate max-w-[100px]">{user?.email || 'Super Admin'}</span>
                    <span className="text-xs text-gray-600 capitalize font-medium">{user?.role || 'superadmin'}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-1.5 h-auto hover:bg-gray-100 rounded-lg">
                        <ChevronDown className="w-3 h-3 text-gray-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg min-w-[200px] rounded-xl" side="bottom" align="end">
                      <div className="p-2 border-b border-gray-100">
                        <div className="text-sm font-semibold text-gray-900">Profile Menu</div>
                        <div className="text-xs text-gray-500">Manage your account</div>
                      </div>
                      <DropdownMenuItem className="p-2 hover:bg-gray-50">
                        <button className="bg-none border-none cursor-pointer w-full text-left flex items-center gap-2" onClick={() => setResetOpen(true)}>
                          <Wrench className="w-4 h-4 text-blue-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Settings</div>
                            <div className="text-xs text-gray-500">Account preferences</div>
                          </div>
                        </button>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="p-2 hover:bg-gray-50">
                        <button className="bg-none border-none cursor-pointer w-full text-left flex items-center gap-2" onClick={() => setTickerOpen(true)}>
                          <Bell className="w-4 h-4 text-green-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Notifications</div>
                            <div className="text-xs text-gray-500">Manage alerts</div>
                          </div>
                        </button>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="p-2 hover:bg-gray-50">
                        <button className="bg-none border-none cursor-pointer w-full text-left flex items-center gap-2" onClick={handleLogout}>
                          <LogOut className="w-4 h-4 text-red-600" />
                          <div>
                            <div className="text-xs text-gray-500">Sign out safely</div>
                          </div>
                        </button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Desktop layout - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-4">
              <Button
                onClick={() => router.push('../')}
                className="bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 rounded-full p-3 flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 hover:border-gray-300 w-11 h-11"
                title="Go to Home"
              >
                <Home style={{ width: '18px', height: '18px', strokeWidth: '2' }} />
              </Button>
            </div>

            {/* Desktop Profile Section - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-4 ml-4">
              {/* Enhanced Profile Section */}
              <div className="flex items-center gap-3 p-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900">{user?.email || 'Super Admin'}</span>
                  <span className="text-xs text-gray-600 capitalize font-medium">{user?.role || 'superadmin'}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2 h-auto hover:bg-gray-100 rounded-lg">
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg min-w-[220px] rounded-xl">
                    <div className="p-3 border-b border-gray-100">
                      <div className="text-sm font-semibold text-gray-900">Profile Menu</div>
                      <div className="text-xs text-gray-500">Manage your account</div>
                    </div>
                    <DropdownMenuItem className="p-3 hover:bg-gray-50">
                      <button className="bg-none border-none cursor-pointer w-full text-left flex items-center gap-3" onClick={() => setResetOpen(true)}>
                        <Wrench className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Settings</div>
                          <div className="text-xs text-gray-500">Account preferences</div>
                        </div>
                      </button>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="p-3 hover:bg-gray-50">
                      <button className="bg-none border-none cursor-pointer w-full text-left flex items-center gap-3" onClick={() => setTickerOpen(true)}>
                        <Bell className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Notifications</div>
                          <div className="text-xs text-gray-500">Manage alerts</div>
                        </div>
                      </button>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="p-3 hover:bg-gray-50">
                      <button className="bg-none border-none cursor-pointer w-full text-left flex items-center gap-3" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 text-red-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Logout</div>
                          <div className="text-xs text-gray-500">Sign out safely</div>
                        </div>
                      </button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu> 
              </div>
            </div>

            {/* Center - Navigation Tabs */}
            {/* Tab buttons container: responsive layout for mobile */}
            <div className="flex flex-wrap gap-1 sm:gap-2 justify-center order-2 sm:order-none sm:absolute sm:left-1/2 sm:top-1/2 sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'companies', label: 'Company Management', icon: Building2 },
                { id: 'users', label: 'User Management', icon: Users },
                { id: 'tickets', label: 'Support Center', icon: FileText },
                { id: 'analyzer', label: 'Analyser History', icon: Activity },
                // { id: 'system', label: 'System Settings', icon: Settings },
                // { id: 'monitoring', label: 'Monitoring', icon: Activity }
              ].map((tab) => (
                <Button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-5 py-1.5 sm:py-2 rounded-full transition-colors duration-200 text-xs sm:text-sm font-medium border ${
                    activeTab === tab.id
                      ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </Button>
              ))}
            </div>
          </div>



          {/* Tab Content */}
          <div className="space-y-4 sm:space-y-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <OverviewSection systemStats={systemStats} />
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <UserManagementSection
                handleUserAction={handleUserAction}
                getRoleBadgeColor={getRoleBadgeColor}
                getStatusBadgeColor={getStatusBadgeColor}
              />
            )}

            {/* Companies Tab */}
            {activeTab === 'companies' && (
              <CompanyManagementSection
                companies={companies}
                setCompanies={setCompanies}
                handleCompanyAction={handleCompanyAction}
                getStatusBadgeColor={getStatusBadgeColor}
              />
            )}

            {/* System Settings Tab */}
            {/* {activeTab === 'system' && (
              <SystemSettingsSection />
            )} */}

            {/* Support Tickets Tab */}
            {activeTab === 'tickets' && (
              <SupportTicketManagementSection />
            )}

            {/* Analyzer History Tab */}
            {activeTab === 'analyzer' && (
              <AnalyzerHistorySection />
            )}

            {/* Monitoring Tab */}
            {/* {activeTab === 'monitoring' && (
              <MonitoringSection systemStats={systemStats} />
            )} */}
          </div>
        </div>
      </div>
    </>
  );
}