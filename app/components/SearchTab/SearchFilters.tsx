'use client';

import React from 'react';
import { getPressNameFromDomain } from '../../utils/domainMapping';
import type { NaverNewsSearchResult } from '../../types/news';
import { Button, Input, Checkbox } from '../ui';

interface SearchFiltersProps {
  newsSearchResult: NaverNewsSearchResult | null;
  filterDomain: string;
  onFilterDomainChange: (domain: string) => void;
  filterText: string;
  onFilterTextChange: (text: string) => void;
  filterInTitle: boolean;
  onFilterInTitleChange: (value: boolean) => void;
  filterInDescription: boolean;
  onFilterInDescriptionChange: (value: boolean) => void;
  useDateRange: boolean;
  onUseDateRangeChange: (value: boolean) => void;
  dateRangeStart: string;
  onDateRangeStartChange: (date: string) => void;
  dateRangeEnd: string;
  onDateRangeEndChange: (date: string) => void;
  onResetFilters: () => void;
  onSetQuickDateRange: (days: number) => void;
  onSetTodayDateRange: () => void;
}

export default function SearchFilters({
  newsSearchResult,
  filterDomain,
  onFilterDomainChange,
  filterText,
  onFilterTextChange,
  filterInTitle,
  onFilterInTitleChange,
  filterInDescription,
  onFilterInDescriptionChange,
  useDateRange,
  onUseDateRangeChange,
  dateRangeStart,
  onDateRangeStartChange,
  dateRangeEnd,
  onDateRangeEndChange,
  onResetFilters,
  onSetQuickDateRange,
  onSetTodayDateRange,
}: SearchFiltersProps) {
  // 고유한 도메인 목록 추출
  const uniqueDomains = React.useMemo(() => {
    const domains = new Set<string>();
    if (newsSearchResult) {
      newsSearchResult.items.forEach((item) => {
        try {
          const url = new URL(item.originallink || item.link);
          const domain = url.hostname.replace('www.', '');
          domains.add(domain);
        } catch (e) {
          // URL 파싱 실패 시 무시
        }
      });
    }
    return Array.from(domains).sort((a, b) => {
      const nameA = getPressNameFromDomain(a);
      const nameB = getPressNameFromDomain(b);
      return nameA.localeCompare(nameB, 'ko');
    });
  }, [newsSearchResult]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }}>
      <div>
        <Checkbox
          checked={useDateRange}
          onChange={(e) => onUseDateRangeChange(e.target.checked)}
          label="날짜 범위 필터 사용"
          style={{ marginBottom: '0.5rem' }}
        />
        {useDateRange && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: '0.5rem'
          }}>
            <Input
              type="date"
              value={dateRangeStart}
              onChange={(e) => onDateRangeStartChange(e.target.value)}
              fullWidth={false}
              style={{ minWidth: '150px' }}
            />
            <span style={{ color: '#666' }}>~</span>
            <Input
              type="date"
              value={dateRangeEnd}
              onChange={(e) => onDateRangeEndChange(e.target.value)}
              fullWidth={false}
              style={{ minWidth: '150px' }}
            />
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
              <Button
                type="button"
                onClick={onSetTodayDateRange}
                variant="ghost"
                size="sm"
              >
                오늘
              </Button>
              <Button
                type="button"
                onClick={() => onSetQuickDateRange(7)}
                variant="ghost"
                size="sm"
              >
                7일
              </Button>
              <Button
                type="button"
                onClick={() => onSetQuickDateRange(30)}
                variant="ghost"
                size="sm"
              >
                30일
              </Button>
            </div>
          </div>
        )}
      </div>

      <div>
        <label style={{
          display: 'block',
          marginBottom: '0.25rem',
          fontSize: '0.85rem',
          color: '#666',
          fontWeight: '500'
        }}>
          언론사
        </label>
        <select
          value={filterDomain}
          onChange={(e) => onFilterDomainChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.9rem',
            backgroundColor: '#fff',
            cursor: 'pointer'
          }}
        >
          <option value="">전체 언론사</option>
          {uniqueDomains.map((domain) => {
            const pressName = getPressNameFromDomain(domain);
            return (
              <option key={domain} value={domain}>
                {pressName}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label style={{
          display: 'block',
          marginBottom: '0.25rem',
          fontSize: '0.85rem',
          color: '#666',
          fontWeight: '500'
        }}>
          제목/본문 검색
        </label>
        <Input
          type="text"
          value={filterText}
          onChange={(e) => onFilterTextChange(e.target.value)}
          placeholder="검색할 텍스트 입력"
          fullWidth
          style={{ marginBottom: '0.5rem' }}
        />
        <div style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '0.85rem'
        }}>
          <Checkbox
            checked={filterInTitle}
            onChange={(e) => onFilterInTitleChange(e.target.checked)}
            label="제목 포함"
          />
          <Checkbox
            checked={filterInDescription}
            onChange={(e) => onFilterInDescriptionChange(e.target.checked)}
            label="본문 포함"
          />
        </div>
      </div>

      {(filterDomain || filterText) && (
        <Button
          type="button"
          onClick={onResetFilters}
          variant="outline"
          size="sm"
          style={{ alignSelf: 'flex-start' }}
        >
          재검색 초기화
        </Button>
      )}
    </div>
  );
}

