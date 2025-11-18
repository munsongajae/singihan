import type { Article, ScrapeResult, NaverNewsItem, NaverNewsSearchResult } from '../types/news';
import { findPressById } from '../data/pressList';
import { getFilteredNewsResults } from './filterUtils';

// 검색 결과 요약 생성
export const generateSearchSummary = (
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

  // 1. 날짜 범위 분석
  const dates = items.map(item => new Date(item.pubDate));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  const dateRange = minDate.toLocaleDateString('ko-KR') === maxDate.toLocaleDateString('ko-KR')
    ? minDate.toLocaleDateString('ko-KR')
    : `${minDate.toLocaleDateString('ko-KR')} ~ ${maxDate.toLocaleDateString('ko-KR')}`;

  // 2. 키워드 추출 (제목과 설명에서)
  const stopWords = new Set([
    '이', '가', '을', '를', '에', '의', '와', '과', '도', '로', '으로', '에서', '부터', '까지',
    '은', '는', '것', '수', '등', '및', '또한', '그리고', '하지만', '그러나', '따라서',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    '년', '월', '일', '시', '분', '초', '오전', '오후'
  ]);

  const wordCount: Record<string, number> = {};
  
  items.forEach(item => {
    const text = `${item.title} ${item.description}`;
    const words = text.match(/[가-힣]{2,}|[A-Za-z]{3,}/g) || [];
    
    words.forEach(word => {
      const lowerWord = word.toLowerCase();
      if (!stopWords.has(lowerWord) && lowerWord.length >= 2) {
        wordCount[lowerWord] = (wordCount[lowerWord] || 0) + 1;
      }
    });
  });

  const topKeywords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word, count]) => ({ word, count }));

  // 3. 제목 패턴 분석
  const titleWords: Record<string, number> = {};
  items.forEach(item => {
    const words = item.title.match(/[가-힣]{2,}/g) || [];
    words.forEach(word => {
      if (!stopWords.has(word) && word.length >= 2) {
        titleWords[word] = (titleWords[word] || 0) + 1;
      }
    });
  });

  const commonTitleWords = Object.entries(titleWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  // 4. 언론사 도메인 분석
  const domains: Record<string, number> = {};
  items.forEach(item => {
    try {
      const url = new URL(item.originallink || item.link);
      const domain = url.hostname.replace('www.', '');
      domains[domain] = (domains[domain] || 0) + 1;
    } catch (e) {
      // URL 파싱 실패 시 무시
    }
  });

  const topDomains = Object.entries(domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  return {
    totalArticles: items.length,
    dateRange,
    topKeywords,
    commonTitleWords,
    topDomains,
    avgDescriptionLength: Math.round(
      items.reduce((sum, item) => sum + item.description.length, 0) / items.length
    )
  };
};

// 신문 수집 결과 요약 생성
export const generateScrapeSummary = (result: Record<string, ScrapeResult>) => {
  const pressIds = Object.keys(result);
  const totalPresses = pressIds.length;
  let totalArticles = 0;
  const allPages = new Set<string>();
  const pressStats: Array<{ pressId: string; pressName: string; category: string; articleCount: number; pageCount: number }> = [];
  const pageStats: Record<string, number> = {};
  const categoryStats: Record<string, number> = {};

  // 언론사별 통계
  pressIds.forEach(pressId => {
    const press = findPressById(pressId);
    const pressName = press?.name || `언론사 ID: ${pressId}`;
    const category = press?.category || '기타';
    const pressResult = result[pressId];
    
    let articleCount = 0;
    const pages = Object.keys(pressResult);
    pages.forEach(page => {
      allPages.add(page);
      const articles = pressResult[page];
      articleCount += articles.length;
      totalArticles += articles.length;
      pageStats[page] = (pageStats[page] || 0) + articles.length;
    });

    pressStats.push({
      pressId,
      pressName,
      category,
      articleCount,
      pageCount: pages.length
    });

    categoryStats[category] = (categoryStats[category] || 0) + articleCount;
  });

  // 키워드 추출 (언론사별, 면별)
  const stopWords = new Set([
    '이', '가', '을', '를', '의', '에', '와', '과', '도', '로', '으로',
    '은', '는', '에서', '에게', '께', '한테', '부터', '까지', '만',
    '그', '그것', '그런', '그렇게', '이것', '이런', '이렇게', '저것',
    '것', '수', '때', '곳', '등', '및', '또한', '또', '그리고', '하지만',
    '그러나', '그런데', '따라서', '그래서', '그러므로', '그러면',
    '있', '하', '되', '되다', '하다', '있다', '없다', '않다',
    '년', '월', '일', '시', '분', '초', '오늘', '어제', '내일',
    '기자', '뉴스', '보도', '발표', '발생', '확인', '알려', '밝혀',
  ]);

  const pressKeywords: Record<string, Record<string, number>> = {};
  const pageKeywords: Record<string, Record<string, number>> = {};

  pressIds.forEach(pressId => {
    const pressResult = result[pressId];
    pressKeywords[pressId] = {};

    Object.entries(pressResult).forEach(([page, articles]) => {
      if (!pageKeywords[page]) {
        pageKeywords[page] = {};
      }

      articles.forEach(article => {
        const words = article.title.match(/[가-힣]{2,}|[A-Za-z]{3,}/g) || [];
        words.forEach(word => {
          const lowerWord = word.toLowerCase();
          if (!stopWords.has(lowerWord) && lowerWord.length >= 2) {
            pressKeywords[pressId][lowerWord] = (pressKeywords[pressId][lowerWord] || 0) + 1;
            pageKeywords[page][lowerWord] = (pageKeywords[page][lowerWord] || 0) + 1;
          }
        });
      });
    });
  });

  // 언론사별 상위 키워드
  const pressTopKeywords: Record<string, Array<{ word: string; count: number }>> = {};
  Object.entries(pressKeywords).forEach(([pressId, keywords]) => {
    pressTopKeywords[pressId] = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));
  });

  // 면별 상위 키워드
  const pageTopKeywords: Record<string, Array<{ word: string; count: number }>> = {};
  Object.entries(pageKeywords).forEach(([page, keywords]) => {
    pageTopKeywords[page] = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));
  });

  // 1면 기사들의 공통 주제 찾기
  const firstPageArticles: Article[] = [];
  pressIds.forEach(pressId => {
    const pressResult = result[pressId];
    Object.entries(pressResult).forEach(([page, articles]) => {
      const normalizedPage = page.trim().replace(/\s+/g, '');
      if (/^1면$/.test(normalizedPage) || /^A1$/.test(normalizedPage) || /^A1면$/.test(normalizedPage) || normalizedPage === '1') {
        firstPageArticles.push(...articles);
      }
    });
  });

  const commonFirstPageKeywords: Record<string, number> = {};
  firstPageArticles.forEach(article => {
    const words = article.title.match(/[가-힣]{2,}|[A-Za-z]{3,}/g) || [];
    words.forEach(word => {
      const lowerWord = word.toLowerCase();
      if (!stopWords.has(lowerWord) && lowerWord.length >= 2) {
        commonFirstPageKeywords[lowerWord] = (commonFirstPageKeywords[lowerWord] || 0) + 1;
      }
    });
  });

  const topCommonKeywords = Object.entries(commonFirstPageKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  // 날짜 추출 (첫 번째 언론사의 첫 번째 면에서)
  let extractionDate = '알 수 없음';
  const firstPressId = pressIds[0];
  if (firstPressId && result[firstPressId]) {
    const firstPage = Object.keys(result[firstPressId])[0];
    if (firstPage) {
      // 날짜 정보가 있다면 사용 (현재는 없으므로 기본값)
      extractionDate = '최신';
    }
  }

  return {
    totalArticles,
    totalPresses,
    totalPages: allPages.size,
    extractionDate,
    pressStats: pressStats.sort((a, b) => b.articleCount - a.articleCount),
    pageStats: Object.entries(pageStats)
      .sort((a, b) => b[1] - a[1])
      .map(([page, count]) => ({ page, count })),
    categoryStats: Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count })),
    pressTopKeywords,
    pageTopKeywords,
    topCommonKeywords
  };
};

