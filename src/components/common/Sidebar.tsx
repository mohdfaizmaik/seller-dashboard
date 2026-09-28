import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Activity,
  Store,
  Boxes,
  ReceiptText,
  Target,
  RotateCcw,
  Wallet,
  X 
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const menuItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/marketplace', label: 'Marketplace', icon: Store },
    { path: '/sales', label: 'Sales Analytics', icon: TrendingUp },
    { path: '/products', label: 'Product Performance', icon: Package },
    { path: '/orders', label: 'Order Management', icon: ShoppingCart },
    { path: '/profit', label: 'Profit & Expenses', icon: DollarSign },
    { path: '/inventory', label: 'Inventory & Stock', icon: Boxes },
    { path: '/tax', label: 'GST & Compliance', icon: ReceiptText },
    { path: '/advertising', label: 'Ad ROI & Marketing', icon: Target },
    { path: '/returns', label: 'Returns & RTO Shield', icon: RotateCcw },
    { path: '/cashflow', label: 'Cash Flow & Runway', icon: Wallet },
    { path: '/comparison', label: 'Platform Comparison', icon: Activity },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div 
        className={`sidebar-backdrop ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo section */}
        <div className="sidebar-logo">
          <LayoutDashboard size={22} style={{ color: 'var(--color-primary)' }} />
          <span className="sidebar-logo-text" style={{ letterSpacing: '-0.03em' }}>SellerVault</span>
          {/* Close button for Mobile screen widths */}
          <button 
            type="button" 
            className="mobile-menu-toggle" 
            style={{ 
              marginLeft: 'auto', 
              display: isOpen ? 'flex' : 'none', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer' 
            }}
            onClick={onClose}
          >
            <X size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => 
                  `sidebar-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={20} />
                <span className="sidebar-item-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
