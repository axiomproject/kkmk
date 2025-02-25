import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import AdminHomeHeader from '../components/admin/AdminHomeHeader';
import { useAuth } from '../hooks/useAuth';
import Footer from '../components/Footer';

const GuestLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="layout-container" style={{ isolation: 'isolate' }}>
      {isAdmin ? <AdminHomeHeader /> : <Header onNavigate={handleNavigation} />}
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default GuestLayout;
