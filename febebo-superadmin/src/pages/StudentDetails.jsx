import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ArrowLeft, User, Phone, MapPin, 
  CreditCard, Calendar, FileText, CheckCircle, Shield, Bed, Briefcase, Heart
} from 'lucide-react';

export default function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', id));
        if (snap.exists()) {
          setStudent({ id: snap.id, ...snap.data() });
        }
      } catch (error) {
        console.error("Error fetching student details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  if (loading) return <div className="text-gray-500 p-6">Loading Student Details...</div>;
  
  if (!student) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/students')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium cursor-pointer">
          <ArrowLeft className="w-5 h-5" /> Back to Students
        </button>
        <div className="text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100 p-6">Student record not found.</div>
      </div>
    );
  }

  const name = student.name || 'Unknown User';

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-slide-up">
      <button onClick={() => navigate('/students')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-bold transition-all duration-300 hover:-translate-x-1 cursor-pointer group">
        <ArrowLeft className="w-5 h-5 group-hover:text-blue-600 transition-colors" /> Back to Students
      </button>

      {/* Header Profile Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 glass-card p-8 rounded-3xl shadow-sm relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-500 text-white rounded-3xl overflow-hidden flex items-center justify-center font-extrabold text-3xl uppercase shadow-lg shadow-blue-500/30">
            {student.kyc?.profilePhoto ? (
              <img src={student.kyc.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              name.charAt(0)
            )}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{name}</h1>
            <p className="text-gray-500 flex items-center gap-3 mt-2 font-medium">
              <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-sm ${student.subscribedPG ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                {student.subscribedPG ? `Subscribed to PG` : 'No Active Subscription'}
              </span>
              <span className="opacity-50">•</span> 
              <span>{student.occupation ? student.occupation.charAt(0).toUpperCase() + student.occupation.slice(1) : 'Occupation Not Set'}</span>
            </p>
          </div>
        </div>
        {student.joinDate && (
          <div className="text-left sm:text-right mt-6 sm:mt-0 relative z-10 glass px-5 py-3 rounded-2xl">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Joined App</p>
            <p className="text-lg font-extrabold text-gray-900">{new Date(student.joinDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        )}
      </div>

      <div className="space-y-6 relative z-10">
        
        {/* Personal & Contact Details */}
        {/* Personal & Contact Details */}
        <div className="glass-card rounded-2xl shadow-sm p-7 group hover:shadow-md transition-shadow">
          <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><User className="w-5 h-5" /></div>
            Personal & Contact Info
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Phone Number</p>
              <p className="font-semibold text-gray-900">{student.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</p>
              <p className="font-semibold text-gray-900">{student.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Blood Group</p>
              <p className="font-semibold text-gray-900">{student.personalDetails?.bloodGroup || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Dietary Preference</p>
              <p className="font-semibold text-gray-900 capitalize">{student.personalDetails?.dietaryPreference || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Permanent Address</p>
              <p className="font-medium text-gray-900 flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-gray-100">
                <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                {student.personalDetails?.permanentAddress || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Occupation Details */}
        <div className="glass-card rounded-2xl shadow-sm p-7 group hover:shadow-md transition-shadow">
          <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Briefcase className="w-5 h-5" /></div>
            Professional / Academic Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Organization / College</p>
              <p className="font-semibold text-gray-900">{student.occupationDetails?.organization || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Course / Job Title</p>
              <p className="font-semibold text-gray-900">{student.occupationDetails?.titleOrCourse || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Additional Details</p>
              <p className="font-semibold text-gray-900">{student.occupationDetails?.details || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Parent Details */}
        <div className="glass-card rounded-2xl shadow-sm p-7 group hover:shadow-md transition-shadow">
          <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-pink-50 rounded-lg text-pink-600"><Heart className="w-5 h-5" /></div>
            Parent / Guardian Info
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Father's Name</p>
              <p className="font-semibold text-gray-900">{student.parentsDetails?.fatherName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Father's Phone</p>
              <p className="font-semibold text-gray-900">{student.parentsDetails?.fatherPhone || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Current PG Subscription */}
        <div className="glass-card rounded-2xl shadow-sm p-7 group hover:shadow-md transition-shadow relative overflow-hidden">
          {student.subscribedPG && (
            <div className="absolute top-0 right-0 w-40 h-40 bg-green-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          )}
          <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-green-50 rounded-lg text-green-600"><Bed className="w-5 h-5" /></div>
            Current Subscription
          </h2>
          {student.subscribedPG ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-8 relative z-10">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">PG Name</p>
                <p className="font-semibold text-gray-900">{student.subscribedPG.pgName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Lease Amount</p>
                <p className="font-extrabold text-gray-900 text-lg">₹{student.subscribedPG.leaseAmount || '0'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</p>
                <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-lg text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                  {student.subscribedPG.status || 'Active'}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Joining Date</p>
                <p className="font-semibold text-gray-900">{student.subscribedPG.joiningDate ? new Date(student.subscribedPG.joiningDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Room Assignment</p>
                <p className="font-semibold text-gray-900 bg-white/50 px-4 py-2 rounded-xl border border-gray-100 inline-block">
                  Room {student.subscribedPG.roomDetails?.roomNumber || 'N/A'} 
                  <span className="text-gray-400 mx-2">|</span>
                  Bed {student.subscribedPG.roomDetails?.bedNumber || 'N/A'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Mess Included</p>
                <p className="font-semibold text-gray-900 flex items-center gap-2">
                  {student.subscribedPG.messIncluded ? <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-lg border border-green-100"><CheckCircle className="w-4 h-4" /> Yes</span> : 'No'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 font-medium italic">This user is not currently subscribed to any PG.</p>
          )}
        </div>

        {/* KYC Documentation */}
        <div className="glass-card rounded-2xl shadow-sm p-7 group hover:shadow-md transition-shadow">
          <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><FileText className="w-5 h-5" /></div>
            KYC & Documentation
          </h2>
          <div className="mb-6">
             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Police Verification Status</p>
             <div className="flex items-center gap-1">
               {student.kyc?.policeVerification === 'Verified' ? (
                 <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 shadow-sm px-4 py-2 rounded-xl font-bold text-sm"><Shield className="w-4 h-4" /> Verified Background</span>
               ) : (
                 <span className="inline-flex items-center gap-1.5 text-orange-700 bg-orange-50 border border-orange-200 shadow-sm px-4 py-2 rounded-xl font-bold text-sm"><Shield className="w-4 h-4" /> {student.kyc?.policeVerification || 'Pending Background Check'}</span>
               )}
             </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {student.kyc?.aadhaarFront && (
              <div className="group/img rounded-2xl overflow-hidden aspect-[4/3] relative shadow-sm border border-gray-200">
                <div className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg font-bold tracking-wide z-10 shadow-lg">Aadhaar Front</div>
                <img src={student.kyc.aadhaarFront} alt="Aadhaar Front" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
              </div>
            )}
            {student.kyc?.aadhaarBack && (
              <div className="group/img rounded-2xl overflow-hidden aspect-[4/3] relative shadow-sm border border-gray-200">
                <div className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg font-bold tracking-wide z-10 shadow-lg">Aadhaar Back</div>
                <img src={student.kyc.aadhaarBack} alt="Aadhaar Back" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
              </div>
            )}
            {student.occupationDetails?.idImage && (
               <div className="group/img rounded-2xl overflow-hidden aspect-[4/3] relative shadow-sm border border-gray-200">
                 <div className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg font-bold tracking-wide z-10 shadow-lg">Work/College ID</div>
                 <img src={student.occupationDetails.idImage} alt="Work/College ID" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
