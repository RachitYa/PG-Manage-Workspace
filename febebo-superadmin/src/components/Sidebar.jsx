import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Building2, LogOut, Shield, 
  BarChart3, DollarSign, Briefcase, AlertOctagon, Megaphone, Database, Map 
} from 'lucide-react';

import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function Sidebar({ setAuthenticated, sidebarOpen, setSidebarOpen }) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('superadmin_auth');
    setAuthenticated(false);
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/analytics', icon: BarChart3, label: 'Platform Analytics' },
    { to: '/system-analytics', icon: Database, label: 'System & DB Analytics' },
    { to: '/ecosystem-map', icon: Map, label: 'Ecosystem Map' },
    { to: '/finances', icon: DollarSign, label: 'Finances' },
    { to: '/pg-owners', icon: Building2, label: 'PG Owners' },
    { to: '/students', icon: Users, label: 'Students' },
    { to: '/staff', icon: Briefcase, label: 'Staff Overview' },
    { to: '/complaints', icon: AlertOctagon, label: 'Complaints' },
    { to: '/broadcasts', icon: Megaphone, label: 'Broadcasts' },
  ];

  return (
    <div className={`w-[280px] glass h-screen flex flex-col fixed left-0 top-0 border-r border-white/40 shadow-xl shadow-blue-900/5 z-[70] transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="p-8 flex items-center justify-between border-b border-gray-200/50">
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight mt-2">
            Febebo HQ
          </span>
        </div>
      </div>
      
      <div className="flex-1 px-5 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-semibold transition-all duration-300 relative group overflow-hidden ${
                isActive 
                  ? 'text-blue-700 bg-blue-50/80 shadow-sm border border-blue-100/50' 
                  : 'text-gray-600 hover:bg-gray-100/50 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full" />
                )}
                <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110 text-blue-600' : 'group-hover:scale-110 group-hover:text-gray-900'}`} />
                <span className="z-10">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="p-5 border-t border-gray-200/50">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 px-4 py-3.5 w-full text-red-600 hover:bg-red-50/80 rounded-xl font-semibold transition-all duration-300 cursor-pointer border border-transparent hover:border-red-100 group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Secure Logout
        </button>
      </div>
    </div>
  );
}
