import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Validate Firebase configuration
const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.authDomain && 
         firebaseConfig.projectId &&
         firebaseConfig.apiKey !== "your-api-key" &&
         firebaseConfig.projectId !== "your-project-id";
};

if (!isFirebaseConfigured()) {
  console.error('❌ Firebase is not configured!');
  console.error('Please create a .env file in the client/ directory with your Firebase configuration.');
  console.error('See FIREBASE_SETUP.md for instructions.');
  
  // Show user-friendly error
  if (typeof window !== 'undefined') {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f44336;
      color: white;
      padding: 20px;
      text-align: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    errorDiv.innerHTML = `
      <strong>Firebase Configuration Missing</strong><br>
      Please create a <code>.env</code> file in the <code>client/</code> directory with your Firebase configuration.<br>
      See <code>FIREBASE_SETUP.md</code> for instructions.
    `;
    document.body.appendChild(errorDiv);
  }
}

// Initialize Firebase only if configured
let app, auth, db, analytics;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    // Initialize Analytics only in browser environment
    if (typeof window !== 'undefined') {
      try {
        analytics = getAnalytics(app);
      } catch (analyticsError) {
        console.warn('Analytics initialization failed (this is okay):', analyticsError);
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
} else {
  // Create mock objects to prevent app crashes
  console.warn('Firebase not initialized - using mock objects');
  auth = null;
  db = null;
  analytics = null;
}

export { auth, db, analytics };
export default app;

