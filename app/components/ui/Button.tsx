'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
  },
  secondary: {
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
  },
  success: {
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
  },
  info: {
    backgroundColor: '#17a2b8',
    color: '#fff',
    border: 'none',
  },
  warning: {
    backgroundColor: '#ffc107',
    color: '#212529',
    border: 'none',
  },
  danger: {
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
  },
  outline: {
    backgroundColor: 'transparent',
    color: '#333',
    border: '1px solid #ddd',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#666',
    border: 'none',
  },
};

const hoverStyles: Record<ButtonVariant, string> = {
  primary: '#0056b3',
  secondary: '#5a6268',
  success: '#218838',
  info: '#138496',
  warning: '#e0a800',
  danger: '#c82333',
  outline: '#e0e0e0',
  ghost: '#e0e0e0',
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
  },
  md: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
  },
  lg: {
    padding: '1rem 2rem',
    fontSize: '1.1rem',
  },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(disabled && {
      opacity: 0.6,
      backgroundColor: variant === 'outline' || variant === 'ghost' ? 'transparent' : '#ccc',
    }),
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && onMouseEnter) {
      onMouseEnter(e);
    } else if (!disabled && hoverStyles[variant]) {
      e.currentTarget.style.backgroundColor = hoverStyles[variant];
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && onMouseLeave) {
      onMouseLeave(e);
    } else if (!disabled) {
      e.currentTarget.style.backgroundColor = variantStyles[variant].backgroundColor as string;
    }
  };

  return (
    <button
      {...props}
      disabled={disabled}
      style={baseStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
}

