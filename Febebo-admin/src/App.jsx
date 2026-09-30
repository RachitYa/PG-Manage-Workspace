import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import GlobalEnquiryListener from './components/GlobalEnquiryListener';
import PushNotificationSetup from './components/PushNotificationSetup';
import { logAppEvent } from './analytics';

// Pages
const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const CreatePGProfile = lazy(() => import('./pages/CreatePGProfile'));
const PendingScreen = lazy(() => import('./pages/PendingScreen'));
const ManageRooms = lazy(() => import('./pages/ManageRooms'));
const ManageTenants = lazy(() => import('./pages/ManageTenants'));
const ManageStaff = lazy(() => import('./pages/ManageStaff'));
const StaffAttendance = lazy(() => import('./pages/StaffAttendance'));
const StaffWork = lazy(() => import('./pages/StaffWork'));
const StaffWorkDetails = lazy(() => import('./pages/StaffWorkDetails'));
const ManageAccount = lazy(() => import('./pages/ManageAccount'));
const VendorTransactions = lazy(() => import('./pages/VendorTransactions'));
const Reports = lazy(() => import('./pages/Reports'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Enquiry = lazy(() => import('./pages/Enquiry'));
const Complain = lazy(() => import('./pages/Complain'));
const RequestBox = lazy(() => import('./pages/RequestBox'));
const Leave = lazy(() => import('./pages/Leave'));
const Subscription = lazy(() => import('./pages/Subscription'));
const PriceMenu = lazy(() => import('./pages/PriceMenu'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const StaffProfile = lazy(() => import('./pages/StaffProfile'));
const Chat = lazy(() => import('./pages/Chat'));
const Transportation = lazy(() => import('./pages/Transportation'));
const Approvals = lazy(() => import('./pages/Approvals'));
const HiredWorkers = lazy(() => import('./pages/HiredWorkers'));
const AssignWork = lazy(() => import('./pages/AssignWork'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const AddTenant = lazy(() => import('./pages/AddTenant'));
const AlreadyResidence = lazy(() => import('./pages/AlreadyResidence'));
const MoveOutFlow = lazy(() => import('./pages/MoveOutFlow'));
const HelpSupport = lazy(() => import('./pages/HelpSupport'));
const MeterReading = lazy(() => import('./pages/MeterReading'));
const VisitorLog = lazy(() => import('./pages/VisitorLog'));
const MeterHistory = lazy(() => import('./pages/MeterHistory'));
const MessHeadcount = lazy(() => import('./pages/MessHeadcount'));
const StaffApp = lazy(() => import('./pages/StaffApp'));

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
import { App as CapacitorApp } from '@capacitor/app';

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
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
