import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Database, HardDrive, Users, Activity, TrendingUp, Server, ShieldAlert, CloudCog, Fingerprint } from 'lucide-react';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export default function SystemAnalytics() {
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const [stats, setStats] = useState({
    totalDocs: 0,
    collections: {
      admins: 0,
      pgOwners: 0,
      tenants: 0,
      complaints: 0,
      broadcasts: 0,
      staff: 0
    }
  });
  const [cloudStats, setCloudStats] = useState({
    reads: 'N/A',
    writes: 'N/A',
    totalUsers: 'N/A'
  });
  const [cloudError, setCloudError] = useState(null);
  const [showCloudModal, setShowCloudModal] = useState(false);

  useEffect(() => {
    const fetchDatabaseScale = async () => {
      try {
        const collectionsToFetch = [
          { key: 'admins', ref: collection(db, 'admins') },
          { key: 'pgOwners', ref: collection(db, 'pg_owners') },
          { key: 'tenants', ref: collection(db, 'tenants') },
          { key: 'complaints', ref: collection(db, 'complaints') },
          { key: 'broadcasts', ref: collection(db, 'broadcasts') },
          { key: 'staff', ref: collection(db, 'staff') }
        ];

        const results = await Promise.allSettled(
          collectionsToFetch.map(c => getDocs(c.ref))
        );

        const counts = {
          admins: results[0].status === 'fulfilled' ? results[0].value.size : 0,
          pgOwners: results[1].status === 'fulfilled' ? results[1].value.size : 0,
          tenants: results[2].status === 'fulfilled' ? results[2].value.size : 0,
          complaints: results[3].status === 'fulfilled' ? results[3].value.size : 0,
          broadcasts: results[4].status === 'fulfilled' ? results[4].value.size : 0,
          staff: results[5].status === 'fulfilled' ? results[5].value.size : 0
        };

        const totalDocs = Object.values(counts).reduce((a, b) => a + b, 0);

        setStats({ totalDocs, collections: counts });
      } catch (error) {
        console.error('Error fetching database scale:', error);
      }
    };

    fetchDatabaseScale();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCloudError("You must be logged in to fetch metrics.");
        setLoading(false);
        return;
      }

      try {
        // Get the secure token for the current superadmin
        const token = await user.getIdToken();
        const response = await fetch(`http://${window.location.hostname}:3000/api/analytics`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        
        if (result.success && result.data) {
          setCloudStats({
            reads: result.data.reads.toLocaleString(),
            writes: result.data.writes.toLocaleString(),
            totalUsers: result.data.totalUsers.toLocaleString()
          });
          setCloudError(null);
        } else {
          console.error("Backend Error:", result.error);
          setCloudError(result.error || "Failed to fetch metrics. Are you logged in as the Superadmin?");
        }
      } catch (error) {
        console.error('Error fetching cloud metrics.', error);
        setCloudError(error.message || "Backend server is not running or unreachable (Port 3000).");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // We always enforce the lock now, as requested.
  }, []);

  const generateRandomBuffer = () => {
    const buffer = new Uint8Array(32);
    window.crypto.getRandomValues(buffer);
    return buffer;
  };

  const handleBiometricUnlock = async () => {
    setBiometricError('');
    try {
      if (Capacitor.isNativePlatform()) {
        await NativeBiometric.verifyIdentity({
          reason: "Access secure database metrics",
          title: "Febebo Analytics Lock"
        });
        setIsUnlocked(true);
      } else {
        const publicKey = {
          challenge: generateRandomBuffer(),
          rpId: window.location.hostname,
          userVerification: "required",
          timeout: 60000
        };
        const assertion = await navigator.credentials.get({ publicKey });
        if (assertion) {
          setIsUnlocked(true);
        }
      }
    } catch (err) {
      console.error(err);
      setBiometricError('Biometric verification failed. Please try again or use another method.');
    }
  };

  const billingCards = [
    { title: 'Total Auth Users', value: cloudStats.totalUsers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'Monthly Active Users', value: cloudStats.totalUsers, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { title: 'Firebase Reads (24h)', value: cloudStats.reads, icon: Database, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Firebase Writes (24h)', value: cloudStats.writes, icon: HardDrive, color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { title: 'Billable Operations', value: 'Active', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Load Connections', value: 'Healthy', icon: Server, color: 'text-orange-600', bg: 'bg-orange-100' }
  ];

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-8 glass-card rounded-3xl text-center space-y-6 animate-fade-in shadow-xl">
        <div className="bg-red-50 text-red-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse shadow-inner">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Restricted Area</h2>
        <p className="text-gray-500 font-medium pb-4">
          System & DB Analytics contain highly sensitive infrastructure data. Please verify your identity to proceed.
        </p>
        
        {localStorage.getItem('biometrics_enabled') !== 'true' && (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-xl text-sm font-medium mb-4">
            ⚠️ You haven't set up Fingerprint access yet. <br/>
            Please click "Secure Logout" in the sidebar and log back in to register your fingerprint.
          </div>
        )}
        
        {biometricError && (
          <p className="text-red-500 text-sm font-bold bg-red-50 py-2 px-4 rounded-lg">{biometricError}</p>
        )}

        <button
          onClick={handleBiometricUnlock}
          className="w-full flex flex-col items-center justify-center gap-3 bg-gradient-to-tr from-blue-50 to-indigo-50 border-2 border-blue-200 hover:border-blue-400 rounded-2xl p-6 transition-all duration-300 group cursor-pointer"
        >
          <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300 text-blue-600">
            <Fingerprint className="w-10 h-10" />
          </div>
          <div className="text-center">
            <span className="block font-extrabold text-gray-900 text-lg">Verify with Fingerprint</span>
            <span className="block text-sm font-medium text-gray-500 mt-1">Tap to unlock dashboard</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-slide-up">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
          <Database className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">System & DB Analytics</h1>
      </div>

      {/* Real Firestore Scale Data */}
      <div className="mb-12">
        <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-gray-500" /> Real-time Database Scale
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Managed Documents</p>
              <p className="text-5xl font-extrabold text-gray-900 mb-3">{stats.totalDocs.toLocaleString()}</p>
              <p className="text-xs font-bold text-green-700 mt-2 bg-green-50 border border-green-200 inline-block px-3 py-1.5 rounded-xl shadow-sm">Across all core collections</p>
            </div>
          </div>
          
          <div className="glass-card p-7 rounded-3xl shadow-sm lg:col-span-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">Document Distribution</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {[
                { label: 'Admin Accounts', count: stats.collections.admins, color: 'text-blue-600' },
                { label: 'PG Profiles', count: stats.collections.pgOwners, color: 'text-indigo-600' },
                { label: 'Tenants', count: stats.collections.tenants, color: 'text-purple-600' },
                { label: 'Staff Records', count: stats.collections.staff, color: 'text-pink-600' },
                { label: 'Complaints', count: stats.collections.complaints, color: 'text-orange-600' },
                { label: 'Broadcasts', count: stats.collections.broadcasts, color: 'text-teal-600' }
              ].map((col, i) => (
                <div key={col.label} className="flex items-center justify-between p-4 bg-white/60 hover:bg-white rounded-2xl border border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 cursor-default group" style={{ animationDelay: `${i * 50}ms` }}>
                  <span className="text-sm font-bold text-gray-500 group-hover:text-gray-700 transition-colors">{col.label}</span>
                  <span className={`text-lg font-extrabold ${col.color}`}>{col.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Metrics Placeholder Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><CloudCog className="w-5 h-5" /></div>
            Firebase Infrastructure Metrics
          </h2>
          {cloudStats.reads === 'N/A' && (
            <button 
              onClick={() => setShowCloudModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:from-gray-900 hover:to-black transition-all shadow-lg shadow-gray-900/20 cursor-pointer transform hover:-translate-y-0.5"
            >
              <ShieldAlert className="w-4 h-4 text-red-400" /> Connect Cloud Service Account
            </button>
          )}
        </div>

        {cloudError && (
          <div className="glass-card bg-red-50/80 border border-red-200 rounded-2xl p-5 mb-8 flex gap-3 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm text-red-900 font-bold mb-1">Error from Backend API</p>
              <p className="text-sm text-red-700">{cloudError}</p>
            </div>
          </div>
        )}

        {cloudStats.reads === 'N/A' && !cloudError && (
          <div className="glass-card bg-orange-50/80 border border-orange-200 rounded-2xl p-5 mb-8 flex gap-3 shadow-sm">
            <Activity className="w-5 h-5 text-orange-600 shrink-0" />
            <div>
              <p className="text-sm text-orange-900 font-bold mb-1">Local Development Mode</p>
              <p className="text-sm text-orange-700">Note: Start the febebo-backend node server locally to unlock these real-time metrics.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {billingCards.map((card, i) => (
            <div key={card.title} className={`glass-card p-6 rounded-3xl shadow-sm transition-all duration-300 relative overflow-hidden group ${cloudStats.reads === 'N/A' ? 'opacity-70 grayscale cursor-not-allowed' : 'hover:shadow-md transform hover:-translate-y-1'}`} style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center gap-4 mb-5 relative z-10">
                <div className={`p-3.5 rounded-2xl ${card.bg} shadow-sm`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-600 leading-tight">{card.title}</h3>
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 relative z-10">{card.value}</p>
              {cloudStats.reads !== 'N/A' && (
                <div className={`absolute top-0 right-0 w-32 h-32 ${card.bg.replace('100', '400')}/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cloud Setup Modal */}
      {showCloudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Google Cloud Integration Required</h3>
              <button onClick={() => setShowCloudModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600 text-sm leading-relaxed">
                To access real-time infrastructure metrics like <strong>Daily Active Users</strong>, <strong>Firebase Reads/Writes</strong>, and <strong>Billing costs</strong>, Google requires secure server-to-server communication.
              </p>
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100">
                <p className="font-bold mb-1">Developer Instructions:</p>
                <ol className="list-decimal pl-4 space-y-1 text-blue-700">
                  <li>Create a Node.js backend server or Cloud Function.</li>
                  <li>Generate a Service Account JSON key from your Google Cloud Console.</li>
                  <li>Use the Google Cloud Monitoring API (`@google-cloud/monitoring`) to query infrastructure metrics.</li>
                  <li>Expose an endpoint (e.g., `/api/metrics`) for this frontend to consume.</li>
                </ol>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowCloudModal(false)}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
