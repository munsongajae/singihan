'use client';

import React from 'react';
import { findPressById, type PressInfo } from '../../data/pressList';
import type { ScrapeResult, Article } from '../../types/news';
import ArticleList from './ArticleList';

interface ScrapeResultsProps {
  result: Record<string, ScrapeResult>;
  articleSearchTerm: string;
  filterArticles: (articles: Article[], searchTerm: string) => Article[];
  highlightText: (text: string, searchTerm: string) => React.ReactNode;
}

// 면 정렬을 위한 정규화 함수
const normalizePage = (page: string): number => {
  const normalized = page.trim().replace(/\s+/g, '');

  // "A1", "B1" 형식 처리 (알파벳 + 숫자)
  const alphaNumMatch = normalized.match(/^([A-Z])(\d+)$/);
  if (alphaNumMatch) {
    const alpha = alphaNumMatch[1].charCodeAt(0) - 64; // A=1, B=2, ...
    const num = parseInt(alphaNumMatch[2]);
    return alpha * 1000 + num; // A1=1001, B1=2001 등
  }

  // "1면", "2면" 형식 처리
  const numMatch = normalized.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1]);
  }

  // 숫자가 없으면 문자열 비교
  return normalized.charCodeAt(0) * 1000;
};

export default function ScrapeResults({
  result,
  articleSearchTerm,
  filterArticles,
  highlightText,
}: ScrapeResultsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {Object.entries(result).map(([pressId, pressResult]) => {
        const press = findPressById(pressId);
        const totalArticles = Object.values(pressResult).reduce((sum, articles) => sum + articles.length, 0);

        return (
          <div
            key={pressId}
            style={{
              border: '2px solid #0066cc',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#fff'
            }}
          >
            <div style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#0066cc',
              color: '#fff',
              fontWeight: '600',
              fontSize: '1.2rem'
            }}>
              {press?.name || `언론사 ID: ${pressId}`} ({press?.category}) - 총 {Object.keys(pressResult).length}면, {totalArticles}개 기사
            </div>

            <div style={{ padding: '1rem' }}>
              {Object.entries(pressResult)
                .sort(([pageA], [pageB]) => {
                  return normalizePage(pageA) - normalizePage(pageB);
                })
                .map(([page, articles]) => {
                  const filteredArticles = filterArticles(articles, articleSearchTerm);

                  if (articleSearchTerm.trim() && filteredArticles.length === 0) {
                    return null;
                  }

                  return (
                    <div
                      key={page}
                      style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#fff',
                        marginBottom: '1.5rem'
                      }}
                    >
                      <div style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#f5f5f5',
                        borderBottom: '1px solid #e0e0e0',
                        fontWeight: '600',
                        fontSize: '1rem',
                        color: '#333'
                      }}>
                        {page} ({filteredArticles.length}개 기사{articleSearchTerm.trim() ? ` / 전체 ${articles.length}개` : ''})
                      </div>

                      <ArticleList
                        articles={filteredArticles}
                        searchTerm={articleSearchTerm}
                        highlightText={highlightText}
                      />
                    </div>
                  );
                })
                .filter(Boolean)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

