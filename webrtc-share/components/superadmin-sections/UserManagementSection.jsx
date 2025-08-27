import { UserPlus, User, Edit, Trash2 as Trash, Eye, Users, Building, Home, Search, ChevronDown, Undo2, X, Save, Mail, Shield, Archive, FileText, Filter, SortAsc, SortDesc, Clock, Activity, Calendar, Crown, Zap, CheckCircle, Pause, Snowflake, Ban, Globe, TrendingUp, CalendarDays, Clock3, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment/moment";
import { useState, useEffect } from "react";
import { getAllUsers, deleteUser, restoreUser, permanentDeleteUser, freezeUser, suspendUser, activateUser, updateUserDetails } from "@/http/userHttp";
import UserEditDialog from "./UserEditDialog";
import { useUser } from "@/provider/UserProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { io } from "socket.io-client";

export default function UserManagementSection() {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingUsers, setDeletingUsers] = useState(new Set());
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'trash'
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [multipleDeleteMode, setMultipleDeleteMode] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedUserForDialog, setSelectedUserForDialog] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // New filter and sort states
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [sortOrder, setSortOrder] = useState('desc');

  // Date filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Online users tracking
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [onlineUsersLoading, setOnlineUsersLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  // Get unique companies for filter dropdown
  const uniqueCompanies = [...new Set(users.map(user => user.company).filter(Boolean))].sort();

  // Enhanced filtering logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.company && user.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesCompany = companyFilter === 'all' || user.company === companyFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    // Activity filtering
    let matchesActivity = true;
    if (activityFilter !== 'all') {
      const now = new Date();
      const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
      
      switch (activityFilter) {
        case 'online':
          // Users logged in within last 15 minutes
          matchesActivity = lastLogin && (now - lastLogin) < 15 * 60 * 1000;
          break;
        case 'today':
          // Users logged in today
          matchesActivity = lastLogin && lastLogin.toDateString() === now.toDateString();
          break;
        case 'week':
          // Users logged in within last 7 days
          matchesActivity = lastLogin && (now - lastLogin) < 7 * 24 * 60 * 60 * 1000;
          break;
        case 'month':
          // Users logged in within last 30 days
          matchesActivity = lastLogin && (now - lastLogin) < 30 * 24 * 60 * 60 * 1000;
          break;
        case 'never':
          // Users who never logged in
          matchesActivity = !lastLogin;
          break;
        case 'inactive':
          // Users not logged in for more than 30 days
          matchesActivity = lastLogin && (now - lastLogin) > 30 * 24 * 60 * 60 * 1000;
          break;
      }
    }
    
    // Date range filtering
    let matchesDateRange = true;
    if (fromDate || toDate) {
      const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
      
      if (fromDate && toDate) {
        // Both dates selected - check if lastLogin falls within range
        const fromDateObj = new Date(fromDate);
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999); // End of day
        
        if (lastLogin) {
          matchesDateRange = lastLogin >= fromDateObj && lastLogin <= toDateObj;
        } else {
          // If user never logged in, check if account creation falls within range
          const createdAt = new Date(user.createdAt);
          matchesDateRange = createdAt >= fromDateObj && createdAt <= toDateObj;
        }
      } else if (fromDate) {
        // Only from date selected
        const fromDateObj = new Date(fromDate);
        if (lastLogin) {
          matchesDateRange = lastLogin >= fromDateObj;
        } else {
          const createdAt = new Date(user.createdAt);
          matchesDateRange = createdAt >= fromDateObj;
        }
      } else if (toDate) {
        // Only to date selected
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999); // End of day
        if (lastLogin) {
          matchesDateRange = lastLogin <= toDateObj;
        } else {
          const createdAt = new Date(user.createdAt);
          matchesDateRange = createdAt <= toDateObj;
        }
      }
    }
    
    return matchesSearch && matchesRole && matchesCompany && matchesStatus && matchesActivity && matchesDateRange;
  });

  // Enhanced sorting logic
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'alphabetical':
        comparison = a.email.localeCompare(b.email);
        break;
      case 'newest':
        comparison = new Date(b.createdAt) - new Date(a.createdAt);
        break;
      case 'oldest':
        comparison = new Date(a.createdAt) - new Date(b.createdAt);
        break;
      case 'lastLogin':
        const aLogin = a.lastLogin ? new Date(a.lastLogin) : new Date(0);
        const bLogin = b.lastLogin ? new Date(b.lastLogin) : new Date(0);
        comparison = bLogin - aLogin;
        break;
      case 'mostActive':
        // Sort by last login (most recent first), then by creation date
        const aLoginSort = a.lastLogin ? new Date(a.lastLogin) : new Date(0);
        const bLoginSort = b.lastLogin ? new Date(b.lastLogin) : new Date(0);
        comparison = bLoginSort - aLoginSort;
        if (comparison === 0) {
          comparison = new Date(b.createdAt) - new Date(a.createdAt);
        }
        break;
      case 'role':
        // Sort by role priority: superadmin > admin > company-admin > landlord > resident
        const rolePriority = { 'superadmin': 5, 'admin': 4, 'company-admin': 3, 'landlord': 2, 'resident': 1 };
        comparison = (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0);
        if (comparison === 0) {
          comparison = a.email.localeCompare(b.email);
        }
        break;
      case 'company':
        comparison = (a.company || '').localeCompare(b.company || '');
        if (comparison === 0) {
          comparison = a.email.localeCompare(b.email);
        }
        break;
      case 'status':
        // Sort by status priority: active > inactive > frozen > suspended
        const statusPriority = { 'active': 4, 'inactive': 3, 'frozen': 2, 'suspended': 1 };
        comparison = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
        if (comparison === 0) {
          comparison = a.email.localeCompare(b.email);
        }
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'desc' ? comparison : -comparison;
  });

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedUsers([]);
    setSelectAll(false);
    
    // Refresh online users when filters change
    if (currentUser?.role === 'superadmin' && socket) {
      refreshOnlineUsersOnFilterToggle();
    }
  }, [searchTerm, roleFilter, companyFilter, statusFilter, activityFilter, sortBy, sortOrder]);

  // Separate effect for date filters to avoid dependency array size changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedUsers([]);
    setSelectAll(false);
  }, [fromDate, toDate]);

  // Update select all when individual selections change
  useEffect(() => {
    if (currentUsers.length > 0) {
      const allSelected = currentUsers.every(user => selectedUsers.includes(user._id));
      setSelectAll(allSelected);
    }
  }, [selectedUsers, currentUsers]);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, [viewMode]);

  // Fetch online users for superadmin
  useEffect(() => {
    if (currentUser?.role === 'superadmin') {
      // Clear previous online users
      setOnlineUsers(new Set());
      setOnlineUsersLoading(true);
      
      // Initialize socket
      initializeSocket();
      
      // Cleanup socket on unmount
      return () => {
        if (socket) {
          socket.disconnect();
          setSocket(null);
        }
        setOnlineUsers(new Set());
        setOnlineUsersLoading(false);
      };
    }
  }, [currentUser]);

  // Periodic refresh of online users to ensure accuracy
  useEffect(() => {
    if (currentUser?.role === 'superadmin' && socket && showFilters) {
      // Refresh every 10 seconds when filters are active
      const interval = setInterval(() => {
        refreshOnlineUsers();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [currentUser, socket, showFilters]);

  // Handle current user logout
  useEffect(() => {
    if (!currentUser && socket) {
      // Current user logged out, disconnect socket and clear online users
      socket.disconnect();
      setSocket(null);
      setOnlineUsers(new Set());
      setOnlineUsersLoading(false);
    }
  }, [currentUser]);


  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllUsers(viewMode === 'trash');
      if (response.success) {
        setUsers(response.users);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to move this user to trash?')) {
      try {
        setDeletingUsers(prev => new Set(prev).add(userId));
        const response = await deleteUser(userId);
        if (response.success) {
          // Remove user from local state
          setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
          // Remove from selected users if present
          setSelectedUsers(prev => prev.filter(id => id !== userId));
          toast.success('User moved to trash successfully');
        } else {
          toast.error('Failed to move user to trash');
        }
      } catch (err) {
        console.error('Error moving user to trash:', err);
        toast.error('Error moving user to trash');
      } finally {
        setDeletingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    }
  };

  const handleRestoreUser = async (userId) => {
    if (window.confirm('Are you sure you want to restore this user?')) {
      try {
        setDeletingUsers(prev => new Set(prev).add(userId));
        const response = await restoreUser(userId);
        if (response.success) {
          // Remove user from local state
          setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
          // Remove from selected users if present
          setSelectedUsers(prev => prev.filter(id => id !== userId));
          toast.success('User restored successfully');
        } else {
          toast.error('Failed to restore user');
        }
      } catch (err) {
        console.error('Error restoring user:', err);
        toast.error('Error restoring user');
      } finally {
        setDeletingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    }
  };

  // Handle select all checkbox
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedUsers(currentUsers.map(user => user._id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Handle individual checkbox
  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
      setSelectAll(false);
    }
  };

  // Handle multiple delete
  const handleMultipleDelete = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users to delete');
      return;
    }

    if (window.confirm(`Are you sure you want to move ${selectedUsers.length} selected user(s) to trash?`)) {
      let successCount = 0;
      let failureCount = 0;

      for (const userId of selectedUsers) {
        try {
          const response = await deleteUser(userId);
          if (response.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (err) {
          failureCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully moved ${successCount} user(s) to trash`);
        // Refresh users list
        fetchUsers();
        setSelectedUsers([]);
        setSelectAll(false);
      }
      if (failureCount > 0) {
        toast.error(`${failureCount} move(s) to trash failed`);
      }
    }
  };

  const handleMultipleRestore = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users to restore');
      return;
    }

    if (window.confirm(`Are you sure you want to restore ${selectedUsers.length} selected user(s)?`)) {
      let successCount = 0;
      let failureCount = 0;

      for (const userId of selectedUsers) {
        try {
          const response = await restoreUser(userId);
          if (response.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (err) {
          failureCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully restored ${successCount} user(s)`);
        // Refresh users list
        fetchUsers();
        setSelectedUsers([]);
        setSelectAll(false);
      }
      if (failureCount > 0) {
        toast.error(`${failureCount} restore(s) failed`);
      }
    }
  };

  const handleMultiplePermanentDelete = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users to delete');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete ${selectedUsers.length} selected user(s)?`)) {
      let successCount = 0;
      let failureCount = 0;
      let errorMessages = [];

      for (const userId of selectedUsers) {
        try {
          const response = await permanentDeleteUser(userId);
          if (response.success) {
            successCount++;
          } else {
            failureCount++;
            errorMessages.push(response.message || 'Unknown error');
          }
        } catch (err) {
          failureCount++;
          const errorMsg = err?.response?.data?.message || 'Unknown error';
          errorMessages.push(errorMsg);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully permanently deleted ${successCount} user(s)`);
        // Refresh users list
        fetchUsers();
        setSelectedUsers([]);
        setSelectAll(false);
      }
      if (failureCount > 0) {
        const uniqueErrors = [...new Set(errorMessages)];
        toast.error(`${failureCount} permanent delete(s) failed`);
      }
    }
  };

  // Helper functions for badge colors
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'landlord':
        return 'bg-blue-100 text-blue-800';
      case 'resident':
        return 'bg-green-100 text-green-800';
      case 'company-admin':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'superadmin':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'frozen':
        return 'bg-orange-100 text-orange-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Online users functions
  const isUserOnline = (userId) => {
    // Never show current user as online
    if (userId === currentUser?._id) {
      return false;
    }
    return onlineUsers.has(userId);
  };

  const initializeSocket = () => {
    if (currentUser?.role !== 'superadmin') return;
    
    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected for online users tracking');
      
      // Authenticate user with socket
      newSocket.emit('user-authenticated', {
        userId: currentUser._id,
        email: currentUser.email,
        role: currentUser.role,
        company: currentUser.company
      });

      // Request current online users
      newSocket.emit('get-online-users', { role: currentUser.role });
    });

    // Listen for online users updates
    newSocket.on('online-users-update', (data) => {
      console.log('Received online users update:', data);
      if (data.users && Array.isArray(data.users)) {
        // Filter out the current user and remove duplicates
        const filteredUsers = data.users.filter(user => 
          user.userId !== currentUser._id && 
          user.userId && 
          user.email
        );
        
        // Remove duplicates based on userId
        const uniqueUsers = filteredUsers.filter((user, index, self) => 
          index === self.findIndex(u => u.userId === user.userId)
        );
        
        const onlineUserIds = new Set(uniqueUsers.map(user => user.userId));
        setOnlineUsers(onlineUserIds);
        setOnlineUsersLoading(false);
        
        console.log('Filtered online users:', {
          total: data.totalOnline,
          filtered: filteredUsers.length,
          unique: uniqueUsers.length,
          currentUser: currentUser._id,
          onlineUsers: Array.from(onlineUserIds)
        });
      }
    });

    // Listen for user coming online
    newSocket.on('user-came-online', (userData) => {
      console.log('User came online:', userData);
      // Don't add current user to online list
      if (userData.userId !== currentUser._id) {
        setOnlineUsers(prev => new Set([...prev, userData.userId]));
      }
    });

    // Listen for user going offline
    newSocket.on('user-went-offline', (userData) => {
      console.log('User went offline:', userData);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userData.userId);
        return newSet;
      });
    });

    // Handle socket errors
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setOnlineUsersLoading(false);
    });

    // Handle socket disconnection
    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setOnlineUsersLoading(false);
    });

    setSocket(newSocket);
  };

  // Function to manually refresh online users
  const refreshOnlineUsers = () => {
    if (currentUser?.role === 'superadmin' && socket) {
      setOnlineUsersLoading(true);
      socket.emit('get-online-users', { role: currentUser.role });
    }
  };

  // Refresh online users when filters are toggled
  const refreshOnlineUsersOnFilterToggle = () => {
    if (currentUser?.role === 'superadmin' && socket) {
      refreshOnlineUsers();
    }
  };

  const fetchOnlineUsers = async () => {
    if (currentUser?.role !== 'superadmin') return;
    
    try {
      setOnlineUsersLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/online`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.users) {
          const onlineUserIds = new Set(data.data.users.map(user => user.userId));
          setOnlineUsers(onlineUserIds);
        }
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    } finally {
      setOnlineUsersLoading(false);
    }
  };

  // Handle dialog actions
  const openEditDialog = (user) => {
    setSelectedUserForDialog(user);
    setShowEditDialog(true);
  };

  const openDetailsDialog = async (user) => {
    setSelectedUserForDialog(user);
    setShowDetailsDialog(true);
    // Disable body scrolling when popup is open
    document.body.style.overflow = 'hidden';
    
    // Fetch user statistics
    await fetchUserStats(user._id);
  };

  const closeDialogs = () => {
    setShowEditDialog(false);
    setShowDetailsDialog(false);
    setSelectedUserForDialog(null);
    setUserStats(null);
    // Re-enable body scrolling when popup is closed
    document.body.style.overflow = 'auto';
  };

  const fetchUserStats = async (userId) => {
    try {
      setLoadingStats(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/${userId}/stats`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          setUserStats(data.data.stats);
        } else {
          console.error('Failed to fetch user stats:', data.message);
          setUserStats(null);
        }
      } else {
        console.error('Failed to fetch user stats:', response.status);
        setUserStats(null);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setUserStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleUserUpdate = (updatedUser) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user._id === updatedUser._id ? updatedUser : user
      )
    );
  };

  // Handle user actions (edit, view, freeze, suspend)
  const handleUserAction = async (action, userId) => {
    try {
      switch (action) {
        case 'edit':
          openEditDialog(users.find(u => u._id === userId));
          break;
        case 'view':
          openDetailsDialog(users.find(u => u._id === userId));
          break;
        case 'freeze':
          const freezeResponse = await freezeUser(userId);
          if (freezeResponse.success) {
            // Update local state immediately
            setUsers(prevUsers => 
              prevUsers.map(user => 
                user._id === userId 
                  ? { ...user, status: 'frozen' }
                  : user
              )
            );
            toast.success('User account frozen successfully');
          } else {
            toast.error('Failed to freeze user');
          }
          break;
        case 'suspend':
          const suspendResponse = await suspendUser(userId);
          if (suspendResponse.success) {
            // Update local state immediately
            setUsers(prevUsers => 
              prevUsers.map(user => 
                user._id === userId 
                  ? { ...user, status: 'suspended' }
                  : user
              )
            );
            toast.success('User account suspended successfully');
          } else {
            toast.error('Failed to suspend user');
          }
          break;
        case 'activate':
          const activateResponse = await activateUser(userId);
          if (activateResponse.success) {
            // Update local state immediately
            setUsers(prevUsers => 
              prevUsers.map(user => 
                user._id === userId 
                  ? { ...user, status: 'active' }
                  : user
              )
            );
            toast.success('User account activated successfully');
          } else {
            toast.error('Failed to activate user');
          }
          break;
        default:
          toast.error('Unknown action');
      }
    } catch (error) {
      console.error(`Error in handleUserAction (${action}):`, error);
              toast.error(`Failed to ${action} user`);
    }
  };

  // Handle bulk user actions
  const handleBulkUserAction = async (action, userIds) => {
    if (userIds.length === 0) {
      toast.error('Please select users to perform this action');
      return;
    }

    try {
      let successCount = 0;
      let failureCount = 0;
      const newStatus = action === 'freeze' ? 'frozen' : action === 'suspend' ? 'suspended' : 'active';

      for (const userId of userIds) {
        try {
          let response;
          if (action === 'freeze') {
            response = await freezeUser(userId);
          } else if (action === 'suspend') {
            response = await suspendUser(userId);
          } else if (action === 'activate') {
            response = await activateUser(userId);
          }

          if (response && response.success) {
            successCount++;
            // Update local state immediately
            setUsers(prevUsers => 
              prevUsers.map(user => 
                user._id === userId 
                  ? { ...user, status: newStatus }
                  : user
              )
            );
          } else {
            failureCount++;
          }
        } catch (err) {
          failureCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully ${action}ed ${successCount} user(s)`);
        // Clear selection after successful bulk action
        setSelectedUsers([]);
        setSelectAll(false);
      }
      if (failureCount > 0) {
        toast.error(`${failureCount} ${action}(s) failed`);
      }
    } catch (error) {
      console.error(`Error in bulk ${action}:`, error);
              toast.error(`Failed to ${action} users`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stats Section Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-gray-200 rounded-lg animate-pulse">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-300 rounded"></div>
                </div>
                <div className="ml-3 sm:ml-4 flex-1">
                  <div className="h-3 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-6 sm:h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 border-b border-gray-200 px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="w-full sm:w-48 h-10 bg-gray-200 rounded-full animate-pulse"></div>
          </div>

          {/* Desktop Table Skeleton */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <th key={i} className="px-3 sm:px-6 py-3 text-left">
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                          <div className="ml-3 flex-1">
                            <div className="h-4 bg-gray-200 rounded animate-pulse mb-1 w-32"></div>
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20"></div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16"></div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
                          <div className="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
                          <div className="h-8 bg-gray-200 rounded animate-pulse w-8"></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards Skeleton */}
          <div className="lg:hidden px-4 sm:px-6">
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col bg-blue-50 border-blue-200 border rounded-lg shadow-sm p-4 w-full items-stretch gap-4">
                  {/* Top: Checkbox and User Info Skeleton */}
                  <div className="flex flex-col justify-center w-full">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="flex flex-col flex-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-32"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
                      </div>
                    </div>
                  </div>

                  {/* Center: Role, Company & Status Skeleton */}
                  <div className="flex flex-col justify-center items-center w-full">
                    <div className="flex items-center gap-4 w-full justify-center">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="flex flex-col items-center">
                          <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-12"></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom: Last Login & Actions Skeleton */}
                  <div className="flex flex-col justify-center items-center w-full">
                    <div className="flex flex-col items-center gap-1 mb-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-16 mb-1"></div>
                      <div className="flex flex-col gap-2 w-full items-center">
                        {/* Edit and Delete buttons skeleton */}
                        <div className="flex items-center gap-3">
                          <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
                          <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
                        </div>
                        {/* Additional actions skeleton */}
                        <div className="flex items-center gap-3">
                          <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
                          <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
                          <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchUsers} className="bg-purple-600 hover:bg-purple-700">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{users.length}</p>
              {showFilters && (
                <p className="text-xs text-gray-500 mt-1">
                  Showing {sortedUsers.length} filtered
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {users.filter(user => user.status === 'active').length}
              </p>
              {showFilters && (
                <p className="text-xs text-gray-500 mt-1">
                  {sortedUsers.filter(user => user.status === 'active').length} in view
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Company Admins</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {users.filter(user => user.role === 'company-admin').length}
              </p>
              {showFilters && (
                <p className="text-xs text-gray-500 mt-1">
                  {sortedUsers.filter(user => user.role === 'company-admin').length} in view
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Home className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Landlords</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {users.filter(user => user.role === 'landlord').length}
              </p>
              {showFilters && (
                <p className="text-xs text-gray-500 mt-1">
                  {sortedUsers.filter(user => user.role === 'landlord').length} in view
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header with checkbox and bulk actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 border-b border-gray-200 px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                disabled={loading || users.length === 0}
              />
              {selectedUsers.length > 0 ? (
                <span className="text-sm text-gray-600">
                  {selectedUsers.length} selected
                </span>
              ) : (
                <span className="text-sm text-gray-500">
                  {sortedUsers.length} of {users.length} {users.length === 1 ? 'user' : 'users'}
                  {searchTerm && ` matching "${searchTerm}"`}
                </span>
              )}
            </div>
            
            {/* Bulk Actions - Show when users are selected */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {viewMode === 'trash' ? (
                  <>
                    <button
                      onClick={() => handleMultipleRestore()}
                      className="text-green-600 hover:text-green-800 text-xs sm:text-sm flex items-center gap-1 hover:bg-green-50 px-2 py-1 rounded"
                      title="Restore selected users"
                    >
                      <Undo2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Restore Selected</span>
                      <span className="sm:hidden">Restore</span>
                    </button>
                    <button
                      onClick={() => {
                        setMultipleDeleteMode(true);
                        setShowPermanentDeleteDialog(true);
                      }}
                      className="text-red-600 hover:text-red-800 text-xs sm:text-sm flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded"
                      title="Permanently delete selected users"
                    >
                      <Trash className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Delete Permanently</span>
                      <span className="sm:hidden">Delete</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                       onClick={() => handleBulkUserAction('freeze', selectedUsers)}
                      className="text-orange-600 hover:text-orange-800 text-xs sm:text-sm flex items-center gap-1 hover:bg-orange-50 px-2 py-1 rounded"
                      title="Freeze selected users"
                    >
                      <Snowflake className="w-3 h-3" />
                      <span className="hidden sm:inline">Freeze Selected</span>
                      <span className="sm:hidden">Freeze</span>
                    </button>
                    <button
                      onClick={() => handleBulkUserAction('suspend', selectedUsers)}
                      className="text-red-600 hover:text-red-800 text-xs sm:text-sm flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded"
                      title="Suspend selected users"
                    >
                      <Ban className="w-3 h-3" />
                      <span className="hidden sm:inline">Suspend Selected</span>
                      <span className="sm:hidden">Suspend</span>
                    </button>
                    <button
                      onClick={handleMultipleDelete}
                      className="text-red-600 hover:text-red-800 text-xs sm:text-sm flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded"
                      title="Move selected users to trash"
                    >
                      <Trash className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Move to Trash</span>
                      <span className="sm:hidden">Trash</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setSelectedUsers([]);
                    setSelectAll(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xs sm:text-sm hover:bg-gray-50 px-2 py-1 rounded"
                >
                  <span className="hidden sm:inline">Clear selection</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            {/* Trash View Toggle */}
            <Button
              className={`${viewMode === 'trash' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white rounded-full px-4 py-2 flex items-center gap-2 shadow transition-all duration-200`}
              onClick={() => {
                setViewMode(viewMode === 'trash' ? 'active' : 'trash');
                setCurrentPage(1);
                setSelectedUsers([]);
                setSelectAll(false);
              }}
              title={viewMode === 'trash' ? 'Exit Trash' : 'View Trash'}
            >
              <Trash className="w-4 h-4" />
              <span className="text-sm font-medium">
                {viewMode === 'trash' ? 'Exit Trash' : 'View Trash'}
              </span>
            </Button>
            

            
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 pl-10 sm:pl-12 pr-4 py-2 sm:py-2.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-200 bg-gray-50 focus:bg-white shadow-sm text-gray-700 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 mx-4 sm:mx-6 mb-4 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Filter className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-sm font-semibold text-purple-800">Quick Filters</span>
              {loading && (
                <div className="flex items-center gap-1 text-purple-600">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-medium">
                {filteredUsers.length} of {users.length} users
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (roleFilter === 'landlord' && companyFilter === 'all' && statusFilter === 'all' && activityFilter === 'all') {
                  // Clear filter if already active
                  setRoleFilter('all');
                  setCompanyFilter('all');
                  setStatusFilter('all');
                  setActivityFilter('all');
                } else {
                  // Set filter
                  setRoleFilter('landlord');
                  setCompanyFilter('all');
                  setStatusFilter('all');
                  setActivityFilter('all');
                }
              }}
              className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 ${
                roleFilter === 'landlord' && companyFilter === 'all' && statusFilter === 'all' && activityFilter === 'all'
                  ? 'bg-blue-500 text-white border-2 border-blue-600 shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-2 border-blue-200 hover:border-blue-300'
              }`}
            >
              <Home className="w-3 h-3" />
              <span>Landlords</span>
            </button>
            <button
              onClick={() => {
                if (roleFilter === 'resident' && companyFilter === 'all' && statusFilter === 'all' && activityFilter === 'all') {
                  // Clear filter if already active
                  setRoleFilter('all');
                  setCompanyFilter('all');
                  setStatusFilter('all');
                  setActivityFilter('all');
                } else {
                  // Set filter
                  setRoleFilter('resident');
                  setCompanyFilter('all');
                  setStatusFilter('all');
                  setActivityFilter('all');
                }
              }}
              className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 ${
                roleFilter === 'resident' && companyFilter === 'all' && statusFilter === 'all' && activityFilter === 'all'
                  ? 'bg-green-500 text-white border-2 border-green-600 shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-green-50 hover:text-green-700 border-2 border-green-200 hover:border-green-300'
              }`}
            >
              <User className="w-3 h-3" />
              <span>Residents</span>
            </button>
            <button
              onClick={() => {
                if (roleFilter === 'company-admin' && companyFilter === 'all' && statusFilter === 'all' && activityFilter === 'all') {
                  // Clear filter if already active
                  setRoleFilter('all');
                  setCompanyFilter('all');
                  setStatusFilter('all');
                  setActivityFilter('all');
                } else {
                  // Set filter
                  setRoleFilter('company-admin');
                  setCompanyFilter('all');
                  setStatusFilter('all');
                  setActivityFilter('all');
                }
              }}
              className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 ${
                roleFilter === 'company-admin' && companyFilter === 'all' && statusFilter === 'all' && activityFilter === 'all'
                  ? 'bg-purple-500 text-white border-2 border-purple-600 shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-700 border-2 border-purple-200 hover:border-purple-300'
              }`}
            >
              <Building className="w-3 h-3" />
              <span>Company Admins</span>
            </button>
            <button
              onClick={() => {
                if (roleFilter === 'all' && companyFilter === 'all' && statusFilter === 'active' && activityFilter === 'all') {
                  // Clear filter if already active
                  setRoleFilter('all');
                  setCompanyFilter('all');
                  setStatusFilter('all');
                  setActivityFilter('all');
                } else {
                  // Set filter
                  setRoleFilter('all');
                  setCompanyFilter('all');
                  setStatusFilter('active');
                  setActivityFilter('all');
                }
              }}
              className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 ${
                roleFilter === 'all' && companyFilter === 'all' && statusFilter === 'active' && activityFilter === 'all'
                  ? 'bg-emerald-500 text-white border-2 border-emerald-600 shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 border-2 border-emerald-200 hover:border-emerald-300'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              <span>Active Users</span>
            </button>
            <button
              onClick={() => {
                if (roleFilter === 'all' && companyFilter === 'all' && statusFilter === 'all' && activityFilter === 'online') {
                  // Clear filter if already active
                  setRoleFilter('all');
                  setCompanyFilter('all');
                  setStatusFilter('all');
                  setActivityFilter('all');
                } else {
                  // Set filter
                  setRoleFilter('all');
                  setCompanyFilter('all');
                  setStatusFilter('all');
                  setActivityFilter('online');
                }
              }}
              className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 ${
                roleFilter === 'all' && companyFilter === 'all' && statusFilter === 'all' && activityFilter === 'online'
                  ? 'bg-indigo-500 text-white border-2 border-indigo-600 shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border-2 border-indigo-200 hover:border-indigo-300'
              }`}
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Online Now</span>
            </button>
            <button
              onClick={() => {
                if (roleFilter === 'all' && companyFilter === 'all' && statusFilter === 'all' && activityFilter === 'never') {
                  // Clear filter if already active
                  setRoleFilter('all');
                  setCompanyFilter('all');
                  setStatusFilter('all');
                  setActivityFilter('all');
                } else {
                  // Set filter
                  setRoleFilter('all');
                  setCompanyFilter('all');
                  setStatusFilter('all');
                  setActivityFilter('never');
                }
              }}
              className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 ${
                roleFilter === 'all' && companyFilter === 'all' && statusFilter === 'all' && activityFilter === 'never'
                  ? 'bg-red-500 text-white border-2 border-red-600 shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-700 border-2 border-red-200 hover:border-red-300'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>Never Logged In</span>
            </button>
            {/* Date Range Filters */}
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
          </div>
        </div>



        {/* Trash View Info - Only show in trash view */}
        {viewMode === 'trash' && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 mx-4 sm:mx-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-red-700">Trash View</span>
              <span className="text-xs text-red-600">Showing deleted users. Users are automatically permanently deleted after 10 days.</span>
            </div>
          </div>
        )}

        {/* Responsive Table/Cards Layout */}
        <div className="hidden lg:block">
          {/* Desktop Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {currentUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-3 sm:px-6 py-8 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  currentUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user._id)}
                          onChange={(e) => handleSelectUser(user._id, e.target.checked)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 bg-gray-200">
                            {user.landlordInfo?.landlordLogo ? (
                              <img
                                src={user.landlordInfo.landlordLogo}
                                alt="Profile"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : user.landlordInfo?.officerImage ? (
                              <img
                                src={user.landlordInfo.officerImage}
                                alt="Profile"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                        <User className="w-4 h-4 text-gray-600" />
                            )}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        <div className="text-sm text-gray-500">ID: {user._id}</div>
                      </div>
                    </div>
                  </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role === 'landlord' ? 'Landlord' : 
                           user.role === 'resident' ? 'Resident' : 
                           user.role === 'company-admin' ? 'Company Admin' : 
                           user.role}
                    </span>
                  </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.company || 'Unassigned'}
                  </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.status)}`}>
                          {user.status === 'frozen' ? 'Frozen' : 
                           user.status === 'suspended' ? 'Suspended' : 
                           user.status === 'active' ? 'Active' : 
                           user.status === 'inactive' ? 'Inactive' : 
                           user.status}
                    </span>
                  </td>

                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin ? moment(user.lastLogin).format('MMM DD, YYYY') : 'Never'}
                  </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {viewMode === 'trash' ? (
                            <>
                              <button
                                onClick={() => handleRestoreUser(user._id)}
                                className="flex items-center justify-center gap-1 text-green-600 hover:text-green-800 text-sm transition-all duration-200 hover:bg-green-50 px-2 py-1.5 rounded-lg"
                                title="Restore user"
                              >
                                <Undo2 className="w-3 h-3" />
                                <span>Restore</span>
                              </button>
                              <button
                                onClick={() => {
                                  setUserToDelete(user);
                                  setMultipleDeleteMode(false);
                                  setShowPermanentDeleteDialog(true);
                                }}
                                className="flex items-center justify-center gap-1 text-red-600 hover:text-red-800 text-sm transition-all duration-200 hover:bg-red-50 px-2 py-1.5 rounded-lg"
                                title="Permanently delete user"
                              >
                                <Trash className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => openEditDialog(user)}
                                className="flex items-center justify-center gap-1 text-green-600 hover:text-green-800 text-sm transition-all duration-200 hover:bg-green-50 px-2 py-1.5 rounded-lg"
                                title="Edit user"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                disabled={deletingUsers.has(user._id)}
                                className="flex items-center justify-center gap-1 text-red-600 hover:text-red-800 text-sm transition-all duration-200 hover:bg-red-50 px-2 py-1.5 rounded-lg"
                                title="Move user to trash"
                              >
                                {deletingUsers.has(user._id) ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                ) : (
                                  <Trash className="w-3 h-3" />
                                )}
                                <span>Delete</span>
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button 
                                    className="flex items-center justify-center text-gray-600 hover:text-gray-800 text-sm transition-all duration-200 hover:bg-gray-50 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-0 focus:shadow-none"
                                    style={{ outline: 'none' }}
                                  >
                                    <span className="text-lg">⋮</span>
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                  className="bg-white border border-gray-200 shadow-lg rounded-lg min-w-[160px] z-50"
                                  side="bottom"
                                  align="end"
                                  sideOffset={5}
                                >
                                  <DropdownMenuItem onClick={() => openDetailsDialog(user)}>
                                    <Eye className="w-4 h-4 mr-2 text-blue-600" />
                                    <span>View Details</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUserAction('freeze', user._id)}>
                                    <Snowflake className="w-4 h-4 mr-2 text-orange-600" />
                                    <span>Freeze Account</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUserAction('suspend', user._id)}>
                                    <Ban className="w-4 h-4 mr-2 text-red-600" />
                                    <span>Suspend Account</span>
                                  </DropdownMenuItem>
                                  {(user.status === 'frozen' || user.status === 'suspended') && (
                                    <DropdownMenuItem onClick={() => handleUserAction('activate', user._id)}>
                                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                                      <span>Activate Account</span>
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                      </td>
                </tr>
                  ))
                )}
            </tbody>
          </table>
        </div>
        </div>

        {/* Mobile Cards Layout */}
        <div className="lg:hidden px-4 sm:px-6">
          <div className="flex flex-col gap-4">
            {currentUsers.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-600 mb-4 max-w-md mx-auto">
                  {searchTerm 
                    ? 'Try adjusting your search criteria to find what you\'re looking for.'
                    : 'No users match the current criteria.'
                  }
                </p>
              </div>
            ) : (
              currentUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex flex-col bg-blue-50 border-blue-200 border rounded-lg shadow-sm p-4 w-full items-stretch gap-4 cursor-pointer hover:shadow-md transition-all duration-200"
                >
                  {/* Top: Checkbox and User Info */}
                  <div className="flex flex-col justify-center w-full">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={(e) => handleSelectUser(user._id, e.target.checked)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-xs text-gray-500">User</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 bg-gray-200">
                        {user.landlordInfo?.landlordLogo ? (
                          <img
                            src={user.landlordInfo.landlordLogo}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : user.landlordInfo?.officerImage ? (
                          <img
                            src={user.landlordInfo.officerImage}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <User className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-base text-blue-900 break-words">
                          {user.email}
                        </span>
                        <span className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                          <User className="w-3 h-3" />
                          ID: {user._id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Role, Company & Status */}
                  <div className="flex flex-col justify-center items-center w-full">
                    <div className="flex items-center gap-4 w-full justify-center">
                      <div className="flex flex-col items-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role === 'landlord' ? 'Landlord' : 
                           user.role === 'resident' ? 'Resident' : 
                           user.role === 'company-admin' ? 'Company Admin' : 
                           user.role}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">Role</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-medium text-blue-700">
                          {user.company || 'Unassigned'}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">Company</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.status)}`}>
                          {user.status === 'frozen' ? 'Frozen' : 
                           user.status === 'suspended' ? 'Suspended' : 
                           user.status === 'active' ? 'Active' : 
                           user.status === 'inactive' ? 'Inactive' : 
                           user.status}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">Status</span>
                      </div>

                    </div>
                  </div>

                  {/* Bottom: Last Login & Actions */}
                  <div className="flex flex-col justify-center items-center w-full">
                    <div className="flex flex-col items-center gap-1 mb-3">
                      <span className="text-sm font-medium text-blue-700">
                        {user.lastLogin ? moment(user.lastLogin).format('MMM DD, YYYY') : 'Never'}
                      </span>
                      <span className="text-xs text-gray-500">Last Login</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium mb-1">Actions</span>
                      <div className="flex flex-col gap-2 w-full items-center">
                        {/* Edit and Delete icons with text in one line */}
                        <div className="flex items-center gap-3">
                          {viewMode === 'trash' ? (
                            <>
                              <button
                                onClick={() => handleRestoreUser(user._id)}
                                className="flex items-center justify-center gap-1 text-green-600 hover:text-green-800 transition-all duration-200 hover:bg-green-50 px-2 py-1.5 rounded-lg"
                                title="Restore user"
                              >
                                <Undo2 className="w-3 h-3" />
                                <span className="text-xs">Restore</span>
                              </button>
                              <button
                                onClick={() => {
                                  setUserToDelete(user);
                                  setMultipleDeleteMode(false);
                                  setShowPermanentDeleteDialog(true);
                                }}
                                className="flex items-center justify-center gap-1 text-red-600 hover:text-red-800 transition-all duration-200 hover:bg-red-50 px-2 py-1.5 rounded-lg"
                                title="Permanently delete user"
                              >
                                <Trash className="w-3 h-3" />
                                <span className="text-xs">Delete</span>
                              </button>
                            </>
                          ) : (
                            <>
                                                          <button
                              onClick={() => openEditDialog(user)}
                              className="flex items-center justify-center gap-1 text-green-600 hover:text-green-800 transition-all duration-200 hover:bg-green-50 px-2 py-1.5 rounded-lg"
                              title="Edit user"
                            >
                              <Edit className="w-3 h-3" />
                              <span className="text-xs">Edit</span>
                            </button>
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                disabled={deletingUsers.has(user._id)}
                                className="flex items-center justify-center gap-1 text-red-600 hover:text-red-800 transition-all duration-200 hover:bg-red-50 px-2 py-1.5 rounded-lg"
                                title="Move user to trash"
                              >
                                {deletingUsers.has(user._id) ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                ) : (
                                  <Trash className="w-3 h-3" />
                                )}
                                <span className="text-xs">Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                        
                        {/* Additional actions with text as individual buttons */}
                        {viewMode !== 'trash' && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => openDetailsDialog(user)}
                              className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 transition-all duration-200 hover:bg-blue-50 px-2 py-1.5 rounded-lg"
                              title="View Details"
                            >
                              <Eye className="w-3 h-3" />
                              <span className="text-xs">View</span>
                            </button>
                            <button
                              onClick={() => handleUserAction('freeze', user._id)}
                              className="flex items-center justify-center gap-1 text-orange-600 hover:text-orange-800 transition-all duration-200 hover:bg-orange-50 px-2 py-1.5 rounded-lg"
                              title="Freeze Account"
                            >
                              <Snowflake className="w-3 h-3" />
                              <span className="text-xs">Freeze</span>
                            </button>
                            <button
                              onClick={() => handleUserAction('suspend', user._id)}
                              className="flex items-center justify-center gap-1 text-red-600 hover:text-red-800 transition-all duration-200 hover:bg-red-50 px-2 py-1.5 rounded-lg"
                              title="Suspend Account"
                            >
                              <Ban className="w-3 h-3" />
                              <span className="text-xs">Suspend</span>
                            </button>
                            {(user.status === 'frozen' || user.status === 'suspended') && (
                              <button
                                onClick={() => handleUserAction('activate', user._id)}
                                className="flex items-center justify-center gap-1 text-green-600 hover:text-green-800 transition-all duration-200 hover:bg-green-50 px-2 py-1.5 rounded-lg"
                                title="Activate Account"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="text-xs">Activate</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 border-t border-gray-200 sm:rounded-bl-lg sm:rounded-br-lg">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-600">Show:</span>
                  <div className="relative">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 pr-8 text-xs sm:text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={40}>40</option>
                      <option value={50}>50</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-gray-900 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" strokeWidth={2} />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">per page</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(indexOfLastItem, filteredUsers.length)}</span> of{' '}
                  <span className="font-medium">{filteredUsers.length}</span> results
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      {showEditDialog && selectedUserForDialog && (
        <UserEditDialog
          user={selectedUserForDialog}
          isOpen={showEditDialog}
          onClose={closeDialogs}
          onUpdate={handleUserUpdate}
        />
      )}

      {/* User Details Dialog */}
      {showDetailsDialog && selectedUserForDialog && (
        <>
          <style jsx global>{`
            body { overflow: hidden; }
          `}</style>
          <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-full bg-black/40 backdrop-blur-sm z-[9999] pointer-events-none"></div>
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2">
            <div className="min-w-[0] max-w-[85vw] w-full sm:w-[800px] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col mx-0">
              {/* Purple header strip above modal */}
              <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-sm sm:text-lg font-bold text-center flex items-center gap-2">
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                    User Details
                  </span>
                </div>
                <button
                  onClick={closeDialogs}
                  className="absolute right-2 sm:right-4 bg-purple-500 hover:bg-purple-700 text-white transition p-1.5 sm:p-2 rounded-full shadow"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              <div className="w-full bg-white rounded-b-2xl shadow-2xl border border-gray-200 p-3 sm:p-6 flex flex-col pointer-events-auto max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
                {selectedUserForDialog ? (
                  <div className="space-y-4 sm:space-y-6">
                    {/* User Header with Status */}
                    <div className="text-center pb-4 border-b border-gray-200">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        {selectedUserForDialog.status === 'frozen' ? 'Frozen' : 
                         selectedUserForDialog.status === 'suspended' ? 'Suspended' : 
                         selectedUserForDialog.status === 'active' ? 'Active' : 
                         selectedUserForDialog.status === 'inactive' ? 'Inactive' : 
                         selectedUserForDialog.status}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                        {selectedUserForDialog.email}
                      </h2>
                      <p className="text-gray-500 text-sm">
                        Created {moment(selectedUserForDialog.createdAt).format('MMM DD, YYYY')}
                      </p>
                    </div>

                    {/* User Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4">
                          <h3 className="font-semibold text-gray-900 mb-3 text-lg">Basic Information</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Email:</span>
                              <span className="text-gray-900">{selectedUserForDialog.email}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Role:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(selectedUserForDialog.role)}`}>
                                {selectedUserForDialog.role === 'landlord' ? 'Landlord' : 
                                 selectedUserForDialog.role === 'resident' ? 'Resident' : 
                                 selectedUserForDialog.role === 'company-admin' ? 'Company Admin' : 
                                 selectedUserForDialog.role}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Company:</span>
                              <span className="text-gray-900">{selectedUserForDialog.company || 'Unassigned'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Status:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(selectedUserForDialog.status)}`}>
                                {selectedUserForDialog.status === 'frozen' ? 'Frozen' : 
                                 selectedUserForDialog.status === 'suspended' ? 'Suspended' : 
                                 selectedUserForDialog.status === 'active' ? 'Active' : 
                                 selectedUserForDialog.status === 'inactive' ? 'Inactive' : 
                                 selectedUserForDialog.status}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Last Login:</span>
                              <span className="text-gray-900">{selectedUserForDialog.lastLogin ? moment(selectedUserForDialog.lastLogin).format('MMM DD, YYYY HH:mm') : 'Never'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Created:</span>
                              <span className="text-gray-900">{moment(selectedUserForDialog.createdAt).format('MMM DD, YYYY')}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        {/* User Statistics */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4 h-full">
                          <h3 className="font-semibold text-gray-900 mb-2 text-lg">User Statistics</h3>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-gray-700 text-sm">Account Age:</span>
                                <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded text-sm">
                                  {moment().diff(moment(selectedUserForDialog.createdAt), 'days')} days
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-gray-700 text-sm">Profile Complete:</span>
                                <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded text-sm">
                                  {selectedUserForDialog.landlordInfo?.landlordName ? 'Yes' : 'No'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-gray-700 text-sm">Last Activity:</span>
                                <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded text-sm">
                                  {selectedUserForDialog.lastLogin ? moment(selectedUserForDialog.lastLogin).fromNow() : 'Never'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>



                    {/* Detailed Statistics Section */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-4 text-lg">Detailed Statistics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Landlord Statistics */}
                        {selectedUserForDialog.role === 'landlord' && (
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                              <Home className="w-4 h-4" />
                              Landlord Statistics
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-blue-700 text-sm">Total Meetings:</span>
                                <span className="font-bold text-blue-900 bg-white px-2 py-1 rounded text-sm">
                                  {loadingStats ? '...' : (userStats?.landlordStats?.totalMeetings || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-blue-700 text-sm">Active Meetings:</span>
                                <span className="font-bold text-blue-900 bg-white px-2 py-1 rounded text-sm">
                                  {loadingStats ? '...' : (userStats?.landlordStats?.activeMeetings || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-blue-700 text-sm">Total Recordings:</span>
                                <span className="font-bold text-blue-900 bg-white px-2 py-1 rounded text-sm">
                                  {loadingStats ? '...' : (userStats?.landlordStats?.totalRecordings || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-blue-700 text-sm">Total Screenshots:</span>
                                <span className="font-bold text-blue-900 bg-white px-2 py-1 rounded text-sm">
                                  {loadingStats ? '...' : (userStats?.landlordStats?.totalScreenshots || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Resident Statistics */}
                        {selectedUserForDialog.role === 'resident' && (
                          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                              <User className="w-4 h-4" />
                              Resident Statistics
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-green-700 text-sm">Total Uploads:</span>
                                <span className="font-bold text-green-900 bg-white px-2 py-1 rounded text-sm">
                                  {loadingStats ? '...' : (userStats?.residentStats?.totalUploads || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-green-700 text-sm">Total Access:</span>
                                <span className="font-bold text-green-900 bg-white px-2 py-1 rounded text-sm">
                                  {loadingStats ? '...' : (userStats?.residentStats?.totalAccess || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Company Admin Statistics */}
                        {selectedUserForDialog.role === 'company-admin' && (
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                            <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                              <Building className="w-4 h-4" />
                              Company Admin Statistics
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-purple-700 text-sm">Company Users:</span>
                                <span className="font-bold text-purple-900 bg-white px-2 py-1 rounded text-sm">
                                  {loadingStats ? '...' : (userStats?.companyStats?.companyUsers || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-purple-700 text-sm">Company Meetings:</span>
                                <span className="font-bold text-purple-900 bg-white px-2 py-1 rounded text-sm">
                                  {loadingStats ? '...' : (userStats?.companyStats?.companyMeetings || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-purple-700 text-sm">Company Uploads:</span>
                                <span className="font-bold text-purple-900 bg-white px-2 py-1 rounded text-sm">
                                  {loadingStats ? '...' : (userStats?.companyStats?.companyUploads || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-purple-700 text-sm">Company Revenue:</span>
                                <span className="font-bold text-purple-900 bg-white px-2 py-1 rounded text-sm">
                                  ${loadingStats ? '...' : (userStats?.companyStats?.companyRevenue || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Archive & Trash Statistics */}
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                          <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                            <Archive className="w-4 h-4" />
                            Archive & Trash
                          </h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                              <span className="text-orange-700 text-sm">Archived Items:</span>
                              <span className="font-bold text-orange-900 bg-white px-2 py-1 rounded text-sm">
                                {loadingStats ? '...' : (userStats?.archiveTrashStats?.archivedItems || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                              <span className="text-orange-700 text-sm">Trash Items:</span>
                              <span className="font-bold text-orange-900 bg-white px-2 py-1 rounded text-sm">
                                {loadingStats ? '...' : (userStats?.archiveTrashStats?.trashItems || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Media Statistics */}
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
                          <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Media
                          </h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                              <span className="text-indigo-700 text-sm">Total Screenshots:</span>
                              <span className="font-bold text-indigo-900 bg-white px-2 py-1 rounded text-sm">
                                {loadingStats ? '...' : (userStats?.mediaStats?.totalScreenshots || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                              <span className="text-indigo-700 text-sm">Total Videos:</span>
                              <span className="font-bold text-indigo-900 bg-white px-2 py-1 rounded text-sm">
                                {loadingStats ? '...' : (userStats?.mediaStats?.totalVideos || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                              <span className="text-indigo-700 text-sm">Storage Used:</span>
                              <span className="font-bold text-indigo-900 bg-white px-2 py-1 rounded text-sm">
                                {loadingStats ? '...' : `${userStats?.mediaStats?.storageUsed || 0} ${userStats?.mediaStats?.storageUnit || 'MB'}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Company Information */}
                        {selectedUserForDialog.company && (
                          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
                            <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                              <Building className="w-4 h-4" />
                              Company Details
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-emerald-700 text-sm">Company Name:</span>
                                <span className="font-bold text-emerald-900 bg-white px-2 py-1 rounded text-sm">
                                  {selectedUserForDialog.company}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-emerald-700 text-sm">Join Date:</span>
                                <span className="font-bold text-emerald-900 bg-white px-2 py-1 rounded text-sm">
                                  {moment(selectedUserForDialog.createdAt).format('MMM DD, YYYY')}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                <span className="text-emerald-700 text-sm">Company Role:</span>
                                <span className="font-bold text-emerald-900 bg-white px-2 py-1 rounded text-sm">
                                  {selectedUserForDialog.role === 'company-admin' ? 'Admin' : 
                                   selectedUserForDialog.role === 'landlord' ? 'Landlord' : 
                                   selectedUserForDialog.role === 'resident' ? 'Resident' : 
                                   selectedUserForDialog.role}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No user selected.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Permanent Delete Confirmation Dialog */}
      {showPermanentDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-sm">
          <div className="bg-orange-100/90 backdrop-blur-lg rounded-xl shadow-2xl p-7 w-full max-w-md border border-orange-200" style={{ boxShadow: '0 8px 32px 0 rgba(255, 183, 77, 0.18)' }}>
            <h2 className="text-xl font-bold text-red-600 mb-3">Permanently Delete User{multipleDeleteMode && selectedUsers.length > 1 ? 's' : ''}?</h2>
            <p className="mb-4 text-orange-900">This will permanently delete:</p>
            <ul className="list-disc list-inside mb-4 text-orange-800">
              <li>The user account{multipleDeleteMode && selectedUsers.length > 1 ? 's' : ''}</li>
              <li>All user data</li>
              <li>All associated records</li>
              <li>All user preferences and settings</li>
            </ul>
            <p className="mb-4 text-sm text-orange-700">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                className="px-5 py-2 bg-orange-50 text-orange-900 rounded-full shadow-sm hover:bg-orange-200 hover:shadow-md transition-all font-semibold"
                onClick={() => {
                  setShowPermanentDeleteDialog(false);
                  setUserToDelete(null);
                  setMultipleDeleteMode(false);
                }}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 bg-red-600 text-white rounded-full shadow-sm hover:bg-red-700 hover:shadow-md transition-all font-semibold"
                onClick={async () => {
                  if (multipleDeleteMode) {
                    await handleMultiplePermanentDelete();
                    setShowPermanentDeleteDialog(false);
                    setMultipleDeleteMode(false);
                  } else if (userToDelete) {
                    try {
                      await permanentDeleteUser(userToDelete._id);
                      toast.success("User permanently deleted");
                      setShowPermanentDeleteDialog(false);
                      setUserToDelete(null);
                      fetchUsers();
                    } catch (error) {
                      const errorMessage = error?.response?.data?.message || "Failed to permanently delete user";
                      toast.error('Failed to delete user');
                      console.error("Permanent delete error:", error);
                    }
                  }
                }}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
