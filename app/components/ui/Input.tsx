'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export default function Input({
  label,
  error,
  fullWidth = true,
  style,
  ...props
}: InputProps) {
  const baseStyle: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    padding: '0.75rem',
    border: error ? '1px solid #dc3545' : '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    ...style,
  };

  return (
    <div style={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#333',
            fontSize: '0.9rem',
          }}
        >
          {label}
        </label>
      )}
      <input
        {...props}
        style={baseStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? '#dc3545' : '#007bff';
          if (props.onFocus) props.onFocus(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? '#dc3545' : '#ddd';
          if (props.onBlur) props.onBlur(e);
        }}
      />
      {error && (
        <div
          style={{
            marginTop: '0.25rem',
            fontSize: '0.85rem',
            color: '#dc3545',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

