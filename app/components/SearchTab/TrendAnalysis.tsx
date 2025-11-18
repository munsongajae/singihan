'use client';

import React from 'react';
import { Card } from '../ui';

export interface TrendData {
  dateDistribution: Array<{ date: string; count: number }>;
  hourDistribution: Array<{ hour: number; count: number }>;
  totalItems: number;
}

interface TrendAnalysisProps {
  trendData: TrendData | null;
}

export default function TrendAnalysis({ trendData }: TrendAnalysisProps) {
  if (!trendData) return null;

  return (
    <Card variant="bordered" padding="md" style={{ marginTop: '1rem' }}>
      {trendData.dateDistribution.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.75rem'
          }}>
            📅 날짜별 기사 수
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {trendData.dateDistribution.map(({ date, count }, index) => {
              const maxCount = Math.max(...trendData.dateDistribution.map(d => d.count));
              const percentage = (count / maxCount) * 100;

              return (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    minWidth: '100px',
                    fontSize: '0.85rem',
                    color: '#666'
                  }}>
                    {date}
                  </div>
                  <div style={{
                    flex: 1,
                    height: '24px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '4px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      backgroundColor: '#007bff',
                      borderRadius: '4px',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{
                    minWidth: '50px',
                    textAlign: 'right',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    {count}개
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {trendData.hourDistribution.length > 0 && (
        <div>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.75rem'
          }}>
            ⏰ 시간대별 기사 수
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
            gap: '0.5rem'
          }}>
            {trendData.hourDistribution.map(({ hour, count }) => {
              const maxCount = Math.max(...trendData.hourDistribution.map(h => h.count));
              const percentage = (count / maxCount) * 100;

              return (
                <div
                  key={hour}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '0.5rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#666',
                    marginBottom: '0.25rem'
                  }}>
                    {hour}시
                  </div>
                  <div style={{
                    width: '100%',
                    height: '60px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '4px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '100%',
                      height: `${percentage}%`,
                      backgroundColor: '#28a745',
                      borderRadius: '4px 4px 0 0',
                      minHeight: count > 0 ? '4px' : '0',
                      transition: 'height 0.3s'
                    }} />
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    color: '#333',
                    marginTop: '0.25rem'
                  }}>
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

