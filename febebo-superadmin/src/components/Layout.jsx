import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState } from 'react';
import { Menu } from 'lucide-react';

export default function Layout({ isAuthenticated, setAuthenticated }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex font-sans animate-fade-in relative bg-[#f8fafc]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass z-[60] border-b border-gray-200/50 flex items-center justify-between px-5 shadow-sm">
        <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight shrink-0">
          Febebo HQ
        </span>
        <button 
          onClick={() => setSidebarOpen(true)} 
          className="p-3 text-gray-700 bg-white/60 hover:bg-white rounded-xl shadow-sm border border-gray-100 transition-colors cursor-pointer relative z-[70]"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-[55] lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar setAuthenticated={setAuthenticated} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <main className="flex-1 lg:ml-[280px] p-5 pt-24 lg:p-10 overflow-y-auto h-screen relative z-10 w-full">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
