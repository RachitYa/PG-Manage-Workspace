import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import StaffApp from './pages/StaffApp';
import StaffOnboarding from './pages/StaffOnboarding';
import PushNotificationSetup from './components/PushNotificationSetup';

// Redirect helper
const RootRedirect = () => {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'staff') {
    logout();
    return <Navigate to="/login" replace />;
  }
  if (!user.hasProfile) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Navigate to="/staff-app" replace />;
};



// Android hardware back button fix
function AndroidBackFix() {
  const navigate = useNavigate();
  useEffect(() => {
    // Push a state so the back button has something to pop
    window.history.pushState({ page: 'app' }, '');
    const handler = (e) => {
      e.preventDefault();
      navigate(-1);
      // Re-push so next back press also works
      setTimeout(() => window.history.pushState({ page: 'app' }, ''), 0);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [navigate]);
  return null;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("App Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding:20, background:'#fee2e2', color:'#991b1b', height:'100vh', overflowY:'auto'}}>
          <h2>Something went wrong (App Crash)</h2>
          <pre style={{fontSize:12, whiteSpace:'pre-wrap'}}>{this.state.error?.toString()}</pre>
          <pre style={{fontSize:10, whiteSpace:'pre-wrap'}}>{this.state.errorInfo?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  return (
    <>
      <AndroidBackFix />
      <PushNotificationSetup />
      <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* Staff Routes */}
      <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['staff']}><StaffOnboarding /></ProtectedRoute>} />
      <Route path="/staff-app" element={<ProtectedRoute allowedRoles={['staff']}><ErrorBoundary><StaffApp /></ErrorBoundary></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
