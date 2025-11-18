import type { NaverNewsItem, NaverNewsSearchResult } from '../types/news';
import { getPressNameFromDomain } from './domainMapping';

// 뉴스 검색 결과 필터링
export const getFilteredNewsResults = (
  newsSearchResult: NaverNewsSearchResult | null,
  filterDomain: string,
  filterText: string,
  filterInTitle: boolean,
  filterInDescription: boolean,
  useDateRange: boolean,
  dateRangeStart: string,
  dateRangeEnd: string
): NaverNewsSearchResult | null => {
  if (!newsSearchResult) return null;

  let filteredItems = [...newsSearchResult.items];

  // 도메인 필터
  if (filterDomain) {
    filteredItems = filteredItems.filter(item => {
      try {
        const url = new URL(item.originallink || item.link);
        const domain = url.hostname.replace('www.', '');
        return domain === filterDomain;
      } catch (e) {
        return false;
      }
    });
  }

  // 텍스트 필터
  if (filterText.trim()) {
    const searchText = filterText.trim().toLowerCase();
    filteredItems = filteredItems.filter(item => {
      const titleMatch = filterInTitle && item.title.toLowerCase().includes(searchText);
      const descMatch = filterInDescription && item.description.toLowerCase().includes(searchText);
      return titleMatch || descMatch;
    });
  }

  // 날짜 범위 필터
  if (useDateRange && (dateRangeStart || dateRangeEnd)) {
    filteredItems = filteredItems.filter(item => {
      const pubDate = new Date(item.pubDate);
      // 로컬 시간 기준으로 YYYY-MM-DD 형식으로 변환
      const year = pubDate.getFullYear();
      const month = String(pubDate.getMonth() + 1).padStart(2, '0');
      const day = String(pubDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (dateRangeStart && dateStr < dateRangeStart) return false;
      if (dateRangeEnd && dateStr > dateRangeEnd) return false;
      return true;
    });
  }

  return {
    ...newsSearchResult,
    items: filteredItems,
    total: filteredItems.length
  };
};

// 필터링된 결과에서 고유한 언론사 목록 추출
export const getUniquePressNames = (items: NaverNewsItem[]): string[] => {
  const pressMap = new Map<string, string>();

  items.forEach(item => {
    try {
      const url = new URL(item.originallink || item.link);
      const domain = url.hostname.replace('www.', '');
      const pressName = getPressNameFromDomain(domain);
      if (!pressMap.has(domain)) {
        pressMap.set(domain, pressName);
      }
    } catch (e) {
      // URL 파싱 실패 시 무시
    }
  });

  return Array.from(pressMap.values()).sort();
};

