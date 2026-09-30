import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingProvider, useLoading } from './context/LoadingContext';
import { App as CapacitorApp } from '@capacitor/app';
import './App.css';

// Import Screens
import StudentSplash from './screens/StudentSplash';
import SignUp from './screens/SignUp';
import LocationPermission from './screens/LocationPermission';
import OnboardingWizard from './screens/OnboardingWizard';
import StudentDashboard from './screens/StudentDashboard';
import Food from './screens/Food';
import Account from './screens/Account';
import Complaints from './screens/Complaints';
import RequestBox from './screens/RequestBox';
import Rating from './screens/Rating';
import Help from './screens/Help';
import Reminder from './screens/Reminder';
import MyProfile from './screens/MyProfile';
import RoomDescription from './screens/RoomDescription';
import Notifications from './screens/Notifications';
import LikedPGs from './screens/LikedPGs';
import AllPGs from './screens/AllPGs';
import ExplorePGs from './screens/ExplorePGs';
import { logAppEvent } from "./analytics";

import Cleaner from './screens/Cleaner';
import Transport from './screens/Transport';
import Visitor from './screens/Visitor';
import Chat from './screens/Chat';

export const TopBar = ({ title, showBack = true }) => {
  const navigate = useNavigate();
  return (
    <div className="top-bar">
      {showBack ? (
        <button className="back-button" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
      ) : <div style={{ width: 24 }}></div>}
      <h1 className="top-bar-title">{title}</h1>
    </div>
  );
};

// Route Helpers
const isApprovedResident = (user) => {
  return !!(user && user.hasPG && (user.subscribedPG?.status === 'Approved' || user.pgStatus === 'Current User' || user.pgStatus === 'Approved'));
};

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/signup" replace />;
  if (isApprovedResident(user)) return children;
  if (!user.hasLocation) return <Navigate to="/location-permission" replace />;
  if (!user.hasProfile) return <Navigate to="/onboarding" replace />;
  return children;
};

const AuthRedirect = ({ children }) => {
  const { user } = useAuth();
  const { loading } = useLoading();

  useEffect(() => {
    // Log app start
    logAppEvent('session_start', {});
  }, []);

  if (user) {
    if (isApprovedResident(user)) return <Navigate to="/student-dashboard" replace />;
    if (!user.hasLocation) return <Navigate to="/location-permission" replace />;
    if (!user.hasProfile) return <Navigate to="/onboarding" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
  return children;
};

const RequireLocation = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/signup" replace />;
  if (user.hasLocation) {
    if (user.hasProfile) return <Navigate to="/student-dashboard" replace />;
    return <Navigate to="/onboarding" replace />;
  }
  return children;
};

const RequireProfile = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/signup" replace />;
  if (!user.hasLocation) return <Navigate to="/location-permission" replace />;
  if (user.hasProfile) return <Navigate to="/student-dashboard" replace />;
  return children;
};

// Android hardware back button fix
function AndroidBackFix() {
  const navigate = useNavigate();
  useEffect(() => {
    const handleBackButton = () => {
      const rootPaths = ['/student-dashboard', '/signup', '/location-permission', '/onboarding', '/'];
      if (rootPaths.includes(window.location.pathname)) {
        CapacitorApp.exitApp();
      } else {
        navigate(-1);
      }
    };
    CapacitorApp.addListener('backButton', handleBackButton);
    
    return () => {
      CapacitorApp.removeAllListeners('backButton');
    };
  }, [navigate]);
  return null;
}

// Global Chat FAB – visible on every protected page except /profile and /chat
function ChatFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Hide on these paths
  const hiddenPaths = ['/profile', '/chat', '/signup', '/location-permission', '/onboarding', '/'];
  if (hiddenPaths.includes(location.pathname)) return null;

  // Only show when the user is logged in and has a subscribed PG (i.e. has someone to chat with)
  if (!user || !user.hasProfile) return null;

  return (
    <div
      onClick={() => navigate('/chat')}
      className="global-chat-fab"
      title="Chat with your PG"
    >
      <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 24 }}>chat</span>
    </div>
  );
}

function AppRoutes() {
  return (
    <>
      <AndroidBackFix />
      <ChatFAB />
      <Routes>
        <Route path="/" element={<AuthRedirect><StudentSplash /></AuthRedirect>} />
      <Route path="/signup" element={<AuthRedirect><SignUp /></AuthRedirect>} />
      
      <Route path="/location-permission" element={<RequireLocation><LocationPermission /></RequireLocation>} />
      <Route path="/onboarding" element={<RequireProfile><OnboardingWizard /></RequireProfile>} />
      
      <Route path="/student-dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      
      {/* Protected Other Screens */}
      <Route path="/food" element={<ProtectedRoute><Food /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
      <Route path="/complain" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
      <Route path="/request-box" element={<ProtectedRoute><RequestBox /></ProtectedRoute>} />
      <Route path="/rating" element={<ProtectedRoute><Rating /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
      <Route path="/reminder" element={<ProtectedRoute><Reminder /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
      <Route path="/room-description" element={<ProtectedRoute><RoomDescription /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/liked-pgs" element={<ProtectedRoute><LikedPGs /></ProtectedRoute>} />
      <Route path="/all-pgs" element={<ProtectedRoute><AllPGs /></ProtectedRoute>} />
      <Route path="/explore" element={<ProtectedRoute><ExplorePGs /></ProtectedRoute>} />
      <Route path="/cleaner" element={<ProtectedRoute><Cleaner /></ProtectedRoute>} />
      <Route path="/transport" element={<ProtectedRoute><Transport /></ProtectedRoute>} />
      <Route path="/visitor" element={<ProtectedRoute><Visitor /></ProtectedRoute>} />
      
      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <LoadingProvider>
            <AppRoutes />
          </LoadingProvider>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
