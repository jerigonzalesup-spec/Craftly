import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let firebaseApp;

/**
 * Initialize Firebase Admin SDK
 * This is different from the web SDK - uses Server Account credentials
 */
export function initializeFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Try to use service account JSON from environment
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON format');
      }
    } else {
      // Build service account from individual env variables
      serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      };
    }

    // Validate required fields
    if (!serviceAccount.project_id) {
      throw new Error('Firebase project_id is missing from environment variables');
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`,
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    throw error;
  }
}

/**
 * Get Firestore database reference
 */
export function getFirestore() {
  initializeFirebaseAdmin();
  return admin.firestore();
}

/**
 * Get Firebase Auth reference
 */
export function getAuth() {
  initializeFirebaseAdmin();
  return admin.auth();
}

/**
 * Get Firebase Storage reference
 */
export function getStorage() {
  initializeFirebaseAdmin();
  // Use env var first; fall back to computed name
  // NOTE: bucket name does NOT include 'gs://' prefix
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
  console.log(`🪣 Using storage bucket: ${bucketName}`);
  return admin.storage().bucket(bucketName);
}

/**
 * Server timestamp (same as Firestore timestamp)
 */
export function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}
