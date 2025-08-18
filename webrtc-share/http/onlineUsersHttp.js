const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Get online users (only for superadmins)
export const getOnlineUsers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/online`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Only superadmins can access online users');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching online users:', error);
    throw error;
  }
};

// Check if a specific user is online
export const checkUserOnlineStatus = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/online`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Only superadmins can access online users');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.data && data.data.users) {
      const user = data.data.users.find(u => u.userId === userId);
      return {
        success: true,
        isOnline: !!user,
        userData: user || null
      };
    }
    
    return {
      success: false,
      isOnline: false,
      userData: null
    };
  } catch (error) {
    console.error('Error checking user online status:', error);
    throw error;
  }
};

// Get online users statistics
export const getOnlineUsersStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/online`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Only superadmins can access online users');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.data && data.data.users) {
      const users = data.data.users;
      
      // Calculate statistics
      const stats = {
        totalOnline: users.length,
        byRole: {
          landlord: users.filter(u => u.role === 'landlord').length,
          resident: users.filter(u => u.role === 'resident').length,
          'company-admin': users.filter(u => u.role === 'company-admin').length,
          admin: users.filter(u => u.role === 'admin').length,
          superadmin: users.filter(u => u.role === 'superadmin').length,
        },
        byCompany: {},
        recentlyConnected: 0,
        averageOnlineDuration: 0
      };

      // Company statistics
      users.forEach(user => {
        if (user.company) {
          stats.byCompany[user.company] = (stats.byCompany[user.company] || 0) + 1;
        }
      });

      // Recently connected (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      stats.recentlyConnected = users.filter(u => new Date(u.connectedAt) > fiveMinutesAgo).length;

      // Average online duration
      if (users.length > 0) {
        const totalDuration = users.reduce((sum, user) => sum + (user.onlineDuration || 0), 0);
        stats.averageOnlineDuration = Math.floor(totalDuration / users.length);
      }

      return {
        success: true,
        data: stats
      };
    }
    
    return {
      success: false,
      data: null
    };
  } catch (error) {
    console.error('Error fetching online users stats:', error);
    throw error;
  }
};
