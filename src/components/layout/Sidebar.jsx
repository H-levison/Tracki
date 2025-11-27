import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Sidebar = ({ isMobileOpen = false, onClose = () => {} }) => {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', allowedRoles: ['admin', 'standard'] },
    { path: '/record-sale', label: 'Record Sale', allowedRoles: ['admin', 'standard'] },
    { path: '/reports', label: 'Reports', allowedRoles: ['admin'] },
    { path: '/settings', label: 'Settings', allowedRoles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.allowedRoles.includes(user?.role || '')
  );

  const renderNavItems = (isMobile = false) => (
    <nav className="space-y-1">
      {filteredMenuItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-lg shadow-blue-600/25 dark:shadow-blue-600/30'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:translate-x-1'
            }`}
            onClick={() => {
              if (isMobile) {
                onClose();
              }
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarContent = (
    <div className="p-6">
      <div className="mb-10">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent tracking-tight">
          Tracki
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sales & Tax Manager</p>
      </div>
      {renderNavItems()}
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen transition-colors duration-200 shadow-lg flex-col">
        {sidebarContent}
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close menu overlay"></div>
          <aside className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-2xl border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {renderNavItems(true)}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;

