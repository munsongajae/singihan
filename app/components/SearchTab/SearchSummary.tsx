'use client';

import React from 'react';
import { Card } from '../ui';

export interface SearchSummaryType {
  totalArticles: number;
  dateRange: string;
  topKeywords: Array<{ word: string; count: number }>;
  commonTitleWords: string[];
  topDomains: Array<{ domain: string; count: number }>;
  avgDescriptionLength: number;
}

interface SearchSummaryProps {
  summary: SearchSummaryType | null;
}

export default function SearchSummary({ summary }: SearchSummaryProps) {
  if (!summary) return null;

  return (
    <Card variant="bordered" padding="md" style={{ marginTop: '1rem' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <Card variant="bordered" padding="md">
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
            표시된 기사 수
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#007bff' }}>
            {summary.totalArticles.toLocaleString()}개
          </div>
        </Card>
        <Card variant="bordered" padding="md">
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
            기사 기간
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#333' }}>
            {summary.dateRange}
          </div>
        </Card>
        <Card variant="bordered" padding="md">
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
            평균 설명 길이
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#333' }}>
            {summary.avgDescriptionLength}자
          </div>
        </Card>
      </div>

      {summary.topKeywords.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.75rem'
          }}>
            🔑 주요 키워드
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {summary.topKeywords.map((keyword, index) => {
              const maxCount = summary.topKeywords[0].count;
              const fontSize = 0.85 + (keyword.count / maxCount) * 0.3;
              const opacity = 0.6 + (keyword.count / maxCount) * 0.4;

              return (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: `rgba(0, 123, 255, ${opacity})`,
                    color: '#fff',
                    borderRadius: '20px',
                    fontSize: `${fontSize}rem`,
                    fontWeight: '500',
                    cursor: 'default'
                  }}
                  title={`${keyword.word}: ${keyword.count}회 등장`}
                >
                  {keyword.word} ({keyword.count})
                </span>
              );
            })}
          </div>
        </div>
      )}

      {summary.topDomains.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.75rem'
          }}>
            📰 주요 언론사
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {summary.topDomains.map((domain, index) => (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  padding: '0.4rem 0.75rem',
                  backgroundColor: '#e6f2ff',
                  color: '#0066cc',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  border: '1px solid #b3d9ff'
                }}
              >
                {domain.domain} ({domain.count}개)
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.commonTitleWords.length > 0 && (
        <div>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.75rem'
          }}>
            📝 제목에서 자주 등장하는 단어
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {summary.commonTitleWords.map((word, index) => (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  padding: '0.4rem 0.75rem',
                  backgroundColor: '#fff3cd',
                  color: '#856404',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  border: '1px solid #ffc107'
                }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

