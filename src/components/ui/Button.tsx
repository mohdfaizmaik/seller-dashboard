import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'secondary',
  size = 'md',
  active = false,
  ...props
}) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const activeClass = active ? 'btn-active' : '';

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${activeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
