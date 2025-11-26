import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAllSales, getBusinessesByOwner } from '../services/firestoreService';
import { formatCurrency } from '../utils/taxCalculator';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalVAT: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        loadAdminBusinesses();
      } else if (user.role === 'representative' && user.businessId) {
        setSelectedBusinessId(user.businessId);
        loadDashboardData(user.businessId);
      } else {
        // User exists but doesn't have a valid role or businessId
        setLoading(false);
      }
    } else {
      // User not loaded yet
      setLoading(false);
    }
  }, [user]);

  const loadAdminBusinesses = async () => {
    try {
      const userBusinesses = await getBusinessesByOwner(user.uid);
      setBusinesses(userBusinesses);
      
      if (userBusinesses.length > 0) {
        // Use first business by default, or could use localStorage to remember selection
        const defaultBusinessId = userBusinesses[0].id;
        setSelectedBusinessId(defaultBusinessId);
        loadDashboardData(defaultBusinessId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
      toast.error(`Failed to load businesses: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusinessId) {
      loadDashboardData(selectedBusinessId);
    }
  }, [selectedBusinessId]);

  const loadDashboardData = async (businessId) => {
    try {
      setLoading(true);
      const sales = await getAllSales(businessId);

      const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
      const totalVAT = sales.reduce((sum, sale) => sum + sale.vatAmount, 0);

      setStats({
        totalSales,
        totalVAT,
        totalTransactions: sales.length,
      });
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Show message if admin has no businesses
  if (user?.role === 'admin' && businesses.length === 0 && !loading) {
    return (
      <div className="p-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Get started by creating your first business</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg max-w-md">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have any businesses yet. Create your first business to start tracking sales and managing your inventory.
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
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Overview of your sales and transactions</p>
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sales</p>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats.totalSales)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total VAT</p>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats.totalVAT)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transactions</p>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.totalTransactions}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href="/record-sale"
            className="group bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] block"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-600 dark:group-hover:bg-blue-600 transition-colors">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">Record New Sale</p>
            </div>
          </a>
          {user?.role === 'admin' && (
            <a
              href="/reports"
              className="group bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] block"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl group-hover:bg-purple-600 dark:group-hover:bg-purple-600 transition-colors">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-900 dark:text-white">View Reports</p>
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

