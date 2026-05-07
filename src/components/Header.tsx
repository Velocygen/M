import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, GraduationCap, LayoutDashboard, FileSpreadsheet, Settings, Key, Terminal } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <img src="https://velocygen.qzz.io/Velocygen.svg" alt="Velocygen Logo" className="h-8 w-auto text-primary-600 dark:brightness-125" />
              <span className="font-heading font-bold text-xl text-gray-900 dark:text-white tracking-tight hidden sm:block">Velocygen</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            {isAdminRoute && user && isAdmin ? (
              <nav className="flex items-center gap-1 sm:gap-4 md:mr-4">
                <Link to="/admin/dashboard" className={`p-2 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/admin/dashboard' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}>
                  <span className="hidden sm:inline">Dashboard</span>
                  <LayoutDashboard className="h-5 w-5 sm:hidden" />
                </Link>
                <Link to="/admin/results" className={`p-2 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors ${location.pathname.startsWith('/admin/results') ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}>
                   <span className="hidden sm:inline">Results</span>
                   <FileSpreadsheet className="h-5 w-5 sm:hidden" />
                </Link>
                <Link to="/admin/settings" className={`p-2 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors ${location.pathname.startsWith('/admin/settings') ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}>
                   <span className="hidden sm:inline">Settings</span>
                   <Settings className="h-5 w-5 sm:hidden" />
                </Link>
                <Link to="/api-demo" className={`p-2 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors ${location.pathname.startsWith('/api-demo') ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}>
                   <span className="hidden sm:inline">API Demo</span>
                   <Terminal className="h-5 w-5 sm:hidden" />
                </Link>
                <Link to="/admin/api-keys" className={`p-2 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors ${location.pathname.startsWith('/admin/api-keys') ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}>
                   <span className="hidden sm:inline">API</span>
                   <Key className="h-5 w-5 sm:hidden" />
                </Link>
              </nav>
            ) : null}

            {!isAdminRoute && (
               <Link to="/admin/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                 Admin Portal
               </Link>
            )}

            {user && isAdminRoute && (
              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
