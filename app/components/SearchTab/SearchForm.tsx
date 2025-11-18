'use client';

import React from 'react';
import { Button, Input } from '../ui';

interface SearchFormProps {
  newsKeyword: string;
  onNewsKeywordChange: (keyword: string) => void;
  newsSearchLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  sortOption: 'sim' | 'date';
  onSortOptionChange: (option: 'sim' | 'date') => void;
  displayCount: number;
  onDisplayCountChange: (count: number) => void;
  showAutocomplete: boolean;
  autocompleteSuggestions: string[];
  onSelectKeyword: (keyword: string) => void;
  onRemoveFromHistory: (keyword: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export default function SearchForm({
  newsKeyword,
  onNewsKeywordChange,
  newsSearchLoading,
  onSubmit,
  sortOption,
  onSortOptionChange,
  displayCount,
  onDisplayCountChange,
  showAutocomplete,
  autocompleteSuggestions,
  onSelectKeyword,
  onRemoveFromHistory,
  onFocus,
  onBlur,
}: SearchFormProps) {
  return (
    <form onSubmit={onSubmit} style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Input
            type="text"
            value={newsKeyword}
            onChange={(e) => {
              onNewsKeywordChange(e.target.value);
            }}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder="검색할 키워드를 입력하세요 (예: 인공지능, 경제, 정치 등)"
            disabled={newsSearchLoading}
            fullWidth
          />

          {showAutocomplete && autocompleteSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '0.25rem',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 1000,
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {autocompleteSuggestions.map((item, index) => (
                <div
                  key={index}
                  onClick={() => onSelectKeyword(item)}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    borderBottom: index < autocompleteSuggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: '#333' }}>🔍 {item}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromHistory(item);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        padding: '0.25rem 0.5rem'
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
                </div>
              ))}
            </div>
          )}
        </div>
        <select
          value={sortOption}
          onChange={(e) => onSortOptionChange(e.target.value as 'sim' | 'date')}
          style={{
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '1rem',
            backgroundColor: '#fff',
            cursor: newsSearchLoading ? 'not-allowed' : 'pointer',
            opacity: newsSearchLoading ? 0.6 : 1,
            minWidth: '140px'
          }}
          disabled={newsSearchLoading}
        >
          <option value="date">최신순</option>
          <option value="sim">정확도순</option>
        </select>
        <select
          value={displayCount}
          onChange={(e) => {
            const newCount = parseInt(e.target.value, 10);
            onDisplayCountChange(newCount);
          }}
          style={{
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '1rem',
            backgroundColor: '#fff',
            cursor: newsSearchLoading ? 'not-allowed' : 'pointer',
            opacity: newsSearchLoading ? 0.6 : 1,
            minWidth: '120px'
          }}
          disabled={newsSearchLoading}
        >
          <option value="10">10개씩</option>
          <option value="20">20개씩</option>
          <option value="30">30개씩</option>
          <option value="50">50개씩</option>
          <option value="100">100개씩</option>
          <option value="200">200개씩</option>
          <option value="500">500개씩</option>
          <option value="1000">1000개씩</option>
        </select>
        <Button
          type="submit"
          disabled={newsSearchLoading || !newsKeyword.trim()}
          variant="primary"
          size="md"
          style={{ whiteSpace: 'nowrap' }}
        >
          {newsSearchLoading ? '검색 중...' : '검색'}
        </Button>
      </div>
    </form>
  );
}

