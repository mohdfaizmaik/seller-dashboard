import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'amazon' | 'flipkart' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'neutral',
  ...props
}) => {
  const baseClass = 'badge';
  const variantClass = `badge-${variant}`;

  return (
    <span
      className={`${baseClass} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
