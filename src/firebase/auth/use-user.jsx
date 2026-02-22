
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

  // Disabled real-time listener due to Firestore SDK compatibility issues
  // Real-time role updates will be available after page refresh from localStorage
  // TODO: Re-enable after upgrading to newer Firestore SDK version
  useEffect(() => {
    // Listener intentionally disabled - causes Firestore watch target state corruption
    // Users can still get role updates on next login/page refresh via localStorage
  }, [user?.uid]);

  return { user, loading };
}
