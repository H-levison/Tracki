import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Send sales report via email
 * Note: This requires email service to be configured in Cloud Functions
 */
export const sendSalesReportEmail = async (businessId, reportData, emailAddress) => {
  try {
    // Call Cloud Function to send email
    const sendReportEmail = httpsCallable(functions, 'sendSalesReportEmail');
    const result = await sendReportEmail({
      businessId,
      emailAddress,
      reportData: {
        startDate: reportData.dateRange.start,
        endDate: reportData.dateRange.end,
        summary: reportData.summary,
        transactionCount: reportData.sales.length,
      },
    });
    
    return result.data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

