import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <div className="flex items-center justify-between gap-4 w-full" style={{ marginBottom: 'var(--spacing-xl)' }}>
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold" style={{ margin: 0, fontSize: '24px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          {title}
        </h1>
        {subtitle && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};
