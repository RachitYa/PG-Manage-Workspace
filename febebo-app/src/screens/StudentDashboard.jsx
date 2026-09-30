import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, MapPin, Bell, Building2, Navigation, Users, Search, SlidersHorizontal, Home, Star, X, Heart, Utensils, User as UserIcon, MessageSquareWarning, FileText, Sparkles, Bus, UserPlus, MessageCircle, CheckCircle } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import SideMenu from '../components/SideMenu';
import ImageSlider from '../components/ImageSlider';
import BottomNav from '../components/BottomNav';
import './StudentDashboard.css';
import './FilterModal.css';
import StudentDetailsModal from '../components/StudentDetailsModal';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [pgList, setPgList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationAccurate, setIsLocationAccurate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [fullPaymentMode, setFullPaymentMode] = useState('Online');
  const [fullTransactionId, setFullTransactionId] = useState('');
  const [fullReceivedBy, setFullReceivedBy] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payScreenshot, setPayScreenshot] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // New remaining payment flow states
  const [showRemainingOptions, setShowRemainingOptions] = useState(false); // 2-option chooser
  const [showFullRemainModal, setShowFullRemainModal] = useState(false);   // Pay Full flow
  const [showPartialModal, setShowPartialModal] = useState(false);         // Pay Partial flow
  const [showKycModal, setShowKycModal] = useState(false);                 // KYC form
  const [remainPayMode, setRemainPayMode] = useState('Online');
  const [dismissDetailsPrompt, setDismissDetailsPrompt] = useState(false);

  useEffect(() => {
    if (user?.pgStatus === 'Current User' && !user?.detailsFilled) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log("Location fetched automatically for new resident");
            setShowDetailsModal(true);
          },
          (err) => {
            console.log("Location denied or error");
            setShowDetailsModal(true);
          }
        );
      } else {
        setShowDetailsModal(true);
      }
    }
  }, [user?.pgStatus, user?.detailsFilled]);

  const [remainTransId, setRemainTransId] = useState('');
  const [remainReceivedBy, setRemainReceivedBy] = useState('');
  const [remainScreenshot, setRemainScreenshot] = useState(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialDueDate, setPartialDueDate] = useState('');
  const [remainLoading, setRemainLoading] = useState(false);
  // KYC form fields
  const [kycDob, setKycDob] = useState('');
  const [kycPermAddr, setKycPermAddr] = useState('');
  const [kycCorrAddr, setKycCorrAddr] = useState('');
  const [kycFatherName, setKycFatherName] = useState('');
  const [kycFatherPhone, setKycFatherPhone] = useState('');
  const [kycMotherName, setKycMotherName] = useState('');
  const [kycMotherPhone, setKycMotherPhone] = useState('');
  const [kycParentsAddr, setKycParentsAddr] = useState('');
  const [kycAadharNum, setKycAadharNum] = useState('');
  const [kycAadharFront, setKycAadharFront] = useState(null);
  const [kycAadharBack, setKycAadharBack] = useState(null);
  const [kycOccupation, setKycOccupation] = useState('Student');
  const [kycCollegeCompany, setKycCollegeCompany] = useState('');
  const [kycLoading, setKycLoading] = useState(false);

  const [activeFilter, setActiveFilter] = useState('All');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState('distance'); // 'distance', 'price_low', 'price_high', 'rating'
  const [priceRange, setPriceRange] = useState({ min: 0, max: 20000 });
  const { startLoading, stopLoading } = useLoading();

  const handleUpdateLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      const updatedPGs = pgList.map(pg => {
        const dist = getDistance(lat, lng, pg.location?.lat, pg.location?.lng);
        return { ...pg, distanceKm: dist };
      }).sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
      
      setPgList(updatedPGs);
      setIsLocating(false);
      setIsLocationAccurate(true);
      setTimeout(() => setIsLocationAccurate(false), 4000);
    }, (error) => {
      console.error(error);
      alert("Unable to retrieve your location");
      setIsLocating(false);
    });
  };


  const isOnlyRoom = user?.serviceType === 'only_room';

  const dashboardItems = [
    { name: 'Food Menu', icon: Utensils, path: '/food', color: '#f59e0b', bg: '#fef3c7', hideForOnlyRoom: true },
    { name: 'My Account', icon: UserIcon, path: '/account', color: '#3b82f6', bg: '#dbeafe' },
    { name: 'Complaints', icon: MessageSquareWarning, path: '/complain', color: '#ef4444', bg: '#fee2e2' },
    { name: 'Request Box', icon: FileText, path: '/request-box', color: '#8b5cf6', bg: '#ede9fe' },
    { name: 'Cleaner', icon: Sparkles, path: '/cleaner', color: '#0ea5e9', bg: '#e0f2fe' },
    { name: 'Transport', icon: Bus, path: '/transport', color: '#10b981', bg: '#d1fae5', hideForOnlyRoom: true },
    { name: 'Visitor', icon: UserPlus, path: '/visitor', color: '#ec4899', bg: '#fce7f3' },
  ].filter(item => !(isOnlyRoom && item.hideForOnlyRoom));

  const locationText = user?.locationData?.city
    ? user.locationData.city.split(',').slice(0, 2).join(',') // Take max 2 parts so it's not huge
    : 'Your Location';

  const filters = ['All', 'Boys', 'Girls', 'Unisex'];

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return parseFloat((R * c).toFixed(1));
  };

  useEffect(() => {
    const fetchPGs = async () => {
      startLoading();
      try {
        const querySnapshot = await getDocs(collection(db, 'pg_owners'));
        let pgs = [];
        querySnapshot.forEach((doc) => {
          const pgData = doc.data();
          if ((pgData.status !== 'Approved' && pgData.status !== 'Active') || pgData.visibility === 'private') return;
          const distanceKm = getDistance(
            user?.locationData?.lat,
            user?.locationData?.lng,
            pgData.location?.lat,
            pgData.location?.lng
          );
          
          let matchCity = true;
          if (user?.locationData?.type === 'manual' && pgData.location?.city) {
            const userCity = (user.locationData.city || '').toLowerCase();
            const pgCity = (pgData.location.city || '').toLowerCase();
            if (!pgCity.includes(userCity)) matchCity = false;
          }
          if (matchCity) {
            pgs.push({ id: doc.id, distanceKm, ...pgData });
          }
        });
        pgs.sort((a, b) => {
          if (a.distanceKm === null && b.distanceKm === null) return 0;
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        });
        setPgList(pgs);
      } catch (error) {
        console.error('Error fetching PGs: ', error);
      } finally {
        setLoading(false);
        stopLoading();
      }
    };
    fetchPGs();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'users', user.uid, 'notifications'), where('unread', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    });
    return () => unsub();
  }, [user]);

  let filteredPGs = pgList.filter(pg => {
    const matchSearch = searchQuery === '' ||
      (pg.pgName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pg.location?.city || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = activeFilter === 'All' ||
      (pg.pgType || '').toLowerCase() === activeFilter.toLowerCase();
    
    // Price filter (leaseAmount is currently used as placeholder)
        const getStartingPrice = (details) => {
      if (!details?.rents || !Array.isArray(details.rents) || details.rents.length === 0) return 0;
      const validRents = details.rents.map(r => Number(r.rent)).filter(v => v > 0);
      return validRents.length > 0 ? Math.min(...validRents) : 0;
    };
    const price = getStartingPrice(pg.propertyDetails);
    const matchPrice = price === 0 || (price >= priceRange.min && price <= priceRange.max);

    return matchSearch && matchFilter && matchPrice;
  });

  filteredPGs.sort((a, b) => {
    if (sortOption === 'price_low') {
      const pA = a.propertyDetails?.rents ? Math.min(...a.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)) : 0;
      const pB = b.propertyDetails?.rents ? Math.min(...b.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)) : 0;
      return pA - pB;
    }
    if (sortOption === 'price_high') {
      const pA = a.propertyDetails?.rents ? Math.min(...a.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)) : 0;
      const pB = b.propertyDetails?.rents ? Math.min(...b.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)) : 0;
      return pB - pA;
    }
    if (sortOption === 'rating') {
      return (b.rating || 4.5) - (a.rating || 4.5);
    }
    return 0; // Default distance sort is already applied when fetching
  });

  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSuccessMessage('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        setPayScreenshot(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const submitFullPayment = async () => {
    if (fullPaymentMode === 'Online' && !payScreenshot) return setSuccessMessage('Please attach a screenshot of your online payment');
    if (!user?.subscribedPG?.pgId) return;
    
    const amountToPay = user.subscribedPG.remainingAmount ?? user.subscribedPG.leaseAmount;
    
    setPayLoading(true);
    try {
      const adminId = user.subscribedPG.adminId || user.subscribedPG.pgId;
      const pgId = user.subscribedPG.adminId ? user.subscribedPG.pgId : 'primary';
      const now = new Date();
      const isoString = now.toISOString();
      const dateString = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      
      // 1. Save to student's own payment history (users/{uid}/payments)
      await addDoc(collection(db, 'users', user.uid, 'payments'), {
        paymentMode: fullPaymentMode,
        transactionId: fullTransactionId,
        receivedBy: fullReceivedBy,
        status: 'Pending Verification',
        name: `Remaining Balance Payment - ${user.subscribedPG.pgName}`,
        amount: Number(amountToPay),
        type: 'Debit',
        date: dateString,
        month: dateString,
        contact: user.subscribedPG.pgName,
        pgName: user.subscribedPG.pgName,
        adminId: adminId,
        screenshot: payScreenshot || null,
        paymentType: 'remaining_balance',
        createdAt: isoString
      });

      // 2. Notification for Admin
      await addDoc(collection(db, 'notifications'), {
        adminId: adminId,
        title: 'Full Payment Received',
        desc: `${user.name || 'Student'} paid ₹${amountToPay} for their remaining balance. Mode: ${fullPaymentMode}${fullPaymentMode === 'Online' && fullTransactionId ? ` (Txn ID: ${fullTransactionId})` : ''}. Received By: ${fullReceivedBy || 'Not specified'}. Please verify.`,
        type: 'success', action: 'VIEW_TENANTS', unread: true, createdAt: isoString,
        resolved: false
      });
      
      // 3. Notification for Student
      await addDoc(collection(db, 'users', user.uid, 'notifications'), {
        title: 'Payment Logged',
        desc: `You paid ₹${amountToPay} for the remaining balance via ${fullPaymentMode}. The admin has been notified.`,
        type: 'success', action: 'VIEW_PAYMENTS', unread: true, createdAt: isoString
      });
      
      // 4. System Chat Message with Screenshot
      const chatId = user.uid > adminId ? user.uid + "_" + adminId : adminId + "_" + user.uid;
      const chatMessageText = `💰 Full Payment Logged\n` +
        `Amount Paid: ₹${amountToPay}\n` +
        `Payment Mode: ${fullPaymentMode}\n` +
        (fullPaymentMode === 'Online' && fullTransactionId ? `Transaction ID: ${fullTransactionId}\n` : '') +
        (fullReceivedBy ? `Received By: ${fullReceivedBy}\n` : '') +
        `\nPlease verify and unlock my dashboard.`;

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: chatMessageText,
        screenshot: payScreenshot || null,
        senderId: user.uid,
        senderName: user.name || 'Student',
        timestamp: serverTimestamp(),
        read: false,
        isSystem: true
      });
      
      // 5. Update user document to indicate payment is logged
      await updateDoc(doc(db, 'users', user.uid), {
        'subscribedPG.paymentVerificationPending': false,
        'subscribedPG.remainingAmount': 0,
        'subscribedPG.fullPaymentPaid': true,
        'subscribedPG.kycStatus': 'payment_approved_kyc_pending',
        'subscribedPG.fullPaymentMode': fullPaymentMode,
        'subscribedPG.fullPaymentScreenshot': payScreenshot || null
      });
      await updateDoc(doc(db, 'tenants', user.uid), {
        remainingAmount: 0,
        paymentStatus: 'Paid',
        paymentVerificationPending: false
      }).catch(() => {});
      
      setShowPayModal(false);
      setPayAmount('');
      setPayScreenshot(null);
      setFullPaymentMode('Online');
      setFullTransactionId('');
      setFullReceivedBy('');
      setSuccessMessage('Payment logged successfully! Your dashboard will unlock once the admin verifies.');
    } catch (err) {
      console.error(err);
      setSuccessMessage('Failed to log payment.');
    } finally {
      setPayLoading(false);
    }
  };

  // Generic image compressor used for KYC images
  const compressImageFromFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > 800) { h = h * 800 / w; w = 800; }
        if (h > 800) { w = w * 800 / h; h = 800; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
      img.src = evt.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleRemainScreenshot = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImageFromFile(file);
    setRemainScreenshot(compressed);
  };

  // Submit full remaining payment
  const submitRemainingFull = async () => {
    const remainingAmt = user?.subscribedPG?.remainingAmount ?? user?.subscribedPG?.leaseAmount ?? 0;
    if (remainPayMode === 'Online' && !remainScreenshot) return setSuccessMessage('Please attach a screenshot of your payment');
    if (!user?.subscribedPG?.pgId) return;
    setRemainLoading(true);
    try {
      const adminId = user.subscribedPG.adminId || user.subscribedPG.pgId;
      const pgId = user.subscribedPG.adminId ? user.subscribedPG.pgId : 'primary';
      const now = new Date();
      const isoString = now.toISOString();
      const dateString = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      await addDoc(collection(db, 'users', user.uid, 'payments'), {
        paymentMode: remainPayMode, transactionId: remainTransId, receivedBy: remainReceivedBy,
        status: 'Pending Verification', name: `Full Remaining Payment - ${user.subscribedPG.pgName}`,
        amount: Number(remainingAmt), type: 'Debit', date: dateString, month: dateString,
        contact: user.subscribedPG.pgName, pgName: user.subscribedPG.pgName, adminId, pgId,
        screenshot: remainScreenshot || null, paymentType: 'full_remaining', createdAt: isoString
      });

      await addDoc(collection(db, 'notifications'), {
        adminId, pgId, tenantId: user.uid, tenantName: user.name || 'Student',
        title: '💰 Full Remaining Payment Received',
        desc: `${user.name || 'Student'} has paid the full remaining balance of ₹${remainingAmt} via ${remainPayMode}${remainTransId ? ` (Ref: ${remainTransId})` : ''}${remainReceivedBy ? `. Received By: ${remainReceivedBy}` : ''}. Please verify and approve.`,
        type: 'full_remaining_payment', action: 'VIEW_TENANTS', unread: true, createdAt: isoString,
        resolved: false, screenshot: remainScreenshot || null
      });

      await addDoc(collection(db, 'users', user.uid, 'notifications'), {
        title: '✅ Payment Logged', desc: `Your full remaining payment of ₹${remainingAmt} via ${remainPayMode} has been submitted. Admin will verify shortly.`,
        type: 'success', action: 'VIEW_PAYMENTS', unread: true, createdAt: isoString
      });

      const chatId = [user.uid, adminId].sort().join('_');
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: `💰 Full Remaining Payment Logged\nAmount: ₹${remainingAmt}\nMode: ${remainPayMode}${remainTransId ? `\nRef: ${remainTransId}` : ''}${remainReceivedBy ? `\nReceived By: ${remainReceivedBy}` : ''}\n\nKindly verify and approve my dashboard access.`,
        screenshot: remainScreenshot || null, senderId: user.uid, senderName: user.name || 'Student',
        timestamp: serverTimestamp(), read: false, isSystem: true
      });

      await updateDoc(doc(db, 'users', user.uid), {
        'subscribedPG.paymentVerificationPending': false,
        'subscribedPG.remainingAmount': 0,
        'subscribedPG.fullPaymentPaid': true,
        'subscribedPG.kycStatus': 'payment_approved_kyc_pending',
        'subscribedPG.fullPaymentMode': remainPayMode,
        'subscribedPG.fullPaymentScreenshot': remainScreenshot || null
      });
      await updateDoc(doc(db, 'tenants', user.uid), {
        remainingAmount: 0,
        paymentStatus: 'Paid',
        paymentVerificationPending: false
      }).catch(() => {});

      setShowFullRemainModal(false);
      setRemainScreenshot(null); setRemainTransId(''); setRemainReceivedBy(''); setRemainPayMode('Online');
      setSuccessMessage('✅ Full payment submitted! Admin will verify and you\'ll be prompted to fill your details.');
    } catch (err) {
      console.error(err);
      setSuccessMessage('Failed to log payment. Please try again.');
    } finally {
      setRemainLoading(false);
    }
  };

  // Submit partial payment + request access
  const submitPartial = async () => {
    if (!partialAmount || isNaN(partialAmount) || Number(partialAmount) <= 0) return setSuccessMessage('Please enter a valid amount');
    if (!partialDueDate) return setSuccessMessage('Please select when you will pay the remaining amount');
    if (remainPayMode === 'Online' && !remainScreenshot) return setSuccessMessage('Please attach a screenshot of your payment');
    if (!user?.subscribedPG?.pgId) return;
    setRemainLoading(true);
    const remainingAmt = user?.subscribedPG?.remainingAmount ?? user?.subscribedPG?.leaseAmount ?? 0;
    const stillOwing = remainingAmt - Number(partialAmount);
    try {
      const adminId = user.subscribedPG.adminId || user.subscribedPG.pgId;
      const pgId = user.subscribedPG.adminId ? user.subscribedPG.pgId : 'primary';
      const now = new Date();
      const isoString = now.toISOString();
      const dateString = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      await addDoc(collection(db, 'users', user.uid, 'payments'), {
        paymentMode: remainPayMode, transactionId: remainTransId, receivedBy: remainReceivedBy,
        status: 'Pending Verification', name: `Partial Payment - ${user.subscribedPG.pgName}`,
        amount: Number(partialAmount), type: 'Debit', date: dateString, month: dateString,
        contact: user.subscribedPG.pgName, pgName: user.subscribedPG.pgName, adminId, pgId,
        screenshot: remainScreenshot || null, paymentType: 'partial_remaining',
        remainingAfterThis: stillOwing, willPayByDate: partialDueDate, createdAt: isoString
      });

      await addDoc(collection(db, 'notifications'), {
        adminId, pgId, tenantId: user.uid, tenantName: user.name || 'Student',
        title: '⏳ Partial Payment + Access Request',
        desc: `${user.name || 'Student'} has paid ₹${partialAmount} partially (Remaining: ₹${stillOwing}). They have promised to pay the rest by ${new Date(partialDueDate).toLocaleDateString('en-IN')}. Mode: ${remainPayMode}. Tap to Approve or Deny dashboard access.`,
        type: 'partial_payment_request', action: 'VIEW_TENANTS', unread: true, createdAt: isoString,
        resolved: false, screenshot: remainScreenshot || null, willPayByDate: partialDueDate,
        partialAmountPaid: Number(partialAmount), stillOwing
      });

      await addDoc(collection(db, 'users', user.uid, 'notifications'), {
        title: '⏳ Partial Payment Submitted', desc: `You paid ₹${partialAmount} partially. Your request has been sent to the admin for approval.`,
        type: 'info', action: 'VIEW_PAYMENTS', unread: true, createdAt: isoString
      });

      const chatId = [user.uid, adminId].sort().join('_');
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: `⏳ Partial Payment Submitted\nPaid Now: ₹${partialAmount}\nStill Owing: ₹${stillOwing}\nWill Pay Remaining By: ${new Date(partialDueDate).toLocaleDateString('en-IN')}\nMode: ${remainPayMode}${remainTransId ? `\nRef: ${remainTransId}` : ''}${remainReceivedBy ? `\nReceived By: ${remainReceivedBy}` : ''}\n\nRequesting temporary dashboard access.`,
        screenshot: remainScreenshot || null, senderId: user.uid, senderName: user.name || 'Student',
        timestamp: serverTimestamp(), read: false, isSystem: true
      });

      await updateDoc(doc(db, 'users', user.uid), {
        'subscribedPG.paymentVerificationPending': true,
        'subscribedPG.kycStatus': 'partial_pending_approval',
        'subscribedPG.partialAmountPaid': Number(partialAmount),
        'subscribedPG.remainingPaymentDueDate': partialDueDate,
        'subscribedPG.remainingAmount': stillOwing
      });

      setShowPartialModal(false);
      setRemainScreenshot(null); setRemainTransId(''); setRemainReceivedBy(''); setPartialAmount(''); setPartialDueDate(''); setRemainPayMode('Online');
      setSuccessMessage('✅ Partial payment submitted! Once the admin approves, you\'ll be asked to fill your details.');
    } catch (err) {
      console.error(err);
      setSuccessMessage('Failed to submit. Please try again.');
    } finally {
      setRemainLoading(false);
    }
  };

  // Submit KYC details
  const submitKyc = async () => {
    if (!kycDob || !kycPermAddr || !kycFatherName || !kycFatherPhone || !kycAadharNum) {
      return setSuccessMessage('Please fill all required fields');
    }
    if (!kycAadharFront || !kycAadharBack) return setSuccessMessage('Please upload both Aadhar card images');
    setKycLoading(true);
    try {
      const adminId = user.subscribedPG.adminId || user.subscribedPG.pgId;
      const pgId = user.subscribedPG.adminId ? user.subscribedPG.pgId : 'primary';
      const now = new Date();
      const isoString = now.toISOString();
      const kycData = {
        name: user.name || '', phone: user.profileData?.phone || '', email: user.email || '',
        dob: kycDob, permanentAddress: kycPermAddr, correspondingAddress: kycCorrAddr,
        fatherName: kycFatherName, fatherPhone: kycFatherPhone,
        motherName: kycMotherName, motherPhone: kycMotherPhone, parentsAddress: kycParentsAddr,
        aadharNumber: kycAadharNum, aadharFront: kycAadharFront, aadharBack: kycAadharBack,
        occupationType: kycOccupation,
        ...(kycOccupation === 'Student' ? { collegeName: kycCollegeCompany } : {}),
        ...(kycOccupation === 'Working Professional' ? { companyName: kycCollegeCompany } : {}),
        submittedAt: isoString
      };

      await updateDoc(doc(db, 'users', user.uid), {
        kycData,
        detailsFilled: true,
        'subscribedPG.kycStatus': 'under_review'
      });

      await addDoc(collection(db, 'notifications'), {
        adminId, pgId, tenantId: user.uid, tenantName: user.name || 'Student',
        title: '📋 KYC Details Submitted',
        desc: `${user.name || 'Student'} has submitted their KYC/profile details. Please review and approve from Manage Tenants.`,
        type: 'kyc_submitted', action: 'VIEW_TENANTS', unread: true, createdAt: isoString, resolved: false
      });

      setShowKycModal(false);
      setSuccessMessage('📋 Details submitted! Your form is under review. Once the admin approves, your dashboard will be fully unlocked.');
    } catch (err) {
      console.error(err);
      setSuccessMessage('Failed to submit details. Please try again.');
    } finally {
      setKycLoading(false);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'Student';

  console.log("Current user state in StudentDashboard:", user);

  return (
    <div className="dashboard-root">
      {!user?.detailsFilled && user?.pgStatus === 'Current User' && !dismissDetailsPrompt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
           <div style={{ background: 'white', padding: '32px 24px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', position: 'relative', width: '100%', maxWidth: '360px' }}>
             <button onClick={() => setDismissDetailsPrompt(true)} style={{ position: 'absolute', top: 16, right: 16, background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
               <X size={18} color="#64748b" />
             </button>
             <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Welcome Resident! 🎉</h1>
             <p style={{ color: '#475569', fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>Please complete your profile and KYC details to unlock your dashboard and access all features.</p>
             <button onClick={() => { setShowDetailsModal(true); setDismissDetailsPrompt(true); }} style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '16px 0', borderRadius: 16, fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 8px 16px rgba(16,185,129,0.2)' }}>Complete Profile Now</button>
           </div>
        </div>
      )}
      
      <SideMenu isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} />

      {/* ── SCROLLABLE CONTENT ── */}
      <main className="dashboard-scroll-content">
      
        {/* ── HERO HEADER ── */}
        <div className="dashboard-hero">
          <div className="hero-top-bar">
            <button className="hero-icon-btn" onClick={() => setIsSideMenuOpen(true)}>
              <Menu size={22} />
            </button>
            <div className="hero-location-pill">
              <MapPin size={13} color="#d3a429" />
              <span>{locationText}</span>
            </div>
            <button className="hero-icon-btn" onClick={() => navigate('/notifications')} style={{ position: 'relative' }}>
              <Bell size={22} />
              {unreadCount > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', boxSizing: 'border-box' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </button>
          </div>

          <div className="hero-greeting">
            <h1>Hi, {firstName} 👋</h1>
            <p>Find your perfect PG nearby</p>
          </div>

          {/* Stats strip */}
          <div className="stats-strip">
            <div className="stat-item">
              <Building2 size={16} color="#dcfce7" />
              <span><strong>{pgList.length}</strong> PGs</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <Navigation size={16} color="#dcfce7" />
              <span><strong>5km</strong> Radius</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <Users size={16} color="#dcfce7" />
              <span><strong>All</strong> Types</span>
            </div>
          </div>
        </div>

        {!user?.hasPG ? (
          <>
            {/* Floating Search Bar */}
            <div className="floating-search-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="hero-search-bar">
                <Search size={18} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search by name or city..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <button className="filter-icon-btn" onClick={() => setIsFilterModalOpen(true)}>
                  <SlidersHorizontal size={18} color="#166534" />
                </button>
              </div>
              <button 
                onClick={handleUpdateLocation}
                disabled={isLocating}
                style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white',
              padding: '14px 20px', borderRadius: '24px', fontSize: '14px', fontWeight: '800',
              cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', width: '100%',
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
              marginTop: '4px'
            }}
              >
                <Navigation size={18} />
                {isLocating ? 'Getting accurate location...' : 'Find PGs near me accurately'}
              </button>

            {isLocationAccurate && (
              <div style={{ padding: '8px 12px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '12px', color: '#047857', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <Navigation size={14} /> Showing PGs nearest to your accurate location
              </div>
            )}

            </div>

            {/* Filter Chips */}
            <div className="filter-chips">
              {filters.map(f => (
                <button
                  key={f}
                  className={`chip ${activeFilter === f ? 'chip-active' : ''}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Nearby PGs — Horizontal Cards */}
            <section className="pg-section">
              <div className="section-row">
                <h2 className="section-heading">Nearby PGs</h2>
                <span className="section-count">{filteredPGs.length} results</span>
              </div>

              {loading ? (
                <div className="loading-shimmer-row">
                  {[1, 2].map(i => <div key={i} className="shimmer-card" />)}
                </div>
              ) : filteredPGs.length === 0 ? (
                <div className="empty-pg-state">
                  <Home size={40} color="#cbd5e1" />
                  <p>No PGs found matching your search</p>
                </div>
              ) : user?.pgStatus === 'Upcoming User' ? (
                (() => {
                  const kycStatus = user?.subscribedPG?.kycStatus;
                  const dueDate = user?.subscribedPG?.remainingPaymentDueDate;
                  const isOverdue = dueDate && new Date() >= new Date(dueDate);
                  const pv = user?.subscribedPG?.paymentVerificationPending;
                  const remainingAmt = Number(user?.subscribedPG?.remainingAmount !== undefined ? user.subscribedPG.remainingAmount : (user?.subscribedPG?.leaseAmount ? (user.subscribedPG.leaseAmount - (user.subscribedPG.tokenPaid || 0)) : 0));
                  const isFullPaid = user?.subscribedPG?.fullPaymentPaid || 
                                     user?.subscribedPG?.paymentMode === 'Full Payment' || 
                                     remainingAmt <= 0;

                  const DummyDashboard = () => (
                    <div style={{ filter: 'blur(5px)', pointerEvents: 'none', padding: '0 20px', userSelect: 'none', opacity: 0.6, marginTop: 24 }}>
                      <div style={{ height: 90, background: 'white', borderRadius: 20, marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                      <div style={{ height: 24, width: '40%', background: '#e2e8f0', borderRadius: 12, marginBottom: 16 }} />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                          <div key={i} style={{ height: 100, background: 'white', borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                        ))}
                      </div>
                    </div>
                  );

                  const renderOverlayCard = (icon, iconColor, bgGrad, title, subtitle, btnText, btnAction) => (
                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                      <DummyDashboard />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 10 }}>
                        <div style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '32px 24px', borderRadius: 28, boxShadow: '0 24px 48px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.5)', textAlign: 'center', width: '100%', maxWidth: 320 }}>
                          <div style={{ width: 68, height: 68, borderRadius: '50%', background: bgGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: `0 8px 16px ${iconColor}40` }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'white' }}>{icon}</span>
                          </div>
                          <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{title}</h3>
                          <p style={{ margin: btnText ? '0 0 24px' : '0', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>{subtitle}</p>
                          {btnText && (
                            <button onClick={btnAction} style={{ width: '100%', padding: '14px 20px', background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 16px rgba(8,145,178,0.25)', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              {btnText}
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  if (user?.detailsFilled || kycStatus === 'under_review') {
                    return renderOverlayCard(
                      'hourglass_empty', '#0284c7', 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                      'Under Review 🔍',
                      'Your details are being reviewed by the admin. The dashboard will unlock automatically once approved.',
                      null, null
                    );
                  }

                  if (isFullPaid) {
                    return renderOverlayCard(
                      'verified_user', '#059669', 'linear-gradient(135deg, #10b981, #059669)',
                      'Payment Completed ✅',
                      'Your full payment has been recorded! Please fill your details to complete your admission.',
                      'Fill Details Now',
                      () => setShowDetailsModal(true)
                    );
                  }

                  if (kycStatus === 'payment_approved_kyc_pending' && isOverdue) {
                    return renderOverlayCard(
                      'lock', '#d97706', 'linear-gradient(135deg, #f59e0b, #d97706)',
                      'Dashboard Locked',
                      'Your payment due date has passed. Please pay your full payment to unlock the dashboard.',
                      'Pay Full Payment',
                      () => setShowFullRemainModal(true)
                    );
                  }

                  if (kycStatus === 'payment_approved_kyc_pending' && !isOverdue) {
                    return renderOverlayCard(
                      'verified_user', '#059669', 'linear-gradient(135deg, #10b981, #059669)',
                      'Payment Verified ✅',
                      'Your payment was approved! Please provide your details to finally enter the dashboard.',
                      'Fill Details Now',
                      () => setShowDetailsModal(true)
                    );
                  }

                  if (kycStatus === 'partial_pending_approval') {
                    return renderOverlayCard(
                      'pending_actions', '#b45309', 'linear-gradient(135deg, #d97706, #b45309)',
                      'Awaiting Approval ⏳',
                      'Your partial payment request has been sent. Once the admin approves it, you can fill your details.',
                      null, null
                    );
                  }

                  if (kycStatus === 'payment_pending_approval') {
                    return renderOverlayCard(
                      'payments', '#0f766e', 'linear-gradient(135deg, #14b8a6, #0f766e)',
                      'Payment Under Verification 💰',
                      'Your payment has been submitted. The admin will verify and approve your access shortly.',
                      null, null
                    );
                  }

                  if (pv && remainingAmt > 0) return (
                    <div style={{ padding: '0 20px', marginTop: '24px', marginBottom: '40px' }}>
                      <div style={{ background: 'linear-gradient(135deg, #166534, #064e3b)', padding: '32px 24px', borderRadius: '24px', color: 'white', boxShadow: '0 12px 24px rgba(22,101,52,0.2)', marginBottom: '24px', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><CheckCircle size={32} color="#fff" /></div>
                        <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 12px' }}>Payment Logged ✅</h2>
                        <p style={{ margin: '0 0 20px', fontSize: '15px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>Your token payment has been recorded. Now log your remaining payment to proceed.</p>
                        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '16px', borderRadius: '16px', backdropFilter: 'blur(10px)', textAlign: 'left', marginBottom: 20 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Token Paid</span><span style={{ fontSize: 15, fontWeight: 700 }}>₹{user?.subscribedPG?.tokenPaid || 0}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.3)', paddingTop: 8 }}><span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Remaining Balance</span><span style={{ fontSize: 16, fontWeight: 800, color: '#fde047' }}>₹{remainingAmt}</span></div>
                        </div>
                        <button onClick={() => setShowRemainingOptions(true)} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #d3a429, #b8891f)', color: 'white', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>account_balance_wallet</span>Log Remaining Payment
                        </button>
                      </div>
                    </div>
                  );

                  // For add_tenant students with remaining balance: show Pay Remaining screen
                  const isAdminAdded1 = user?.subscribedPG?.isAddTenant;
                  if (isAdminAdded1 && remainingAmt > 0) {
                    return renderOverlayCard(
                      'account_balance_wallet', '#b45309', 'linear-gradient(135deg, #f59e0b, #b45309)',
                      'Complete Your Payment 💰',
                      `You have a remaining balance of ₹${remainingAmt.toLocaleString('en-IN')} to pay. Please pay the full remaining amount to unlock your dashboard.`,
                      'Pay Remaining Amount',
                      () => setShowRemainingOptions(true)
                    );
                  }

                  if (isAdminAdded1 && !user?.detailsFilled) {
                    return renderOverlayCard(
                      'assignment_ind', '#0891b2', 'linear-gradient(135deg, #0ea5e9, #0891b2)',
                      'Fill Your Details 📋',
                      'Your payment is complete! Please fill your personal details to unlock your full dashboard.',
                      'Fill Details Now',
                      () => setShowDetailsModal(true)
                    );
                  }

                  return null;
                })()
              ) : (
                <div className="pg-h-scroll">
                  {filteredPGs.map(pg => (
                    <div
                      key={pg.id}
                      className="pg-card-h"
                      onClick={() => navigate('/room-description', { state: { pg } })}
                    >
                      <div className="pg-card-img-wrap">
                        <ImageSlider
                          images={pg.images || pg.propertyDetails?.images}
                          fallback={pg.image || 'https://images.unsplash.com/photo-1522771731478-44633239c878?auto=format&fit=crop&q=80&w=400'}
                          className="pg-card-img"
                        />
                        <span className="pg-type-badge glass-badge" data-type={pg.pgType?.toLowerCase()}>
                          {pg.pgType || 'UNISEX'}
                        </span>
                        {pg.distanceKm !== null && (
                          <span className="pg-dist-badge glass-badge">
                            <Navigation size={10} /> {pg.distanceKm} km
                          </span>
                        )}
                        <div className="pg-card-price-overlay">
                          {pg.propertyDetails?.rents?.length ? `Starts ₹${Math.min(...pg.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)).toLocaleString()}` : '₹ —'}<span>/mo</span>
                        </div>
                      </div>
                      <div className="pg-card-body">
                        <div className="pg-card-top-row">
                          <h3 className="pg-card-name">{pg.pgName || 'Febebo PG'}</h3>
                          <span className="pg-card-rating">
                            <Star size={12} fill="currentColor" /> 4.5
                          </span>
                        </div>
                        <p className="pg-card-loc">
                          <MapPin size={11} /> {pg.location?.city || 'New Delhi'}
                        </p>
                        <div className="pg-card-footer">
                          <button
                            className="btn-view-pg"
                            onClick={e => { e.stopPropagation(); navigate('/room-description', { state: { pg } }); }}
                          >
                            View Details →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* All PGs — Vertical List */}
            {filteredPGs.length > 0 && (
              <section className="pg-section">
                <div className="section-row">
                  <h2 className="section-heading">Popular in your City</h2>
                  <span 
                    style={{ fontSize: '13px', fontWeight: '700', color: '#064e3b', cursor: 'pointer' }}
                    onClick={() => navigate('/all-pgs')}
                  >
                    Show all
                  </span>
                </div>
                <div className="pg-v-list">
                  {filteredPGs.map(pg => (
                    <div
                      key={pg.id}
                      className="pg-card-v"
                      onClick={() => navigate('/room-description', { state: { pg } })}
                    >
                      <div className="pg-v-img-wrap">
                        <ImageSlider
                          images={pg.images || pg.propertyDetails?.images}
                          fallback={pg.image || 'https://images.unsplash.com/photo-1522771731478-44633239c878?auto=format&fit=crop&q=80&w=400'}
                        />
                      </div>
                      <div className="pg-v-info">
                        <div className="pg-v-header-row">
                          <h4 className="pg-v-name">{pg.pgName || 'Febebo PG'}</h4>
                          <span className="pg-v-rating-pill"><Star size={10} fill="currentColor" /> {pg.rating || '4.5'}</span>
                        </div>
                        <p className="pg-v-loc"><MapPin size={12} /> {pg.location?.city || 'New Delhi'}</p>
                        
                        <div className="pg-v-footer-row">
                          <div className="pg-v-price-block">
                            <span className="pg-v-price-label">Starting at</span>
                            <p className="pg-v-price">
                              {pg.propertyDetails?.rents?.length ? `₹${Math.min(...pg.propertyDetails.rents.map(r=>Number(r.rent)).filter(v=>v>0)).toLocaleString()}` : '—'}
                              <span>/mo</span>
                            </p>
                          </div>
                          {pg.distanceKm !== null && (
                            <div className="pg-v-dist-pill">
                              <Navigation size={12} /> {pg.distanceKm} km
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>


              {!user?.detailsFilled && user?.pgStatus === 'Current User' && (
                <div 
                  onClick={() => setShowDetailsModal(true)}
                  style={{ background: '#fef3c7', padding: '16px', borderRadius: '16px', border: '1px solid #fde68a', margin: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: '0 4px 12px rgba(217,119,6,0.1)' }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800', color: '#b45309' }}>Action Required</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#92400e', fontWeight: '600' }}>Fill your details to use dashboard fully</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: '#b45309', fontSize: 24 }}>arrow_forward_ios</span>
                </div>
              )}
              </section>
            )}

          </>
        ) : (user?.pgStatus === 'Upcoming User' && user?.subscribedPG?.status !== 'Approved') ? (
          (() => {
            const kycStatus = user?.subscribedPG?.kycStatus;
            const dueDate = user?.subscribedPG?.remainingPaymentDueDate;
            const isOverdue = dueDate && new Date() >= new Date(dueDate);
            const pv = user?.subscribedPG?.paymentVerificationPending;
            const remainingAmt = Number(user?.subscribedPG?.remainingAmount !== undefined ? user.subscribedPG.remainingAmount : (user?.subscribedPG?.leaseAmount ? (user.subscribedPG.leaseAmount - (user.subscribedPG.tokenPaid || 0)) : 0));
            const isFullPaid = user?.subscribedPG?.fullPaymentPaid || 
                               user?.subscribedPG?.paymentMode === 'Full Payment' || 
                               remainingAmt <= 0;

            const DummyDashboard = () => (
              <div style={{ filter: 'blur(5px)', pointerEvents: 'none', padding: '0 20px', userSelect: 'none', opacity: 0.6, marginTop: 24 }}>
                <div style={{ height: 90, background: 'white', borderRadius: 20, marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                <div style={{ height: 24, width: '40%', background: '#e2e8f0', borderRadius: 12, marginBottom: 16 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} style={{ height: 100, background: 'white', borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                  ))}
                </div>
              </div>
            );

            const renderOverlayCard = (icon, iconColor, bgGrad, title, subtitle, btnText, btnAction) => (
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <DummyDashboard />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 10 }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '32px 24px', borderRadius: 28, boxShadow: '0 24px 48px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.5)', textAlign: 'center', width: '100%', maxWidth: 320 }}>
                    <div style={{ width: 68, height: 68, borderRadius: '50%', background: bgGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: `0 8px 16px ${iconColor}40` }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'white' }}>{icon}</span>
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{title}</h3>
                    <p style={{ margin: btnText ? '0 0 24px' : '0', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>{subtitle}</p>
                    {btnText && (
                      <button onClick={btnAction} style={{ width: '100%', padding: '14px 20px', background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 16px rgba(8,145,178,0.25)', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        {btnText}
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );

            if (user?.detailsFilled || kycStatus === 'under_review') {
              return renderOverlayCard(
                'hourglass_empty', '#0284c7', 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                'Under Review 🔍',
                'Your details are being reviewed by the admin. The dashboard will unlock automatically once approved.',
                null, null
              );
            }

            if (isFullPaid) {
              return renderOverlayCard(
                'verified_user', '#059669', 'linear-gradient(135deg, #10b981, #059669)',
                'Payment Completed ✅',
                'Your full payment has been recorded! Please fill your details to complete your admission.',
                'Fill Details Now',
                () => setShowDetailsModal(true)
              );
            }

            if (kycStatus === 'payment_approved_kyc_pending' && isOverdue) {
              return renderOverlayCard(
                'lock', '#d97706', 'linear-gradient(135deg, #f59e0b, #d97706)',
                'Dashboard Locked',
                'Your payment due date has passed. Please pay your full payment to unlock the dashboard.',
                'Pay Full Payment',
                () => setShowFullRemainModal(true)
              );
            }

            if (kycStatus === 'payment_approved_kyc_pending' && !isOverdue) {
              return renderOverlayCard(
                'verified_user', '#059669', 'linear-gradient(135deg, #10b981, #059669)',
                'Payment Verified ✅',
                'Your payment was approved! Please provide your details to finally enter the dashboard.',
                'Fill Details Now',
                () => setShowDetailsModal(true)
              );
            }

            if (kycStatus === 'partial_pending_approval') {
              return renderOverlayCard(
                'pending_actions', '#b45309', 'linear-gradient(135deg, #d97706, #b45309)',
                'Awaiting Approval ⏳',
                'Your partial payment request has been sent. Once the admin approves it, you can fill your details.',
                null, null
              );
            }

            if (kycStatus === 'payment_pending_approval') {
              return renderOverlayCard(
                'payments', '#0f766e', 'linear-gradient(135deg, #14b8a6, #0f766e)',
                'Payment Under Verification 💰',
                'Your payment has been submitted. The admin will verify and approve your access shortly.',
                null, null
              );
            }

            if (pv && remainingAmt > 0) return (
              <div style={{ padding: '0 20px', marginTop: '24px', marginBottom: '40px' }}>
                <div style={{ background: 'linear-gradient(135deg, #166534, #064e3b)', padding: '32px 24px', borderRadius: '24px', color: 'white', boxShadow: '0 12px 24px rgba(22,101,52,0.2)', marginBottom: '24px', textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><CheckCircle size={32} color="#fff" /></div>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 12px' }}>Payment Logged ✅</h2>
                  <p style={{ margin: '0 0 20px', fontSize: '15px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>Your token payment has been recorded. Now log your remaining payment to proceed.</p>
                  <div style={{ background: 'rgba(255,255,255,0.15)', padding: '16px', borderRadius: '16px', backdropFilter: 'blur(10px)', textAlign: 'left', marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Token Paid</span><span style={{ fontSize: 15, fontWeight: 700 }}>₹{user?.subscribedPG?.tokenPaid || 0}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.3)', paddingTop: 8 }}><span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Remaining Balance</span><span style={{ fontSize: 16, fontWeight: 800, color: '#fde047' }}>₹{remainingAmt}</span></div>
                  </div>
                  <button onClick={() => setShowRemainingOptions(true)} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #d3a429, #b8891f)', color: 'white', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>account_balance_wallet</span>Log Remaining Payment
                  </button>
                </div>
              </div>
            );

            // For add_tenant students with remaining balance: show Pay Remaining screen
            const isAdminAdded = user?.subscribedPG?.isAddTenant;
            if (isAdminAdded && remainingAmt > 0) {
              return renderOverlayCard(
                'account_balance_wallet', '#b45309', 'linear-gradient(135deg, #f59e0b, #b45309)',
                'Complete Your Payment 💰',
                `You have a remaining balance of ₹${remainingAmt.toLocaleString('en-IN')} to pay. Please pay the full remaining amount to unlock your dashboard.`,
                'Pay Remaining Amount',
                () => setShowRemainingOptions(true)
              );
            }

            if (isAdminAdded && !user?.detailsFilled) {
              return renderOverlayCard(
                'assignment_ind', '#0891b2', 'linear-gradient(135deg, #0ea5e9, #0891b2)',
                'Fill Your Details 📋',
                'Your payment is complete! Please fill your personal details to unlock your full dashboard.',
                'Fill Details Now',
                () => setShowDetailsModal(true)
              );
            }

            // Fallback: show dashboard features only if genuinely unlocked
            return (
              <div style={{ padding: '0 20px', marginTop: '24px', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>Dashboard Features</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {dashboardItems.map((item, idx) => {
                    const IconComponent = item.icon;
                    return (
                      <div 
                        key={idx}
                        onClick={() => navigate(item.path)}
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '16px',
                          padding: '16px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                          border: '1px solid #f8fafc',
                          cursor: 'pointer',
                          gap: '10px',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                        onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <div style={{ 
                          width: '42px', 
                          height: '42px', 
                          borderRadius: '12px', 
                          backgroundColor: item.bg, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                        }}>
                          <IconComponent size={20} color={item.color} strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', textAlign: 'center' }}>
                          {item.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        ) : user?.pgStatus === 'Pending' ? (
          <div style={{ padding: '0 20px', marginTop: '24px', marginBottom: '40px' }}>
            {/* Pending content */}
          </div>
        ) : (
          <div style={{ padding: '0 20px', marginTop: '24px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>Dashboard Features</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {dashboardItems.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div 
                    key={idx}
                    onClick={() => navigate(item.path)}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      padding: '16px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                      border: '1px solid #f8fafc',
                      cursor: 'pointer',
                      gap: '10px',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                    onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{ 
                      width: '42px', 
                      height: '42px', 
                      borderRadius: '12px', 
                      backgroundColor: item.bg, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                    }}>
                      <IconComponent size={20} color={item.color} strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', textAlign: 'center' }}>
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* ── LOG FULL PAYMENT MODAL ── */}
      {showPayModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 400, borderRadius: 24, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Log Full Payment</h2>
            
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Amount to be Paid (₹)</label>
            <div style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16, fontSize: 15, boxSizing: 'border-box', backgroundColor: '#f8fafc', color: '#166534', fontWeight: 800 }}>
              ₹ {user.subscribedPG?.remainingAmount ?? user.subscribedPG?.leaseAmount}
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Mode *</label>
                <select value={fullPaymentMode} onChange={e => setFullPaymentMode(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }}>
                  <option value="Online">Online</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
              {fullPaymentMode === 'Online' && (
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Transaction ID</label>
                  <input type="text" value={fullTransactionId} onChange={e => setFullTransactionId(e.target.value)} placeholder="e.g. UPI Ref" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
                </div>
              )}
            </div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Received By (Name / Role)</label>
            <input type="text" value={fullReceivedBy} onChange={e => setFullReceivedBy(e.target.value)} placeholder="e.g. Rahul (Manager)" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', marginBottom: 16, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />

            {fullPaymentMode === 'Online' && (
              <>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Screenshot *</label>
                <input type="file" accept="image/*" onChange={handleScreenshotUpload} style={{ width: '100%', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: 12, marginBottom: 16, fontSize: 13 }} />
                
                {payScreenshot && (
                  <img src={payScreenshot} alt="Preview" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />
                )}
          </>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => { setShowPayModal(false); setPayScreenshot(null); setFullPaymentMode('Online'); setFullTransactionId(''); setFullReceivedBy(''); }}
                style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: '#e2e8f0', color: '#475569', fontWeight: 700, fontSize: 15 }}
              >
                Cancel
              </button>
              <button 
                onClick={submitFullPayment} disabled={payLoading}
                style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: '#d3a429', color: 'white', fontWeight: 700, fontSize: 15 }}
              >
                {payLoading ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── 1. REMAINING PAYMENT CHOOSER MODAL ── */}
      {showRemainingOptions && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setShowRemainingOptions(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ background: 'white', borderRadius: 24, padding: 24, width: '90%', maxWidth: 360, position: 'relative', zIndex: 1 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#0f172a', fontWeight: 800 }}>Choose Action</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => { setShowRemainingOptions(false); setShowFullRemainModal(true); }} style={{ padding: 16, background: 'linear-gradient(135deg, #166534, #064e3b)', color: 'white', borderRadius: 16, border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="material-symbols-outlined">payments</span>
                <div><div style={{ fontSize: 15 }}>Pay Full Payment</div><div style={{ fontSize: 12, fontWeight: 500, opacity: 0.8 }}>Unlock full dashboard immediately</div></div>
              </button>
              <button onClick={() => { setShowRemainingOptions(false); setShowPartialModal(true); }} style={{ padding: 16, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: 16, fontWeight: 800, fontSize: 15, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="material-symbols-outlined" style={{ color: '#b45309' }}>pending_actions</span>
                <div><div style={{ fontSize: 15 }}>Pay Partial & Request Access</div><div style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Admin will review your request</div></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. FULL REMAINING PAYMENT MODAL ── */}
      {showFullRemainModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={() => setShowFullRemainModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ background: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px', width: '100%', maxWidth: 480, position: 'relative', zIndex: 1, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 800 }}>Pay Full Payment</h3>
              <span onClick={() => setShowFullRemainModal(false)} className="material-symbols-outlined" style={{ cursor: 'pointer' }}>close</span>
            </div>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 16, marginBottom: 20 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Amount to pay</p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#166534' }}>₹{user?.subscribedPG?.remainingAmount ?? user?.subscribedPG?.leaseAmount ?? 0}</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Mode *</label>
              <select value={remainPayMode} onChange={e => setRemainPayMode(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                <option value="Online">Online</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            {remainPayMode === 'Online' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Transaction ID</label>
                <input type="text" value={remainTransId} onChange={e => setRemainTransId(e.target.value)} placeholder="e.g. UPI Ref" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Received By</label>
              <input type="text" value={remainReceivedBy} onChange={e => setRemainReceivedBy(e.target.value)} placeholder="e.g. Rahul (Manager)" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} />
            </div>
            {remainPayMode === 'Online' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Screenshot *</label>
                <input type="file" accept="image/*" onChange={handleRemainScreenshot} style={{ width: '100%', padding: 8, border: '1px dashed #cbd5e1', borderRadius: 12, marginBottom: 10 }} />
                {remainScreenshot && <img src={remainScreenshot} alt="Preview" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 12 }} />}
              </div>
            )}
            <button onClick={submitRemainingFull} disabled={remainLoading} style={{ width: '100%', padding: 16, background: '#166534', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15 }}>
              {remainLoading ? 'Submitting...' : 'Submit Payment'}
            </button>
          </div>
        </div>
      )}

      {/* ── 3. PARTIAL PAYMENT MODAL ── */}
      {showPartialModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={() => setShowPartialModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ background: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px', width: '100%', maxWidth: 480, position: 'relative', zIndex: 1, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 800 }}>Pay Partial & Request</h3>
              <span onClick={() => setShowPartialModal(false)} className="material-symbols-outlined" style={{ cursor: 'pointer' }}>close</span>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Amount You Are Paying Now (₹) *</label>
              <input type="number" value={partialAmount} onChange={e => setPartialAmount(e.target.value)} placeholder="Enter amount" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} />
            </div>
            
            {partialAmount && !isNaN(partialAmount) && (
              <div style={{ background: '#fef3c7', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#92400e', fontWeight: 600 }}>Remaining after this: ₹{(user?.subscribedPG?.remainingAmount ?? user?.subscribedPG?.leaseAmount ?? 0) - Number(partialAmount)}</p>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>When will you pay the remaining balance? *</label>
              <input type="date" value={partialDueDate} onChange={e => setPartialDueDate(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', fontFamily: 'inherit' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Mode *</label>
              <select value={remainPayMode} onChange={e => setRemainPayMode(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                <option value="Online">Online</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            {remainPayMode === 'Online' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Transaction ID</label>
                <input type="text" value={remainTransId} onChange={e => setRemainTransId(e.target.value)} placeholder="e.g. UPI Ref" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Received By</label>
              <input type="text" value={remainReceivedBy} onChange={e => setRemainReceivedBy(e.target.value)} placeholder="e.g. Rahul (Manager)" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} />
            </div>
            {remainPayMode === 'Online' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Payment Screenshot *</label>
                <input type="file" accept="image/*" onChange={handleRemainScreenshot} style={{ width: '100%', padding: 8, border: '1px dashed #cbd5e1', borderRadius: 12, marginBottom: 10 }} />
                {remainScreenshot && <img src={remainScreenshot} alt="Preview" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 12 }} />}
              </div>
            )}
            <button onClick={submitPartial} disabled={remainLoading} style={{ width: '100%', padding: 16, background: '#166534', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15 }}>
              {remainLoading ? 'Submitting...' : 'Submit & Request Access'}
            </button>
          </div>
        </div>
      )}

      {/* ── 4. KYC DETAILS MODAL ── */}
      {showKycModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={() => setShowKycModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ background: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px', width: '100%', maxWidth: 600, position: 'relative', zIndex: 1, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, color: '#0f172a', fontWeight: 800 }}>Fill Your Details</h3>
              <span onClick={() => setShowKycModal(false)} className="material-symbols-outlined" style={{ cursor: 'pointer' }}>close</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Auto-filled read-only */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Full Name</label><input type="text" value={user?.name || ''} readOnly style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8' }} /></div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Phone</label><input type="text" value={user?.profileData?.phone || ''} readOnly style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8' }} /></div>
              </div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Email</label><input type="text" value={user?.email || ''} readOnly style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8' }} /></div>
              
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />
              
              {/* Manual inputs */}
              <div><label style={{ fontSize: 13, fontWeight: 700 }}>Date of Birth *</label><input type="date" value={kycDob} onChange={e => setKycDob(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} /></div>
              
              <div><label style={{ fontSize: 13, fontWeight: 700 }}>Permanent Address *</label><textarea value={kycPermAddr} onChange={e => setKycPermAddr(e.target.value)} rows="2" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} /></div>
              <div><label style={{ fontSize: 13, fontWeight: 700 }}>Corresponding Address</label><textarea value={kycCorrAddr} onChange={e => setKycCorrAddr(e.target.value)} rows="2" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} /></div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 13, fontWeight: 700 }}>Father's Name *</label><input type="text" value={kycFatherName} onChange={e => setKycFatherName(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} /></div>
                <div><label style={{ fontSize: 13, fontWeight: 700 }}>Father's Phone *</label><input type="tel" value={kycFatherPhone} onChange={e => setKycFatherPhone(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} /></div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 13, fontWeight: 700 }}>Mother's Name (Optional)</label><input type="text" value={kycMotherName} onChange={e => setKycMotherName(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} /></div>
                <div><label style={{ fontSize: 13, fontWeight: 700 }}>Mother's Phone (Optional)</label><input type="tel" value={kycMotherPhone} onChange={e => setKycMotherPhone(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} /></div>
              </div>
              
              <div><label style={{ fontSize: 13, fontWeight: 700 }}>Parents' Address</label><textarea value={kycParentsAddr} onChange={e => setKycParentsAddr(e.target.value)} rows="2" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} /></div>
              
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />
              
              <div><label style={{ fontSize: 13, fontWeight: 700 }}>Aadhar Number *</label><input type="text" value={kycAadharNum} onChange={e => setKycAadharNum(e.target.value)} placeholder="12 digit aadhar number" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} /></div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>Aadhar Front *</label>
                  <input type="file" accept="image/*" onChange={async e => { if (e.target.files[0]) setKycAadharFront(await compressImageFromFile(e.target.files[0])); }} style={{ width: '100%', padding: 8, fontSize: 12 }} />
                  {kycAadharFront && <img src={kycAadharFront} alt="Front" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>Aadhar Back *</label>
                  <input type="file" accept="image/*" onChange={async e => { if (e.target.files[0]) setKycAadharBack(await compressImageFromFile(e.target.files[0])); }} style={{ width: '100%', padding: 8, fontSize: 12 }} />
                  {kycAadharBack && <img src={kycAadharBack} alt="Back" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

              <div>
                <label style={{ fontSize: 13, fontWeight: 700 }}>Occupation *</label>
                <select value={kycOccupation} onChange={e => setKycOccupation(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                  <option value="Student">Student</option>
                  <option value="Working Professional">Working Professional</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              {kycOccupation === 'Student' && (
                <div><label style={{ fontSize: 13, fontWeight: 700 }}>College / Institute Name *</label><input type="text" value={kycCollegeCompany} onChange={e => setKycCollegeCompany(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} /></div>
              )}
              {kycOccupation === 'Working Professional' && (
                <div><label style={{ fontSize: 13, fontWeight: 700 }}>Company Name *</label><input type="text" value={kycCollegeCompany} onChange={e => setKycCollegeCompany(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }} /></div>
              )}

              <button onClick={submitKyc} disabled={kycLoading} style={{ width: '100%', padding: 16, background: '#0891b2', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, marginTop: 10 }}>
                {kycLoading ? 'Submitting...' : 'Submit Details'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Modal */}
      {successMessage && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setSuccessMessage('')} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
          <div style={{ background: 'white', borderRadius: 20, padding: 24, width: '90%', maxWidth: 340, position: 'relative', zIndex: 1, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ background: '#166534', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#166534' }}>Notification</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
              {successMessage}
            </p>
            <button 
              onClick={() => setSuccessMessage('')} 
              style={{ width: '100%', padding: '12px', background: '#166534', border: 'none', borderRadius: 12, fontWeight: 700, color: 'white', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      </main>



      {/* ── FILTER MODAL ── */}
      {isFilterModalOpen && (
        <>
          <div className="filter-modal-backdrop" onClick={() => setIsFilterModalOpen(false)} />
          <div className="filter-modal">
            <div className="filter-modal-header">
              <h3>Filters & Sort</h3>
              <button onClick={() => setIsFilterModalOpen(false)} className="close-btn"><X size={20}/></button>
            </div>
            
            <div className="filter-section">
              <h4>Sort By</h4>
              <div className="sort-options">
                <button className={`sort-btn ${sortOption === 'distance' ? 'active' : ''}`} onClick={() => setSortOption('distance')}>Nearest</button>
                <button className={`sort-btn ${sortOption === 'price_low' ? 'active' : ''}`} onClick={() => setSortOption('price_low')}>Price: Low to High</button>
                <button className={`sort-btn ${sortOption === 'price_high' ? 'active' : ''}`} onClick={() => setSortOption('price_high')}>Price: High to Low</button>
                <button className={`sort-btn ${sortOption === 'rating' ? 'active' : ''}`} onClick={() => setSortOption('rating')}>Highest Rated</button>
              </div>
            </div>

            <div className="filter-section">
              <h4>Price Range (₹)</h4>
              <div className="price-inputs">
                <div className="price-input-wrapper">
                  <span>Min</span>
                  <input 
                    type="number" 
                    value={priceRange.min} 
                    onChange={e => setPriceRange({...priceRange, min: Number(e.target.value) || 0})} 
                  />
                </div>
                <div className="price-input-wrapper">
                  <span>Max</span>
                  <input 
                    type="number" 
                    value={priceRange.max} 
                    onChange={e => setPriceRange({...priceRange, max: Number(e.target.value) || 0})} 
                  />
                </div>
              </div>
            </div>

            <button className="apply-filter-btn" onClick={() => setIsFilterModalOpen(false)}>Show {filteredPGs.length} Results</button>
          </div>
        </>
      )}

      {/* Chat FAB */}
      <div 
        onClick={() => navigate('/chat')}
        style={{
          position: 'fixed', bottom: 110, right: 16, width: 54, height: 54,
          borderRadius: '50%', background: 'linear-gradient(135deg, #d3a429, #b8891f)',
          boxShadow: '0 4px 16px rgba(211,164,41,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 50, cursor: 'pointer'
        }}
      >
        <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 24 }}>chat</span>
      </div>

      <BottomNav activeNav="home" />

      {/* Student Details Modal */}
      {user?.subscribedPG && (
        <StudentDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          user={user}
          activeContact={{ id: user.subscribedPG.adminId || user.subscribedPG.pgId, name: user.subscribedPG.pgName }}
          chatId={[user.uid, user.subscribedPG.adminId || user.subscribedPG.pgId].sort().join('_')}
          setSuccessMessage={() => {}}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
