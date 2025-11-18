'use client';

import React from 'react';
import { Card } from '../ui';

export interface ScrapeSummaryType {
  totalArticles: number;
  totalPresses: number;
  totalPages: number;
  extractionDate: string;
  pressStats: Array<{
    pressId: string;
    pressName: string;
    category: string;
    articleCount: number;
    pageCount: number;
  }>;
  pageStats: Array<{ page: string; count: number }>;
  categoryStats: Array<{ category: string; count: number }>;
  pressTopKeywords: Record<string, Array<{ word: string; count: number }>>;
  pageTopKeywords: Record<string, Array<{ word: string; count: number }>>;
  topCommonKeywords: Array<{ word: string; count: number }>;
}

interface ScrapeSummaryProps {
  summary: ScrapeSummaryType | null;
}

export default function ScrapeSummary({ summary }: ScrapeSummaryProps) {
  if (!summary) return null;
  return (
    <Card variant="elevated" padding="lg" style={{ marginBottom: '2rem' }}>
      <div style={{
        fontSize: '1.1rem',
        fontWeight: '600',
        color: '#333',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        📊 신문 기사 요약
      </div>

      {/* 기본 통계 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <Card variant="bordered" padding="md">
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
            총 기사 수
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#007bff' }}>
            {summary.totalArticles.toLocaleString()}개
          </div>
        </Card>
        <Card variant="bordered" padding="md">
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
            언론사 수
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#28a745' }}>
            {summary.totalPresses}개
          </div>
        </Card>
        <Card variant="bordered" padding="md">
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
            면 수
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#17a2b8' }}>
            {summary.totalPages}면
          </div>
        </Card>
        <Card variant="bordered" padding="md">
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
            추출 날짜
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#333' }}>
            {summary.extractionDate}
          </div>
        </Card>
      </div>

      {/* 언론사별 통계 */}
      {summary.pressStats.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.75rem'
          }}>
            📰 언론사별 기사 수
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '0.75rem'
          }}>
            {summary.pressStats.slice(0, 10).map((stat) => (
              <Card key={stat.pressId} variant="bordered" padding="sm">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                      {stat.pressName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      {stat.category} · {stat.pageCount}면
                    </div>
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#007bff'
                  }}>
                    {stat.articleCount}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 면별 통계 */}
      {summary.pageStats.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.75rem'
          }}>
            📄 면별 기사 수
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {summary.pageStats.slice(0, 15).map((pageStat) => (
              <div
                key={pageStat.page}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#e6f2ff',
                  borderRadius: '4px',
                  border: '1px solid #b3d9ff'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0066cc' }}>
                  {pageStat.page}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#0066cc' }}>
                  {pageStat.count}개
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 카테고리별 통계 */}
      {summary.categoryStats.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.75rem'
          }}>
            🏷️ 카테고리별 분포
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {summary.categoryStats.map(({ category, count }) => (
              <span
                key={category}
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
                {category} ({count}개)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 언론사별 주요 키워드 */}
      {Object.keys(summary.pressTopKeywords).length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.75rem'
          }}>
            🔑 언론사별 주요 키워드
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {summary.pressStats.slice(0, 5).map((stat) => {
              const keywords = summary.pressTopKeywords[stat.pressId] || [];
              if (keywords.length === 0) return null;

              return (
                <Card key={stat.pressId} variant="bordered" padding="sm">
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '0.5rem'
                  }}>
                    {stat.pressName}
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.4rem'
                  }}>
                    {keywords.slice(0, 8).map((keyword, idx) => {
                      const maxCount = keywords[0]?.count || 1;
                      const fontSize = 0.75 + (keyword.count / maxCount) * 0.2;
                      const opacity = 0.6 + (keyword.count / maxCount) * 0.4;

                      return (
                        <span
                          key={idx}
                          style={{
                            display: 'inline-block',
                            padding: '0.35rem 0.6rem',
                            backgroundColor: `rgba(0, 123, 255, ${opacity})`,
                            color: '#fff',
                            borderRadius: '15px',
                            fontSize: `${fontSize}rem`,
                            fontWeight: '500'
                          }}
                          title={`${keyword.word}: ${keyword.count}회`}
                        >
                          {keyword.word}
                        </span>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 면별 주요 키워드 */}
      {Object.keys(summary.pageTopKeywords).length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.75rem'
          }}>
            📝 면별 주요 키워드
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '0.75rem'
          }}>
            {summary.pageStats.slice(0, 6).map((pageStat) => {
              const keywords = summary.pageTopKeywords[pageStat.page] || [];
              if (keywords.length === 0) return null;

              return (
                <Card key={pageStat.page} variant="bordered" padding="sm">
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '0.5rem'
                  }}>
                    {pageStat.page}
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.4rem'
                  }}>
                    {keywords.slice(0, 5).map((keyword, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-block',
                          padding: '0.3rem 0.5rem',
                          backgroundColor: '#e6f2ff',
                          color: '#0066cc',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          border: '1px solid #b3d9ff'
                        }}
                        title={`${keyword.word}: ${keyword.count}회`}
                      >
                        {keyword.word}
                      </span>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 언론사 간 공통 주제 */}
      {summary.topCommonKeywords.length > 0 && (
        <div>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.75rem'
          }}>
            🔄 1면/A1 공통 키워드
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {summary.topCommonKeywords.map((keyword, index) => (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#fff3cd',
                  color: '#856404',
                  borderRadius: '15px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  border: '1px solid #ffc107'
                }}
                title={`${keyword.word}: ${keyword.count}회`}
              >
                {keyword.word} ({keyword.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

