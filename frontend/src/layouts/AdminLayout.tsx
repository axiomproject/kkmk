import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AdminHeader from '../components/admin/AdminHeader';
import AdminSidebar from '../components/admin/AdminSidebar';
import { useAuth } from '../hooks/useAuth';
import '../styles/admin/AdminLayout.css';

const AdminLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  if (!user || !['admin', 'staff'].includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  // Redirect root path to dashboard
  if (location.pathname === '/') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="admin-layout">
      <AdminHeader />
      <div className="admin-container">
        <AdminSidebar />
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
