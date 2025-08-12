import { UserPlus, User, Edit, Trash, Eye, Users, Building, Home, Search, ChevronDown, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment/moment";
import { useState, useEffect } from "react";
import { getAllUsers, deleteUser, restoreUser, permanentDeleteUser } from "@/http/userHttp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function UserManagementSection({ 
  handleUserAction,
  getRoleBadgeColor,
  getStatusBadgeColor
}) {
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.company && user.company.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedUsers([]);
    setSelectAll(false);
  }, [searchTerm]);

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
        toast.error(err.response?.data?.message || 'Error moving user to trash');
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
        toast.error(err.response?.data?.message || 'Error restoring user');
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
        toast.error(`${failureCount} permanent delete(s) failed: ${uniqueErrors.join(', ')}`);
      }
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
                  {filteredUsers.length} of {users.length} {users.length === 1 ? 'user' : 'users'}
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
                      onClick={() => handleUserAction('freeze', selectedUsers)}
                      className="text-orange-600 hover:text-orange-800 text-xs sm:text-sm flex items-center gap-1 hover:bg-orange-50 px-2 py-1 rounded"
                      title="Freeze selected users"
                    >
                      <span className="text-xs">❄️</span>
                      <span className="hidden sm:inline">Freeze Selected</span>
                      <span className="sm:hidden">Freeze</span>
                    </button>
                    <button
                      onClick={() => handleUserAction('suspend', selectedUsers)}
                      className="text-red-600 hover:text-red-800 text-xs sm:text-sm flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded"
                      title="Suspend selected users"
                    >
                      <span className="text-xs">🚫</span>
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
          
          {/* Search Box */}
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
                                onClick={() => handleUserAction('edit', user._id)}
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
                                  <DropdownMenuItem onClick={() => handleUserAction('view', user._id)}>
                                    <Eye className="w-4 h-4 mr-2 text-blue-600" />
                                    <span>View Details</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUserAction('freeze', user._id)}>
                                    <span className="text-orange-600 mr-2">❄️</span>
                                    <span>Freeze Account</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUserAction('suspend', user._id)}>
                                    <span className="text-red-600 mr-2">🚫</span>
                                    <span>Suspend Account</span>
                                  </DropdownMenuItem>
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
                                onClick={() => handleUserAction('edit', user._id)}
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
                              onClick={() => handleUserAction('view', user._id)}
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
                              <span className="text-xs">❄️</span>
                              <span className="text-xs">Freeze</span>
                            </button>
                            <button
                              onClick={() => handleUserAction('suspend', user._id)}
                              className="flex items-center justify-center gap-1 text-red-600 hover:text-red-800 transition-all duration-200 hover:bg-red-50 px-2 py-1.5 rounded-lg"
                              title="Suspend Account"
                            >
                              <span className="text-xs">🚫</span>
                              <span className="text-xs">Suspend</span>
                            </button>
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
                      toast.error(errorMessage);
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
