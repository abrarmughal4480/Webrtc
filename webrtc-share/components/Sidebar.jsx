import Link from 'next/link'
import { 
  AiOutlineHome, 
  AiOutlineUser, 
  AiOutlineBarChart, 
  AiOutlineSetting,
  AiOutlineFileText,
  AiOutlineLock,
  AiOutlineMenu,
  AiOutlineClose
} from 'react-icons/ai'

const SidebarItem = ({ icon: Icon, label, href, isActive }) => (
  <Link 
    href={href} 
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      isActive 
        ? 'bg-blue-500 text-white shadow-md' 
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    <Icon className="text-xl" />
    <span className="font-medium">{label}</span>
  </Link>
)

const Sidebar = ({ isOpen, onToggle, currentPath }) => {
  const menuItems = [
    { icon: AiOutlineHome, label: 'Dashboard', href: '/dashboard/superadmin' },
    { icon: AiOutlineUser, label: 'Users', href: '/dashboard/superadmin/users' },
    { icon: AiOutlineBarChart, label: 'Analytics', href: '/dashboard/superadmin/analytics' },
    { icon: AiOutlineSetting, label: 'Settings', href: '/dashboard/superadmin/settings' },
    { icon: AiOutlineFileText, label: 'Reports', href: '/dashboard/superadmin/reports' },
    { icon: AiOutlineLock, label: 'Security', href: '/dashboard/superadmin/security' },
  ]

  return (
    <div className={`bg-white shadow-lg transition-all duration-300 ${
      isOpen ? 'w-64' : 'w-16'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className={`font-bold text-xl text-gray-800 ${isOpen ? 'block' : 'hidden'}`}>
            Super Admin
          </h1>
          <button 
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900"
          >
            {isOpen ? <AiOutlineClose className="text-lg" /> : <AiOutlineMenu className="text-lg" />}
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="space-y-2">
          {menuItems.map((item, index) => (
            <SidebarItem 
              key={index}
              icon={item.icon}
              label={isOpen ? item.label : ''}
              href={item.href}
              isActive={currentPath === item.href}
            />
          ))}
        </nav>
      </div>
    </div>
  )
}

export default Sidebar 