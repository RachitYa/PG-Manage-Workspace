import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PGOwners from './pages/PGOwners';
import PGOwnerDetails from './pages/PGOwnerDetails';
import Students from './pages/Students';
import StudentDetails from './pages/StudentDetails';
import Analytics from './pages/Analytics';
import SystemAnalytics from './pages/SystemAnalytics';
import Finances from './pages/Finances';
import Broadcasts from './pages/Broadcasts';
import Complaints from './pages/Complaints';
import StaffOverview from './pages/StaffOverview';
import EcosystemMap from './pages/EcosystemMap';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('superadmin_auth') === 'true'
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login setAuthenticated={setIsAuthenticated} />
          } 
        />
        <Route element={<Layout isAuthenticated={isAuthenticated} setAuthenticated={setIsAuthenticated} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/system-analytics" element={<SystemAnalytics />} />
          <Route path="/finances" element={<Finances />} />
          <Route path="/pg-owners" element={<PGOwners />} />
          <Route path="/pg-owners/:id" element={<PGOwnerDetails />} />
          <Route path="/students" element={<Students />} />
          <Route path="/students/:id" element={<StudentDetails />} />
          <Route path="/staff" element={<StaffOverview />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/broadcasts" element={<Broadcasts />} />
          <Route path="/ecosystem-map" element={<EcosystemMap />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
