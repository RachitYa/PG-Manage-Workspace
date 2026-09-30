import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AlertOctagon, Phone, CheckCircle2 } from 'lucide-react';

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchComplaints = async () => {
    try {
      const snap = await getDocs(collection(db, 'superadmin_complaints'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by newest first
      data.sort((a, b) => b.createdAt - a.createdAt);
      setComplaints(data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleResolve = async (id) => {
    try {
      await updateDoc(doc(db, 'superadmin_complaints', id), { status: 'Resolved' });
      setComplaints(complaints.map(c => c.id === id ? { ...c, status: 'Resolved' } : c));
    } catch (error) {
      console.error('Error resolving complaint:', error);
    }
  };

  if (loading) return <div className="text-gray-500 p-6">Loading Support Requests...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <AlertOctagon className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Admin Support Requests</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <p className="text-gray-600 font-medium">Tickets and technical support requests submitted by PG Owners (Admins).</p>
        </div>
        <div className="divide-y divide-gray-100">
          {complaints.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No pending support requests.</p>
            </div>
          ) : (
            complaints.map(complaint => (
              <div key={complaint.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 pr-6">
                    <h3 className="font-bold text-gray-900 text-lg">{complaint.subject}</h3>
                    <p className="text-gray-700 mt-2 whitespace-pre-wrap">{complaint.message}</p>
                    <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 bg-white border border-gray-200 p-3 rounded-lg w-max shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs">
                          {complaint.adminName ? complaint.adminName.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <span className="font-medium text-gray-900">{complaint.adminName}</span>
                      </div>
                      <span className="text-gray-300">|</span>
                      <span>{complaint.adminEmail}</span>
                      <span className="text-gray-300">|</span>
                      <span>Submitted: {new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`inline-flex items-center py-1.5 px-4 rounded-full text-xs font-bold uppercase tracking-wide ${
                      complaint.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {complaint.status || 'Pending'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mt-4 border-t border-gray-100 pt-4">
                  {complaint.adminEmail && (
                    <a href={`mailto:${complaint.adminEmail}`} className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                      Email Admin
                    </a>
                  )}
                  {complaint.status !== 'Resolved' && (
                    <button 
                      onClick={() => handleResolve(complaint.id)}
                      className="flex items-center gap-2 text-sm font-bold text-green-600 bg-green-50 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Mark as Resolved
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
