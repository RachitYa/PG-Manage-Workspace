import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Megaphone, Send } from 'lucide-react';

export default function Broadcasts() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchHistory = async () => {
    try {
      const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(data);
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title || !message) return;
    setSending(true);

    try {
      const payload = {
        title,
        message,
        audience,
        createdAt: new Date().toISOString(),
        status: "Sent"
      };
      
      const docRef = await addDoc(collection(db, 'broadcasts'), payload);
      alert(`Broadcast "${title}" sent successfully!`);
      
      setHistory([{ id: docRef.id, ...payload }, ...history]);
      setTitle('');
      setMessage('');
    } catch (error) {
      console.error("Error sending broadcast:", error);
      alert("Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Megaphone className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Global Broadcasts</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Create New Broadcast</h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
              <select 
                value={audience} 
                onChange={e => setAudience(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">All Users & Admins</option>
                <option value="students">Only Students/Tenants</option>
                <option value="admins">Only PG Owners</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input 
                type="text" required placeholder="E.g., Diwali Offer!"
                value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
              <textarea 
                required rows="4" placeholder="Enter your notification text here..."
                value={message} onChange={e => setMessage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              ></textarea>
            </div>
            <button 
              type="submit" 
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-70"
            >
              <Send className="w-5 h-5" /> {sending ? 'Sending...' : 'Send Push Notification'}
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Broadcast History</h2>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {loading ? (
              <p className="text-gray-500">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="text-gray-500">No broadcasts sent yet.</p>
            ) : (
              history.map(item => (
                <div key={item.id} className="p-4 border border-gray-100 rounded-lg flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-700 mt-1">{item.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Sent to: <span className="font-medium capitalize">{item.audience}</span> • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{item.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
