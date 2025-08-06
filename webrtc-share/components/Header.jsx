import { 
  AiOutlineBell, 
  AiOutlineUser, 
  AiOutlineLogout,
  AiOutlineDashboard
} from 'react-icons/ai'

const Header = ({ userName = "Admin" }) => {
  const handleLogout = () => {
    // Logout logic here
    console.log('Logout clicked')
  }

  return (
    <header className="bg-white shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <AiOutlineDashboard className="text-blue-500" />
            Dashboard
          </h2>
          <p className="text-sm text-gray-600">Welcome back, {userName}</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 relative">
            <AiOutlineBell className="text-xl" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              3
            </span>
          </button>
          
          {/* Profile */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
              <AiOutlineUser className="text-sm" />
            </div>
            <span className="text-sm text-gray-600 hidden md:block">{userName}</span>
          </div>
          
          {/* Logout */}
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <AiOutlineLogout className="text-sm" />
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header 