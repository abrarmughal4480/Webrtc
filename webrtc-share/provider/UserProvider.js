"use client"
import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadMeRequest } from '@/http/authHttp';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    try {
        console.log('👤 Loading user data...');
        const response = await loadMeRequest();
        console.log('✅ User data loaded successfully');
        setUser(response.data.user);
        setIsAuth(true);
        setLoading(false); // <-- Ensure loading is set to false on success
    } catch (error) {
        // Handle network errors gracefully
        if (error.code === 'ERR_NETWORK') {
            console.log('ℹ️ Cannot connect to server - user will remain logged out');
        } else if (error.response?.status === 401) {
            console.log('ℹ️ User not authenticated');
        } else {
            console.log('ℹ️ Error loading user data:', error.message);
        }
        // Don't throw error, just set user as not authenticated
        setIsAuth(false);
        setUser(null);
        setLoading(false); // <-- Ensure loading is set to false on error
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const value = {
    isAuth,
    user,
    loading,
    loadMe,
    setIsAuth,
    setUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};



