import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Server, Database, Globe, BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MonitoringSection({ systemStats }) {
  const performanceMetrics = [
    { name: 'Response Time', value: systemStats.responseTime, trend: 'down', status: 'good' },
    { name: 'Error Rate', value: systemStats.errorRate, trend: 'down', status: 'good' },
    { name: 'CPU Usage', value: systemStats.cpuUsage, trend: 'up', status: 'warning' },
    { name: 'Memory Usage', value: systemStats.memoryUsage, trend: 'up', status: 'warning' },
    { name: 'Disk Usage', value: systemStats.diskUsage, trend: 'stable', status: 'good' },
    { name: 'Server Uptime', value: systemStats.serverUptime, trend: 'stable', status: 'good' }
  ];

  const recentAlerts = [
    { type: 'warning', message: 'High CPU usage detected', time: '5 minutes ago', severity: 'medium' },
    { type: 'info', message: 'Database backup completed successfully', time: '1 hour ago', severity: 'low' },
    { type: 'error', message: 'Connection timeout to external service', time: '2 hours ago', severity: 'high' },
    { type: 'success', message: 'System health check passed', time: '3 hours ago', severity: 'low' }
  ];

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Performance Metrics */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Real-time Performance Metrics
          </h3>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {performanceMetrics.map((metric, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">{metric.name}</span>
                {getTrendIcon(metric.trend)}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                  {metric.value}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  metric.status === 'good' ? 'bg-green-100 text-green-800' :
                  metric.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {metric.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Alerts */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          System Alerts
        </h3>
        <div className="space-y-3">
          {recentAlerts.map((alert, index) => (
            <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${
              alert.type === 'error' ? 'border-l-red-500 bg-red-50' :
              alert.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
              alert.type === 'success' ? 'border-l-green-500 bg-green-50' :
              'border-l-blue-500 bg-blue-50'
            }`}>
              {getAlertIcon(alert.type)}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                <p className="text-xs text-gray-500">{alert.time}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {alert.severity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* System Health Dashboard */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-purple-600" />
          System Health Dashboard
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overall System Status */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-4 h-4 rounded-full ${
                systemStats.systemHealth === 'healthy' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-lg font-semibold text-gray-900">Overall Status</span>
            </div>
            <p className={`text-2xl font-bold ${
              systemStats.systemHealth === 'healthy' ? 'text-green-600' : 'text-red-600'
            }`}>
              {systemStats.systemHealth === 'healthy' ? 'Healthy' : 'Issues Detected'}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Database className="w-4 h-4 mr-2" />
                Run Health Check
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <RefreshCw className="w-4 h-4 mr-2" />
                Restart Services
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Globe className="w-4 h-4 mr-2" />
                Check Network Status
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Charts Placeholder */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                     <BarChart3 className="w-5 h-5 text-purple-600" />
          Performance Trends
        </h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <BarChart3 className="w-16 h-16 mx-auto mb-2 text-gray-300" />
            <p>Performance charts will be displayed here</p>
            <p className="text-sm">CPU, Memory, and Network usage over time</p>
          </div>
        </div>
      </div>
    </div>
  );
}
