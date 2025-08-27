import { Users, Building2, VideoIcon, FileText, Activity, Database, Monitor, BarChart3, Save, AlertTriangle, Cpu, HardDrive, MemoryStick, Network } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../../http/index.js";
import { useUser } from "../../provider/UserProvider.js";

export default function OverviewSection() {
  const { user, isAuth, loading: userLoading } = useUser();
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 45,
    ram: 62,
    storage: 78,
    network: 23
  });

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    totalMeetings: 0,
    totalUploads: 0,
    totalTickets: 0,
    systemHealth: 'healthy'
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard stats from database
  useEffect(() => {
    const fetchStats = async () => {
      // Don't fetch if user is not authenticated or still loading
      if (userLoading || !isAuth || !user) {
        return;
      }

      // Check if user has superadmin role
      if (user.role !== 'superadmin') {
        setError('Access denied. Only superadmins can view dashboard stats.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 [OverviewSection] Fetching dashboard stats...');
        console.log('🔍 [OverviewSection] User:', user.email, 'Role:', user.role);
        
        const response = await api.get('/dashboard/stats');
        
        console.log('✅ [OverviewSection] Stats response:', response.data);
        
        if (response.data.success) {
          setStats(response.data.data);
        } else {
          throw new Error(response.data.message || 'Failed to fetch stats');
        }
      } catch (err) {
        console.error('❌ [OverviewSection] Error fetching dashboard stats:', err);
        console.error('❌ [OverviewSection] Error details:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });
        
        // Handle different types of errors
        if (err.response?.status === 403) {
          setError('Access denied. Only superadmins can view dashboard stats.');
        } else if (err.response?.status === 401) {
          // Don't show error for 401 - user just needs to log in
          console.log('ℹ️ [OverviewSection] User not authenticated - this is normal');
          setError(null);
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else if (err.message) {
          setError(err.message);
        } else {
          setError('Failed to fetch dashboard stats. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAuth, user, userLoading]);

  // Simulate real-time system metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        cpu: Math.max(10, Math.min(95, prev.cpu + (Math.random() - 0.5) * 20)),
        ram: Math.max(20, Math.min(90, prev.ram + (Math.random() - 0.5) * 15)),
        storage: Math.max(60, Math.min(95, prev.storage + (Math.random() - 0.5) * 5)),
        network: Math.max(5, Math.min(80, prev.network + (Math.random() - 0.5) * 25))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getMetricColor = (value) => {
    if (value < 50) return '#10B981'; // green
    if (value < 75) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  // Show loading while user is being loaded
  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error if user is not authenticated
  if (!isAuth || !user) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 font-medium">Authentication Required</span>
          </div>
          <p className="text-red-600 mt-2">Please log in to view dashboard statistics.</p>
        </div>
      </div>
    );
  }

  // Show error if user is not superadmin
  if (user.role !== 'superadmin') {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 font-medium">Access Denied</span>
          </div>
          <p className="text-red-600 mt-2">Only superadmins can view dashboard statistics.</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching stats
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error if API call failed
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 font-medium">Error loading dashboard stats</span>
          </div>
          <p className="text-red-600 mt-2">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {[
          { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-purple-500' },
          { title: 'Total Companies', value: stats.totalCompanies, icon: Building2, color: 'bg-amber-500' },
          { title: 'Total Meetings', value: stats.totalMeetings, icon: VideoIcon, color: 'bg-blue-500' },
          { title: 'Total Uploads', value: stats.totalUploads, icon: FileText, color: 'bg-green-500' },
          { title: 'Total Tickets', value: stats.totalTickets, icon: Activity, color: 'bg-red-500' }
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-full`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3-Column Layout: System Performance (1/3) + Right Content (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Performance Card - Left Side (1/3 width) */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">System Performance</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { 
                title: 'CPU Usage', 
                value: Math.round(systemMetrics.cpu), 
                icon: Cpu, 
                metric: systemMetrics.cpu,
                color: getMetricColor(systemMetrics.cpu)
              },
              { 
                title: 'RAM Usage', 
                value: Math.round(systemMetrics.ram), 
                icon: MemoryStick, 
                metric: systemMetrics.ram,
                color: getMetricColor(systemMetrics.ram)
              },
              { 
                title: 'Storage Usage', 
                value: Math.round(systemMetrics.storage), 
                icon: HardDrive, 
                metric: systemMetrics.storage,
                color: getMetricColor(systemMetrics.storage)
              },
              { 
                title: 'Network', 
                value: Math.round(systemMetrics.network), 
                icon: Network, 
                metric: systemMetrics.network,
                color: getMetricColor(systemMetrics.network)
              }
            ].map((metric, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="relative w-24 h-24 mb-3">
                  {/* Circular Progress Background */}
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke={metric.color}
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - metric.metric / 100)}`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  
                  {/* Center Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <metric.icon className="w-6 h-6 text-gray-600 mb-1" />
                    <span className="text-lg font-bold" style={{ color: metric.color }}>
                      {metric.value}%
                    </span>
                  </div>
                </div>
                
                <p className="text-sm font-medium text-gray-700">{metric.title}</p>
              </div>
            ))}
          </div>

          {/* System Status */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">All systems operational</span>
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* System Health Overview */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${stats.systemHealth === 'healthy' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                <span className="text-sm text-gray-700">Overall Status: {stats.systemHealth === 'healthy' ? 'Healthy' : 'Issues Detected'}</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Database: Connected</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">API: Operational</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">WebSocket: Active</span>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
