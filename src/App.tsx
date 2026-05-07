/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import ResultCheck from './pages/ResultCheck';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import ResultsList from './pages/admin/ResultsList';
import ResultForm from './pages/admin/ResultForm';
import Settings from './pages/admin/Settings';
import ApiKeys from './pages/admin/ApiKeys';
import { ThemeProvider } from './context/ThemeContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user || !isAdmin) return <Navigate to="/admin/login" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col font-sans dark:bg-gray-900 transition-colors duration-200">
            <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<ResultCheck />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              
              <Route path="/admin" element={<ProtectedRoute><Navigate to="/admin/dashboard" /></ProtectedRoute>} />
              <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/admin/results" element={<ProtectedRoute><ResultsList /></ProtectedRoute>} />
              <Route path="/admin/results/add" element={<ProtectedRoute><ResultForm /></ProtectedRoute>} />
              <Route path="/admin/results/edit/:id" element={<ProtectedRoute><ResultForm /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/admin/api-keys" element={<ProtectedRoute><ApiKeys /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
