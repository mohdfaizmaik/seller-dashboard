import React from 'react';
import { Menu } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import type { PlatformFilter, DatePresetFilter } from '../../hooks/useFilters';

interface TopbarProps {
  onMenuToggle: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuToggle }) => {
  const { platform, preset, startDate, endDate, setFilters } = useFilters();

  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ platform: e.target.value as PlatformFilter });
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ preset: e.target.value as DatePresetFilter });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ startDate: e.target.value });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ endDate: e.target.value });
  };

  return (
    <header className="topbar">
      {/* Mobile Menu Trigger & Brand Title */}
      <div className="flex items-center">
        <button 
          type="button" 
          className="mobile-menu-toggle"
          onClick={onMenuToggle}
          aria-label="Toggle Sidebar Menu"
        >
          <Menu size={20} />
        </button>
        <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Seller Dashboard
        </span>
      </div>

      {/* Global Filter Form Elements */}
      <div className="topbar-filters flex items-center flex-wrap gap-2 justify-end">
        {/* Marketplace Selection */}
        <select 
          className="filter-select"
          value={platform}
          onChange={handlePlatformChange}
          aria-label="Filter by Platform"
        >
          <option value="all">All Platforms</option>
          <option value="amazon">Amazon</option>
          <option value="flipkart">Flipkart</option>
        </select>

        {/* Date Ranges Quick Select Presets */}
        <select 
          className="filter-select"
          value={preset}
          onChange={handlePresetChange}
          aria-label="Filter by Date Range"
        >
          <option value="today">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="ytd">Year to Date (YTD)</option>
          <option value="custom">Custom Range</option>
        </select>

        {/* Custom Calendar Inputs (Only when preset is 'custom') */}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 text-xs" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: 'var(--spacing-md)' }}>
            <input 
              type="date" 
              className="filter-select"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              value={startDate || ''}
              onChange={handleStartDateChange}
              aria-label="Start Date"
            />
            <span style={{ color: 'var(--text-secondary)' }}>to</span>
            <input 
              type="date" 
              className="filter-select"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              value={endDate || ''}
              onChange={handleEndDateChange}
              aria-label="End Date"
            />
          </div>
        )}
      </div>
    </header>
  );
};
