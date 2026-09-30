import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Briefcase, Users, Star } from 'lucide-react';

export default function StaffOverview() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const snap = await getDocs(collection(db, 'staff'));
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStaffList(data);
      } catch (error) {
        console.error("Error fetching staff:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  // Compute stats
  const rolesMap = {};
  staffList.forEach(staff => {
    const role = staff.role || 'Unassigned';
    rolesMap[role] = (rolesMap[role] || 0) + 1;
  });
  
  const staffStats = Object.keys(rolesMap).map(role => ({
    role,
    count: rolesMap[role]
  }));

  if (loading) return <div className="text-gray-500 p-6">Loading Staff Overview...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Briefcase className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Global Staff Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {staffStats.length === 0 ? (
          <div className="col-span-full text-gray-500 text-sm">No staff roles found yet.</div>
        ) : (
          staffStats.map(stat => (
            <div key={stat.role} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <h3 className="text-gray-500 font-medium mb-2 capitalize">{stat.role}</h3>
              <p className="text-3xl font-bold text-gray-900">{stat.count}</p>
            </div>
          ))
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Registered Staff on Platform</h2>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Role</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">PG Admin ID</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staffList.map(staff => (
              <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {(staff.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  {staff.name || 'Unknown Staff'}
                </td>
                <td className="px-6 py-4 text-gray-600 capitalize">{staff.role || 'N/A'}</td>
                <td className="px-6 py-4 text-gray-600 font-mono text-xs">{staff.adminId || 'Unknown'}</td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1 text-orange-500 font-medium">
                    <Star className="w-4 h-4 fill-current" /> {staff.rating || '5.0'}
                  </span>
                </td>
              </tr>
            ))}
            {staffList.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No staff found on the platform.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
