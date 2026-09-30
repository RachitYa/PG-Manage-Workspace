import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Building2, AlertCircle, LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'tenants'));
        
        // Fetch PG owners
        const pgSnap = await getDocs(collection(db, 'pg_owners'));
        const pgOwners = pgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const adminPromises = pgOwners.map(pg => getDoc(doc(db, 'admins', pg.id)));
        const adminSnaps = await Promise.all(adminPromises);
        
        let pendingCount = 0;
        adminSnaps.forEach(adminDoc => {
          if (adminDoc.exists()) {
            const data = adminDoc.data();
            if (data.isApproved === false || data.isApproved === undefined) {
              pendingCount++;
            }
          } else {
            pendingCount++;
          }
        });

        setStats({
          totalUsers: usersSnap.size,
          totalAdmins: pgSnap.size,
          pendingApprovals: pendingCount,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const fallbackTimer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(fallbackTimer);
  }, []);

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="animate-slide-up pb-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
          <LayoutDashboard className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
          Platform Overview
        </h1>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-5 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="p-4 bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-600 rounded-2xl shadow-sm border border-blue-200/50">
            <Users className="w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Students</p>
            <p className="text-3xl font-extrabold text-gray-900">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-5 group relative overflow-hidden" style={{ animationDelay: '100ms' }}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="p-4 bg-gradient-to-tr from-emerald-100 to-green-100 text-emerald-600 rounded-2xl shadow-sm border border-emerald-200/50">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total PG Owners</p>
            <p className="text-3xl font-extrabold text-gray-900">{stats.totalAdmins}</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-5 group relative overflow-hidden" style={{ animationDelay: '200ms' }}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="p-4 bg-gradient-to-tr from-orange-100 to-red-100 text-orange-600 rounded-2xl shadow-sm border border-orange-200/50">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pending Approvals</p>
            <p className="text-3xl font-extrabold text-gray-900">{stats.pendingApprovals}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
