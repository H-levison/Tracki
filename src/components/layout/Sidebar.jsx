import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Sidebar = () => {
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

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen transition-colors duration-200 shadow-lg">
      <div className="p-6">
        <div className="mb-10">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent tracking-tight">
            Tracki
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sales & Tax Manager</p>
        </div>
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
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

