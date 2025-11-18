'use client';

import React from 'react';
import type { NaverNewsItem } from '../../types/news';
import { getPressNameFromDomain } from '../../utils/domainMapping';
import { Card, Button } from '../ui';

interface SearchResultsProps {
  items: NaverNewsItem[];
  currentPage: number;
  total: number;
  displayCount: number;
  onPageChange: (page: number) => void;
  onItemClick?: (item: NaverNewsItem) => void;
}

export default function SearchResults({
  items,
  currentPage,
  total,
  displayCount,
  onPageChange,
  onItemClick,
}: SearchResultsProps) {
  const totalPages = Math.ceil(total / displayCount);

  return (
    <div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {items.map((item, index) => {
          let domain = '';
          try {
            const url = new URL(item.originallink || item.link);
            domain = url.hostname.replace('www.', '');
          } catch (e) {
            // URL 파싱 실패 시 무시
          }

          const pressName = getPressNameFromDomain(domain);

          return (
            <Card
              key={index}
              variant="bordered"
              padding="md"
              onClick={() => onItemClick?.(item)}
              style={{
                cursor: onItemClick ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
                marginBottom: '0.5rem'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#333',
                  margin: 0,
                  flex: 1,
                  lineHeight: '1.5'
                }}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#0066cc',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.title}
                  </a>
                </h3>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#999',
                  whiteSpace: 'nowrap'
                }}>
                  {new Date(item.pubDate).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              <p style={{
                fontSize: '0.9rem',
                color: '#666',
                lineHeight: '1.6',
                margin: '0.5rem 0'
              }}>
                {item.description}
              </p>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #f0f0f0'
              }}>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#999'
                }}>
                  <span style={{ fontWeight: '600', color: '#666' }}>
                    {pressName || domain || '알 수 없음'}
                  </span>
                  {item.originallink && item.originallink !== item.link && (
                    <span style={{ marginLeft: '0.5rem', color: '#ccc' }}>•</span>
                  )}
                </div>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.8rem',
                    color: '#999',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#0066cc';
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#999';
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  원문 보기 →
                </a>
              </div>
            </Card>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <Button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            variant="outline"
            size="sm"
          >
            ◀ 이전
          </Button>

          <div style={{
            display: 'flex',
            gap: '0.25rem',
            alignItems: 'center'
          }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  variant={currentPage === pageNum ? 'primary' : 'outline'}
                  size="sm"
                  style={{
                    minWidth: '2.5rem'
                  }}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            variant="outline"
            size="sm"
          >
            다음 ▶
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <div style={{
          marginTop: '1rem',
          textAlign: 'center',
          color: '#666',
          fontSize: '0.85rem'
        }}>
          페이지 {currentPage} / {totalPages}
          ({total.toLocaleString()}개 결과 중)
        </div>
      )}
    </div>
  );
}

