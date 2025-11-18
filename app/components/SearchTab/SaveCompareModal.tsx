'use client';

import React from 'react';
import { Button, Card, EmptyState } from '../ui';
import type { NaverNewsSearchResult } from '../../types/news';

interface SavedSearchResult {
  keyword: string;
  result: NaverNewsSearchResult;
  timestamp: number;
}

interface SaveCompareModalProps {
  newsSearchResult: NaverNewsSearchResult | null;
  newsKeyword: string;
  savedSearchResults: SavedSearchResult[];
  onSaveSearchResult: () => void;
  onRemoveSavedResult: (index: number) => void;
  showComparison: boolean;
  onToggleComparison: () => void;
  overlappingArticles: Array<{ title: string; link: string; keywords: string[] }>;
}

export default function SaveCompareModal({
  newsSearchResult,
  newsKeyword,
  savedSearchResults,
  onSaveSearchResult,
  onRemoveSavedResult,
  showComparison,
  onToggleComparison,
  overlappingArticles,
}: SaveCompareModalProps) {
  return (
    <div style={{
      marginTop: '1rem',
      padding: '1rem',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <Button
          type="button"
          onClick={onSaveSearchResult}
          variant="success"
          size="sm"
          disabled={!newsSearchResult}
        >
          현재 결과 저장
        </Button>
        <Button
          type="button"
          onClick={onToggleComparison}
          disabled={savedSearchResults.length < 2}
          variant="info"
          size="sm"
        >
          {showComparison ? '비교 숨기기' : '결과 비교'}
        </Button>
      </div>

      {savedSearchResults.length > 0 && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          backgroundColor: '#fff',
          borderRadius: '4px',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{
            fontSize: '0.85rem',
            color: '#666',
            marginBottom: '0.5rem'
          }}>
            저장된 검색 ({savedSearchResults.length}/5)
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {savedSearchResults.map((saved, index) => (
              <div
                key={index}
                style={{
                  padding: '0.4rem 0.75rem',
                  backgroundColor: '#e6f2ff',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  border: '1px solid #b3d9ff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{ color: '#0066cc', fontWeight: '500' }}>
                  {saved.keyword}
                </span>
                <span style={{ color: '#999', fontSize: '0.75rem' }}>
                  ({saved.result.items.length}개)
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveSavedResult(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.3rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#dc3545';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#999';
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showComparison && savedSearchResults.length >= 2 && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#fff3cd',
          borderRadius: '6px',
          border: '1px solid #ffc107'
        }}>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#856404',
            marginBottom: '0.75rem'
          }}>
            🔄 겹치는 기사 ({overlappingArticles.length}개)
          </div>
          {overlappingArticles.length > 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {overlappingArticles.map((article, index) => (
                <Card key={index} variant="bordered" padding="sm">
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '0.5rem'
                  }}>
                    {article.title}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#856404',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: '600' }}>
                      {article.keywords.length}개 키워드:
                    </span>
                    {article.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#fff3cd',
                          borderRadius: '4px',
                          fontSize: '0.75rem'
                        }}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.8rem',
                      color: '#007bff',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    기사 보기 →
                  </a>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState message="겹치는 기사가 없습니다." icon="📭" />
          )}
        </div>
      )}
    </div>
  );
}

