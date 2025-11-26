import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { calculateTax } from '../utils/taxCalculator';

/**
 * Get all products for a business
 */
export const getProducts = async (businessId) => {
  try {
    const q = query(
      collection(db, 'products'),
      where('businessId', '==', businessId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Add a new product
 */
export const addProduct = async (businessId, productData) => {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      businessId,
      name: productData.name,
      price: productData.price,
      currentStock: productData.currentStock || 0,
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

/**
 * Update product stock
 */
export const updateProductStock = async (productId, newStock) => {
  try {
    await updateDoc(doc(db, 'products', productId), {
      currentStock: newStock,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new business
 */
export const createBusiness = async (businessData) => {
  try {
    const docRef = await addDoc(collection(db, 'businesses'), {
      name: businessData.name,
      ownerId: businessData.ownerId,
      rraVatRate: businessData.rraVatRate || 0.18,
      salesRepIds: [], // Initialize empty array for sales reps
      emailEnabled: false, // Email notifications disabled by default
      emailAddress: null, // Email address for reports
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

/**
 * Get business data
 */
export const getBusiness = async (businessId) => {
  try {
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (businessDoc.exists()) {
      return {
        id: businessDoc.id,
        ...businessDoc.data(),
      };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Add a new sale
 */
export const addSale = async (saleData) => {
  try {
    // Get business data to fetch VAT rate
    const business = await getBusiness(saleData.businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const vatRate = business.rraVatRate || 0.18; // Default 18% for Rwanda

    // Calculate totals
    const subtotal = saleData.items.reduce(
      (sum, item) => sum + item.pricePerItem * item.quantity,
      0
    );
    const { vatAmount, total } = calculateTax(subtotal, vatRate);

    // Create sale document
    await addDoc(collection(db, 'sales'), {
      businessId: saleData.businessId,
      recordedByUserId: saleData.recordedByUserId,
      createdAt: Timestamp.now(),
      items: saleData.items,
      paymentMethod: saleData.paymentMethod,
      subtotal,
      vatAmount,
      total,
    });

    return { success: true };
  } catch (error) {
    throw error;
  }
};

/**
 * Get sales by date range
 */
export const getSalesByDate = async (businessId, startDate, endDate) => {
  try {
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    const q = query(
      collection(db, 'sales'),
      where('businessId', '==', businessId),
      where('createdAt', '>=', startTimestamp),
      where('createdAt', '<=', endTimestamp),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Get all sales for a business
 */
export const getAllSales = async (businessId) => {
  try {
    const q = query(
      collection(db, 'sales'),
      where('businessId', '==', businessId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Update business settings (e.g., VAT rate)
 */
export const updateBusiness = async (businessId, updates) => {
  try {
    await updateDoc(doc(db, 'businesses', businessId), updates);
  } catch (error) {
    throw error;
  }
};

/**
 * Get all businesses owned by a user (admin)
 */
export const getBusinessesByOwner = async (ownerId) => {
  try {
    const q = query(
      collection(db, 'businesses'),
      where('ownerId', '==', ownerId),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a business
 */
export const deleteBusiness = async (businessId) => {
  try {
    await deleteDoc(doc(db, 'businesses', businessId));
  } catch (error) {
    throw error;
  }
};

/**
 * Create an invitation for a sales rep
 */
export const createInvitation = async (businessId, email, invitedBy) => {
  try {
    // Generate a unique token for the invitation
    const token = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const docRef = await addDoc(collection(db, 'invitations'), {
      businessId,
      email: email.toLowerCase().trim(),
      invitedBy,
      token,
      status: 'pending',
      createdAt: Timestamp.now(),
    });
    
    return {
      id: docRef.id,
      token,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get invitation by token
 */
export const getInvitationByToken = async (token) => {
  try {
    const q = query(
      collection(db, 'invitations'),
      where('token', '==', token),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const invitationDoc = querySnapshot.docs[0];
    return {
      id: invitationDoc.id,
      ...invitationDoc.data(),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get invitation by email
 */
export const getInvitationByEmail = async (email) => {
  try {
    const q = query(
      collection(db, 'invitations'),
      where('email', '==', email.toLowerCase().trim()),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const invitationDoc = querySnapshot.docs[0];
    return {
      id: invitationDoc.id,
      ...invitationDoc.data(),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Accept an invitation (link sales rep to business)
 */
export const acceptInvitation = async (invitationId, userId) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Get invitation
      const invitationRef = doc(db, 'invitations', invitationId);
      const invitationDoc = await transaction.get(invitationRef);
      
      if (!invitationDoc.exists()) {
        throw new Error('Invitation not found');
      }
      
      const invitation = invitationDoc.data();
      
      if (invitation.status !== 'pending') {
        throw new Error('Invitation already used or expired');
      }
      
      // Update invitation status
      transaction.update(invitationRef, {
        status: 'accepted',
        acceptedAt: Timestamp.now(),
        acceptedBy: userId,
      });
      
      // Update user document to link to business
      const userRef = doc(db, 'users', userId);
      transaction.update(userRef, {
        businessId: invitation.businessId,
        role: 'representative',
      });
      
      // Add user to business salesRepIds array
      const businessRef = doc(db, 'businesses', invitation.businessId);
      transaction.update(businessRef, {
        salesRepIds: arrayUnion(userId),
      });
      
      return {
        businessId: invitation.businessId,
      };
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get all invitations for a business
 */
export const getBusinessInvitations = async (businessId) => {
  try {
    const q = query(
      collection(db, 'invitations'),
      where('businessId', '==', businessId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Delete an invitation
 */
export const deleteInvitation = async (invitationId) => {
  try {
    await deleteDoc(doc(db, 'invitations', invitationId));
  } catch (error) {
    throw error;
  }
};

/**
 * Remove a sales rep from a business
 */
export const removeSalesRep = async (businessId, salesRepId) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Remove from business salesRepIds array
      const businessRef = doc(db, 'businesses', businessId);
      transaction.update(businessRef, {
        salesRepIds: arrayRemove(salesRepId),
      });
      
      // Update user document to remove business link
      const userRef = doc(db, 'users', salesRepId);
      transaction.update(userRef, {
        businessId: null,
        role: null, // Or keep as 'representative' but with no business
      });
      
      return { success: true };
    });
  } catch (error) {
    throw error;
  }
};

