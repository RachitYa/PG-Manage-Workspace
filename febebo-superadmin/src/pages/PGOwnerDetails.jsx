import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, CheckCircle, User, Building2, MapPin, Check, Image as ImageIcon } from 'lucide-react';

export default function PGOwnerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState(null);
  const [pgData, setPgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pgSnap = await getDoc(doc(db, 'pg_owners', id));
        let adminIdToFetch = id;
        if (pgSnap.exists()) {
          const data = pgSnap.data();
          setPgData({ id: pgSnap.id, ...data });
          if (data.adminId) {
            adminIdToFetch = data.adminId;
          }
        }
        
        const adminSnap = await getDoc(doc(db, 'admins', adminIdToFetch));
        if (adminSnap.exists()) {
          setAdminData({ id: adminSnap.id, ...adminSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const [showApproveOptions, setShowApproveOptions] = useState(false);

  const handleApprove = async (visibility) => {
    setApproving(true);
    setShowApproveOptions(false);
    try {
      if (adminData && adminData.id) {
        await updateDoc(doc(db, 'admins', adminData.id), { isApproved: true });
      }
      if (pgData) {
        await updateDoc(doc(db, 'pg_owners', id), { status: 'Approved', visibility });
        setPgData(prev => ({ ...prev, status: 'Approved', visibility }));
      }
      setAdminData(prev => ({ ...prev, isApproved: true }));
    } catch (error) {
      console.error("Error approving admin:", error);
      alert("Error approving admin.");
    } finally {
      setApproving(false);
    }
  };

  const toggleVisibility = async () => {
    if (!pgData) return;
    const newVis = pgData.visibility === 'private' ? 'public' : 'private';
    try {
      await updateDoc(doc(db, 'pg_owners', id), { visibility: newVis });
      setPgData(prev => ({ ...prev, visibility: newVis }));
    } catch(e) {
      alert("Error updating visibility");
    }
  };

  if (loading) return <div className="text-gray-500 p-6">Loading Details...</div>;
  
  if (!adminData && !pgData) {
    return (
      <div>
        <button onClick={() => navigate('/pg-owners')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium cursor-pointer">
          <ArrowLeft className="w-5 h-5" /> Back to PG Owners
        </button>
        <div className="text-gray-500 p-6 bg-white rounded-xl shadow-sm border border-gray-100">PG Owner not found.</div>
      </div>
    );
  }

  const isApproved = adminData?.isApproved;

  return (
    <div className="max-w-4xl pb-12 animate-slide-up">
      <button onClick={() => navigate('/pg-owners')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-bold transition-all duration-300 hover:-translate-x-1 cursor-pointer group">
        <ArrowLeft className="w-5 h-5 group-hover:text-blue-600 transition-colors" /> Back to PG Owners
      </button>

      {/* Header Profile Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 glass-card p-8 rounded-3xl shadow-sm relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

        <div className="flex items-center gap-5 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-500 text-white rounded-3xl flex items-center justify-center font-extrabold text-3xl shadow-lg shadow-blue-500/30">
            {(adminData?.name || pgData?.adminName || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{adminData?.name || pgData?.adminName || 'Unknown Admin'}</h1>
            <p className="text-gray-500 flex items-center gap-3 mt-2 font-medium">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-sm ${isApproved ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200 animate-pulse'}`}>
                  {isApproved ? 'Approved' : 'Pending Verification'}
                </span>
                {isApproved && pgData?.visibility === 'private' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-xl text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                    Hidden (Private)
                  </span>
                )}
              </div>
              <span className="opacity-50">•</span> 
              <span>{adminData?.email || pgData?.email}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 sm:mt-0 relative z-10 flex flex-col items-end gap-2">
          {!isApproved ? (
            showApproveOptions ? (
              <div className="flex gap-2">
                <button onClick={() => handleApprove('public')} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-sm cursor-pointer">Show to Students</button>
                <button onClick={() => handleApprove('private')} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-sm shadow-sm cursor-pointer">Hide (Private)</button>
                <button onClick={() => setShowApproveOptions(false)} className="px-4 py-2 bg-white text-red-500 rounded-xl font-bold text-sm cursor-pointer">Cancel</button>
              </div>
            ) : (
              <button 
                onClick={() => setShowApproveOptions(true)}
                disabled={approving}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-500/30 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <CheckCircle className="w-5 h-5" />
                {approving ? 'Approving...' : 'Approve PG Owner'}
              </button>
            )
          ) : (
            pgData && (
              <button
                onClick={toggleVisibility}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm shadow-sm cursor-pointer transition-colors ${pgData.visibility === 'private' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
              >
                {pgData.visibility === 'private' ? '👁 Show in Student App' : '🙈 Hide from Student App'}
              </button>
            )
          )}
        </div>
      </div>

      {!pgData ? (
        <div className="glass-card bg-orange-50/50 border border-orange-200 text-orange-800 rounded-2xl p-6 font-medium flex items-start gap-3">
          <div className="bg-orange-100 p-2 rounded-lg"><User className="w-5 h-5 text-orange-600" /></div>
          <div>
            <h3 className="font-bold text-orange-900 mb-1">Incomplete Profile</h3>
            <p>This admin has registered an account but has not yet completed their PG Profile setup.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 relative z-10">
          
          {/* Property Essentials */}
          <div className="glass-card rounded-2xl shadow-sm p-7 group hover:shadow-md transition-shadow">
            <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Building2 className="w-5 h-5" /></div>
              Property Essentials
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">PG Name</p>
                <p className="font-semibold text-gray-900">{pgData.pgName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">PG Type</p>
                <p className="font-semibold text-gray-900">{pgData.pgType || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Total Rooms</p>
                <p className="font-semibold text-gray-900">{pgData.propertyDetails?.totalRooms || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Total Capacity (Seats)</p>
                <p className="font-semibold text-gray-900">{pgData.propertyDetails?.totalSeats || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Registration Number</p>
                <p className="font-semibold text-gray-900">{pgData.propertyDetails?.registrationNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Ownership</p>
                <p className="font-semibold text-gray-900">
                  {pgData.propertyDetails?.isOnLease ? <span className="text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-lg">On Lease (₹{pgData.propertyDetails.leaseAmount}/mo)</span> : 'Owned Property'}
                </p>
              </div>
              
              <div className="col-span-2 md:col-span-3 mt-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Rent Pricing (Per Month)</p>
                {pgData.propertyDetails?.rents && pgData.propertyDetails.rents.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {pgData.propertyDetails.rents.map((r, idx) => (
                      <div key={idx} className="glass-card border border-gray-100 rounded-xl p-4 text-center hover:-translate-y-1 transition-transform">
                        <span className="block text-xs font-bold text-blue-600 uppercase mb-1">{r.seater} Seater</span>
                        <span className="block text-xl font-extrabold text-gray-900">₹{r.rent}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-semibold text-gray-900">N/A</p>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="glass-card rounded-2xl shadow-sm p-7 group hover:shadow-md transition-shadow">
            <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><MapPin className="w-5 h-5" /></div>
              Location Details
            </h2>
            <div className="bg-white/50 p-5 rounded-xl border border-gray-100 mb-4">
              <p className="font-medium text-gray-900 mb-1">{pgData.location?.address || 'No address provided'}</p>
              <p className="text-gray-500 text-sm font-semibold">
                {pgData.location?.city || 'City'}, {pgData.location?.state || 'State'} - {pgData.location?.pin || 'PIN'}
              </p>
            </div>
            {pgData.location?.mapLink && (
              <a 
                href={pgData.location.mapLink} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white px-5 py-2.5 rounded-xl transition-all shadow-sm"
              >
                <MapPin className="w-4 h-4" /> Open in Google Maps
              </a>
            )}
          </div>

          {/* Admin Details */}
          <div className="glass-card rounded-2xl shadow-sm p-7 group hover:shadow-md transition-shadow">
            <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><User className="w-5 h-5" /></div>
              Owner Contact Info
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Phone Number</p>
                <p className="font-semibold text-gray-900">{pgData.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</p>
                <p className="font-semibold text-gray-900">{pgData.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Date of Birth</p>
                <p className="font-semibold text-gray-900">{pgData.dob || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Amenities */}
          {pgData.amenities && pgData.amenities.length > 0 && (
            <div className="glass-card rounded-2xl shadow-sm p-7 group hover:shadow-md transition-shadow">
              <h2 className="text-lg font-extrabold text-gray-900 mb-5 flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><CheckCircle className="w-5 h-5" /></div>
                Selected Amenities
              </h2>
              <div className="flex flex-wrap gap-3">
                {pgData.amenities.map(amenity => (
                  <span key={amenity} className="inline-flex items-center gap-2 bg-white/60 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold capitalize shadow-sm">
                    <Check className="w-4 h-4 text-green-500" /> {amenity.replace(/-/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Photos */}
          <div className="glass-card rounded-2xl shadow-sm p-7 group hover:shadow-md transition-shadow">
            <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-pink-50 rounded-lg text-pink-600"><ImageIcon className="w-5 h-5" /></div>
              Property Photos
            </h2>
            {pgData.images && pgData.images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {pgData.images.map((imgBase64, idx) => (
                  <div key={idx} className="group/img aspect-[4/3] rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm relative">
                    <div className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg font-bold tracking-wide z-10 shadow-lg">Photo {idx + 1}</div>
                    <img src={imgBase64} alt={`Property ${idx + 1}`} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm font-medium italic">No photos uploaded.</p>
            )}
          </div>
          </div>
      )}
    </div>
  );
}
