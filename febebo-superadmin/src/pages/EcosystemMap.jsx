import { useState, useEffect } from 'react';
import { Map, MapPin, Users, Building2, Search, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function EcosystemMap() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    let authTimeout;

    const fetchMapData = async (user) => {
      if (!user) {
        if (isMounted) {
          setError('User not authenticated');
          setLoading(false);
        }
        return;
      }
      try {
        const token = await user.getIdToken();
        const response = await fetch(`http://${window.location.hostname}:3000/api/ecosystem-map`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        if (isMounted) {
          if (result.success) setData(result.data);
          else setError(result.error || 'Failed to fetch map data');
        }
      } catch (err) {
        if (isMounted) {
          console.error("Fetch error:", err);
          setError('Network error connecting to backend API');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // If auth is already initialized, use it immediately
    if (auth.currentUser) {
      fetchMapData(auth.currentUser);
    } else {
      // Otherwise wait, but with a timeout in case IndexedDB is locked
      authTimeout = setTimeout(() => {
        if (isMounted && loading) {
          setError('Authentication timed out. Please clear your browser cache or use Incognito mode.');
          setLoading(false);
        }
      }, 5000);

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        clearTimeout(authTimeout);
        fetchMapData(user);
      });
      return () => {
        isMounted = false;
        clearTimeout(authTimeout);
        unsubscribe();
      };
    }

    return () => {
      isMounted = false;
      clearTimeout(authTimeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl shadow-sm border border-red-100 max-w-lg text-center">
          <p className="font-bold text-lg mb-2">Error Loading Map</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const filteredMap = data?.map?.filter(pg => {
    const locString = pg.location?.city || pg.location?.address || '';
    return (
      (pg.pgName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      locString.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pg.residents.some(r => (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight flex items-center gap-3">
            <Map className="w-8 h-8 text-blue-600" />
            Ecosystem Map
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Relational overview of Students and PG Assignments</p>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full md:w-80 pl-10 pr-4 py-2.5 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 shadow-sm"
            placeholder="Search PGs, Locations, or Students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Global Stats Overview */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{data.stats.totalStudents}</p>
            </div>
          </div>
          <div className="glass-card p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total PGs</p>
              <p className="text-2xl font-bold text-gray-900">{data.stats.totalPGs}</p>
            </div>
          </div>
          <div className="glass-card p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-xl text-green-600">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Est. DAU</p>
              <p className="text-2xl font-bold text-gray-900">{data.stats.estimatedDailyActiveUsers}</p>
            </div>
          </div>
          <div className="glass-card p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Top Area</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{data.stats.mostPopularSearchArea}</p>
            </div>
          </div>
        </div>
      )}

      {/* Map Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMap.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white/50 rounded-2xl border border-gray-100">
            <p className="text-gray-500 font-medium">No relational data found.</p>
          </div>
        ) : (
          filteredMap.map((pg) => (
            <div key={pg.pgId} className="glass-card rounded-2xl shadow-sm border border-white/20 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-transparent">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{pg.pgName}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {pg.location?.city || pg.location?.address || 'Unknown Location'}
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200">
                    {pg.residents.length} Residents
                  </span>
                </div>
              </div>
              
              <div className="p-0">
                {pg.residents.length === 0 ? (
                  <div className="p-5 text-center text-sm text-gray-400">
                    No students mapped to this PG yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {pg.residents.map((res, idx) => (
                      <li key={idx} className="p-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                            {res.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{res.name}</p>
                            <p className="text-xs text-gray-500">{res.phone}</p>
                          </div>
                        </div>
                        {res.hasPaidToken ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                            <ShieldCheck className="w-3 h-3" />
                            Token Paid
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                            Pending
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
