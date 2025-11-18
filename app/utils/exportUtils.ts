import type { Article, ScrapeResult, NaverNewsItem, NaverNewsSearchResult } from '../types/news';
import { findPressById } from '../data/pressList';

// CSV 이스케이프 처리
const escapeCSV = (text: string): string => {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

// 신문 수집 결과 CSV 다운로드
export const downloadScrapeCSV = (result: Record<string, ScrapeResult>, date: string) => {
  const csvRows: string[] = [];
  csvRows.push('언론사,카테고리,면,제목,링크');

  for (const [pressId, pressResult] of Object.entries(result)) {
    const press = findPressById(pressId);
    const pressName = press?.name || `언론사 ID: ${pressId}`;
    const pressCategory = press?.category || '';

    for (const [page, articles] of Object.entries(pressResult)) {
      for (const article of articles) {
        csvRows.push([
          escapeCSV(pressName),
          escapeCSV(pressCategory),
          escapeCSV(page),
          escapeCSV(article.title),
          escapeCSV(article.link)
        ].join(','));
      }
    }
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `naver-news-${date || 'latest'}-${new Date().getTime()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 신문 수집 결과 JSON 다운로드
export const downloadScrapeJSON = (result: Record<string, ScrapeResult>, date: string) => {
  const jsonContent = JSON.stringify(result, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `naver-news-${date || 'latest'}-${new Date().getTime()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 신문 수집 결과 TXT 다운로드
export const downloadScrapeTXT = (result: Record<string, ScrapeResult>, date: string) => {
  const textLines: string[] = [];
  
  textLines.push('='.repeat(60));
  textLines.push('신문 기사 추출 결과');
  textLines.push(`추출 날짜: ${date || '최신'}`);
  textLines.push('='.repeat(60));
  textLines.push('');
  
  for (const [pressId, pressResult] of Object.entries(result)) {
    const press = findPressById(pressId);
    const pressName = press?.name || `언론사 ID: ${pressId}`;
    const pressCategory = press?.category || '';
    
    textLines.push(`\n${'='.repeat(60)}`);
    textLines.push(`언론사: ${pressName} (${pressCategory})`);
    textLines.push(`${'='.repeat(60)}\n`);
    
    for (const [page, articles] of Object.entries(pressResult)) {
      textLines.push(`\n[${page}]`);
      textLines.push('-'.repeat(40));
      articles.forEach((article, index) => {
        textLines.push(`\n${index + 1}. ${article.title}`);
        textLines.push(`   링크: ${article.link}`);
        if (article.summary) {
          textLines.push(`   요약: ${article.summary}`);
        }
      });
      textLines.push('');
    }
  }

  const textContent = textLines.join('\n');
  const blob = new Blob(['\uFEFF' + textContent], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `신문기사-${date || 'latest'}-${new Date().getTime()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 신문 수집 결과 클립보드 복사
export const copyScrapeToClipboard = async (result: Record<string, ScrapeResult>) => {
  try {
    const textLines: string[] = [];
    
    for (const [pressId, pressResult] of Object.entries(result)) {
      const press = findPressById(pressId);
      const pressName = press?.name || `언론사 ID: ${pressId}`;
      
      textLines.push(`\n=== ${pressName} ===\n`);
      
      for (const [page, articles] of Object.entries(pressResult)) {
        textLines.push(`\n[${page}]\n`);
        articles.forEach((article, index) => {
          textLines.push(`${index + 1}. ${article.title}`);
          textLines.push(`   ${article.link}\n`);
        });
      }
    }

    const textContent = textLines.join('\n');
    await navigator.clipboard.writeText(textContent);
    alert('클립보드에 복사되었습니다!');
  } catch (err) {
    console.error('클립보드 복사 실패:', err);
    alert('클립보드 복사에 실패했습니다.');
  }
};

// 뉴스 검색 결과 CSV 다운로드
export const downloadNewsCSV = (
  result: NaverNewsSearchResult,
  items: NaverNewsItem[],
  keyword: string
) => {
  const headers = ['제목', '설명', '링크', '원문 링크', '발행일'];
  const csvRows = [headers.join(',')];

  items.forEach((item) => {
    const row = [
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${item.link}"`,
      `"${item.originallink || ''}"`,
      `"${item.pubDate}"`
    ];
    csvRows.push(row.join(','));
  });

  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `뉴스_검색_결과_${keyword}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 뉴스 검색 결과 JSON 다운로드
export const downloadNewsJSON = (
  result: NaverNewsSearchResult,
  items: NaverNewsItem[],
  keyword: string,
  useDateRange: boolean,
  dateRangeStart: string,
  dateRangeEnd: string,
  sortOption: 'sim' | 'date'
) => {
  const data = {
    검색어: keyword,
    검색일시: new Date().toISOString(),
    총결과수: result.total,
    필터링결과수: items.length,
    날짜범위필터: useDateRange && (dateRangeStart || dateRangeEnd) 
      ? { 시작일: dateRangeStart, 종료일: dateRangeEnd }
      : null,
    정렬옵션: sortOption === 'date' ? '최신순' : '정확도순',
    결과: items
  };

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `뉴스_검색_결과_${keyword}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 뉴스 검색 결과 TXT 다운로드
export const downloadNewsTXT = (
  result: NaverNewsSearchResult,
  items: NaverNewsItem[],
  keyword: string,
  useDateRange: boolean,
  dateRangeStart: string,
  dateRangeEnd: string,
  sortOption: 'sim' | 'date'
) => {
  const textLines: string[] = [];
  
  textLines.push('='.repeat(60));
  textLines.push('뉴스 키워드 검색 결과');
  textLines.push(`검색어: ${keyword}`);
  textLines.push(`검색 일시: ${new Date().toLocaleString('ko-KR')}`);
  textLines.push(`총 결과 수: ${result.total}개`);
  textLines.push(`표시된 결과: ${items.length}개`);
  if (useDateRange && (dateRangeStart || dateRangeEnd)) {
    textLines.push(`날짜 범위: ${dateRangeStart || '시작일 미설정'} ~ ${dateRangeEnd || '종료일 미설정'}`);
  }
  textLines.push(`정렬 옵션: ${sortOption === 'date' ? '최신순' : '정확도순'}`);
  textLines.push('='.repeat(60));
  textLines.push('');

  items.forEach((item, index) => {
    textLines.push(`\n${index + 1}. ${item.title}`);
    textLines.push(`   설명: ${item.description}`);
    textLines.push(`   링크: ${item.link}`);
    if (item.originallink) {
      textLines.push(`   원문 링크: ${item.originallink}`);
    }
    textLines.push(`   발행일: ${new Date(item.pubDate).toLocaleString('ko-KR')}`);
    textLines.push('-'.repeat(40));
  });

  const textContent = textLines.join('\n');
  const blob = new Blob(['\uFEFF' + textContent], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `뉴스검색_${keyword}_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 뉴스 검색 결과 클립보드 복사
export const copyNewsToClipboard = async (items: NaverNewsItem[]) => {
  const text = items.map((item, index) => {
    return `${index + 1}. ${item.title}\n   ${item.description}\n   링크: ${item.link}\n   발행일: ${item.pubDate}\n`;
  }).join('\n');

  try {
    await navigator.clipboard.writeText(text);
    alert('검색 결과가 클립보드에 복사되었습니다.');
  } catch (err) {
    console.error('클립보드 복사 실패:', err);
    alert('클립보드 복사에 실패했습니다.');
  }
};

