import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getInvitationByEmail, getInvitationByToken, acceptInvitation } from './firestoreService';

/**
 * Get user-friendly error message from Firebase error
 */
const getErrorMessage = (error) => {
  if (!error.code) {
    return error.message || 'An error occurred';
  }

  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Invalid email address. Please check your email and try again.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please check your email or create an account.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    default:
      return error.message || 'An error occurred. Please try again.';
  }
};

/**
 * Sign up with invitation (for sales reps)
 * Handles both new users and existing users who need to accept an invitation
 */
export const signupWithInvitation = async (email, password, name, invitationToken) => {
  try {
    let user;
    let isNewUser = false;

    // Get invitation by token first to validate it
    const invitation = await getInvitationByToken(invitationToken);
    
    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error('Invitation email does not match');
    }

    try {
      // Try to create a new user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      isNewUser = true;
    } catch (error) {
      // If email is already in use, sign in instead
      if (error.code === 'auth/email-already-in-use') {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          user = userCredential.user;
          
          // Check if user already has a profile
          const existingUserDoc = await getDoc(doc(db, 'users', user.uid));
          if (existingUserDoc.exists()) {
            const existingUser = existingUserDoc.data();
            // If user already has a businessId, they can't accept another invitation
            if (existingUser.businessId) {
              throw new Error('This account is already linked to a business. Please use a different email for this invitation.');
            }
            // If user is an admin, they can't become a sales rep
            if (existingUser.role === 'admin') {
              throw new Error('Admin accounts cannot be converted to sales representatives. Please use a different email.');
            }
          }
        } catch (signInError) {
          // If sign in fails, throw the original error
          if (signInError.code === 'auth/wrong-password') {
            throw new Error('This email is already registered. Please sign in with your password to accept the invitation.');
          }
          throw signInError;
        }
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    // Accept invitation (links user to business)
    await acceptInvitation(invitation.id, user.uid);

    // Create or update user document
    if (isNewUser) {
      // Create new user document
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name,
        businessId: invitation.businessId,
        role: 'representative',
      });
    } else {
      // Update existing user document
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: name || (await getDoc(doc(db, 'users', user.uid))).data()?.name || user.email,
        businessId: invitation.businessId,
        role: 'representative',
      }, { merge: true });
    }

    // Fetch updated user data
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    return {
      uid: user.uid,
      email: user.email,
      name,
      businessId: invitation.businessId,
      role: 'representative',
      ...userDoc.data(),
    };
  } catch (error) {
    // Re-throw with user-friendly message
    const friendlyError = new Error(error.message || getErrorMessage(error));
    friendlyError.code = error.code;
    throw friendlyError;
  }
};

/**
 * Sign in with email and password
 */
export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Fetch user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      // Check if there's a pending invitation for this email
      const invitation = await getInvitationByEmail(user.email);
      if (invitation) {
        // User has pending invitation - they need to complete signup with invitation
        const error = new Error('INVITATION_PENDING');
        error.code = 'INVITATION_PENDING';
        error.message = 'You have a pending invitation. Please sign up using the invitation link.';
        error.invitationToken = invitation.token;
        throw error;
      }
      
      // User exists in Auth but not in Firestore - should not happen with new flow
      const error = new Error('PROFILE_INCOMPLETE');
      error.code = 'PROFILE_INCOMPLETE';
      error.message = 'Your account needs to be set up.';
      throw error;
    }
    
    return {
      uid: user.uid,
      email: user.email,
      ...userDoc.data(),
    };
  } catch (error) {
    // If it's already a custom error, preserve it
    if (error.code === 'PROFILE_INCOMPLETE' || error.code === 'INVITATION_PENDING') {
      throw error;
    }
    // If it's already a friendly error message, preserve it
    if (error.message && !error.code) {
      throw error;
    }
    // Otherwise, convert Firebase errors to user-friendly messages
    const friendlyError = new Error(getErrorMessage(error));
    friendlyError.code = error.code;
    throw friendlyError;
  }
};

/**
 * Sign up a new user (creates admin account)
 * Anyone can sign up - they automatically become an admin
 * They can create businesses later from the settings page
 */
export const signup = async (email, password, name) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore with admin role
    // No business required - admins can create multiple businesses later
    await setDoc(doc(db, 'users', user.uid), {
      email,
      name,
      businessId: null, // Admins don't have a single businessId
      role: 'admin',
    });
    
    return {
      uid: user.uid,
      email: user.email,
      name,
      businessId: null,
      role: 'admin',
    };
  } catch (error) {
    // Re-throw with user-friendly message
    const friendlyError = new Error(getErrorMessage(error));
    friendlyError.code = error.code;
    throw friendlyError;
  }
};

/**
 * Sign out the current user
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

/**
 * Check current session and get user data
 */
export const checkSession = async () => {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            resolve({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userDoc.data(),
            });
          } else {
            resolve(null);
          }
        } catch (error) {
          reject(error);
        }
      } else {
        resolve(null);
      }
    });
  });
};

