import React from 'react';
import type { Article } from '../types/news';

export function useFilteredResults() {
  const filterArticles = (articles: Article[], searchTerm: string): Article[] => {
    if (!searchTerm.trim()) return articles;
    const term = searchTerm.toLowerCase();
    return articles.filter(article =>
      article.title.toLowerCase().includes(term)
    );
  };

  const highlightText = (text: string, searchTerm: string): React.ReactNode => {
    if (!searchTerm.trim()) return text;

    const parts = text.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={index} style={{ backgroundColor: '#ffeb3b', padding: '0 2px' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return {
    filterArticles,
    highlightText,
  };
}

