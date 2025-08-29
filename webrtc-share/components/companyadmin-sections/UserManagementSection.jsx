"use client"
import { Search, Users, Eye, Edit, Clock } from "lucide-react"
import { useState, useMemo } from "react"

const UserRow = ({ user, onView, onEdit, getInitials, formatDate, userMeetings }) => {
  const userStorageUsage = userMeetings?.reduce((total, meeting) => {
    let meetingSize = 0

    if (meeting.recordings && Array.isArray(meeting.recordings)) {
      meetingSize += meeting.recordings.reduce((recTotal, rec) => {
        if (rec.uploaded_by === user._id) {
          return recTotal + (rec.size || 0)
        }
        return recTotal
      }, 0)
    }

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

  const storageLimit = 1000 * 1024 * 1024
  const storagePercentage = Math.min((userStorageUsage / storageLimit) * 100, 100)

  const displayStorage = userStorageUsage > 0
    ? (userStorageUsage > 1024 * 1024 ? `${storageInMB} MB` : `${storageInKB} KB`)
    : '0 KB'

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    if (ampm === 'PM') {
      const hourStr = displayHours.toString();
      const paddedHour = hourStr.length === 1 ? ` ${hourStr}` : hourStr;
      return `${paddedHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
    } else {
      return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
    }
  };

  const formatLoginTime = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);

    const timeStr = formatTime(date);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);

    return `${timeStr} ${day}/${month}/${year}`;
  };

  const getProfileImage = () => {
    if (user?.landlordInfo?.useLandlordLogoAsProfile && user?.landlordInfo?.landlordLogo) {
      return user.landlordInfo.landlordLogo;
    }

    if (user?.landlordInfo?.officerImage) {
      return user.landlordInfo.officerImage;
    }

    if (user?.logo) {
      return user.logo;
    }

    return null;
  };

  const getProfileShapeClass = () => {
    const shape = user?.landlordInfo?.profileShape;
    if (shape === 'square') {
      return 'rounded-lg';
    } else if (shape === 'circle') {
      return 'rounded-full';
    }
    return 'rounded-full';
  };

  const getImageObjectFitClass = () => {
    const shape = user?.landlordInfo?.profileShape;
    if (shape === 'square') {
      return 'object-contain';
    } else {
      return 'object-cover';
    }
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors duration-150">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="relative">
            <div className={`w-10 h-10 overflow-hidden border border-gray-200 bg-gray-50 ${getProfileShapeClass()}`}>
              {getProfileImage() ? (
                <img
                  src={getProfileImage()}
                  alt="Profile"
                  className={`w-full h-full ${getImageObjectFitClass()}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {getInitials(`${user.firstName || ''} ${user.lastName || ''}`)}
                  </span>
                </div>
              )}
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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
          {user.status || 'Unknown'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex items-center">
          <span className="font-mono" style={{ whiteSpace: 'pre' }}>
            {formatLoginTime(user.lastLoginTime || user.currentLoginTime)}
          </span>
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
      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header with search and filters integrated */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-6 border-b border-gray-100">
          <div className="flex-1">
            <span className="text-sm text-gray-500">
              {filteredAndSortedUsers.length} of {companyUsers.length} {companyUsers.length === 1 ? 'user' : 'users'}
              {searchTerm && ` matching "${searchTerm}"`}
            </span>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 sm:pl-12 pr-4 py-3 sm:py-3 border border-gray-200 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-200 bg-gray-50 focus:bg-white shadow-sm text-gray-700 text-sm"
            />
          </div>
        </div>

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
