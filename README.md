# Tracki

A comprehensive Sales, Inventory, and Tax Compliance management tool for small businesses in Rwanda.

## Features

- **Multi-user Support**: Role-based access control (Admin and sales representative)
- **Sales Management**: Record sales with automatic VAT calculations
- **Tax Compliance**: RRA VAT calculations and tax reports
- **Data Export**: Export reports to PDF and Excel formats
- **Offline Support**: Basic offline persistence for viewing data
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React (Vite), React Router, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions, Cloud Storage)
- **Key Libraries**: 
  - `react-router-dom` - Client-side routing
  - `jspdf` & `xlsx` - Data export
  - `react-hot-toast` - Notifications
  - `date-fns` - Date utilities

## Project Structure

```
Tracki/
├── src/
│   ├── components/
│   │   ├── common/          # Reusable UI components
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── reports/         # Report components
│   │   └── layout/          # Layout components (Navbar, Sidebar, PrivateRoute)
│   ├── contexts/
│   │   └── AuthContext.jsx  # Authentication context
│   ├── hooks/
│   │   └── useAuth.js       # Auth hook
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RecordSale.jsx
│   │   ├── Reports.jsx
│   │   ├── Inventory.jsx
│   │   └── Settings.jsx
│   ├── services/
│   │   ├── firebase.js      # Firebase initialization
│   │   ├── authService.js   # Authentication service
│   │   └── firestoreService.js # Firestore operations
│   ├── utils/
│   │   ├── taxCalculator.js # RRA VAT calculations
│   │   └── exportUtils.js   # PDF/Excel export
│   ├── App.jsx              # Main app router
│   └── main.jsx
├── functions/               # Firebase Cloud Functions
├── firebase.json            # Firebase configuration
├── firestore.rules          # Firestore security rules
└── firestore.indexes.json   # Firestore indexes

```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account
- Firebase CLI (`npm install -g firebase-tools`)

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

2. Enable the following services:
   - Authentication (Email/Password)
   - Firestore Database
   - Cloud Functions
   - Cloud Storage (optional, for storing exports)

3. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps" and add a web app
   - Copy the Firebase configuration object

4. Environment Configuration:
Create a .env file in the root directory (do not commit this file). Add your Firebase config keys:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Initialize Firestore

1. Go to Firestore Database in Firebase Console
2. Create the database in production mode (we'll use security rules)
3. Deploy Firestore rules and indexes:

```bash
firebase login
firebase init firestore
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. Set Up Authentication

1. In Firebase Console, go to Authentication
2. Enable "Email/Password" sign-in method
3. (Optional) Configure authorized domains

### 5. Initialize Cloud Functions

```bash
cd functions
npm install
cd ..
```

### 6. Create Initial Data Structure

You'll need to manually create the initial business and user data in Firestore:

1. **Create a business document** in the `businesses` collection:
   ```json
   {
     "name": "Your Business Name",
     "ownerId": "user-uid-here",
     "rraVatRate": 0.18
   }
   ```

2. **Create a user document** in the `users` collection (doc ID = auth.uid):
   ```json
   {
     "email": "admin@example.com",
     "name": "Admin User",
     "businessId": "business-id-here",
     "role": "admin"
   }
   ```

### 7. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:yourport`

## Database Schema

### Users Collection
- **Doc ID**: `auth.uid`
- **Fields**: `email`, `name`, `businessId`, `role` ('admin' | 'standard')

### Businesses Collection
- **Doc ID**: `businessId` (unique ID)
- **Fields**: `name`, `ownerId`, `rraVatRate` (e.g., 0.18 for 18%)

### Products Collection
- **Doc ID**: `productId` (unique ID)
- **Fields**: `businessId`, `name`, `price`, `currentStock`

### Sales Collection
- **Doc ID**: `saleId` (unique ID)
- **Fields**: 
  - `businessId`
  - `recordedByUserId`
  - `createdAt` (Timestamp)
  - `items` (Array of `{productId, productName, quantity, pricePerItem}`)
  - `paymentMethod`
  - `subtotal`
  - `vatAmount`
  - `total`

## User Roles

### Admin
- Full access to all features
- Can view Reports and Settings
- Can manage inventory
- Can record sales

### Sales Representative
- Can view Dashboard
- Can record sales
- Can view inventory (read-only)

## Cloud Functions

### Weekly Sales Report

A scheduled function that runs every Friday at 9:00 AM (Rwanda time) to generate and email weekly sales summaries to admin users.

**To deploy:**
```bash
firebase deploy --only functions:sendWeeklySalesReport
```

**Note**: The email functionality is stubbed. You'll need to:
1. Set up an email service (SendGrid, Mailgun, etc.)
2. Install the email service package
3. Configure API keys in Firebase Functions config
4. Uncomment and configure the email sending code in `functions/index.js`

### Manual Report Generation

An HTTP function for testing report generation:
```
https://your-region-your-project.cloudfunctions.net/generateSalesReport?businessId=YOUR_BUSINESS_ID
```

## Offline Support

The application includes basic offline persistence for Firestore. Data is cached locally and can be viewed offline. Full offline transaction support (with sync) requires additional implementation.

## Export Features

- **PDF Export**: Uses jsPDF to generate formatted sales reports
- **Excel Export**: Uses xlsx to generate spreadsheet reports

Both exports include:
- Transaction details
- Summary statistics (Total Sales, Total VAT, Grand Total)
- Date range information

## Security

Firestore security rules are configured to:
- Restrict access based on user authentication
- Enforce business-level data isolation
- Limit write operations based on user roles

## Development

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Screenshots
##Login Screen
screenshots\Screenshot 2025-11-28 004950.png

##User Dashboard
screenshots\Screenshot 2025-11-28 005027.png

## Troubleshooting

### Common Issues

1. **Firebase configuration errors**: Ensure your Firebase config in `src/services/firebase.js` is correct
2. **Permission denied errors**: Check Firestore security rules and user authentication
3. **Offline persistence errors**: Ensure IndexedDB is enabled in your browser
4. **Export not working**: Check browser console for errors related to jsPDF or xlsx

## Future Enhancements

- Full offline transaction support with sync
- Email notifications for low stock
- Advanced analytics and charts
- Multi-business support for users
- Receipt generation
- Barcode scanning for products
- Mobile app (React Native)

## License

This project is private and proprietary.

## Support

For issues and questions, please contact the development team.
