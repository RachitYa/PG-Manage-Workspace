const express = require('express');
const cors = require('cors');
const { initializeApp, cert } = require('firebase-admin/app');
const { google } = require('googleapis');
require('dotenv').config();

// 1. Initialize Firebase Admin
// Make sure serviceAccountKey.json is present in this folder!
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
  initializeApp({
    credential: cert(serviceAccount)
  });
} catch (error) {
  console.log("WARNING: serviceAccountKey.json not found or invalid. Please add it to start using the API.");
  console.error(error);
}

const app = express();
app.use(express.json({ limit: '10mb' })); // Support large base64 images

// Security 1: Rate Limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, error: "Too many requests from this IP, please try again later." }
});
app.use('/api/', limiter);

// Security 2: Strict CORS
// Allowing all origins here since we use Bearer token auth which is immune to CSRF
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Unprotected Endpoint for Staff App
app.post('/api/update-staff-profile', async (req, res) => {
  try {
    const { passkey, profileData } = req.body;
    if (!passkey || !profileData) {
      return res.status(400).json({ success: false, error: "Missing passkey or profileData" });
    }
    const { getFirestore } = require('firebase-admin/firestore');
    const db = getFirestore();
    await db.collection('staff_tokens').doc(passkey).update({
      hasProfile: true,
      profileData: profileData,
      name: profileData.name
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating staff profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Security 3: Authentication Middleware
const verifySuperadmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const { getAuth } = require('firebase-admin/auth');
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Check if it's the superadmin email (shadow account used in Login.jsx)
    if (decodedToken.email !== 'febebo.in@gmail.com') {
      return res.status(403).json({ success: false, error: "Forbidden: Superadmin access required" });
    }
    
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth verification failed:', error);
    return res.status(401).json({ success: false, error: `Unauthorized: ${error.message}` });
  }
};

// 2. Setup Google Cloud Monitoring Client
const getMonitoringClient = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: './serviceAccountKey.json',
    scopes: ['https://www.googleapis.com/auth/monitoring.read'],
  });
  const client = await auth.getClient();
  return google.monitoring({ version: 'v3', auth: client });
};

// 3. Create the Analytics API Endpoint (Now Protected!)
app.get('/api/analytics', verifySuperadmin, async (req, res) => {
  try {
    const monitoring = await getMonitoringClient();
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || serviceAccount.project_id;
    if (!projectId || projectId === 'your-firebase-project-id') {
      return res.status(400).json({ success: false, error: "Please update GOOGLE_CLOUD_PROJECT in your .env file or ensure serviceAccountKey.json is valid" });
    }

    let totalReads = 0;
    let totalWrites = 0;

    try {
      const readResponse = await monitoring.projects.timeSeries.list({
        name: `projects/${projectId}`,
        filter: 'metric.type="firestore.googleapis.com/document/read_count"',
        "interval.startTime": startTime.toISOString(),
        "interval.endTime": new Date().toISOString(),
      });
      if (readResponse.data.timeSeries && readResponse.data.timeSeries.length > 0) {
        readResponse.data.timeSeries.forEach(ts => {
          ts.points.forEach(p => totalReads += parseInt(p.value.int64Value || 0));
        });
      }

      const writeResponse = await monitoring.projects.timeSeries.list({
        name: `projects/${projectId}`,
        filter: 'metric.type="firestore.googleapis.com/document/write_count"',
        "interval.startTime": startTime.toISOString(),
        "interval.endTime": new Date().toISOString(),
      });
      if (writeResponse.data.timeSeries && writeResponse.data.timeSeries.length > 0) {
        writeResponse.data.timeSeries.forEach(ts => {
          ts.points.forEach(p => totalWrites += parseInt(p.value.int64Value || 0));
        });
      }
    } catch (monError) {
      console.log("Monitoring API disabled or lacking permissions, skipping reads/writes.");
    }

    // Fetch total registered users via Auth
    const { getAuth } = require('firebase-admin/auth');
    let totalAuthUsers = 0;
    try {
      const listUsersResult = await getAuth().listUsers(1000);
      totalAuthUsers = listUsersResult.users.length;
    } catch(err) {
      console.error("Auth fetch error:", err);
    }
    
    res.json({
      success: true,
      data: {
        reads: totalReads > 0 ? totalReads : 'Needs GCP API',
        writes: totalWrites > 0 ? totalWrites : 'Needs GCP API',
        totalUsers: totalAuthUsers
      }
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Ecosystem Map Endpoint
app.get('/api/ecosystem-map', verifySuperadmin, async (req, res) => {
  try {
    const { getFirestore } = require('firebase-admin/firestore');
    const db = getFirestore();
    
    // Fetch all needed collections
    const [usersSnap, ownersSnap, chatsSnap, analyticsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('pg_owners').get(),
      db.collection('chats').get(),
      db.collection('analytics_events').get()
    ]);
    
    // Map them into lookup tables
    const students = {};
    usersSnap.forEach(doc => { students[doc.id] = { id: doc.id, ...doc.data() }; });
    
    const pgs = {};
    ownersSnap.forEach(doc => { pgs[doc.id] = { id: doc.id, ...doc.data(), residents: [] }; });
    
    // Analyze chats to link students to PGs
    const chatStats = {
      totalChats: chatsSnap.size,
      paidTokens: 0
    };
    
    chatsSnap.forEach(doc => {
      const chat = doc.data();
      const studentId = chat.studentId;
      const ownerId = chat.ownerId;
      
      if (studentId && ownerId && students[studentId] && pgs[ownerId]) {
        const hasPaidToken = chat.tokenPaid === true || chat.tokenAmount > 0;
        if (hasPaidToken) chatStats.paidTokens++;
      }
    });

    // Link students to PGs based on explicit subscription
    Object.values(students).forEach(student => {
      const ownerId = student.subscribedPG?.pgId || student.adminId;
      if (ownerId && pgs[ownerId]) {
        pgs[ownerId].residents.push({
          studentId: student.id,
          name: student.name || student.tenantName || 'Unknown',
          email: student.email || 'N/A',
          phone: student.phone || 'N/A',
          hasPaidToken: true
        });
      }
    });
    
    // Analyze Analytics Events
    let topFeatureCount = {};
    let searchAreaCount = {};
    let dailyActiveUsers = new Set();
    
    analyticsSnap.forEach(doc => {
      const event = doc.data();
      // Track session starts for DAU
      if (event.eventName === 'session_start') {
        dailyActiveUsers.add(event.timestamp?.toMillis() || doc.id); // approximating DAU
      }
      
      // Track top feature
      if (event.eventName === 'feature_used' && event.feature) {
        topFeatureCount[event.feature] = (topFeatureCount[event.feature] || 0) + 1;
      }
      
      // Track search areas
      if (event.eventName === 'search' && event.search_term) {
        const term = event.search_term.toLowerCase();
        searchAreaCount[term] = (searchAreaCount[term] || 0) + 1;
      }
    });
    
    const mostPopularSearchArea = Object.entries(searchAreaCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topFeature = Object.entries(topFeatureCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    // Calculate global stats using real analytics data
    const ecosystemStats = {
      totalStudents: usersSnap.size,
      totalPGs: ownersSnap.size,
      chatActivity: chatStats,
      estimatedDailyActiveUsers: dailyActiveUsers.size,
      mostPopularSearchArea: mostPopularSearchArea.charAt(0).toUpperCase() + mostPopularSearchArea.slice(1),
      topFeature: topFeature
    };

    res.json({
      success: true,
      data: {
        map: Object.values(pgs).map(pg => ({
          pgId: pg.id,
          pgName: pg.pgName || 'Unnamed PG',
          ownerName: pg.name || 'Unknown Owner',
          location: pg.location || 'Unknown',
          residents: pg.residents
        })),
        stats: ecosystemStats
      }
    });
    
  } catch (error) {
    console.error("Error generating ecosystem map:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Account Deletion Endpoint
app.delete('/api/account/:uid', verifySuperadmin, async (req, res) => {
  try {
    const { getFirestore } = require('firebase-admin/firestore');
    const { getAuth } = require('firebase-admin/auth');
    const db = getFirestore();
    const auth = getAuth();
    const uid = req.params.uid;
    const role = req.query.role; // 'student' or 'admin'

    // 1. Delete from Firebase Auth
    try {
      await auth.deleteUser(uid);
    } catch (authError) {
      // If user doesn't exist in auth but exists in DB, we should still proceed to delete DB records
      if (authError.code !== 'auth/user-not-found') {
        throw authError;
      }
    }

    // 2. Delete from Firestore
    if (role === 'student') {
      await db.collection('users').doc(uid).delete();
    } else if (role === 'admin') {
      await db.collection('admins').doc(uid).delete();
      await db.collection('pg_owners').doc(uid).delete();
    } else {
      return res.status(400).json({ success: false, error: "Invalid role specified" });
    }

    res.json({ success: true, message: `Account ${uid} deleted successfully.` });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
