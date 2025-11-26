import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQsRJANwjTHj_Apb91VQeVEJ3xvIPfCIY",
  authDomain: "tracki-4c91b.firebaseapp.com",
  projectId: "tracki-4c91b",
  storageBucket: "tracki-4c91b.firebasestorage.app",
  messagingSenderId: "858693475602",
  appId: "1:858693475602:web:312db3be487b1e10cca7cb",
  measurementId: "G-VT86PQM3YW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    console.warn('Firestore persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // The browser doesn't support all of the features required
    console.warn('Firestore persistence not available');
  }
});

export default app;

