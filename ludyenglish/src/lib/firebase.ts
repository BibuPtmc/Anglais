import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC3mLr83HtUKM58zdPDAEPEkcf0an8dgEE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ludyenglish-dbcb6.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ludyenglish-dbcb6",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ludyenglish-dbcb6.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "404122287419",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:404122287419:web:7543ce21b463a3270ccb1e",
  measurementId: "G-W98LWYHL06"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialiser les services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Configurer le provider Google
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
