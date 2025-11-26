import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { addSale, getBusiness, getBusinessesByOwner } from '../services/firestoreService';
import { calculateTax } from '../utils/taxCalculator';
import { isOnline, storeSaleOffline, syncPendingSales } from '../services/offlineService';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

const RecordSale = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customPaymentMethod, setCustomPaymentMethod] = useState('');
  const [vatRate, setVatRate] = useState(0.18);
  const [submitting, setSubmitting] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        loadAdminBusinesses();
      } else if (user.role === 'representative' && user.businessId) {
        setSelectedBusinessId(user.businessId);
        loadBusinessData(user.businessId);
      }
    }
  }, [user]);

  // Sync pending sales when online
  useEffect(() => {
    if (user && selectedBusinessId && isOnline()) {
      syncPendingSales(
        async (saleData) => {
          return await addSale({
            ...saleData,
            businessId: selectedBusinessId,
            recordedByUserId: user.uid,
          });
        },
        selectedBusinessId
      ).then((result) => {
        if (result.synced > 0) {
          toast.success(`${result.synced} offline sale${result.synced !== 1 ? 's' : ''} synced successfully`);
        }
      });
    }
  }, [user, selectedBusinessId]);

  const loadAdminBusinesses = async () => {
    try {
      const userBusinesses = await getBusinessesByOwner(user.uid);
      setBusinesses(userBusinesses);
      
      if (userBusinesses.length > 0) {
        const defaultBusinessId = userBusinesses[0].id;
        setSelectedBusinessId(defaultBusinessId);
        loadBusinessData(defaultBusinessId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      toast.error('Failed to load businesses');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusinessId) {
      loadBusinessData(selectedBusinessId);
    }
  }, [selectedBusinessId]);

  const loadBusinessData = async (businessId) => {
    try {
      setLoading(true);
      const business = await getBusiness(businessId);
      if (business?.rraVatRate) {
        setVatRate(business.rraVatRate);
      }
    } catch (error) {
      console.error('Failed to load business data');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordSale = async (e) => {
    e.preventDefault();
    
    if (!productName || !price) {
      toast.error('Please enter product name and price');
      return;
    }

    if (!selectedBusinessId) {
      toast.error('Please select a business');
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    const quantityValue = parseInt(quantity);
    if (isNaN(quantityValue) || quantityValue <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    // Determine payment method
    const finalPaymentMethod = paymentMethod === 'Custom' ? customPaymentMethod.trim() : paymentMethod;
    if (paymentMethod === 'Custom' && !customPaymentMethod.trim()) {
      toast.error('Please enter a custom payment method');
      return;
    }

    setSubmitting(true);

    try {
      // Calculate totals
      const subtotal = priceValue * quantityValue;
      const { vatAmount, total } = calculateTax(subtotal, vatRate);

      // Prepare sale data
      const saleData = {
        businessId: selectedBusinessId,
        recordedByUserId: user.uid,
        items: [
          {
            productId: `manual-${Date.now()}`,
            productName: productName.trim(),
            quantity: quantityValue,
            pricePerItem: priceValue,
          },
        ],
        paymentMethod: finalPaymentMethod,
        subtotal,
        vatAmount,
        total,
      };

      // Check if online or offline
      if (isOnline()) {
        // Save to Firestore
        await addSale(saleData);
        toast.success('Sale recorded successfully');
      } else {
        // Store offline
        await storeSaleOffline(saleData);
        toast.success('Sale saved offline. It will sync when connection is restored.');
      }

      // Clear form
      setProductName('');
      setPrice('');
      setQuantity(1);
      setPaymentMethod('Cash');
      setCustomPaymentMethod('');
    } catch (error) {
      console.error('Error recording sale:', error);
      toast.error(error.message || 'Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  // Show message if admin has no businesses
  if (user?.role === 'admin' && businesses.length === 0 && !loading) {
    return (
      <div className="p-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Record Sale</h1>
          <p className="text-gray-500 dark:text-gray-400">Create a business first to record sales</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg max-w-md">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to create a business before you can record sales.
          </p>
          <Button onClick={() => navigate('/settings')}>
            Go to Settings to Create Business
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Record Sale</h1>
            <p className="text-gray-500 dark:text-gray-400">Enter product details and record the sale</p>
          </div>
          {user?.role === 'admin' && businesses.length > 0 && (
            <select
              value={selectedBusinessId || ''}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Sale Details</h2>
          
          <form onSubmit={handleRecordSale} className="space-y-6">
            <Input
              label="Product Name"
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter product name"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Price (RWF)"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                required
              />

              <Input
                label="Quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100"
              >
                <option value="Cash">Cash</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            {paymentMethod === 'Custom' && (
              <Input
                label="Custom Payment Method"
                type="text"
                value={customPaymentMethod}
                onChange={(e) => setCustomPaymentMethod(e.target.value)}
                placeholder="Enter custom payment method"
                required
              />
            )}

            <div className="pt-4">
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Recording...' : 'Record Sale'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecordSale;
