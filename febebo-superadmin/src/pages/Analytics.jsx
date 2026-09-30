import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [totalTenants, setTotalTenants] = useState(0);
  const [totalCapacity, setTotalCapacity] = useState(0);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const tenantsSnap = await getDocs(collection(db, 'tenants'));
        setTotalTenants(tenantsSnap.size);

        const pgSnap = await getDocs(collection(db, 'pg_owners'));
        let capacity = 0;
        pgSnap.docs.forEach(doc => {
          const seats = doc.data()?.propertyDetails?.totalSeats;
          if (seats) {
            capacity += parseInt(seats, 10);
          }
        });
        setTotalCapacity(capacity);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Use dummy data for growth chart as we lack historical logging
  const growthData = [
    { name: 'Jan', users: 120, pgOwners: 5 },
    { name: 'Feb', users: 250, pgOwners: 8 },
    { name: 'Mar', users: 380, pgOwners: 12 },
    { name: 'Apr', users: 510, pgOwners: 15 },
    { name: 'May', users: 690, pgOwners: 22 },
    { name: 'Jun', users: 850, pgOwners: 28 },
  ];

  const occupied = totalTenants;
  const vacant = Math.max(0, totalCapacity - totalTenants);
  const occupancyPercentage = totalCapacity > 0 ? Math.round((occupied / totalCapacity) * 100) : 0;

  const occupancyData = [
    { name: 'Occupied Beds', value: occupied },
    { name: 'Vacant Beds', value: vacant },
  ];
  const COLORS = ['#3b82f6', '#f3f4f6'];

  if (loading) return <div className="text-gray-500 p-6">Loading Analytics...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">User Growth (Sample History)</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Total Users" />
                <Line type="monotone" dataKey="pgOwners" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="PG Owners" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Live Global Occupancy</h2>
          <div className="h-64 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-gray-900">{occupancyPercentage}%</span>
              <span className="text-xs font-medium text-gray-500">Filled</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Occupied</span>
              <span className="font-semibold text-gray-900">{occupied} Beds</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-200"></div> Vacant</span>
              <span className="font-semibold text-gray-900">{vacant} Beds</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
