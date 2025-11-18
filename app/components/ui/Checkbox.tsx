'use client';

import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelPosition?: 'left' | 'right';
}

export default function Checkbox({
  label,
  labelPosition = 'right',
  style,
  ...props
}: CheckboxProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    userSelect: 'none' as const,
    ...style,
  };

  const checkboxStyle: React.CSSProperties = {
    width: '1.2rem',
    height: '1.2rem',
    cursor: 'pointer',
  };

  return (
    <label style={containerStyle}>
      {label && labelPosition === 'left' && (
        <span style={{ fontSize: '0.9rem', color: '#333' }}>{label}</span>
      )}
      <input type="checkbox" {...props} style={checkboxStyle} />
      {label && labelPosition === 'right' && (
        <span style={{ fontSize: '0.9rem', color: '#333' }}>{label}</span>
      )}
    </label>
  );
}

