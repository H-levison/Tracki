/**
 * Offline service for storing and syncing sales transactions
 * Uses IndexedDB for primary storage
 */

const DB_NAME = 'TrackiOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'pendingSales';

let db = null;

/**
 * Initialize IndexedDB
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        objectStore.createIndex('businessId', 'businessId', { unique: false });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
        objectStore.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
};

/**
 * Check if browser is online
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Store sale offline
 */
export const storeSaleOffline = async (saleData) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const saleRecord = {
      ...saleData,
      id: `offline-${Date.now()}-${Math.random()}`,
      synced: false,
      createdAt: new Date().toISOString(),
      storedAt: Date.now(),
    };

    await store.add(saleRecord);
    return saleRecord.id;
  } catch (error) {
    console.error('Error storing sale offline:', error);
    throw error;
  }
};

/**
 * Get all pending sales (unsynced)
 */
export const getPendingSales = async (businessId = null) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('synced');
    const request = index.getAll(false);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        let sales = request.result;
        
        // Filter by businessId if provided
        if (businessId) {
          sales = sales.filter(sale => sale.businessId === businessId);
        }
        
        resolve(sales);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get pending sales'));
      };
    });
  } catch (error) {
    console.error('Error getting pending sales:', error);
    throw error;
  }
};

/**
 * Mark sale as synced
 */
export const markSaleAsSynced = async (saleId) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const getRequest = store.get(saleId);
    
    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const sale = getRequest.result;
        if (sale) {
          sale.synced = true;
          const updateRequest = store.put(sale);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Failed to mark sale as synced'));
        } else {
          resolve(); // Sale not found, might have been deleted
        }
      };
      
      getRequest.onerror = () => {
        reject(new Error('Failed to get sale'));
      };
    });
  } catch (error) {
    console.error('Error marking sale as synced:', error);
    throw error;
  }
};

/**
 * Delete synced sales (cleanup)
 */
export const deleteSyncedSales = async () => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('synced');
    const request = index.getAll(true);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const syncedSales = request.result;
        const deletePromises = syncedSales.map(sale => {
          return new Promise((res, rej) => {
            const deleteRequest = store.delete(sale.id);
            deleteRequest.onsuccess = () => res();
            deleteRequest.onerror = () => rej();
          });
        });

        Promise.all(deletePromises)
          .then(() => resolve())
          .catch(reject);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get synced sales'));
      };
    });
  } catch (error) {
    console.error('Error deleting synced sales:', error);
    throw error;
  }
};

/**
 * Sync pending sales to Firestore
 */
export const syncPendingSales = async (addSaleFunction, businessId) => {
  if (!isOnline()) {
    return { synced: 0, failed: 0 };
  }

  try {
    const pendingSales = await getPendingSales(businessId);
    let synced = 0;
    let failed = 0;

    for (const sale of pendingSales) {
      try {
        // Convert stored sale back to Firestore format
        const firestoreSale = {
          businessId: sale.businessId,
          recordedByUserId: sale.recordedByUserId,
          items: sale.items,
          paymentMethod: sale.paymentMethod,
          subtotal: sale.subtotal,
          vatAmount: sale.vatAmount,
          total: sale.total,
        };

        await addSaleFunction(firestoreSale);
        await markSaleAsSynced(sale.id);
        synced++;
      } catch (error) {
        console.error('Error syncing sale:', error);
        failed++;
      }
    }

    // Clean up old synced sales (older than 7 days)
    await deleteSyncedSales();

    return { synced, failed };
  } catch (error) {
    console.error('Error syncing pending sales:', error);
    return { synced: 0, failed: 0 };
  }
};

/**
 * Get count of pending sales
 */
export const getPendingSalesCount = async (businessId = null) => {
  try {
    const pendingSales = await getPendingSales(businessId);
    return pendingSales.length;
  } catch (error) {
    console.error('Error getting pending sales count:', error);
    return 0;
  }
};

