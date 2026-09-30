import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { DollarSign, ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-react';

export default function Finances() {
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        const snap = await getDocs(collection(db, 'pg_owners'));
        const data = snap.docs.map(doc => {
          const pg = doc.data();
          return {
            id: doc.id,
            pgName: pg.pgName || 'Unknown PG',
            owner: pg.adminName || 'Unknown',
            amount: "₹999", // Default platform fee
            status: "Pending" // Assumed pending until we build a payment gateway
          };
        });
        setDues(data);
      } catch (error) {
        console.error("Error fetching finances:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFinances();
  }, []);

  const totalMRR = dues.length * 999;

  if (loading) return <div className="text-gray-500 p-6">Loading Finances...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Monthly Recurring Revenue (MRR)</p>
          <div className="flex items-end gap-2">
            <h2 className="text-3xl font-bold text-gray-900">₹{totalMRR.toLocaleString()}</h2>
            <span className="flex items-center text-sm font-medium text-gray-500 mb-1">
              Projected
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Pending SaaS Dues</p>
          <div className="flex items-end gap-2">
            <h2 className="text-3xl font-bold text-gray-900">₹{totalMRR.toLocaleString()}</h2>
            <span className="flex items-center text-sm font-medium text-orange-600 mb-1">
               Waiting
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Registered Subscriptions</p>
          <div className="flex items-end gap-2">
            <h2 className="text-3xl font-bold text-gray-900">{dues.length}</h2>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">PG Subscriptions & Dues</h2>
          <button className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
            <CreditCard className="w-4 h-4" /> Generate Invoices
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">PG Name</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Owner</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Subscription Fee</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dues.map((due) => (
              <tr key={due.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{due.pgName}</td>
                <td className="px-6 py-4 text-gray-600">{due.owner}</td>
                <td className="px-6 py-4 text-gray-900 font-medium">{due.amount}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center py-1 px-3 rounded-full text-xs font-medium bg-orange-50 text-orange-700`}>
                    {due.status}
                  </span>
                </td>
              </tr>
            ))}
            {dues.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                  No subscriptions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
