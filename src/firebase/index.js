
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

let firebaseCache;

export function initializeFirebase() {
  if (firebaseCache) {
    return firebaseCache;
  }

  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('YOUR_')) {
    throw new Error(
      'Firebase API key is missing or incorrect. Please check your .env file and ensure it is configured correctly with the VITE_ prefix (e.g., VITE_FIREBASE_API_KEY=...). Then, restart your development server.'
    );
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  
  firebaseCache = { app, auth, firestore };
  return firebaseCache;
}

export { FirebaseProvider, useFirebaseApp, useAuth, useFirestore } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useUser } from './auth/use-user';
