import { Users, Building2, VideoIcon, FileText, Activity, Database, Monitor, BarChart3, Save, AlertTriangle, Cpu, HardDrive, MemoryStick, Network } from "lucide-react";
import { useState, useEffect } from "react";

export default function OverviewSection({ systemStats }) {
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 45,
    ram: 62,
    storage: 78,
    network: 23
  });

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

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {[
          { title: 'Total Users', value: systemStats.totalUsers, icon: Users, color: 'bg-purple-500' },
          { title: 'Total Companies', value: systemStats.totalCompanies, icon: Building2, color: 'bg-amber-500' },
          { title: 'Total Meetings', value: systemStats.totalMeetings, icon: VideoIcon, color: 'bg-blue-500' },
          { title: 'Total Uploads', value: systemStats.totalUploads, icon: FileText, color: 'bg-green-500' },
          { title: 'System Health', value: systemStats.systemHealth === 'healthy' ? 'Healthy' : 'Issues', icon: Activity, color: systemStats.systemHealth === 'healthy' ? 'bg-green-500' : 'bg-amber-500' }
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


      </div>
    </div>
  );
}
