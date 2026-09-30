import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If they are logged in but don't have the right role, send to their specific dashboard
    return <Navigate to={`/${user.role}-dashboard`} replace />;
  }

  return children;
};

export default ProtectedRoute;
