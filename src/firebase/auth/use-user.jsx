
import { useState, useEffect } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Function to load user from localStorage
    const loadUserFromStorage = () => {
      const storedUser = localStorage.getItem('craftly_user');

      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('✅ User loaded from localStorage:', userData);
          setUser(userData);
        } catch (error) {
          console.error('Error parsing stored user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    };

    // Load user on component mount
    loadUserFromStorage();

    // Listen for custom event dispatched when user auth state changes
    const handleUserChanged = (e) => {
      console.log('👤 User changed event received:', e.detail);
      if (e.detail) {
        setUser(e.detail);
      } else {
        setUser(null);
      }
    };

    window.addEventListener('craftly-user-changed', handleUserChanged);

    return () => {
      window.removeEventListener('craftly-user-changed', handleUserChanged);
    };
  }, []);

  // Set up real-time listener for user document changes (e.g., role updates by admin)
  useEffect(() => {
    if (!user || !user.uid) return;

    const firestore = getFirestore();
    const userDocRef = doc(firestore, 'users', user.uid);

    try {
      const unsubscribe = onSnapshot(
        userDocRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const updatedUserData = docSnapshot.data();
            // Check if role or other important fields have changed
            if (updatedUserData.role !== user.role) {
              console.log(`👤 User role updated from ${user.role} to ${updatedUserData.role}`);
              // Update both local state and localStorage
              const updatedUser = { ...user, ...updatedUserData };
              setUser(updatedUser);
              localStorage.setItem('craftly_user', JSON.stringify(updatedUser));
              // Dispatch event so other components can react to the change
              window.dispatchEvent(
                new CustomEvent('craftly-user-changed', { detail: updatedUser })
              );
            }
          }
        },
        (error) => {
          // Silently handle permission errors for API-authenticated users
          // API users don't have Firebase Auth context, so they can't listen to Firestore
          if (error.code === 'permission-denied') {
            console.log('Note: Real-time user updates not available for API-authenticated users. Use localStorage updates instead.');
          } else {
            console.error('Error listening to user document changes:', error);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      // Catch any errors during listener setup
      if (error.code === 'permission-denied') {
        console.log('Note: Real-time user updates not available for API-authenticated users.');
      } else {
        console.error('Error setting up user listener:', error);
      }
    }
  }, [user]);

  return { user, loading };
}
