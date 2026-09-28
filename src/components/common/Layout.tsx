import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { DataModeBanner } from './DataModeBanner';
import { StoreCopilotDrawer } from '../ai/StoreCopilotDrawer';
import { useCopilot } from '../../context/CopilotContext';

export const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isOpen: isCopilotOpen, openCopilot, closeCopilot, initialQuery } = useCopilot();
  const location = useLocation();
  const contentAreaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (contentAreaRef.current) {
      contentAreaRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

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
        <main ref={contentAreaRef} className="content-area">
          <Outlet />
        </main>
      </div>

      {/* Floating Action Button (FAB) for AI Copilot */}
      <button
        type="button"
        onClick={() => openCopilot()}
        aria-label="Open AI Copilot"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.15rem',
          borderRadius: '9999px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%)',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontWeight: 600,
          fontSize: '0.85rem'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          e.currentTarget.style.boxShadow = '0 12px 28px rgba(99, 102, 241, 0.55)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.45)';
        }}
      >
        <Sparkles size={17} />
        <span>AI Copilot</span>
      </button>

      {/* Slide-over Copilot Drawer */}
      <StoreCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={closeCopilot}
        initialQuery={initialQuery}
      />
    </div>
  );
};
