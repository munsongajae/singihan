'use client';

import React from 'react';
import type { Article } from '../../types/news';

interface ArticleListProps {
  articles: Article[];
  searchTerm: string;
  highlightText: (text: string, searchTerm: string) => React.ReactNode;
}

export default function ArticleList({ articles, searchTerm, highlightText }: ArticleListProps) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {articles.map((article, index) => (
        <li
          key={index}
          style={{
            borderBottom: index < articles.length - 1 ? '1px solid #f0f0f0' : 'none',
            padding: '1rem 1.5rem',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fafafa';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#0066cc',
              textDecoration: 'none',
              display: 'block',
              fontSize: '1rem',
              lineHeight: '1.6'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            {highlightText(article.title, searchTerm)}
          </a>
          {article.summary && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              fontSize: '0.9rem',
              color: '#555',
              lineHeight: '1.5',
              borderLeft: '3px solid #17a2b8'
            }}>
              <div style={{
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#17a2b8',
                marginBottom: '0.25rem'
              }}>
                📄 요약
              </div>
              {article.summary}
            </div>
          )}
          <div style={{
            marginTop: '0.5rem',
            fontSize: '0.85rem',
            color: '#999'
          }}>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#999', textDecoration: 'none' }}
            >
              {article.link}
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}

