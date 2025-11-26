import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { logout } from '../services/authService';
import toast from 'react-hot-toast';

/**
 * Hook to handle user inactivity and auto-logout
 * Logs out user after 30 minutes of inactivity
 * Shows warning 1 minute before logout
 */
export const useInactivity = (onSaveWork = null) => {
  const { user, setUser } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const onSaveWorkRef = useRef(onSaveWork);

  // Update ref when callback changes
  useEffect(() => {
    onSaveWorkRef.current = onSaveWork;
  }, [onSaveWork]);

  // 30 minutes in milliseconds
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
  // Warning shows 1 minute before logout
  const WARNING_TIME = 1 * 60 * 1000;

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Hide warning if it was showing
    setShowWarning(false);

    if (!user) {
      return;
    }

    // Set warning timer (29 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      toast.error('You will be logged out in 1 minute due to inactivity', {
        duration: 60000, // Show for 1 minute
        icon: '⚠️',
      });
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    // Set logout timer (30 minutes)
    timeoutRef.current = setTimeout(async () => {
      try {
        // Save any unsaved work if callback provided
        if (onSaveWorkRef.current && typeof onSaveWorkRef.current === 'function') {
          await onSaveWorkRef.current();
        }

        // Logout user
        await logout();
        setUser(null);
        toast.success('You have been logged out due to inactivity');
        window.location.href = '/login';
      } catch (error) {
        console.error('Error during auto-logout:', error);
        // Still logout even if save fails
        try {
          await logout();
        } catch (e) {
          // Ignore logout errors
        }
        setUser(null);
        window.location.href = '/login';
      }
    }, INACTIVITY_TIMEOUT);
  }, [user, setUser]);

  useEffect(() => {
    if (!user) {
      // Clear timers if user logs out
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      setShowWarning(false);
      return;
    }

    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [user, resetTimer]);

  return { showWarning };
};

