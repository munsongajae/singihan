'use client';

import React from 'react';

interface EmptyStateProps {
  message?: string;
  icon?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  message = '데이터가 없습니다.',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div
      style={{
        padding: '3rem',
        textAlign: 'center',
        color: '#999',
        backgroundColor: '#fafafa',
        borderRadius: '8px',
        border: '1px dashed #ddd',
      }}
    >
      {icon && (
        <div
          style={{
            fontSize: '3rem',
            marginBottom: '1rem',
          }}
        >
          {icon}
        </div>
      )}
      <p style={{ margin: 0, fontSize: '1rem' }}>{message}</p>
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  );
}

