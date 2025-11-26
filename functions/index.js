const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require("@sendgrid/mail");

admin.initializeApp();

// --- CONFIGURATION ---
// Load SendGrid Key and Sender Email from Firebase Config
// (Run 'firebase functions:config:set' command in terminal to set these)
const SENDGRID_API_KEY = functions.config().sendgrid?.key;
const SENDER_EMAIL = functions.config().sendgrid?.from;

// Initialize SendGrid
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn("WARNING: SendGrid API Key not found in functions config.");
}

/**
 * Scheduled function to send weekly sales summary email to admin users
 * Runs every Friday at 9:00 AM UTC
 */
exports.sendWeeklySalesReport = functions.pubsub
  .schedule('0 9 * * 5') // Every Friday at 9:00 AM UTC
  .timeZone('Africa/Kigali')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const weekAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 7 * 24 * 60 * 60 * 1000
    );

    try {
      const businessesSnapshot = await db.collection('businesses').get();

      // Process businesses sequentially
      for (const businessDoc of businessesSnapshot.docs) {
        const businessId = businessDoc.id;
        const businessData = businessDoc.data();

        // 1. Get sales for the past week
        const salesSnapshot = await db
          .collection('sales')
          .where('businessId', '==', businessId)
          .where('createdAt', '>=', weekAgo)
          .where('createdAt', '<=', now)
          .get();

        // 2. Calculate summary
        let totalSales = 0;
        let totalVAT = 0;
        let transactionCount = 0;

        salesSnapshot.forEach((saleDoc) => {
          const sale = saleDoc.data();
          totalSales += sale.total || 0;
          totalVAT += sale.vatAmount || 0;
          transactionCount += 1;
        });

        // 3. Send Email if enabled
        if (businessData.emailEnabled && businessData.emailAddress) {
          
          const msg = {
            to: businessData.emailAddress,
            from: SENDER_EMAIL, // Uses the configured sender email
            subject: `Weekly Sales Report - ${businessData.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>Weekly Sales Report</h2>
                <p><strong>Business:</strong> ${businessData.name}</p>
                <p><strong>Period:</strong> Last 7 days</p>
                <hr style="border: 1px solid #eee;">
                <h3>Summary</h3>
                <ul>
                  <li><strong>Total Transactions:</strong> ${transactionCount}</li>
                  <li><strong>Total Sales:</strong> ${totalSales.toLocaleString()} RWF</li>
                  <li><strong>Total VAT:</strong> ${totalVAT.toLocaleString()} RWF</li>
                </ul>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">Thank you for using Tracki!</p>
              </div>
            `,
          };

          try {
            await sgMail.send(msg);
            console.log(`Weekly report sent to ${businessData.emailAddress}`);
          } catch (emailError) {
            console.error(`Failed to send email to ${businessData.emailAddress}:`, emailError);
          }

        } else {
          console.log(`Skipping email for ${businessId}: Email not enabled or missing.`);
        }
      }

      return null;
    } catch (error) {
      console.error('Error in weekly sales report job:', error);
      return null;
    }
  });

/**
 * HTTP function to send sales report via email
 * Called from frontend when user requests email report
 */
exports.sendSalesReportEmail = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { businessId, emailAddress, reportData } = data;

  if (!businessId || !emailAddress || !reportData) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  const db = admin.firestore();

  try {
    // Verify business existence
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists()) {
      throw new functions.https.HttpsError('not-found', 'Business not found');
    }

    const businessData = businessDoc.data();
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();

    // Verify Access
    const hasAccess = (userData.role === 'admin' && businessData.ownerId === context.auth.uid) ||
                      (userData.role === 'representative' && userData.businessId === businessId);

    if (!hasAccess) {
      throw new functions.https.HttpsError('permission-denied', 'You do not have access to this business');
    }

    // Prepare email
    const msg = {
      to: emailAddress,
      from: SENDER_EMAIL, // Uses the configured sender email
      subject: `Sales Report - ${businessData.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Sales Report</h2>
          <p><strong>Business:</strong> ${businessData.name}</p>
          <p><strong>Period:</strong> ${reportData.startDate} to ${reportData.endDate}</p>
          <hr style="border: 1px solid #eee;">
          <h3>Summary</h3>
          <ul>
            <li><strong>Total Transactions:</strong> ${reportData.transactionCount}</li>
            <li><strong>Total Sales:</strong> ${reportData.summary.totalSales.toLocaleString()} RWF</li>
            <li><strong>Total VAT:</strong> ${reportData.summary.totalVAT.toLocaleString()} RWF</li>
            <li><strong>Grand Total:</strong> ${reportData.summary.grandTotal.toLocaleString()} RWF</li>
          </ul>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">Generated via Tracki App</p>
        </div>
      `,
    };

    // Send the email
    await sgMail.send(msg);

    return {
      success: true,
      message: 'Email sent successfully',
    };

  } catch (error) {
    console.error('Error sending email:', error);
    // Return specific error message to frontend if it's from SendGrid
    if (error.response) {
      console.error(error.response.body);
    }
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
});

/**
 * HTTP function to manually trigger sales report generation (JSON only)
 * Useful for testing data logic without sending emails
 */
exports.generateSalesReport = functions.https.onRequest(async (req, res) => {
  const businessId = req.query.businessId;

  if (!businessId) {
    res.status(400).send('businessId is required');
    return;
  }

  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const weekAgo = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - 7 * 24 * 60 * 60 * 1000
  );

  try {
    const salesSnapshot = await db
      .collection('sales')
      .where('businessId', '==', businessId)
      .where('createdAt', '>=', weekAgo)
      .where('createdAt', '<=', now)
      .get();

    let totalSales = 0;
    let totalVAT = 0;
    let transactionCount = 0;

    salesSnapshot.forEach((saleDoc) => {
      const sale = saleDoc.data();
      totalSales += sale.total || 0;
      totalVAT += sale.vatAmount || 0;
      transactionCount += 1;
    });

    res.json({
      success: true,
      businessId,
      period: 'Last 7 days',
      summary: {
        transactionCount,
        totalSales,
        totalVAT,
        grandTotal: totalSales,
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).send('Error generating report');
  }
});