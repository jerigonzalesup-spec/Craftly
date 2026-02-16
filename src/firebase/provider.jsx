
import React, { createContext, useContext } from 'react';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

const FirebaseContext = createContext(null);

export const FirebaseProvider = ({ children, value }) => {
  return (
    <FirebaseContext.Provider value={value}>
        {children}
        <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
};

export const useFirebaseApp = () => useContext(FirebaseContext)?.app ?? null;
export const useAuth = () => useContext(FirebaseContext)?.auth ?? null;
export const useFirestore = () => useContext(FirebaseContext)?.firestore ?? null;
