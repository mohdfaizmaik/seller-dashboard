import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { DataModeBanner } from './DataModeBanner';

export const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="app-layout">
      {/* Left-hand Navigation Drawer */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      {/* Right-hand Workspace */}
      <div className="main-container">
        {/* Filter controls header bar */}
        <Topbar onMenuToggle={toggleMobileMenu} />

        {/* Global Demo vs Live Data Mode Banner */}
        <DataModeBanner />

        {/* Scrollable Workstation area */}
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
