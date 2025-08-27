"use client"
import { Search, Users, Eye, Edit, Clock } from "lucide-react"
import { useState, useMemo } from "react"

const UserRow = ({ user, onView, onEdit, getInitials, formatDate, userMeetings }) => {
  // Calculate user's storage usage from meetings (recordings and screenshots)
  // User ID is stored in uploaded_by field within each screenshot/recording
  const userStorageUsage = userMeetings?.reduce((total, meeting) => {
    let meetingSize = 0

    // Add size from recordings array - check uploaded_by field
    if (meeting.recordings && Array.isArray(meeting.recordings)) {
      meetingSize += meeting.recordings.reduce((recTotal, rec) => {
        if (rec.uploaded_by === user._id) {
          return recTotal + (rec.size || 0)
        }
        return recTotal
      }, 0)
    }

    // Add size from screenshots array - check uploaded_by field
    if (meeting.screenshots && Array.isArray(meeting.screenshots)) {
      meetingSize += meeting.screenshots.reduce((scrTotal, scr) => {
        if (scr.uploaded_by === user._id) {
          return scrTotal + (scr.size || 0)
        }
        return scrTotal
      }, 0)
    }

    return total + meetingSize
  }, 0) || 0

  const storageInMB = (userStorageUsage / (1024 * 1024)).toFixed(2)
  const storageInKB = (userStorageUsage / 1024).toFixed(2)

  // Set unlimited storage (1000 MB = 1 GB limit)
  const storageLimit = 1000 * 1024 * 1024 // 1000 MB in bytes
  const storagePercentage = Math.min((userStorageUsage / storageLimit) * 100, 100)

  // Show storage in appropriate unit
  const displayStorage = userStorageUsage > 0
    ? (userStorageUsage > 1024 * 1024 ? `${storageInMB} MB` : `${storageInKB} KB`)
    : '0 KB'

  // Show storage limit
  const storageLimitDisplay = '1 GB'

  return (
    <tr className="hover:bg-gray-50 transition-colors duration-150">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white font-semibold text-sm">
                {getInitials(`${user.firstName || ''} ${user.lastName || ''}`)}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 border-2 border-white rounded-full"></div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-semibold text-gray-900">
              {user.firstName || 'Unknown'} {user.lastName || 'User'}
            </div>
            <div className="text-sm text-gray-500">{user.email || 'No email'}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-gray-500">User</span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
          {user.role || 'Unknown'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
            {user.status || 'Unknown'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-2 text-gray-400" />
          {formatDate(user.lastLoginTime || user.currentLoginTime)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Storage:</span>
            <span className="text-xs font-medium text-gray-900">{displayStorage}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${storagePercentage > 80 ? 'bg-red-500' :
                  storagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
              style={{ width: `${storagePercentage}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 text-center">
            {storagePercentage.toFixed(1)}% of limit
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onView(user)}
            className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 hover:text-purple-700 transition-colors duration-150"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(user)}
            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150"
            title="Edit User"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => (
  <div className="bg-white px-6 py-4 flex items-center justify-between border-t border-gray-100">
    <div className="flex-1 flex justify-between sm:hidden">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
      >
        Previous
      </button>
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
      >
        Next
      </button>
    </div>
    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-gray-700">
          Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
          <span className="font-semibold text-gray-900">
            {Math.min(currentPage * itemsPerPage, totalItems)}
          </span>{' '}
          of <span className="font-semibold text-gray-900">{totalItems}</span> results
        </p>
      </div>
      <div>
        <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px bg-white border border-gray-200">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let page;
            if (totalPages <= 5) {
              page = i + 1;
            } else if (currentPage <= 3) {
              page = i + 1;
            } else if (currentPage >= totalPages - 2) {
              page = totalPages - 4 + i;
            } else {
              page = currentPage - 2 + i;
            }
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors duration-150 ${currentPage === page
                    ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
              >
                {page}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  </div>
)

const UserManagementSection = ({
  companyUsers,
  companyMeetings,
  onViewUser,
  onEditUser,
  getInitials,
  formatDate
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = companyUsers.filter(user => {
      const matchesSearch = !searchTerm ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesRole = filterRole === 'all' || user.role === filterRole
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus

      return matchesSearch && matchesRole && matchesStatus
    })

    // Sort users
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'firstName':
          aValue = a.firstName || ''
          bValue = b.firstName || ''
          break
        case 'lastName':
          aValue = a.lastName || ''
          bValue = b.lastName || ''
          break
        case 'email':
          aValue = a.email || ''
          bValue = b.email || ''
          break
        case 'createdAt':
          aValue = new Date(a.createdAt || 0)
          bValue = new Date(b.createdAt || 0)
          break
        case 'lastLoginTime':
          aValue = new Date(a.lastLoginTime || a.currentLoginTime || 0)
          bValue = new Date(b.lastLoginTime || b.currentLoginTime || 0)
          break
        default:
          aValue = a[sortBy] || ''
          bValue = b[sortBy] || ''
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [companyUsers, searchTerm, filterRole, filterStatus, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage)
  const currentUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )



  return (
    <div className="space-y-8 pb-8">
      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Roles</option>
              <option value="landlord">Landlords</option>
              <option value="resident">Residents</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Storage Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentUsers.length > 0 ? (
                currentUsers.map((user) => (
                  <UserRow
                    key={user._id}
                    user={user}
                    onView={onViewUser}
                    onEdit={onEditUser}
                    getInitials={getInitials}
                    formatDate={formatDate}
                    userMeetings={companyMeetings}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium">No users found</p>
                    <p className="text-sm">No users match your current filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredAndSortedUsers.length}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>
    </div>
  )
}

export default UserManagementSection
