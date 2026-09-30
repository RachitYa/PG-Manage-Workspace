import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SplashScreen from './components/SplashScreen';
import LoadingSpinner from './components/LoadingSpinner';

// --- Shared & Auth Pages ---
const Login = lazy(() => import('./pages/Login'));
const RoleSelection = lazy(() => import('./pages/RoleSelection'));
const StaffPinEntry = lazy(() => import('./pages/StaffPinEntry'));

// --- Admin Pages ---
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CreatePGProfile = lazy(() => import('./pages/CreatePGProfile'));
const ManageRooms = lazy(() => import('./pages/ManageRooms'));
const ManageTenants = lazy(() => import('./pages/ManageTenants'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const ManageStaff = lazy(() => import('./pages/ManageStaff'));
const StaffProfile = lazy(() => import('./pages/StaffProfile'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const StaffAttendance = lazy(() => import('./pages/StaffAttendance'));
const StaffWork = lazy(() => import('./pages/StaffWork'));
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

// --- Customer Pages ---
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));

// --- Staff App Pages ---
const StaffAppDashboard = lazy(() => import('./pages/staff/StaffDashboard'));
const StaffAppAttendance = lazy(() => import('./pages/staff/Attendance'));
const StaffAppApplyLeave = lazy(() => import('./pages/staff/ApplyLeave'));
const StaffAppSalaryHistory = lazy(() => import('./pages/staff/SalaryHistory'));
const StaffAppDailyTask = lazy(() => import('./pages/staff/DailyTask'));
const StaffAppInOut = lazy(() => import('./pages/staff/InOut'));
const StaffAppProfile = lazy(() => import('./pages/staff/StaffProfile'));
const StaffAppReview = lazy(() => import('./pages/staff/Review'));
const StaffAppHelp = lazy(() => import('./pages/staff/Help'));
const StaffAppNotification = lazy(() => import('./pages/staff/Notification'));
const StaffAppKitchenMenu = lazy(() => import('./pages/staff/KitchenMenu'));
const StaffAppSalesInventory = lazy(() => import('./pages/staff/SalesInventory'));
const StaffAppAddTenant = lazy(() => import('./pages/staff/AddTenant'));

// Redirect helper
const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.role) return <Navigate to="/role-selection" replace />;
  
  if (user.role === 'admin') {
    if (!user.hasProfile) return <Navigate to="/create-pg-profile" replace />;
    return <Navigate to="/admin-dashboard" replace />;
  }
  
  if (user.role === 'staff') {
    return <Navigate to="/staff-pin" replace />;
  }
  
  return <Navigate to={`/${user.role}-dashboard`} replace />;
};

// Admin-only route helper
const AdminRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={['admin']}>{children}</ProtectedRoute>
);

// Staff-only route helper (Requires Firebase user.role === 'staff' AND local staff role)
const StaffRoute = ({ children }) => {
  const localStaffRole = localStorage.getItem('febebo_staff_role');
  return (
    <ProtectedRoute allowedRoles={['staff']}>
      {localStaffRole ? children : <Navigate to="/staff-pin" replace />}
    </ProtectedRoute>
  );
};

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/role-selection" element={<ProtectedRoute allowedRoles={null}><RoleSelection /></ProtectedRoute>} />
        <Route path="/staff-pin" element={<ProtectedRoute allowedRoles={['staff']}><StaffPinEntry /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/create-pg-profile" element={<AdminRoute><CreatePGProfile /></AdminRoute>} />
        <Route path="/manage-rooms" element={<AdminRoute><ManageRooms /></AdminRoute>} />
        <Route path="/my-profile" element={<AdminRoute><MyProfile /></AdminRoute>} />
        <Route path="/manage-tenants" element={<AdminRoute><ManageTenants /></AdminRoute>} />
        <Route path="/user/:id" element={<AdminRoute><UserProfile /></AdminRoute>} />
        <Route path="/manage-staff" element={<AdminRoute><ManageStaff /></AdminRoute>} />
        <Route path="/admin/staff/:id" element={<AdminRoute><StaffProfile /></AdminRoute>} />
        <Route path="/staff-attendance" element={<AdminRoute><StaffAttendance /></AdminRoute>} />
        <Route path="/staff-work" element={<AdminRoute><StaffWork /></AdminRoute>} />
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

        {/* Staff App Routes */}
        <Route path="/staff-dashboard" element={<StaffRoute><StaffAppDashboard /></StaffRoute>} />
        <Route path="/attendance" element={<StaffRoute><StaffAppAttendance /></StaffRoute>} />
        <Route path="/apply-leave" element={<StaffRoute><StaffAppApplyLeave /></StaffRoute>} />
        <Route path="/salary" element={<StaffRoute><StaffAppSalaryHistory /></StaffRoute>} />
        <Route path="/daily-task" element={<StaffRoute><StaffAppDailyTask /></StaffRoute>} />
        <Route path="/in-out" element={<StaffRoute><StaffAppInOut /></StaffRoute>} />
        <Route path="/profile" element={<StaffRoute><StaffAppProfile /></StaffRoute>} />
        <Route path="/review" element={<StaffRoute><StaffAppReview /></StaffRoute>} />
        <Route path="/help" element={<StaffRoute><StaffAppHelp /></StaffRoute>} />
        <Route path="/notification" element={<StaffRoute><StaffAppNotification /></StaffRoute>} />
        <Route path="/kitchen-menu" element={<StaffRoute><StaffAppKitchenMenu /></StaffRoute>} />
        <Route path="/pg-inventory" element={<StaffRoute><StaffAppSalesInventory /></StaffRoute>} />
        <Route path="/add-tenant" element={<StaffRoute><StaffAppAddTenant /></StaffRoute>} />

        {/* Customer Routes */}
        <Route path="/customer-dashboard" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fff', color: '#000', minHeight: '100vh', wordWrap: 'break-word' }}>
          <h2 style={{ color: 'red' }}>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary>Click for error details</summary>
            <br />
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <SplashScreen>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </SplashScreen>
    </ErrorBoundary>
  );
}

export default App;
