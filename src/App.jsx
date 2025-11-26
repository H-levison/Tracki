import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/layout/PrivateRoute';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import RecordSale from './pages/RecordSale';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { useAuth } from './hooks/useAuth';
import { useInactivity } from './hooks/useInactivity';
import OfflineIndicator from './components/common/OfflineIndicator';

const AppLayout = ({ children }) => {
  const { user } = useAuth();
  
  // Enable inactivity tracking for logged-in users
  useInactivity();

  if (!user) {
    return children;
  }

  // Get businessId for offline indicator
  const businessId = user?.role === 'admin' ? null : user?.businessId;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-200">{children}</main>
      </div>
      <OfflineIndicator businessId={businessId} />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/record-sale"
            element={
              <PrivateRoute>
                <AppLayout>
                  <RecordSale />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute requiredRole="admin">
                <AppLayout>
                  <Reports />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute requiredRole="admin">
                <AppLayout>
                  <Settings />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

