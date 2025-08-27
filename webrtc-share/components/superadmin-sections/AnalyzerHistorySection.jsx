"use client"
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Eye, 
  Trash2, 
  Image as ImageIcon, 
  FileText, 
  Activity,
  Clock,
  Code,
  BarChart3,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  Droplets,
  AlertTriangle,
  Shield,
  Target,
  Calendar
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getAllAnalyserSessions, getAnalyserStats, deleteAnalyserSession } from '@/http/analyzerHttp';
import { useUser } from '@/provider/UserProvider';

export default function AnalyzerHistorySection() {
  const { user, loading: userLoading } = useUser();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalImages: 0,
    completedAnalyses: 0,
    averageConfidence: 0
  });

  useEffect(() => {
    // Only load data when user is authenticated
    if (user && !userLoading) {
      // Try to load data directly - if token is missing, it will show error
      loadAnalyserData();
    }
  }, [user, userLoading]);

  // Prevent background scrolling when popup is open
  useEffect(() => {
    if (showSessionModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showSessionModal]);

  const loadAnalyserData = async () => {
    setLoading(true);
    try {
      // Fetch analyser sessions and stats using HTTP functions
      const [sessionsResponse, statsResponse] = await Promise.all([
        getAllAnalyserSessions(),
        getAnalyserStats()
      ]);

      if (sessionsResponse.success && Array.isArray(sessionsResponse.data)) {
        setSessions(sessionsResponse.data);
      } else {
        console.warn('Sessions response is not an array:', sessionsResponse);
        setSessions([]);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        console.warn('Stats response is invalid:', statsResponse);
        setStats({
          totalSessions: 0,
          totalImages: 0,
          completedAnalyses: 0,
          averageConfidence: 0
        });
      }
    } catch (error) {
      console.error('Error loading analyser data:', error);
      // Set empty data on error so loading stops
      setSessions([]);
      setStats({
        totalSessions: 0,
        totalImages: 0,
        completedAnalyses: 0,
        averageConfidence: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      analyzing: { color: 'bg-blue-100 text-blue-800', icon: Target },
      completed: { color: 'bg-green-100 text-green-800', icon: Shield },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertTriangle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getSeverityColor = (severity) => {
    const severityColors = {
      'no': 'bg-green-100 text-green-800',
      'light': 'bg-yellow-100 text-yellow-800',
      'moderate': 'bg-orange-100 text-orange-800',
      'severe': 'bg-red-100 text-red-800',
      'critical': 'bg-purple-100 text-purple-800'
    };

    for (const [key, color] of Object.entries(severityColors)) {
      if (severity?.toLowerCase().includes(key)) {
        return color;
      }
    }
    return 'bg-gray-100 text-gray-800';
  };

  const filteredSessions = (Array.isArray(sessions) ? sessions : []).filter(session => {
    const matchesSearch = 
      session.demoCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.sessionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date filtering
    let matchesDateRange = true;
    if (fromDate || toDate) {
      const sessionDate = new Date(session.createdAt);
      
      if (fromDate && toDate) {
        const fromDateObj = new Date(fromDate);
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999); // End of day
        matchesDateRange = sessionDate >= fromDateObj && sessionDate <= toDateObj;
      } else if (fromDate) {
        const fromDateObj = new Date(fromDate);
        matchesDateRange = sessionDate >= fromDateObj;
      } else if (toDate) {
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999); // End of day
        matchesDateRange = sessionDate <= toDateObj;
      }
    }
    
    return matchesSearch && matchesDateRange;
  });

  const handleViewSession = (session) => {
    setSelectedSession(session);
    setShowSessionModal(true);
  };

  const handleDeleteSession = async (sessionId) => {
    if (confirm('Are you sure you want to delete this session?')) {
      try {
        const response = await deleteAnalyzerSession(sessionId);
        
        if (response.success) {
          setSessions(prevSessions => {
            if (Array.isArray(prevSessions)) {
              return prevSessions.filter(s => s.sessionId !== sessionId);
            }
            return [];
          });
          // Update stats
          setStats(prev => ({
            ...prev,
            totalSessions: prev.totalSessions - 1
          }));
        }
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
  };



  // Show loading while user authentication is being checked
  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Checking authentication...</span>
      </div>
    );
  }

  // Show message if user is not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view analyser history.</p>
        </div>
      </div>
    );
  }

  // Check if user has superadmin role
  if (user.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Access denied. Only superadmin can view analyser history.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="ml-3 sm:ml-4 flex-1">
                  <div className="h-3 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sessions List Skeleton */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 pt-4 sm:pt-6 px-4 sm:px-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-4 sm:mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="w-full sm:w-48 h-10 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Cards Skeleton */}
          <div className="flex flex-col gap-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex flex-col sm:flex-row bg-blue-50 border-blue-200 border rounded-lg shadow-sm p-3 sm:p-4 sm:px-6 sm:py-4 w-full items-stretch gap-6 sm:gap-0">
                {/* Left Section Skeleton */}
                <div className="flex flex-col justify-center w-full sm:w-1/3 sm:pr-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden sm:block w-px bg-blue-200 mx-4"></div>

                {/* Center Section Skeleton */}
                <div className="flex flex-col justify-center items-center w-full sm:w-2/5">
                  <div className="flex items-center gap-4 sm:gap-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                          <div className="w-8 h-6 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="w-12 h-3 bg-gray-200 rounded animate-pulse mt-1"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden sm:block w-px bg-blue-200 mx-4"></div>

                {/* Right Section Skeleton */}
                <div className="flex flex-col justify-center items-center w-full sm:w-1/4">
                  <div className="flex flex-col items-center w-full">
                    <div className="w-16 h-3 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="flex flex-row gap-1 w-full justify-center">
                      <div className="w-16 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="w-16 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalSessions || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Images</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalImages || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Completed</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.completedAnalyses || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Avg Confidence</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.averageConfidence ? `${Math.round(stats.averageConfidence)}%` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>



      {/* Sessions List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 pt-4 sm:pt-6 px-4 sm:px-6">
        {/* Header with search and filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-4 sm:mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3 sm:gap-4">
            <Droplets className="w-5 h-5" />
            <h3 className="text-lg font-semibold text-gray-900">
              Analyser Sessions ({filteredSessions.length})
            </h3>
          </div>
        
          {/* Search and Date Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 text-xs border-l-2 border-t-2 border-b-2 border-gray-300 rounded-l-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                placeholder="From Date"
              />
              <span className="text-xs text-gray-500">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 text-xs border-r-2 border-t-2 border-b-2 border-gray-300 rounded-r-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                placeholder="To Date"
              />
              {(fromDate || toDate) && (
                <button
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                  }}
                  className="px-2 py-2 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                  title="Clear date filters"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {/* Search */}
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 pl-12 pr-4 py-2.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-200 bg-gray-50 focus:bg-white shadow-sm text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Sessions Cards */}
        <div className="flex flex-col gap-4">
          {filteredSessions.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <Code className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No analyser sessions found</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                {searchTerm || (fromDate || toDate)
                  ? 'Try adjusting your search criteria or date filters to find what you\'re looking for.'
                  : 'No analyser sessions have been created yet.'
                }
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const dateObj = new Date(session.createdAt);
              const formattedDate = !isNaN(dateObj) ? `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}` : session.createdAt;
              
              return (
                <div
                  key={session.sessionId}
                  className="flex flex-col sm:flex-row bg-blue-50 border-blue-200 border rounded-lg shadow-sm p-3 sm:p-4 sm:px-6 sm:py-4 w-full items-stretch gap-6 sm:gap-0 cursor-pointer hover:shadow-md transition-all duration-200"
                >
                  {/* Left: Session Info - Fixed Width */}
                  <div className="flex flex-col justify-center w-full sm:w-1/3 sm:pr-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-blue-600">Session</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-lg text-blue-900 break-words mb-2">
                        {session.demoCode || 'No Demo Code'}
                      </span>
                      {session.notes && (
                        <span className="text-sm text-gray-600 leading-relaxed">
                          {session.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vertical Divider Line */}
                  <div className="hidden sm:block w-px bg-blue-200 mx-4" />

                  {/* Center: Status & Stats - Fixed Width */}
                  <div className="flex flex-col justify-center items-center w-full sm:w-2/5">
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          {getStatusBadge(session.status)}
                        </div>
                        <span className="text-xs text-gray-500 mt-1">Status</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                          <span className="font-semibold text-base sm:text-lg text-blue-700">{session.totalImages || 0}</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-1">Images</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                          <span className="text-xs sm:text-sm text-blue-700">{formattedDate}</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-1">Created</span>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Divider Line */}
                  <div className="hidden sm:block w-px bg-blue-200 mx-4" />

                  {/* Right: Actions - Fixed Width */}
                  <div className="flex flex-col justify-center items-center sm:items-center w-full sm:w-1/4">
                    <div className="flex flex-col items-center w-full">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500 font-medium mb-0.5">Actions</span>
                        <div className="flex flex-row gap-1 w-full justify-center">
                          <button
                            onClick={() => handleViewSession(session)}
                            className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 text-sm transition-all duration-200 hover:bg-blue-50 px-2 py-1.5 rounded-lg"
                            title="View session details"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.sessionId)}
                            className="flex items-center justify-center gap-1 text-red-600 hover:text-red-800 text-sm transition-all duration-200 hover:bg-red-50 px-2 py-1.5 rounded-lg"
                            title="Delete session"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Table Footer */}
        {filteredSessions.length > 0 && (
          <div className="border-t border-gray-200 px-4 sm:px-6 py-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
              <div className="text-sm text-gray-600">
                Showing {filteredSessions.length} of {sessions.length} sessions
                {searchTerm && ` matching "${searchTerm}"`}
                {(fromDate || toDate) && ` within date range`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session Detail Modal */}
      {showSessionModal && selectedSession && (
        <>
          <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-full bg-black/40 backdrop-blur-sm z-[9999] pointer-events-none"></div>
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2">
            <div className="min-w-[0] max-w-[85vw] w-full sm:w-[800px] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col mx-0">
              {/* Purple header strip above modal */}
              <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-sm sm:text-lg font-bold text-center flex items-center gap-2">
                    <Code className="w-4 h-4 sm:w-5 sm:h-5" />
                    Session Details: {selectedSession?.demoCode || 'No Demo Code'}
                  </span>
                </div>
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="absolute right-2 sm:right-4 bg-purple-500 hover:bg-purple-700 text-white transition p-1.5 sm:p-2 rounded-full shadow"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              <div className="w-full bg-white rounded-b-2xl shadow-2xl border border-gray-200 p-3 sm:p-6 flex flex-col pointer-events-auto max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
                <div className="space-y-4 sm:space-y-6">
                  {/* Session Overview */}
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                      Session Overview
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <label className="text-xs font-semibold text-gray-600 ml-1 block mb-2">
                          Demo Code
                        </label>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-sm bg-white">
                            {selectedSession.demoCode || 'N/A'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <label className="text-xs font-semibold text-gray-600 ml-1 block mb-2">
                          Status
                        </label>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(selectedSession.status)}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <label className="text-xs font-semibold text-gray-600 ml-1 block mb-2">
                          Created
                        </label>
                        <div className="text-sm text-gray-800">
                          {new Date(selectedSession.createdAt).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <label className="text-xs font-semibold text-gray-600 ml-1 block mb-2">
                          Total Images
                        </label>
                        <div className="text-sm text-gray-800 font-medium">
                          {selectedSession.totalImages || 0}
                        </div>
                      </div>
                    </div>
                    

                  </div>

                  {/* Session Images */}
                  {selectedSession.images && selectedSession.images.length > 0 && (
                    <div className="space-y-3 sm:space-y-4">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                        Session Images ({selectedSession.images.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {selectedSession.images.map((image, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="aspect-square bg-white rounded-lg border border-gray-200 overflow-hidden mb-2">
                              <img
                                src={image.s3Url || image.url || '/placeholder-image.png'}
                                alt={`Image ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = '/placeholder-image.png';
                                }}
                              />
                            </div>
                            <div className="text-center">
                              <span className="text-xs font-medium text-gray-700">
                                Image {index + 1}
                              </span>
                              {image.originalName && (
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                  {image.originalName}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Analysis Results */}
                  {selectedSession.analysisResults && selectedSession.analysisResults.length > 0 && (
                    <div className="space-y-3 sm:space-y-4">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                        Analysis Results
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        {selectedSession.analysisResults.map((result, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700 bg-white px-2 py-1 rounded-full border">
                                Image {index + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                {result.confidence && (
                                  <Badge variant="outline" className="bg-white">
                                    {result.confidence}% confidence
                                  </Badge>
                                )}
                                {result.severity && (
                                  <Badge className={getSeverityColor(result.severity)}>
                                    {result.severity}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {result.affected && result.affected.length > 0 && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <label className="text-xs font-semibold text-gray-600 ml-1 block mb-2">
                                  Affected Areas
                                </label>
                                <div className="flex flex-wrap gap-1">
                                  {result.affected.map((area, areaIndex) => (
                                    <Badge key={areaIndex} variant="outline" className="text-xs bg-blue-50">
                                      {area}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {result.summary && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <label className="text-xs font-semibold text-gray-600 ml-1 block mb-2">
                                  Summary
                                </label>
                                <p className="text-sm text-gray-800 leading-relaxed">
                                  {result.summary}
                                </p>
                              </div>
                            )}
                            
                            {result.analysedAt && (
                              <div className="text-xs text-gray-500 text-right">
                                Analyzed: {new Date(result.analysedAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Dialog Footer */}
                <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSessionModal(false)}
                    className="w-full px-4 py-3 sm:py-2 border border-gray-300 text-gray-700 font-semibold rounded-full transition-all hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
