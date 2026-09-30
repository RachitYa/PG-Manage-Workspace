import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, logout } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If the role is unsupported by this client app, log out to prevent redirect loops
    if (user.role !== 'staff' && user.role !== 'customer') {
      logout();
      return <Navigate to="/login" replace />;
    }
    // If they are logged in but don't have the right role, send to their specific dashboard
    return <Navigate to={`/${user.role}-dashboard`} replace />;
  }

  return children;
};

export default ProtectedRoute;
