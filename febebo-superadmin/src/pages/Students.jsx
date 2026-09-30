import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Trash2, Users, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStudents = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    const fallbackTimer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(fallbackTimer);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student? This will permanently delete their account.')) return;
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated as Superadmin");
      const token = await user.getIdToken();
      
      const res = await fetch(`http://${window.location.hostname}:3000/api/account/${id}?role=student`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setStudents(students.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student: ' + error.message);
    }
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="animate-slide-up pb-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
          Students & Tenants
        </h1>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/40 border-b border-gray-200/50">
              <tr>
                <th className="px-6 py-4 text-sm font-extrabold text-gray-500 tracking-wider uppercase">Name</th>
                <th className="px-6 py-4 text-sm font-extrabold text-gray-500 tracking-wider uppercase">Contact</th>
                <th className="px-6 py-4 text-sm font-extrabold text-gray-500 tracking-wider uppercase">PG Subscribed</th>
                <th className="px-6 py-4 text-sm font-extrabold text-gray-500 tracking-wider uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/30">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-white/60 transition-colors duration-200 group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-100 to-pink-100 flex items-center justify-center text-purple-700 font-bold border border-purple-200/50">
                        {(student.name || student.tenantName || student.fullName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-900">{student.name || student.tenantName || student.fullName || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-gray-900 font-medium">{student.email || 'No email'}</span>
                      <span className="text-gray-500 text-xs mt-0.5">{student.phone || 'No phone'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {student.subscribedPG?.pgName || student.pgName || student.adminId ? (
                      <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                        {student.subscribedPG?.pgName || student.pgName || 'Yes (Admin ID linked)'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-medium bg-gray-50 text-gray-500 border border-gray-100">
                        Not Subscribed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => navigate(`/students/${student.id}`)}
                        className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all duration-300 p-2 rounded-xl shadow-sm cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(student.id)}
                        className="text-red-500 bg-red-50 hover:bg-red-500 hover:text-white transition-all duration-300 p-2 rounded-xl shadow-sm cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 font-medium bg-white/30">
                    No students found in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
