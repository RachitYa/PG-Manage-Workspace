import React, { useEffect, Suspense, lazy, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import GlobalEnquiryListener from './components/GlobalEnquiryListener';
import PushNotificationSetup from './components/PushNotificationSetup';
import { logAppEvent } from './analytics';
import { App as CapacitorApp } from '@capacitor/app';

// Robust dynamic import with auto-retry and chunk mismatch handling
function lazyWithRetry(componentImport) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.warn("Retrying dynamic module load...", error);
      const isRetried = window.sessionStorage.getItem('retry-lazy-refresh');
      if (!isRetried) {
        window.sessionStorage.setItem('retry-lazy-refresh', 'true');
        window.location.reload();
        return { default: () => <LoadingSpinner /> };
      }
      window.sessionStorage.removeItem('retry-lazy-refresh');
      throw error;
    }
  });
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', background: '#f8fafc', fontFamily: 'sans-serif' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32 }}>refresh</span>
          </div>
          <h2 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: 20, fontWeight: 800 }}>Loading Update...</h2>
          <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14, maxWidth: 360 }}>
            An update was made to the app. Tap reload to refresh the latest version smoothly.
          </p>
          <button
            onClick={() => {
              window.sessionStorage.removeItem('retry-lazy-refresh');
              window.location.reload();
            }}
            style={{ padding: '12px 24px', background: '#0891b2', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Pages
const Login = lazyWithRetry(() => import('./pages/Login'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const StaffDashboard = lazyWithRetry(() => import('./pages/StaffDashboard'));
const CustomerDashboard = lazyWithRetry(() => import('./pages/CustomerDashboard'));
const CreatePGProfile = lazyWithRetry(() => import('./pages/CreatePGProfile'));
const PendingScreen = lazyWithRetry(() => import('./pages/PendingScreen'));
const ManageRooms = lazyWithRetry(() => import('./pages/ManageRooms'));
const ManageTenants = lazyWithRetry(() => import('./pages/ManageTenants'));
const ManageStaff = lazyWithRetry(() => import('./pages/ManageStaff'));
const StaffAttendance = lazyWithRetry(() => import('./pages/StaffAttendance'));
const StaffWork = lazyWithRetry(() => import('./pages/StaffWork'));
const StaffWorkDetails = lazyWithRetry(() => import('./pages/StaffWorkDetails'));
const ManageAccount = lazyWithRetry(() => import('./pages/ManageAccount'));
const VendorTransactions = lazyWithRetry(() => import('./pages/VendorTransactions'));
const Reports = lazyWithRetry(() => import('./pages/Reports'));
const Inventory = lazyWithRetry(() => import('./pages/Inventory'));
const Enquiry = lazyWithRetry(() => import('./pages/Enquiry'));
const Complain = lazyWithRetry(() => import('./pages/Complain'));
const RequestBox = lazyWithRetry(() => import('./pages/RequestBox'));
const Leave = lazyWithRetry(() => import('./pages/Leave'));
const Subscription = lazyWithRetry(() => import('./pages/Subscription'));
const PriceMenu = lazyWithRetry(() => import('./pages/PriceMenu'));
const UserProfile = lazyWithRetry(() => import('./pages/UserProfile'));
const StaffProfile = lazyWithRetry(() => import('./pages/StaffProfile'));
const Chat = lazyWithRetry(() => import('./pages/Chat'));
const Transportation = lazyWithRetry(() => import('./pages/Transportation'));
const Approvals = lazyWithRetry(() => import('./pages/Approvals'));
const HiredWorkers = lazyWithRetry(() => import('./pages/HiredWorkers'));
const AssignWork = lazyWithRetry(() => import('./pages/AssignWork'));
const AdminProfile = lazyWithRetry(() => import('./pages/AdminProfile'));
const MyProfile = lazyWithRetry(() => import('./pages/MyProfile'));
const AddTenant = lazyWithRetry(() => import('./pages/AddTenant'));
const AlreadyResidence = lazyWithRetry(() => import('./pages/AlreadyResidence'));
const MoveOutFlow = lazyWithRetry(() => import('./pages/MoveOutFlow'));
const HelpSupport = lazyWithRetry(() => import('./pages/HelpSupport'));
const MeterReading = lazyWithRetry(() => import('./pages/MeterReading'));
const VisitorLog = lazyWithRetry(() => import('./pages/VisitorLog'));
const MeterHistory = lazyWithRetry(() => import('./pages/MeterHistory'));
const MessHeadcount = lazyWithRetry(() => import('./pages/MessHeadcount'));
const MealAuditLog = lazyWithRetry(() => import('./pages/MealAuditLog'));
const DeliveryOrders = lazyWithRetry(() => import('./pages/DeliveryOrders'));
const StaffApp = lazyWithRetry(() => import('./pages/StaffApp'));

// Redirect helper
const RootRedirect = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    logAppEvent('session_start', {});
  }, []);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') {
    if (!user.hasProfile) return <Navigate to="/create-pg-profile" replace />;
    if (!user.isApproved) return <Navigate to="/pending-approval" replace />;
  }
  if (user.role === 'staff') return <Navigate to="/staff-app" replace />;
  return <Navigate to={`/${user.role}-dashboard`} replace />;
};

// Admin-only route helper (Requires Profile & Approval)
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace />;
  if (!user.hasProfile) return <Navigate to="/create-pg-profile" replace />;
  if (!user.isApproved) return <Navigate to="/pending-approval" replace />;
  return children;
};

// Android hardware back button fix
function AndroidBackFix() {
  const navigate = useNavigate();
  useEffect(() => {
    const handleBackButton = () => {
      const rootPaths = ['/admin-dashboard', '/staff-dashboard', '/login', '/create-pg-profile', '/pending-approval', '/'];
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

function AppRoutes() {
  return (
    <>
      <AndroidBackFix />
      <GlobalEnquiryListener />
      <PushNotificationSetup />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />

        {/* Pre-Approval Admin Routes */}
        <Route path="/create-pg-profile" element={<ProtectedRoute allowedRoles={['admin']}><CreatePGProfile /></ProtectedRoute>} />
        <Route path="/pending-approval" element={<ProtectedRoute allowedRoles={['admin']}><PendingScreen /></ProtectedRoute>} />

        {/* Approved Admin Routes */}
        <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/manage-rooms" element={<AdminRoute><ManageRooms /></AdminRoute>} />
        <Route path="/manage-tenants" element={<AdminRoute><ManageTenants /></AdminRoute>} />
        <Route path="/user/:id" element={<AdminRoute><UserProfile /></AdminRoute>} />
        <Route path="/manage-staff" element={<AdminRoute><ManageStaff /></AdminRoute>} />
        <Route path="/staff/:id" element={<AdminRoute><StaffProfile /></AdminRoute>} />
        <Route path="/staff-attendance" element={<AdminRoute><StaffAttendance /></AdminRoute>} />
        <Route path="/staff-work" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><StaffWork /></ProtectedRoute>} />
        <Route path="/staff-work/:id" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><StaffWorkDetails /></ProtectedRoute>} />
        <Route path="/approvals" element={<AdminRoute><Approvals /></AdminRoute>} />
        <Route path="/hired-workers" element={<AdminRoute><HiredWorkers /></AdminRoute>} />
        <Route path="/assign-work" element={<AdminRoute><AssignWork /></AdminRoute>} />
        <Route path="/admin-profile" element={<AdminRoute><AdminProfile /></AdminRoute>} />
        <Route path="/my-profile" element={<AdminRoute><MyProfile /></AdminRoute>} />
        <Route path="/manage-account" element={<AdminRoute><ManageAccount /></AdminRoute>} />
        <Route path="/vendor-transactions" element={<AdminRoute><VendorTransactions /></AdminRoute>} />
        <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={['admin', 'customer']}><Inventory /></ProtectedRoute>} />
        <Route path="/enquiry" element={<AdminRoute><Enquiry /></AdminRoute>} />
        <Route path="/complain" element={<AdminRoute><Complain /></AdminRoute>} />
        <Route path="/request-box" element={<AdminRoute><RequestBox /></AdminRoute>} />
        <Route path="/leave" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><Leave /></ProtectedRoute>} />
        <Route path="/subscription" element={<AdminRoute><Subscription /></AdminRoute>} />
        <Route path="/price-menu" element={<AdminRoute><PriceMenu /></AdminRoute>} />
        <Route path="/chat" element={<AdminRoute><Chat /></AdminRoute>} />
        <Route path="/transportation" element={<AdminRoute><Transportation /></AdminRoute>} />
        <Route path="/add-tenant" element={<AdminRoute><AddTenant /></AdminRoute>} />
        <Route path="/already-residence" element={<AdminRoute><AlreadyResidence /></AdminRoute>} />
        <Route path="/move-out" element={<AdminRoute><MoveOutFlow /></AdminRoute>} />
        <Route path="/meter-reading" element={<AdminRoute><MeterReading /></AdminRoute>} />
        <Route path="/meter-history/:id" element={<AdminRoute><MeterHistory /></AdminRoute>} />
        <Route path="/visitor-log" element={<AdminRoute><VisitorLog /></AdminRoute>} />
        <Route path="/mess-headcount" element={<AdminRoute><MessHeadcount /></AdminRoute>} />
        <Route path="/meal-audit-log" element={<AdminRoute><MealAuditLog /></AdminRoute>} />
        <Route path="/delivery-orders" element={<AdminRoute><DeliveryOrders /></AdminRoute>} />
        <Route path="/help" element={<AdminRoute><HelpSupport /></AdminRoute>} />

        {/* Staff Routes */}
        <Route path="/staff-dashboard" element={<ProtectedRoute allowedRoles={['staff']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff-app" element={<ProtectedRoute allowedRoles={['staff']}><StaffApp /></ProtectedRoute>} />

        {/* Customer Routes */}
        <Route path="/customer-dashboard" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
