import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import CreatePGProfile from './pages/CreatePGProfile';
import ManageRooms from './pages/ManageRooms';
import ManageTenants from './pages/ManageTenants';
import ManageStaff from './pages/ManageStaff';
import StaffAttendance from './pages/StaffAttendance';
import StaffWork from './pages/StaffWork';
import StaffWorkDetails from './pages/StaffWorkDetails';
import ManageAccount from './pages/ManageAccount';
import VendorTransactions from './pages/VendorTransactions';
import Reports from './pages/Reports';
import Inventory from './pages/Inventory';
import Enquiry from './pages/Enquiry';
import Complain from './pages/Complain';
import RequestBox from './pages/RequestBox';
import Leave from './pages/Leave';
import Subscription from './pages/Subscription';
import PriceMenu from './pages/PriceMenu';
import UserProfile from './pages/UserProfile';
import StaffProfile from './pages/StaffProfile';
import Chat from './pages/Chat';
import Transportation from './pages/Transportation';
import Approvals from './pages/Approvals';
import HiredWorkers from './pages/HiredWorkers';
import AdminProfile from './pages/AdminProfile';
import AddTenant from './pages/AddTenant';
import MoveOutFlow from './pages/MoveOutFlow';
import MeterReading from './pages/MeterReading';
import VisitorLog from './pages/VisitorLog';
import MessHeadcount from './pages/MessHeadcount';
import StaffApp from './pages/StaffApp';

// Redirect helper
const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin' && !user.hasProfile) return <Navigate to="/create-pg-profile" replace />;
  if (user.role === 'staff') return <Navigate to="/staff-app" replace />;
  return <Navigate to={`/${user.role}-dashboard`} replace />;
};

// Admin-only route helper
const AdminRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={['admin']}>{children}</ProtectedRoute>
);

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

function AppRoutes() {
  return (
    <>
      <AndroidBackFix />
      <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* Admin Routes */}
      <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/create-pg-profile" element={<AdminRoute><CreatePGProfile /></AdminRoute>} />
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
      <Route path="/admin-profile" element={<AdminRoute><AdminProfile /></AdminRoute>} />
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
      <Route path="/move-out" element={<AdminRoute><MoveOutFlow /></AdminRoute>} />
      <Route path="/meter-reading" element={<AdminRoute><MeterReading /></AdminRoute>} />
      <Route path="/visitor-log" element={<AdminRoute><VisitorLog /></AdminRoute>} />
      <Route path="/mess-headcount" element={<AdminRoute><MessHeadcount /></AdminRoute>} />

      {/* Staff Routes */}
      <Route path="/staff-dashboard" element={<ProtectedRoute allowedRoles={['staff']}><StaffDashboard /></ProtectedRoute>} />
      <Route path="/staff-app" element={<ProtectedRoute allowedRoles={['staff']}><StaffApp /></ProtectedRoute>} />

      {/* Customer Routes */}
      <Route path="/customer-dashboard" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />

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
