import type { NaverNewsItem, NaverNewsSearchResult } from '../types/news';
import { getFilteredNewsResults } from './filterUtils';

// 트렌드 분석 데이터 생성
export const generateTrendData = (
  newsSearchResult: NaverNewsSearchResult | null,
  filterDomain: string,
  filterText: string,
  filterInTitle: boolean,
  filterInDescription: boolean,
  useDateRange: boolean,
  dateRangeStart: string,
  dateRangeEnd: string
) => {
  if (!newsSearchResult) return null;

  const filteredResult = getFilteredNewsResults(
    newsSearchResult,
    filterDomain,
    filterText,
    filterInTitle,
    filterInDescription,
    useDateRange,
    dateRangeStart,
    dateRangeEnd
  );
  const displayResult = filteredResult || newsSearchResult;
  const items = displayResult.items;

  if (items.length === 0) return null;

  // 날짜별 분포
  const dateDistribution: Record<string, number> = {};
  const hourDistribution: Record<number, number> = {};

  items.forEach(item => {
    const date = new Date(item.pubDate);
    const dateStr = date.toLocaleDateString('ko-KR');
    const hour = date.getHours();

    dateDistribution[dateStr] = (dateDistribution[dateStr] || 0) + 1;
    hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
  });

  // 날짜별 정렬
  const sortedDateData = Object.entries(dateDistribution)
    .sort((a, b) => {
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);
      return dateA.getTime() - dateB.getTime();
    })
    .map(([date, count]) => ({ date, count }));

  // 시간대별 정렬
  const sortedHourData = Object.entries(hourDistribution)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([hour, count]) => ({ hour: parseInt(hour), count }));

  return {
    dateDistribution: sortedDateData,
    hourDistribution: sortedHourData,
    totalItems: items.length
  };
};

