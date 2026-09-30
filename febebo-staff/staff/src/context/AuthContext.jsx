import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking local storage for an existing session
    const storedUser = localStorage.getItem('febebo_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (mobileOrUsername, role = 'admin', extraData = {}) => {
    // Dummy login logic: Admin lacks profile initially for demo purposes
    const hasProfile = role !== 'admin'; 
    const dummyUser = { 
      id: extraData.id || Date.now(), 
      mobile: mobileOrUsername, 
      username: mobileOrUsername,
      role, 
      staffRole: extraData.staffRole || (role === 'staff' ? 'Cook' : null),
      name: extraData.name || (role === 'admin' ? 'PG Admin Owner' : 'Staff Member'),
      hasProfile 
    };
    setUser(dummyUser);
    localStorage.setItem('febebo_user', JSON.stringify(dummyUser));
  };

  const completeProfile = () => {
    if (user) {
      const updatedUser = { ...user, hasProfile: true };
      setUser(updatedUser);
      localStorage.setItem('febebo_user', JSON.stringify(updatedUser));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('febebo_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, completeProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

