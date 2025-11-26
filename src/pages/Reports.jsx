import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getSalesByDate, getBusiness, getBusinessesByOwner } from '../services/firestoreService';
import { formatCurrency } from '../utils/taxCalculator';
import { exportToPDF, exportToExcel, exportToCSV } from '../utils/exportUtils';
import { sendSalesReportEmail } from '../services/emailService';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

const Reports = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('custom');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        loadAdminBusinesses();
      } else if (user.role === 'representative' && user.businessId) {
        setSelectedBusinessId(user.businessId);
        loadBusinessData(user.businessId);
        setDefaultDates();
      }
    }
  }, [user]);

  const loadAdminBusinesses = async () => {
    try {
      const userBusinesses = await getBusinessesByOwner(user.uid);
      setBusinesses(userBusinesses);
      
      if (userBusinesses.length > 0) {
        const defaultBusinessId = userBusinesses[0].id;
        setSelectedBusinessId(defaultBusinessId);
        loadBusinessData(defaultBusinessId);
        setDefaultDates();
      }
    } catch (error) {
      toast.error('Failed to load businesses');
    }
  };

  const loadBusinessData = async (businessId) => {
    try {
      const businessData = await getBusiness(businessId);
      if (businessData) {
        setSelectedBusiness(businessData);
      }
    } catch (error) {
      console.error('Failed to load business data');
    }
  };

  useEffect(() => {
    if (selectedBusinessId) {
      loadBusinessData(selectedBusinessId);
    }
  }, [selectedBusinessId]);

  const setDefaultDates = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
  };

  const handleReportTypeChange = (type) => {
    setReportType(type);
    const today = new Date();
    let start = new Date();

    switch (type) {
      case 'today':
        start = today;
        break;
      case 'week':
        start = new Date(today.setDate(today.getDate() - 7));
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      default:
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
  };

  const loadReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    if (!selectedBusinessId) {
      toast.error('Please select a business');
      return;
    }

    setLoading(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include full end date

      const salesData = await getSalesByDate(selectedBusinessId, start, end);
      setSales(salesData);
      
      if (salesData.length === 0) {
        toast.success('Report generated. No sales found for the selected period.');
      }
    } catch (error) {
      console.error('Error loading report:', error);
      
      // Check if it's an index error
      if (error.message && error.message.includes('index')) {
        toast.error('Database index is being created. Please wait a few minutes and try again. If the issue persists, deploy indexes: firebase deploy --only firestore:indexes');
      } else {
        toast.error(`Failed to load report: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalVAT = sales.reduce((sum, sale) => sum + sale.vatAmount, 0);
    const subtotal = sales.reduce((sum, sale) => sum + sale.subtotal, 0);

    return {
      totalSales: subtotal,
      totalVAT,
      grandTotal: totalSales,
    };
  };

  const handleExportPDF = () => {
    if (sales.length === 0) {
      toast.error('No data to export');
      return;
    }

    const summary = calculateSummary();
    exportToPDF({
      sales,
      summary,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    }, `Sales Report - ${reportType}`);
    toast.success('PDF exported successfully');
  };

  const handleExportExcel = () => {
    if (sales.length === 0) {
      toast.error('No data to export');
      return;
    }

    const summary = calculateSummary();
    exportToExcel({
      sales,
      summary,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    }, `Sales Report - ${reportType}`);
    toast.success('Excel file exported successfully');
  };

  const handleSendEmail = async () => {
    if (sales.length === 0) {
      toast.error('No data to send. Please generate a report first.');
      return;
    }

    if (!selectedBusiness) {
      toast.error('Business information not available');
      return;
    }

    if (!selectedBusiness.emailEnabled || !selectedBusiness.emailAddress) {
      toast.error('Email notifications are not enabled for this business. Please configure in Settings.');
      return;
    }

    setSendingEmail(true);
    try {
      const summary = calculateSummary();
      await sendSalesReportEmail(
        selectedBusinessId,
        {
          sales,
          summary,
          dateRange: {
            start: startDate,
            end: endDate,
          },
        },
        selectedBusiness.emailAddress
      );
      toast.success('Sales report sent via email successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email. Make sure email service is configured in Cloud Functions.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExportCSV = () => {
    if (sales.length === 0) {
      toast.error('No data to export');
      return;
    }

    const summary = calculateSummary();
    exportToCSV({
      sales,
      summary,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    }, `Sales Report - ${reportType}`);
    toast.success('CSV file exported successfully');
  };

  const summary = calculateSummary();

  // Show message if admin has no businesses
  if (user?.role === 'admin' && businesses.length === 0 && !loading) {
    return (
      <div className="p-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">Create a business first to generate reports</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg max-w-md">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to create a business before you can generate reports.
          </p>
          <Button onClick={() => window.location.href = '/settings'}>
            Go to Settings to Create Business
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Reports</h1>
            <p className="text-gray-500 dark:text-gray-400">Generate and export sales reports</p>
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

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg mb-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Report Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Button
            variant={reportType === 'today' ? 'primary' : 'secondary'}
            onClick={() => handleReportTypeChange('today')}
            className="w-full"
          >
            Today
          </Button>
          <Button
            variant={reportType === 'week' ? 'primary' : 'secondary'}
            onClick={() => handleReportTypeChange('week')}
            className="w-full"
          >
            Last 7 Days
          </Button>
          <Button
            variant={reportType === 'month' ? 'primary' : 'secondary'}
            onClick={() => handleReportTypeChange('month')}
            className="w-full"
          >
            This Month
          </Button>
          <Button
            variant={reportType === 'custom' ? 'primary' : 'secondary'}
            onClick={() => setReportType('custom')}
            className="w-full"
          >
            Custom Range
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <Button onClick={loadReport} disabled={loading}>
          {loading ? 'Loading...' : 'Generate Report'}
        </Button>
      </div>

      {sales.length > 0 && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg mb-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary.totalSales)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total VAT</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary.totalVAT)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Grand Total</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(summary.grandTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction Details</h2>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleExportPDF}>
                  Export PDF
                </Button>
                <Button variant="secondary" onClick={handleExportExcel}>
                  Export Excel
                </Button>
                <Button variant="secondary" onClick={handleExportCSV}>
                  Export CSV
                </Button>
                {selectedBusiness?.emailEnabled && selectedBusiness?.emailAddress && (
                  <Button 
                    variant="secondary" 
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                  >
                    {sendingEmail ? 'Sending...' : 'Send Email'}
                  </Button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Subtotal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      VAT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {sale.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {sale.items.map((item) => item.productName).join(', ')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {sale.paymentMethod}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {formatCurrency(sale.subtotal)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {formatCurrency(sale.vatAmount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(sale.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {sales.length === 0 && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-200 dark:border-gray-700 shadow-lg text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No sales data found for the selected period.</p>
        </div>
      )}
    </div>
  );
};

export default Reports;

