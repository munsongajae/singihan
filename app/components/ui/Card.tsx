'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  onClick?: () => void;
}

const variantStyles: Record<'default' | 'bordered' | 'elevated', React.CSSProperties> = {
  default: {
    backgroundColor: '#fff',
  },
  bordered: {
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
  },
  elevated: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
};

const paddingStyles: Record<'none' | 'sm' | 'md' | 'lg', React.CSSProperties> = {
  none: {
    padding: 0,
  },
  sm: {
    padding: '0.75rem',
  },
  md: {
    padding: '1rem',
  },
  lg: {
    padding: '1.5rem',
  },
};

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  style,
  onClick,
}: CardProps) {
  const baseStyle: React.CSSProperties = {
    ...variantStyles[variant],
    ...paddingStyles[padding],
    ...(onClick && {
      cursor: 'pointer',
      transition: 'all 0.2s',
    }),
    ...style,
  };

  if (onClick) {
    return (
      <div
        style={baseStyle}
        onClick={onClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          if (variant === 'elevated') {
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          if (variant === 'elevated') {
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
          }
        }}
      >
        {children}
      </div>
    );
  }

  return <div style={baseStyle}>{children}</div>;
}

