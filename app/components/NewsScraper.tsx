'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { newspaperPressList, findPressById, type PressInfo } from '../data/pressList';

// 워드 클라우드는 클라이언트 사이드에서만 동작하므로 dynamic import
const WordCloud = dynamic(() => import('./WordCloud'), { ssr: false });

interface Article {
  title: string;
  link: string;
  summary?: string;
  matched?: boolean;
}

interface ScrapeResult {
  [page: string]: Article[];
}

interface Preset {
  id: string;
  name: string;
  pressIds: string[];
  createdAt: number;
}

interface NaverNewsItem {
  title: string;
  link: string;
  originallink: string;
  description: string;
  pubDate: string;
}

interface NaverNewsSearchResult {
  total: number;
  start: number;
  display: number;
  items: NaverNewsItem[];
}

export default function NewsScraper() {
  const [selectedPresses, setSelectedPresses] = useState<PressInfo[]>([]);
  const [date, setDate] = useState(''); // YYYY-MM-DD 형식으로 저장
  const [onlyFirstPage, setOnlyFirstPage] = useState(false); // 1면만 추출 옵션
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, ScrapeResult> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // 언론사 검색용
  const [articleSearchTerm, setArticleSearchTerm] = useState(''); // 기사 검색용
  const [showWordCloud, setShowWordCloud] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showScrapeSummary, setShowScrapeSummary] = useState(false); // 신문 기사 요약 표시 여부
  
  // 네이버 뉴스 검색 관련 state
  const [newsKeyword, setNewsKeyword] = useState('');
  const [newsSearchLoading, setNewsSearchLoading] = useState(false);
  const [newsSearchResult, setNewsSearchResult] = useState<NaverNewsSearchResult | null>(null);
  const [newsSearchError, setNewsSearchError] = useState<string | null>(null);
  const [showNewsSearch, setShowNewsSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [displayCount, setDisplayCount] = useState(10); // 한 페이지에 표시할 결과 수
  const [sortOption, setSortOption] = useState<'sim' | 'date'>('date'); // 정렬 옵션
  const [dateRangeStart, setDateRangeStart] = useState(''); // 날짜 범위 시작일
  const [dateRangeEnd, setDateRangeEnd] = useState(''); // 날짜 범위 종료일
  const [useDateRange, setUseDateRange] = useState(false); // 날짜 범위 필터 사용 여부
  const [searchHistory, setSearchHistory] = useState<string[]>([]); // 검색어 히스토리
  const [showAutocomplete, setShowAutocomplete] = useState(false); // 자동완성 표시 여부
  const [filterDomain, setFilterDomain] = useState<string>(''); // 언론사 필터
  const [filterText, setFilterText] = useState<string>(''); // 제목/본문 필터
  const [filterInTitle, setFilterInTitle] = useState(true); // 제목에 포함 여부
  const [filterInDescription, setFilterInDescription] = useState(true); // 본문에 포함 여부
  const [savedSearchResults, setSavedSearchResults] = useState<Array<{ keyword: string; result: NaverNewsSearchResult; timestamp: number }>>([]); // 저장된 검색 결과
  const [showComparison, setShowComparison] = useState(false); // 비교 모드 표시 여부
  const [showFilters, setShowFilters] = useState(false); // 필터링 섹션 표시 여부
  const [showTrend, setShowTrend] = useState(false); // 트렌드 분석 표시 여부
  const [showSummary, setShowSummary] = useState(false); // 검색 결과 요약 표시 여부
  const [showSaveCompare, setShowSaveCompare] = useState(false); // 저장/비교 섹션 표시 여부
  
  // 요약문 추출 관련 state
  const [summaryExtracting, setSummaryExtracting] = useState(false);
  const [summaryExtractError, setSummaryExtractError] = useState<string | null>(null);

  // 검색어 히스토리 로드 (컴포넌트 마운트 시)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newsSearchHistory');
      if (saved) {
        try {
          const history = JSON.parse(saved);
          setSearchHistory(Array.isArray(history) ? history : []);
        } catch (e) {
          console.error('검색어 히스토리 로드 실패:', e);
        }
      }
    }
  }, []);

  // 검색어 히스토리에 추가
  const addToSearchHistory = (keyword: string) => {
    if (!keyword.trim()) return;
    
    const trimmedKeyword = keyword.trim();
    setSearchHistory((prev) => {
      // 중복 제거 및 최신순으로 정렬
      const filtered = prev.filter(item => item !== trimmedKeyword);
      const newHistory = [trimmedKeyword, ...filtered].slice(0, 10); // 최대 10개만 저장
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('newsSearchHistory', JSON.stringify(newHistory));
      }
      
      return newHistory;
    });
  };

  // 검색어 히스토리에서 삭제
  const removeFromSearchHistory = (keyword: string) => {
    setSearchHistory((prev) => {
      const newHistory = prev.filter(item => item !== keyword);
      if (typeof window !== 'undefined') {
        localStorage.setItem('newsSearchHistory', JSON.stringify(newHistory));
      }
      return newHistory;
    });
  };

  // 검색어 히스토리 전체 삭제
  const clearSearchHistory = () => {
    setSearchHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('newsSearchHistory');
    }
  };

  // 자동완성 필터링된 검색어 목록
  const getAutocompleteSuggestions = () => {
    if (!newsKeyword.trim()) {
      return searchHistory.slice(0, 5); // 입력이 없으면 최근 5개
    }
    
    const keyword = newsKeyword.trim().toLowerCase();
    return searchHistory
      .filter(item => item.toLowerCase().includes(keyword) && item.toLowerCase() !== keyword)
      .slice(0, 5);
  };

  // 신문 수집 결과 요약 생성
  const generateScrapeSummary = () => {
    if (!result) return null;

    // 1. 기본 통계
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
        
        // 면별 통계
        pageStats[page] = (pageStats[page] || 0) + articles.length;
      });

      pressStats.push({
        pressId,
        pressName,
        category,
        articleCount,
        pageCount: pages.length
      });

      // 카테고리별 통계
      categoryStats[category] = (categoryStats[category] || 0) + articleCount;
    });

    // 2. 언론사별 주요 키워드 추출
    const stopWords = new Set([
      '이', '가', '을', '를', '에', '의', '와', '과', '도', '로', '으로', '에서', '부터', '까지',
      '은', '는', '것', '수', '등', '및', '또한', '그리고', '하지만', '그러나', '따라서',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      '년', '월', '일', '시', '분', '초', '오전', '오후'
    ]);

    const pressKeywords: Record<string, Array<{ word: string; count: number }>> = {};
    
    pressIds.forEach(pressId => {
      const wordCount: Record<string, number> = {};
      const pressResult = result[pressId];
      
      Object.values(pressResult).forEach(articles => {
        articles.forEach(article => {
          const text = article.title;
          const words = text.match(/[가-힣]{2,}|[A-Za-z]{3,}/g) || [];
          
          words.forEach(word => {
            const lowerWord = word.toLowerCase();
            if (!stopWords.has(lowerWord) && lowerWord.length >= 2) {
              wordCount[lowerWord] = (wordCount[lowerWord] || 0) + 1;
            }
          });
        });
      });

      const topKeywords = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));
      
      pressKeywords[pressId] = topKeywords;
    });

    // 3. 면별 주요 키워드 추출
    const pageKeywords: Record<string, Array<{ word: string; count: number }>> = {};
    
    allPages.forEach(page => {
      const wordCount: Record<string, number> = {};
      
      pressIds.forEach(pressId => {
        const pressResult = result[pressId];
        if (pressResult[page]) {
          pressResult[page].forEach(article => {
            const text = article.title;
            const words = text.match(/[가-힣]{2,}|[A-Za-z]{3,}/g) || [];
            
            words.forEach(word => {
              const lowerWord = word.toLowerCase();
              if (!stopWords.has(lowerWord) && lowerWord.length >= 2) {
                wordCount[lowerWord] = (wordCount[lowerWord] || 0) + 1;
              }
            });
          });
        }
      });

      const topKeywords = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));
      
      pageKeywords[page] = topKeywords;
    });

    // 4. 언론사 간 비교 (1면 기사 비교)
    const firstPageArticles: Record<string, Array<{ title: string; pressName: string }>> = {};
    pressIds.forEach(pressId => {
      const press = findPressById(pressId);
      const pressName = press?.name || `언론사 ID: ${pressId}`;
      const pressResult = result[pressId];
      
      // 1면 또는 A1면 찾기
      const firstPage = Object.keys(pressResult).find(page => 
        page === '1면' || page === 'A1' || page === 'A1면'
      );
      
      if (firstPage && pressResult[firstPage]) {
        pressResult[firstPage].forEach(article => {
          const key = article.title.substring(0, 20); // 제목 앞부분으로 그룹화
          if (!firstPageArticles[key]) {
            firstPageArticles[key] = [];
          }
          firstPageArticles[key].push({ title: article.title, pressName });
        });
      }
    });

    // 공통 주제 찾기 (같은 제목을 다룬 언론사들)
    const commonTopics = Object.entries(firstPageArticles)
      .filter(([_, articles]) => articles.length > 1)
      .map(([key, articles]) => ({
        title: articles[0].title,
        pressCount: articles.length,
        presses: articles.map(a => a.pressName)
      }))
      .sort((a, b) => b.pressCount - a.pressCount)
      .slice(0, 5);

    // 면별 통계 정렬
    const sortedPageStats = Object.entries(pageStats)
      .sort((a, b) => {
        // 숫자로 변환 가능한 면은 숫자 순으로, 아니면 알파벳 순으로
        const aNum = parseInt(a[0]);
        const bNum = parseInt(b[0]);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a[0].localeCompare(b[0], 'ko');
      });

    return {
      totalArticles,
      totalPresses,
      totalPages: allPages.size,
      pressStats: pressStats.sort((a, b) => b.articleCount - a.articleCount),
      pageStats: sortedPageStats,
      categoryStats: Object.entries(categoryStats)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({ category, count })),
      pressKeywords,
      pageKeywords,
      commonTopics,
      extractionDate: date || '최신'
    };
  };

  // 검색 결과 요약 생성
  const generateSearchSummary = () => {
    if (!newsSearchResult) return null;

    const filteredResult = getFilteredNewsResults();
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
      // 제목과 설명을 합쳐서 키워드 추출
      const text = `${item.title} ${item.description}`;
      // 한글 2글자 이상, 영문 3글자 이상 단어 추출
      const words = text.match(/[가-힣]{2,}|[A-Za-z]{3,}/g) || [];
      
      words.forEach(word => {
        const lowerWord = word.toLowerCase();
        if (!stopWords.has(lowerWord) && lowerWord.length >= 2) {
          wordCount[lowerWord] = (wordCount[lowerWord] || 0) + 1;
        }
      });
    });

    // 상위 키워드 추출 (빈도순)
    const topKeywords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, count]) => ({ word, count }));

    // 3. 제목 패턴 분석 (공통 단어/구문)
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
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState<'scrape' | 'search'>('scrape');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    if (selectedPresses.length === 0) {
      setError('언론사를 하나 이상 선택해주세요.');
      setLoading(false);
      return;
    }

    try {
      const formattedDate = date ? date.replace(/-/g, '') : '';
      const results: Record<string, ScrapeResult> = {};
      const errors: string[] = [];

      // 모든 언론사에 대해 병렬로 API 호출
      const fetchPromises = selectedPresses.map(async (press) => {
        try {
          const params = new URLSearchParams({ pressId: press.id });
          if (formattedDate) {
            params.append('date', formattedDate);
          }

          const response = await fetch(`/api/scrape?${params.toString()}`);
          const data = await response.json();

          if (!response.ok) {
            return {
              success: false,
              pressId: press.id,
              pressName: press.name,
              error: `${press.name}: ${data.error || '스크레이핑 실패'}`
            };
          }

          return {
            success: true,
            pressId: press.id,
            pressName: press.name,
            data: data
          };
        } catch (err) {
          return {
            success: false,
            pressId: press.id,
            pressName: press.name,
            error: `${press.name}: ${err instanceof Error ? err.message : '알 수 없는 오류'}`
          };
        }
      });

      // 모든 요청이 완료될 때까지 대기
      const responses = await Promise.all(fetchPromises);

      // 결과 처리
      responses.forEach((response) => {
        if (response.success) {
          results[response.pressId] = response.data;
        } else if (response.error) {
          errors.push(response.error);
        }
      });

      if (Object.keys(results).length === 0) {
        throw new Error('모든 언론사 스크레이핑에 실패했습니다.\n' + errors.join('\n'));
      }

      if (errors.length > 0) {
        setError(`일부 언론사 스크레이핑 실패:\n${errors.join('\n')}`);
      }

      // 1면만 추출 옵션이 활성화되어 있으면 필터링
      if (onlyFirstPage) {
        const filteredResults: Record<string, ScrapeResult> = {};
        for (const [pressId, pressResult] of Object.entries(results)) {
          // 정확히 1면과 A1만 찾기 (11면, 12면 등은 제외)
          const firstPageKeys = Object.keys(pressResult).filter(key => {
            const normalizedKey = key.trim().replace(/\s+/g, '');
            
            // 정확히 "1면"만 매칭 (정규식: ^1면$ - 시작과 끝이 정확히 일치)
            if (/^1면$/.test(normalizedKey)) {
              return true;
            }
            
            // 정확히 "A1"만 매칭
            if (/^A1$/.test(normalizedKey)) {
              return true;
            }
            
            // 정확히 "A1면"만 매칭
            if (/^A1면$/.test(normalizedKey)) {
              return true;
            }
            
            // 숫자만 "1"인 경우도 체크 (정확히 일치)
            if (normalizedKey === '1') {
              return true;
            }
            
            return false;
          });
          
          if (firstPageKeys.length > 0) {
            const filteredResult: ScrapeResult = {};
            for (const key of firstPageKeys) {
              filteredResult[key] = pressResult[key];
            }
            filteredResults[pressId] = filteredResult;
          }
        }
        setResult(filteredResults);
      } else {
        setResult(results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 네이버 뉴스 검색 핸들러 (페이지 번호 포함)
  const handleNewsSearch = async (page: number = 1) => {
    if (!newsKeyword.trim()) {
      setNewsSearchError('검색어를 입력해주세요.');
      return;
    }

    setNewsSearchLoading(true);
    setNewsSearchError(null);
    setCurrentPage(page);

    try {
      // displayCount가 100을 초과하면 여러 번의 API 호출 필요
      if (displayCount > 100) {
        // 100개씩 나눠서 여러 번 요청
        const requestsNeeded = Math.ceil(displayCount / 100);
        const start = (page - 1) * displayCount + 1;
        
        // 각 요청의 start 위치 계산
        const requests = [];
        for (let i = 0; i < requestsNeeded; i++) {
          const requestStart = start + (i * 100);
          const requestDisplay = Math.min(100, displayCount - (i * 100));
          
          // start가 1000을 초과하면 중단
          if (requestStart > 1000) break;
          
          const params = new URLSearchParams({
            query: newsKeyword.trim(),
            display: requestDisplay.toString(),
            start: requestStart.toString(),
            sort: sortOption
          });
          
          requests.push(fetch(`/api/search-news?${params.toString()}`));
        }
        
        // 병렬 요청
        const responses = await Promise.all(requests);
        const results = await Promise.all(responses.map(r => r.json()));
        
        // 첫 번째 응답에서 에러 확인
        if (!responses[0].ok) {
          throw new Error(results[0].error || '뉴스 검색에 실패했습니다.');
        }
        
        // 모든 결과 합치기
        const allItems = results.flatMap(r => r.items || []);
        const totalItems = Math.min(displayCount, allItems.length);
        
        // 첫 번째 응답의 메타데이터 사용
        const firstResult = results[0];
        setNewsSearchResult({
          total: firstResult.total,
          start: start,
          display: totalItems,
          items: allItems.slice(0, displayCount)
        });
      } else {
        // 100개 이하는 기존 로직 사용
        const start = (page - 1) * displayCount + 1;
        const params = new URLSearchParams({
          query: newsKeyword.trim(),
          display: displayCount.toString(),
          start: start.toString(),
          sort: sortOption
        });

        const response = await fetch(`/api/search-news?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '뉴스 검색에 실패했습니다.');
        }

        setNewsSearchResult(data);
      }
    } catch (err) {
      setNewsSearchError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setNewsSearchLoading(false);
    }
  };

  // 검색 폼 제출 핸들러
  const handleNewsSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowNewsSearch(true);
    setCurrentPage(1); // 검색 시 첫 페이지로 리셋
    setShowAutocomplete(false); // 자동완성 닫기
    addToSearchHistory(newsKeyword); // 히스토리에 추가
    await handleNewsSearch(1);
  };

  // 검색어 선택 핸들러 (자동완성에서)
  const handleSelectKeyword = async (keyword: string) => {
    setNewsKeyword(keyword);
    setShowAutocomplete(false);
    // 선택한 검색어로 바로 검색
    setShowNewsSearch(true);
    setCurrentPage(1);
    addToSearchHistory(keyword);
    await handleNewsSearch(1);
  };

  // 페이지 변경 핸들러
  const handlePageChange = async (newPage: number) => {
    if (newPage < 1) return;
    if (newsSearchResult && newPage > Math.ceil(newsSearchResult.total / displayCount)) return;
    await handleNewsSearch(newPage);
    // 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 날짜 범위로 필터링된 결과 계산
  const getFilteredNewsResults = () => {
    if (!newsSearchResult) return null;

    let filteredItems = [...newsSearchResult.items];

    // 1. 날짜 범위 필터
    if (useDateRange && (dateRangeStart || dateRangeEnd)) {
      filteredItems = filteredItems.filter((item) => {
        const itemDateObj = new Date(item.pubDate);
        const year = itemDateObj.getFullYear();
        const month = String(itemDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(itemDateObj.getDate()).padStart(2, '0');
        const itemDateStr = `${year}-${month}-${day}`;
        
        if (dateRangeStart && itemDateStr < dateRangeStart) return false;
        if (dateRangeEnd && itemDateStr > dateRangeEnd) return false;
        return true;
      });
    }

    // 2. 언론사 필터 (도메인)
    if (filterDomain.trim()) {
      const domainLower = filterDomain.trim().toLowerCase();
      filteredItems = filteredItems.filter((item) => {
        try {
          const url = new URL(item.originallink || item.link);
          const domain = url.hostname.replace('www.', '').toLowerCase();
          return domain.includes(domainLower);
        } catch (e) {
          return false;
        }
      });
    }

    // 3. 제목/본문 필터
    if (filterText.trim()) {
      const searchText = filterText.trim().toLowerCase();
      filteredItems = filteredItems.filter((item) => {
        const titleMatch = filterInTitle && item.title.toLowerCase().includes(searchText);
        const descMatch = filterInDescription && item.description.toLowerCase().includes(searchText);
        return titleMatch || descMatch;
      });
    }

    return {
      ...newsSearchResult,
      items: filteredItems,
      filteredCount: filteredItems.length,
      originalTotal: newsSearchResult.total
    };
  };

  // 트렌드 분석 데이터 생성
  const generateTrendData = () => {
    if (!newsSearchResult) return null;

    const filteredResult = getFilteredNewsResults();
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

  // 검색 결과 저장
  const saveSearchResult = () => {
    if (!newsSearchResult) return;
    
    setSavedSearchResults(prev => {
      const newResults = [...prev, {
        keyword: newsKeyword,
        result: newsSearchResult,
        timestamp: Date.now()
      }].slice(-5); // 최대 5개만 저장
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('savedSearchResults', JSON.stringify(newResults));
      }
      
      return newResults;
    });
  };

  // 저장된 검색 결과 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('savedSearchResults');
      if (saved) {
        try {
          const results = JSON.parse(saved);
          setSavedSearchResults(Array.isArray(results) ? results : []);
        } catch (e) {
          console.error('저장된 검색 결과 로드 실패:', e);
        }
      }
    }
  }, []);

  // 겹치는 기사 찾기
  const findOverlappingArticles = () => {
    if (savedSearchResults.length < 2) return [];

    const allArticles: Array<{ title: string; link: string; keywords: string[] }> = [];
    const articleMap = new Map<string, Set<string>>(); // link -> keywords set

    savedSearchResults.forEach(({ keyword, result }) => {
      result.items.forEach(item => {
        if (!articleMap.has(item.link)) {
          articleMap.set(item.link, new Set());
          allArticles.push({
            title: item.title,
            link: item.link,
            keywords: []
          });
        }
        articleMap.get(item.link)?.add(keyword);
      });
    });

    // 여러 키워드에 나타난 기사 찾기
    const overlapping = allArticles
      .map(article => ({
        ...article,
        keywords: Array.from(articleMap.get(article.link) || [])
      }))
      .filter(article => article.keywords.length > 1)
      .sort((a, b) => b.keywords.length - a.keywords.length);

    return overlapping;
  };

  // 빠른 날짜 범위 선택 핸들러
  const setQuickDateRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    setDateRangeStart(startDate.toISOString().split('T')[0]);
    setDateRangeEnd(endDate.toISOString().split('T')[0]);
    setUseDateRange(true);
  };

  // 오늘 날짜로 설정
  const setTodayDateRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setDateRangeStart(todayStr);
    setDateRangeEnd(todayStr);
    setUseDateRange(true);
  };

  // 뉴스 검색 결과 CSV 다운로드
  const downloadNewsCSV = () => {
    if (!newsSearchResult) return;

    const filteredResult = getFilteredNewsResults();
    const displayResult = filteredResult || newsSearchResult;
    const items = displayResult.items;

    // CSV 헤더
    const headers = ['제목', '설명', '링크', '원문 링크', '발행일'];
    const csvRows = [headers.join(',')];

    // 데이터 행 추가
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
    link.download = `뉴스_검색_결과_${newsKeyword}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 뉴스 검색 결과 JSON 다운로드
  const downloadNewsJSON = () => {
    if (!newsSearchResult) return;

    const filteredResult = getFilteredNewsResults();
    const displayResult = filteredResult || newsSearchResult;
    
    const data = {
      검색어: newsKeyword,
      검색일시: new Date().toISOString(),
      총결과수: newsSearchResult.total,
      필터링결과수: displayResult.items.length,
      날짜범위필터: useDateRange && (dateRangeStart || dateRangeEnd) 
        ? { 시작일: dateRangeStart, 종료일: dateRangeEnd }
        : null,
      정렬옵션: sortOption === 'date' ? '최신순' : '정확도순',
      결과: displayResult.items
    };

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `뉴스_검색_결과_${newsKeyword}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 뉴스 검색 결과 텍스트 파일 다운로드
  const downloadNewsTXT = () => {
    if (!newsSearchResult) return;

    const filteredResult = getFilteredNewsResults();
    const displayResult = filteredResult || newsSearchResult;
    const items = displayResult.items;

    const textLines: string[] = [];
    
    textLines.push('='.repeat(60));
    textLines.push('뉴스 키워드 검색 결과');
    textLines.push(`검색어: ${newsKeyword}`);
    textLines.push(`검색 일시: ${new Date().toLocaleString('ko-KR')}`);
    textLines.push(`총 결과 수: ${newsSearchResult.total}개`);
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
    link.download = `뉴스검색_${newsKeyword}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 뉴스 검색 결과 클립보드 복사
  const copyNewsToClipboard = async () => {
    if (!newsSearchResult) return;

    const filteredResult = getFilteredNewsResults();
    const displayResult = filteredResult || newsSearchResult;
    const items = displayResult.items;

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

  // 요약문 추출 핸들러
  const handleExtractSummaries = async () => {
    if (!result) {
      setSummaryExtractError('먼저 기사를 추출해주세요.');
      return;
    }

    // 모든 기사 수집
    const allArticles: Article[] = [];
    for (const pressResult of Object.values(result)) {
      for (const articles of Object.values(pressResult)) {
        allArticles.push(...articles);
      }
    }

    if (allArticles.length === 0) {
      setSummaryExtractError('추출된 기사가 없습니다.');
      return;
    }

    // 이미 요약문이 있는 기사는 제외 (선택사항)
    const articlesToProcess = allArticles.filter(article => !article.summary);

    if (articlesToProcess.length === 0) {
      alert('모든 기사에 이미 요약문이 있습니다.');
      return;
    }

    const confirmMessage = `총 ${allArticles.length}개의 기사 중 ${articlesToProcess.length}개의 기사에 요약문을 추가하시겠습니까?\n\n주의: API 호출 제한을 피하기 위해 처리에 시간이 걸릴 수 있습니다.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setSummaryExtracting(true);
    setSummaryExtractError(null);

    try {
      const response = await fetch('/api/extract-summaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articles: articlesToProcess,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '요약문 추출에 실패했습니다.');
      }

      // 결과를 기존 result에 병합
      const updatedResult: Record<string, ScrapeResult> = { ...result };
      const summaryMap = new Map<string, Article>();

      // 요약문이 추가된 기사들을 맵에 저장
      data.articles.forEach((article: Article) => {
        if (article.summary) {
          summaryMap.set(`${article.title}|${article.link}`, article);
        }
      });

      // 기존 result를 순회하며 요약문 추가
      for (const [pressId, pressResult] of Object.entries(updatedResult)) {
        const updatedPressResult: ScrapeResult = {};
        for (const [page, articles] of Object.entries(pressResult)) {
          updatedPressResult[page] = articles.map(article => {
            const key = `${article.title}|${article.link}`;
            const articleWithSummary = summaryMap.get(key);
            if (articleWithSummary && articleWithSummary.summary) {
              return {
                ...article,
                summary: articleWithSummary.summary,
                matched: articleWithSummary.matched,
              };
            }
            return article;
          });
        }
        updatedResult[pressId] = updatedPressResult;
      }

      setResult(updatedResult);

      // 통계 정보 표시
      const stats = data.statistics;
      alert(
        `요약문 추출 완료!\n\n` +
        `총 기사: ${stats.total}개\n` +
        `매칭 성공: ${stats.matched}개\n` +
        `매칭 실패: ${stats.unmatched}개\n` +
        `매칭률: ${stats.matchRate}%`
      );
    } catch (err) {
      setSummaryExtractError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setSummaryExtracting(false);
    }
  };

  // 언론사 토글
  const togglePress = (press: PressInfo) => {
    setSelectedPresses(prev => {
      const isSelected = prev.some(p => p.id === press.id);
      if (isSelected) {
        return prev.filter(p => p.id !== press.id);
      } else {
        return [...prev, press];
      }
    });
  };

  // 카테고리 토글
  const toggleCategory = (category: string) => {
    const categoryPresses = newspaperPressList.filter(p => p.category === category);
    const allSelected = categoryPresses.every(press => 
      selectedPresses.some(p => p.id === press.id)
    );

    setSelectedPresses(prev => {
      if (allSelected) {
        // 모두 선택되어 있으면 모두 해제
        return prev.filter(p => !categoryPresses.some(cp => cp.id === p.id));
      } else {
        // 일부만 선택되어 있거나 없으면 모두 선택
        const newPresses = categoryPresses.filter(press => 
          !prev.some(p => p.id === press.id)
        );
        return [...prev, ...newPresses];
      }
    });
  };

  // CSV 다운로드
  const downloadCSV = () => {
    if (!result) return;

    const csvRows: string[] = [];
    // 헤더
    csvRows.push('언론사,카테고리,면,제목,링크');

    // 데이터
    for (const [pressId, pressResult] of Object.entries(result)) {
      const press = findPressById(pressId);
      const pressName = press?.name || `언론사 ID: ${pressId}`;
      const pressCategory = press?.category || '';

      for (const [page, articles] of Object.entries(pressResult)) {
        for (const article of articles) {
          // CSV 형식에 맞게 이스케이프 처리
          const escapeCSV = (text: string) => {
            if (text.includes(',') || text.includes('"') || text.includes('\n')) {
              return `"${text.replace(/"/g, '""')}"`;
            }
            return text;
          };

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

  // JSON 다운로드
  const downloadJSON = () => {
    if (!result) return;

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

  // 텍스트 파일 다운로드
  const downloadTXT = () => {
    if (!result) return;

    // 텍스트 형식으로 변환
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

  // 클립보드 복사
  const copyToClipboard = async () => {
    if (!result) return;

    try {
      // 텍스트 형식으로 변환
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

  // 오늘 날짜를 YYYYMMDD 형식으로 반환
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  // 워드 클라우드용 단어 추출 및 빈도수 계산
  const wordCloudData = useMemo(() => {
    if (!result) return [];

    // 한국어 불용어 목록
    const stopWords = new Set([
      '이', '가', '을', '를', '의', '에', '와', '과', '도', '로', '으로',
      '은', '는', '에서', '에게', '께', '한테', '부터', '까지', '만',
      '그', '그것', '그런', '그렇게', '이것', '이런', '이렇게', '저것',
      '것', '수', '때', '곳', '등', '및', '또한', '또', '그리고', '하지만',
      '그러나', '그런데', '따라서', '그래서', '그러므로', '그러면',
      '있', '하', '되', '되다', '하다', '있다', '없다', '않다',
      '년', '월', '일', '시', '분', '초', '오늘', '어제', '내일',
      '위', '아래', '앞', '뒤', '옆', '중', '안', '밖',
      '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열',
      '하나', '둘', '셋', '넷', 
      '첫', '마지막', '새', '옛', '지난', '다음', '이번',
      '대', '중', '소', '전', '후', '최근', '지금', '현재',
      '기자', '뉴스', '보도', '발표', '발생', '확인', '알려', '밝혀',
      '회사', '기업', '조사', '연구', '분석', '결과', '발견',
      '사람', '국민', '시민', '주민', '시장', '도지사', '시장', '군수',
      '오늘', '어제', '내일', '지난', '이번', '다음', '올해', '작년', '내년',
      '작년', '내년', '사설', '포토',
      '포토뉴스' , '동정' , '지원' , '논란' , '단독' , '개최' ,'추진' , '협력' ,'강화' , 
      '글로벌', '협력', 
    ]);

    // 모든 기사 제목 수집
    const allTitles: string[] = [];
    for (const pressResult of Object.values(result)) {
      for (const articles of Object.values(pressResult)) {
        for (const article of articles) {
          allTitles.push(article.title);
        }
      }
    }

    // 단어 추출 및 빈도수 계산
    const wordCount: Record<string, number> = {};
    
    allTitles.forEach(title => {
      // 한글, 영문만 추출 (숫자는 제외)
      // 한글: 2글자 이상, 영문: 3글자 이상
      const words = title.match(/[가-힣]{2,}|[A-Za-z]{3,}/g) || [];
      
      words.forEach(word => {
        const lowerWord = word.toLowerCase();
        // 불용어 제거 및 최소 길이 체크
        // 숫자만 있는 단어는 이미 정규식에서 제외됨
        if (!stopWords.has(word) && !stopWords.has(lowerWord) && word.length >= 2) {
          wordCount[word] = (wordCount[word] || 0) + 1;
        }
      });
    });

    // 빈도수 기준으로 정렬하고 상위 50개만 선택
    const sortedWords = Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50)
      .map(([text, count]) => ({
        text,
        size: count
      }));

    return sortedWords;
  }, [result]);

  // 기사 검색 필터링 함수
  const filterArticles = (articles: Article[], searchTerm: string): Article[] => {
    if (!searchTerm.trim()) return articles;
    const term = searchTerm.toLowerCase();
    return articles.filter(article => 
      article.title.toLowerCase().includes(term)
    );
  };

  // 검색어 하이라이트 함수
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

  // 검색된 기사 총 개수 계산
  const getFilteredArticleCount = (): number => {
    if (!result || !articleSearchTerm.trim()) {
      return Object.values(result || {}).reduce((total, pressResult) => 
        total + Object.values(pressResult).reduce((sum, articles) => sum + articles.length, 0), 0
      );
    }
    
    let count = 0;
    for (const pressResult of Object.values(result)) {
      for (const articles of Object.values(pressResult)) {
        count += filterArticles(articles, articleSearchTerm).length;
      }
    }
    return count;
  };

  // 전체 기사 개수 계산
  const getTotalArticleCount = (): number => {
    if (!result) return 0;
    return Object.values(result).reduce((total, pressResult) => 
      total + Object.values(pressResult).reduce((sum, articles) => sum + articles.length, 0), 0
    );
  };

  // 프리셋 관리 함수들
  useEffect(() => {
    // 로컬 스토리지에서 프리셋 로드
    if (typeof window !== 'undefined') {
      const savedPresets = localStorage.getItem('newsScraperPresets');
      if (savedPresets) {
        try {
          setPresets(JSON.parse(savedPresets));
        } catch (err) {
          console.error('프리셋 로드 실패:', err);
        }
      }
    }
  }, []);

  const savePreset = () => {
    if (!presetName.trim() || selectedPresses.length === 0) {
      alert('프리셋 이름을 입력하고 언론사를 선택해주세요.');
      return;
    }

    const newPreset: Preset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      pressIds: selectedPresses.map(p => p.id),
      createdAt: Date.now()
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('newsScraperPresets', JSON.stringify(updatedPresets));
    }

    setPresetName('');
    setShowPresetModal(false);
    alert('프리셋이 저장되었습니다.');
  };

  const loadPreset = (preset: Preset) => {
    const presses = preset.pressIds
      .map(id => findPressById(id))
      .filter(Boolean) as PressInfo[];
    
    if (presses.length > 0) {
      setSelectedPresses(presses);
      setShowPresetModal(false);
    } else {
      alert('프리셋에 유효한 언론사가 없습니다.');
    }
  };

  const deletePreset = (presetId: string) => {
    if (!confirm('이 프리셋을 삭제하시겠습니까?')) return;

    const updatedPresets = presets.filter(p => p.id !== presetId);
    setPresets(updatedPresets);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('newsScraperPresets', JSON.stringify(updatedPresets));
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem',
          marginBottom: '0.5rem'
        }}>
          {/* 로고 - 이미지 파일 또는 SVG */}
          <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
            {/* 이미지 파일이 있으면 사용, 없으면 SVG 폴백 */}
            <img 
              src="/logo.png" 
              alt="신기한 앱 로고"
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                display: 'block'
              }}
              onError={(e) => {
                // 이미지 로드 실패 시 SVG 표시
                const target = e.currentTarget;
                target.style.display = 'none';
                const svg = target.nextElementSibling as HTMLElement;
                if (svg) svg.style.display = 'block';
              }}
            />
            {/* SVG 폴백 (이미지 설명 기반 재현) */}
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 48 48" 
              style={{ 
                display: 'none',
                position: 'absolute',
                top: 0,
                left: 0
              }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* 그라데이션 정의 (녹색에서 청록색으로) */}
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4ade80" />
                  <stop offset="50%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              
              {/* 신문/문서 배경 (약간 접힌 형태) */}
              <path 
                d="M 8 6 L 36 6 Q 40 6 40 10 L 40 38 Q 40 42 36 42 L 8 42 Q 4 42 4 38 L 4 10 Q 4 6 8 6 Z" 
                fill="none" 
                stroke="url(#logoGradient)" 
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* 텍스트 라인들 (헤드라인) */}
              <line 
                x1="8" 
                y1="12" 
                x2="38" 
                y2="12" 
                stroke="url(#logoGradient)" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
              
              {/* 텍스트 라인들 (본문) */}
              <line 
                x1="8" 
                y1="20" 
                x2="32" 
                y2="20" 
                stroke="url(#logoGradient)" 
                strokeWidth="1.5" 
                strokeLinecap="round"
              />
              <line 
                x1="8" 
                y1="26" 
                x2="30" 
                y2="26" 
                stroke="url(#logoGradient)" 
                strokeWidth="1.5" 
                strokeLinecap="round"
              />
              
              {/* 눈 아이콘 (중앙에 위치) */}
              <g transform="translate(24, 24)">
                {/* 눈 외곽선 */}
                <ellipse 
                  cx="0" 
                  cy="0" 
                  rx="10" 
                  ry="6" 
                  fill="none" 
                  stroke="url(#logoGradient)" 
                  strokeWidth="2"
                />
                {/* 홍채 */}
                <circle 
                  cx="0" 
                  cy="0" 
                  r="5" 
                  fill="none" 
                  stroke="url(#logoGradient)" 
                  strokeWidth="1.5"
                />
                {/* 동공 */}
                <circle 
                  cx="0" 
                  cy="0" 
                  r="3" 
                  fill="url(#logoGradient)"
                />
                {/* 하이라이트 */}
                <circle 
                  cx="-1" 
                  cy="-1" 
                  r="1" 
                  fill="#ffffff"
                  opacity="0.9"
                />
              </g>
              
              {/* 아래쪽 텍스트 라인들 (눈 아래) */}
              <line 
                x1="8" 
                y1="34" 
                x2="28" 
                y2="34" 
                stroke="url(#logoGradient)" 
                strokeWidth="1.5" 
                strokeLinecap="round"
              />
              <line 
                x1="8" 
                y1="38" 
                x2="26" 
                y2="38" 
                stroke="url(#logoGradient)" 
                strokeWidth="1.5" 
                strokeLinecap="round"
              />
            </svg>
          </div>
          
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            margin: 0,
            lineHeight: '1.4',
            display: 'inline-block',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif',
            letterSpacing: '-0.02em'
          }}>
            <span style={{ 
              fontSize: '2.5rem', 
              fontWeight: '800',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              display: 'inline-block',
              letterSpacing: '0.02em'
            }}>신</span>
            <span style={{ 
              fontSize: '1.2rem', 
              fontWeight: '500', 
              color: '#6b7280',
              letterSpacing: '0.01em'
            }}>문 </span>
            <span style={{ 
              fontSize: '2.5rem', 
              fontWeight: '800',
              background: 'linear-gradient(135deg, #f093fb 0%, #4facfe 50%, #00f2fe 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              display: 'inline-block',
              letterSpacing: '0.02em'
            }}>기</span>
            <span style={{ 
              fontSize: '1.2rem', 
              fontWeight: '500', 
              color: '#6b7280',
              letterSpacing: '0.01em'
            }}>사 </span>
            <span style={{ 
              fontSize: '2.5rem', 
              fontWeight: '800',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 50%, #43e97b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              display: 'inline-block',
              letterSpacing: '0.02em'
            }}>한</span>
            <span style={{ 
              fontSize: '1.2rem', 
              fontWeight: '500', 
              color: '#6b7280',
              letterSpacing: '0.01em'
            }}>눈에 보기</span>
          </h1>
        </div>
        <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.6', marginTop: '0.5rem' }}>
          여러 언론사의 신문 기사를 면별로 모아보고, 키워드 분석과 트렌드를 한눈에 파악하세요
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div style={{
        marginBottom: '1.5rem',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('scrape')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'scrape' ? '#007bff' : 'transparent',
              color: activeTab === 'scrape' ? '#fff' : '#666',
              border: 'none',
              borderBottom: activeTab === 'scrape' ? '3px solid #007bff' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: activeTab === 'scrape' ? '600' : '500',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            📰 신문 수집
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'search' ? '#007bff' : 'transparent',
              color: activeTab === 'search' ? '#fff' : '#666',
              border: 'none',
              borderBottom: activeTab === 'search' ? '3px solid #007bff' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: activeTab === 'search' ? '600' : '500',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            🔍 뉴스 키워드 검색
          </button>
        </div>
      </div>

      {/* 신문 수집 탭 */}
      {activeTab === 'scrape' && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
        {/* 언론사 선택 영역 */}
        <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <label 
                style={{ 
                  fontWeight: '500',
                  color: '#333',
                  margin: 0
                }}
              >
                언론사 선택 *
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPresetModal(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#17a2b8',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    color: '#fff',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#138496';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#17a2b8';
                  }}
                >
                  ⭐ 프리셋 관리
                </button>
                {selectedPresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPresetName('');
                      setShowPresetModal(true);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#28a745',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      color: '#fff',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#218838';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#28a745';
                    }}
                  >
                    💾 현재 선택 저장
                  </button>
                )}
              </div>
            </div>
            
            {/* 검색 입력 */}
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="언론사 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            {/* 토글 버튼 그룹 */}
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '1rem',
              backgroundColor: '#fafafa',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {(() => {
                const filtered = newspaperPressList.filter(press => {
                  if (!searchTerm) return true;
                  const term = searchTerm.toLowerCase();
                  return (
                    press.name.toLowerCase().includes(term) ||
                    press.id.includes(term) ||
                    press.category.toLowerCase().includes(term)
                  );
                });
                
                const grouped = filtered.reduce((acc, press) => {
                  if (!acc[press.category]) {
                    acc[press.category] = [];
                  }
                  acc[press.category].push(press);
                  return acc;
                }, {} as Record<string, typeof newspaperPressList>);
                
                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                      검색 결과가 없습니다.
                    </div>
                  );
                }
                
                return Object.entries(grouped).map(([category, presses]) => {
                  const categorySelectedCount = presses.filter(press => 
                    selectedPresses.some(p => p.id === press.id)
                  ).length;
                  const isCategoryFullySelected = categorySelectedCount === presses.length;
                  const isCategoryPartiallySelected = categorySelectedCount > 0 && !isCategoryFullySelected;
                  
                  return (
                    <div key={category} style={{ marginBottom: '1.5rem' }}>
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: isCategoryFullySelected 
                            ? '#0066cc' 
                            : isCategoryPartiallySelected 
                            ? '#b3d9ff' 
                            : '#f0f0f0',
                          color: isCategoryFullySelected || isCategoryPartiallySelected 
                            ? '#fff' 
                            : '#555',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          borderRadius: '4px',
                          marginBottom: '0.75rem',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!isCategoryFullySelected) {
                            e.currentTarget.style.backgroundColor = isCategoryPartiallySelected 
                              ? '#99ccff' 
                              : '#e0e0e0';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isCategoryFullySelected 
                            ? '#0066cc' 
                            : isCategoryPartiallySelected 
                            ? '#b3d9ff' 
                            : '#f0f0f0';
                        }}
                      >
                        <span>
                          {category} 
                          {isCategoryPartiallySelected && ` (${categorySelectedCount}/${presses.length})`}
                          {isCategoryFullySelected && ` (전체 선택됨)`}
                        </span>
                        <span style={{ fontSize: '0.8rem' }}>
                          {isCategoryFullySelected ? '✓' : isCategoryPartiallySelected ? '◐' : '○'}
                        </span>
                      </button>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        {presses.map((press) => {
                          const isSelected = selectedPresses.some(p => p.id === press.id);
                          return (
                            <button
                              key={press.id}
                              type="button"
                              onClick={() => togglePress(press)}
                              style={{
                                padding: '0.6rem 1rem',
                                border: isSelected 
                                  ? '2px solid #0066cc' 
                                  : '1px solid #ddd',
                                borderRadius: '6px',
                                backgroundColor: isSelected 
                                  ? '#0066cc' 
                                  : '#fff',
                                color: isSelected 
                                  ? '#fff' 
                                  : '#333',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: isSelected ? '600' : '400',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                                  e.currentTarget.style.borderColor = '#bbb';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = '#fff';
                                  e.currentTarget.style.borderColor = '#ddd';
                                }
                              }}
                            >
                              {press.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            
            {selectedPresses.length > 0 && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                backgroundColor: '#e6f2ff',
                borderRadius: '6px',
                fontSize: '0.9rem',
                color: '#0066cc'
              }}>
                <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
                  선택된 언론사 ({selectedPresses.length}개):
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  {selectedPresses.map((press) => (
                    <span
                      key={press.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        fontSize: '0.85rem'
                      }}
                    >
                      <strong>{press.name}</strong>
                      <span style={{ color: '#999', fontSize: '0.8rem' }}>
                        ({press.category})
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePress(press)}
                        style={{
                          marginLeft: '0.25rem',
                          padding: '0 0.25rem',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#cc0000',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 'bold'
                        }}
                        title="선택 해제"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
              신문보기 가능한 언론사만 표시됩니다
            </small>
        </div>
        
        {/* 날짜 및 버튼 영역 */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          flexWrap: 'wrap',
          alignItems: 'flex-end'
        }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label 
              htmlFor="date" 
              style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                color: '#333'
              }}
            >
              날짜 (선택)
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={getTodayDate().slice(0, 4) + '-' + getTodayDate().slice(4, 6) + '-' + getTodayDate().slice(6, 8)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
            <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
              날짜를 선택하지 않으면 최신 신문을 가져옵니다
            </small>
          </div>

          <div style={{ flex: '1', minWidth: '200px' }}>
            <label 
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: '#fff',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={onlyFirstPage}
                onChange={(e) => setOnlyFirstPage(e.target.checked)}
                style={{
                  width: '1.2rem',
                  height: '1.2rem',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontWeight: '500', color: '#333' }}>
                1면/A1 추출
              </span>
            </label>
            <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block', paddingLeft: '0.75rem' }}>
              체크 시 1면과 A1 기사만 추출합니다
            </small>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: loading ? '#ccc' : '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                whiteSpace: 'nowrap',
                height: 'fit-content'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#0052a3';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#0066cc';
                }
              }}
            >
              {loading ? '추출 중...' : '기사 추출'}
            </button>
          </div>
        </div>
      </form>
      )}

      {/* 뉴스 키워드 검색 탭 */}
      {activeTab === 'search' && (
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            color: '#333',
            marginBottom: '1.5rem'
          }}>
            🔍 뉴스 키워드 검색
          </h2>

          <form onSubmit={handleNewsSearchSubmit} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  value={newsKeyword}
                  onChange={(e) => {
                    setNewsKeyword(e.target.value);
                    setShowAutocomplete(true);
                  }}
                  onFocus={() => setShowAutocomplete(true)}
                  onBlur={() => {
                    // 약간의 딜레이를 주어 클릭 이벤트가 먼저 발생하도록
                    setTimeout(() => setShowAutocomplete(false), 200);
                  }}
                  placeholder="검색할 키워드를 입력하세요 (예: 인공지능, 경제, 정치 등)"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  disabled={newsSearchLoading}
                />
                
                {/* 자동완성 드롭다운 */}
                {showAutocomplete && getAutocompleteSuggestions().length > 0 && (
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
                    {getAutocompleteSuggestions().map((item, index) => (
                      <div
                        key={index}
                        onClick={() => handleSelectKeyword(item)}
                        style={{
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderBottom: index < getAutocompleteSuggestions().length - 1 ? '1px solid #f0f0f0' : 'none',
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
                              removeFromSearchHistory(item);
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
                onChange={(e) => setSortOption(e.target.value as 'sim' | 'date')}
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
                  setDisplayCount(newCount);
                  setCurrentPage(1); // 개수 변경 시 첫 페이지로 리셋
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
              <button
                type="submit"
                disabled={newsSearchLoading || !newsKeyword.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: newsSearchLoading || !newsKeyword.trim() ? '#ccc' : '#007bff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: newsSearchLoading || !newsKeyword.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#fff',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {newsSearchLoading ? '검색 중...' : '검색'}
              </button>
            </div>
          </form>

          {/* 최근 검색어 목록 */}
          {searchHistory.length > 0 && (
            <div style={{
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: '#fff',
              borderRadius: '6px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem'
              }}>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  📚 최근 검색어
                </div>
                <button
                  type="button"
                  onClick={clearSearchHistory}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.8rem',
                    color: '#999',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#dc3545';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#999';
                  }}
                >
                  전체 삭제
                </button>
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                {searchHistory.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e0e0e0',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleSelectKeyword(item)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e6f2ff';
                      e.currentTarget.style.borderColor = '#007bff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  >
                    <span style={{ color: '#333' }}>{item}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromSearchHistory(item);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: 0,
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
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
                ))}
              </div>
            </div>
          )}

          {/* 날짜 범위 필터 */}
          <div style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#fff',
            borderRadius: '6px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#333'
              }}>
                <input
                  type="checkbox"
                  checked={useDateRange}
                  onChange={(e) => setUseDateRange(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                날짜 선택
              </label>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={setTodayDateRange}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: '600',
                    color: '#007bff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e6f2ff';
                    e.currentTarget.style.borderColor = '#007bff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDateRange(1)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                    e.currentTarget.style.borderColor = '#007bff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                >
                  어제
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDateRange(7)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                    e.currentTarget.style.borderColor = '#007bff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                >
                  지난 7일
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDateRange(30)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                    e.currentTarget.style.borderColor = '#007bff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                >
                  지난 30일
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDateRange(90)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                    e.currentTarget.style.borderColor = '#007bff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                >
                  지난 90일
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateRangeStart('');
                    setDateRangeEnd('');
                    setUseDateRange(false);
                  }}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee';
                    e.currentTarget.style.borderColor = '#dc3545';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                >
                  초기화
                </button>
              </div>
            </div>

            {useDateRange && (
              <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                <div style={{ flex: '1', minWidth: '150px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontSize: '0.85rem',
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    시작일
                  </label>
                  <input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    max={dateRangeEnd || new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div style={{
                  fontSize: '1.2rem',
                  color: '#999',
                  marginTop: '1.5rem'
                }}>
                  ~
                </div>
                <div style={{ flex: '1', minWidth: '150px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontSize: '0.85rem',
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    종료일
                  </label>
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    min={dateRangeStart}
                    max={new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 검색 결과 필터링 */}
          {newsSearchResult && (
            <div style={{
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: '#fff',
              borderRadius: '6px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: showFilters ? '0.75rem' : '0',
                cursor: 'pointer'
              }}
              onClick={() => setShowFilters(!showFilters)}
              >
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🔍 결과 필터링
                  {(filterDomain || filterText) && (
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      backgroundColor: '#007bff',
                      color: '#fff',
                      borderRadius: '12px',
                      fontSize: '0.7rem'
                    }}>
                      활성
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  {showFilters ? '▲' : '▼'}
                </span>
              </div>
              {showFilters && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                {/* 언론사 필터 */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontSize: '0.85rem',
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    언론사 (도메인)
                  </label>
                  <input
                    type="text"
                    value={filterDomain}
                    onChange={(e) => setFilterDomain(e.target.value)}
                    placeholder="예: chosun.com, joongang.co.kr"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                {/* 제목/본문 필터 */}
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
                  <input
                    type="text"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder="검색할 텍스트 입력"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      marginBottom: '0.5rem'
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '0.85rem'
                  }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={filterInTitle}
                        onChange={(e) => setFilterInTitle(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      제목 포함
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={filterInDescription}
                        onChange={(e) => setFilterInDescription(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      본문 포함
                    </label>
                  </div>
                </div>

                {/* 필터 초기화 */}
                {(filterDomain || filterText) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterDomain('');
                      setFilterText('');
                    }}
                    style={{
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.85rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      color: '#dc3545',
                      alignSelf: 'flex-start'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fee';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff';
                    }}
                  >
                    필터 초기화
                  </button>
                )}
                </div>
              )}
            </div>
          )}

          {newsSearchError && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '6px',
              color: '#856404',
              marginBottom: '1rem'
            }}>
              ⚠️ {newsSearchError}
            </div>
          )}

          {newsSearchResult && (() => {
            const filteredResult = getFilteredNewsResults();
            const displayResult = filteredResult || newsSearchResult;
            const isFiltered = useDateRange && (dateRangeStart || dateRangeEnd);
            const summary = generateSearchSummary();
            
            return (
              <div>
                <div style={{ 
                  marginBottom: '1rem', 
                  color: '#666',
                  fontSize: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}>
                  <div>
                    총 {newsSearchResult.total.toLocaleString()}개의 검색 결과 중 {newsSearchResult.start}~{Math.min(newsSearchResult.start + newsSearchResult.display - 1, newsSearchResult.total)}번째 결과
                  </div>
                  {isFiltered && filteredResult && (
                    <div style={{
                      padding: '0.5rem',
                      backgroundColor: '#e6f2ff',
                      borderRadius: '4px',
                      color: '#0066cc',
                      fontSize: '0.85rem'
                    }}>
                      📅 날짜 범위 필터 적용: {displayResult.items.length}개 결과 표시
                      {dateRangeStart && dateRangeEnd && (
                        <span> ({dateRangeStart} ~ {dateRangeEnd})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 검색 결과 저장 및 비교 */}
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: showSaveCompare ? '0.75rem' : '0',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowSaveCompare(!showSaveCompare)}
                  >
                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#333',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      💾 검색 결과 저장 및 비교
                      {savedSearchResults.length > 0 && (
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          backgroundColor: '#28a745',
                          color: '#fff',
                          borderRadius: '12px',
                          fontSize: '0.7rem'
                        }}>
                          {savedSearchResults.length}개 저장됨
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>
                      {showSaveCompare ? '▲' : '▼'}
                    </span>
                  </div>
                  {showSaveCompare && (
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={saveSearchResult}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#28a745',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#218838';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#28a745';
                        }}
                      >
                        현재 결과 저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowComparison(!showComparison)}
                        disabled={savedSearchResults.length < 2}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: savedSearchResults.length < 2 ? '#ccc' : '#17a2b8',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: savedSearchResults.length < 2 ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (savedSearchResults.length >= 2) {
                            e.currentTarget.style.backgroundColor = '#138496';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (savedSearchResults.length >= 2) {
                            e.currentTarget.style.backgroundColor = '#17a2b8';
                          }
                        }}
                      >
                        {showComparison ? '비교 숨기기' : '결과 비교'}
                      </button>
                    </div>

                    {/* 저장된 검색 결과 목록 */}
                    {savedSearchResults.length > 0 && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: '#fff',
                      borderRadius: '4px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#666',
                        marginBottom: '0.5rem'
                      }}>
                        저장된 검색 ({savedSearchResults.length}/5)
                      </div>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        {savedSearchResults.map((saved, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '0.4rem 0.75rem',
                              backgroundColor: '#e6f2ff',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              border: '1px solid #b3d9ff',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <span style={{ color: '#0066cc', fontWeight: '500' }}>
                              {saved.keyword}
                            </span>
                            <span style={{ color: '#999', fontSize: '0.75rem' }}>
                              ({saved.result.items.length}개)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSavedSearchResults(prev => {
                                  const newResults = prev.filter((_, i) => i !== index);
                                  if (typeof window !== 'undefined') {
                                    localStorage.setItem('savedSearchResults', JSON.stringify(newResults));
                                  }
                                  return newResults;
                                });
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#999',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                                padding: '0.1rem 0.3rem'
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
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 비교 결과 */}
                  {showComparison && savedSearchResults.length >= 2 && (() => {
                    const overlapping = findOverlappingArticles();
                    return (
                      <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        backgroundColor: '#fff3cd',
                        borderRadius: '6px',
                        border: '1px solid #ffc107'
                      }}>
                        <div style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#856404',
                          marginBottom: '0.75rem'
                        }}>
                          🔄 겹치는 기사 ({overlapping.length}개)
                        </div>
                        {overlapping.length > 0 ? (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            maxHeight: '400px',
                            overflowY: 'auto'
                          }}>
                            {overlapping.map((article, index) => (
                              <div
                                key={index}
                                style={{
                                  padding: '0.75rem',
                                  backgroundColor: '#fff',
                                  borderRadius: '4px',
                                  border: '1px solid #ffc107'
                                }}
                              >
                                <div style={{
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  color: '#333',
                                  marginBottom: '0.5rem'
                                }}>
                                  {article.title}
                                </div>
                                <div style={{
                                  fontSize: '0.8rem',
                                  color: '#856404',
                                  marginBottom: '0.5rem',
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '0.5rem',
                                  alignItems: 'center'
                                }}>
                                  <span style={{ fontWeight: '600' }}>
                                    {article.keywords.length}개 키워드:
                                  </span>
                                  {article.keywords.map((keyword, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        backgroundColor: '#fff3cd',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem'
                                      }}
                                    >
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                                <a
                                  href={article.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: '0.8rem',
                                    color: '#007bff',
                                    textDecoration: 'none'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.textDecoration = 'underline';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.textDecoration = 'none';
                                  }}
                                >
                                  기사 보기 →
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{
                            padding: '1rem',
                            textAlign: 'center',
                            color: '#856404',
                            fontSize: '0.85rem'
                          }}>
                            겹치는 기사가 없습니다.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  </div>
                  )}
                </div>

                {/* 트렌드 분석 */}
                {(() => {
                  const trendData = generateTrendData();
                  if (!trendData) return null;

                  return (
                    <div style={{
                      marginBottom: '1.5rem',
                      padding: '1rem',
                      backgroundColor: '#fff',
                      borderRadius: '6px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: showTrend ? '1rem' : '0',
                        cursor: 'pointer'
                      }}
                      onClick={() => setShowTrend(!showTrend)}
                      >
                        <div style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#333',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          📈 트렌드 분석
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>
                          {showTrend ? '▲' : '▼'}
                        </span>
                      </div>
                      {showTrend && (
                        <div>
                          {/* 날짜별 분포 */}
                          {trendData.dateDistribution.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <div style={{
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            color: '#333',
                            marginBottom: '0.75rem'
                          }}>
                            📅 날짜별 기사 수
                          </div>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            maxHeight: '300px',
                            overflowY: 'auto'
                          }}>
                            {trendData.dateDistribution.map(({ date, count }, index) => {
                              const maxCount = Math.max(...trendData.dateDistribution.map(d => d.count));
                              const percentage = (count / maxCount) * 100;
                              
                              return (
                                <div key={index} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem'
                                }}>
                                  <div style={{
                                    minWidth: '100px',
                                    fontSize: '0.85rem',
                                    color: '#666'
                                  }}>
                                    {date}
                                  </div>
                                  <div style={{
                                    flex: 1,
                                    height: '24px',
                                    backgroundColor: '#e0e0e0',
                                    borderRadius: '4px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${percentage}%`,
                                      height: '100%',
                                      backgroundColor: '#007bff',
                                      borderRadius: '4px',
                                      transition: 'width 0.3s'
                                    }} />
                                  </div>
                                  <div style={{
                                    minWidth: '50px',
                                    textAlign: 'right',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    color: '#333'
                                  }}>
                                    {count}개
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 시간대별 분포 */}
                      {trendData.hourDistribution.length > 0 && (
                        <div>
                          <div style={{
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            color: '#333',
                            marginBottom: '0.75rem'
                          }}>
                            ⏰ 시간대별 기사 수
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                            gap: '0.5rem'
                          }}>
                            {trendData.hourDistribution.map(({ hour, count }) => {
                              const maxCount = Math.max(...trendData.hourDistribution.map(h => h.count));
                              const percentage = (count / maxCount) * 100;
                              
                              return (
                                <div
                                  key={hour}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    padding: '0.5rem',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '4px',
                                    border: '1px solid #e0e0e0'
                                  }}
                                >
                                  <div style={{
                                    fontSize: '0.75rem',
                                    color: '#666',
                                    marginBottom: '0.25rem'
                                  }}>
                                    {hour}시
                                  </div>
                                  <div style={{
                                    width: '100%',
                                    height: '60px',
                                    backgroundColor: '#e0e0e0',
                                    borderRadius: '4px',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    justifyContent: 'center'
                                  }}>
                                    <div style={{
                                      width: '100%',
                                      height: `${percentage}%`,
                                      backgroundColor: '#28a745',
                                      borderRadius: '4px 4px 0 0',
                                      minHeight: count > 0 ? '4px' : '0',
                                      transition: 'height 0.3s'
                                    }} />
                                  </div>
                                  <div style={{
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    color: '#333',
                                    marginTop: '0.25rem'
                                  }}>
                                    {count}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 검색 결과 요약 */}
                {summary && (
                  <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#fff',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: showSummary ? '1rem' : '0',
                      cursor: 'pointer'
                    }}
                    onClick={() => setShowSummary(!showSummary)}
                    >
                      <div style={{
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: '#333',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        📊 검색 결과 요약
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>
                        {showSummary ? '▲' : '▼'}
                      </span>
                    </div>
                    {showSummary && (
                      <div>

                    {/* 기본 통계 */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      marginBottom: '1.5rem'
                    }}>
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px solid #e0e0e0'
                      }}>
                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                          표시된 기사 수
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#007bff' }}>
                          {summary.totalArticles.toLocaleString()}개
                        </div>
                      </div>
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px solid #e0e0e0'
                      }}>
                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                          기사 기간
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: '600', color: '#333' }}>
                          {summary.dateRange}
                        </div>
                      </div>
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px solid #e0e0e0'
                      }}>
                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                          평균 설명 길이
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: '600', color: '#333' }}>
                          {summary.avgDescriptionLength}자
                        </div>
                      </div>
                    </div>

                    {/* 주요 키워드 */}
                    {summary.topKeywords.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          color: '#333',
                          marginBottom: '0.75rem'
                        }}>
                          🔑 주요 키워드
                        </div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.5rem'
                        }}>
                          {summary.topKeywords.map((keyword, index) => {
                            const maxCount = summary.topKeywords[0].count;
                            const fontSize = 0.85 + (keyword.count / maxCount) * 0.3; // 빈도에 따라 크기 조정
                            const opacity = 0.6 + (keyword.count / maxCount) * 0.4; // 빈도에 따라 투명도 조정
                            
                            return (
                              <span
                                key={index}
                                style={{
                                  display: 'inline-block',
                                  padding: '0.5rem 0.75rem',
                                  backgroundColor: `rgba(0, 123, 255, ${opacity})`,
                                  color: '#fff',
                                  borderRadius: '20px',
                                  fontSize: `${fontSize}rem`,
                                  fontWeight: '500',
                                  cursor: 'default'
                                }}
                                title={`${keyword.word}: ${keyword.count}회 등장`}
                              >
                                {keyword.word} ({keyword.count})
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 주요 언론사 */}
                    {summary.topDomains.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          color: '#333',
                          marginBottom: '0.75rem'
                        }}>
                          📰 주요 언론사
                        </div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.5rem'
                        }}>
                          {summary.topDomains.map((domain, index) => (
                            <span
                              key={index}
                              style={{
                                display: 'inline-block',
                                padding: '0.4rem 0.75rem',
                                backgroundColor: '#e6f2ff',
                                color: '#0066cc',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                                border: '1px solid #b3d9ff'
                              }}
                            >
                              {domain.domain} ({domain.count}개)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 제목 패턴 */}
                    {summary.commonTitleWords.length > 0 && (
                      <div>
                        <div style={{
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          color: '#333',
                          marginBottom: '0.75rem'
                        }}>
                          📝 제목에서 자주 등장하는 단어
                        </div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.5rem'
                        }}>
                          {summary.commonTitleWords.map((word, index) => (
                            <span
                              key={index}
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
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                      </div>
                    )}
                  </div>
                )}

                {/* 검색 결과 내보내기 버튼 */}
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '0.75rem'
                  }}>
                    📥 결과 내보내기
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      type="button"
                      onClick={copyNewsToClipboard}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#6c757d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#5a6268';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#6c757d';
                      }}
                    >
                      📋 클립보드 복사
                    </button>
                    <button
                      type="button"
                      onClick={downloadNewsCSV}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#28a745',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#218838';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#28a745';
                      }}
                    >
                      📄 CSV 다운로드
                    </button>
                    <button
                      type="button"
                      onClick={downloadNewsJSON}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#17a2b8',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#138496';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#17a2b8';
                      }}
                    >
                      📦 JSON 다운로드
                    </button>
                    <button
                      type="button"
                      onClick={downloadNewsTXT}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#6c757d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#5a6268';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#6c757d';
                      }}
                    >
                      📄 TXT 다운로드
                    </button>
                  </div>
                </div>
                {displayResult.items.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#999',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px'
                  }}>
                    선택한 날짜 범위에 해당하는 검색 결과가 없습니다.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {displayResult.items.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '1rem',
                          backgroundColor: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                          transition: 'all 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#007bff';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,123,255,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e0e0e0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => window.open(item.link, '_blank')}
                      >
                        <h3 style={{
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          color: '#333',
                          marginBottom: '0.5rem',
                          marginTop: 0
                        }}>
                          {item.title}
                        </h3>
                        <p style={{
                          fontSize: '0.9rem',
                          color: '#666',
                          marginBottom: '0.5rem',
                          lineHeight: '1.5'
                        }}>
                          {item.description}
                        </p>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.85rem',
                          color: '#999'
                        }}>
                          <span>{new Date(item.pubDate).toLocaleString('ko-KR')}</span>
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: '#007bff',
                              textDecoration: 'none'
                            }}
                          >
                            원문 보기 →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 페이징 UI */}
                {newsSearchResult && newsSearchResult.total > 0 && (
                <div style={{
                  marginTop: '2rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || newsSearchLoading}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: currentPage === 1 || newsSearchLoading ? '#e0e0e0' : '#007bff',
                      color: currentPage === 1 || newsSearchLoading ? '#999' : '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: currentPage === 1 || newsSearchLoading ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                  >
                    ◀ 이전
                  </button>

                  {/* 페이지 번호 표시 */}
                  <div style={{
                    display: 'flex',
                    gap: '0.25rem',
                    alignItems: 'center'
                  }}>
                    {(() => {
                      const totalPages = Math.ceil(newsSearchResult.total / displayCount);
                      const maxPages = 10; // 최대 표시할 페이지 번호 수
                      const pages: (number | string)[] = [];
                      
                      if (totalPages <= maxPages) {
                        // 전체 페이지가 적으면 모두 표시
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // 현재 페이지 기준으로 앞뒤 페이지 표시
                        const startPage = Math.max(1, currentPage - 4);
                        const endPage = Math.min(totalPages, currentPage + 5);
                        
                        if (startPage > 1) {
                          pages.push(1);
                          if (startPage > 2) pages.push('...');
                        }
                        
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(i);
                        }
                        
                        if (endPage < totalPages) {
                          if (endPage < totalPages - 1) pages.push('...');
                          pages.push(totalPages);
                        }
                      }

                      return pages.map((page, index) => {
                        if (page === '...') {
                          return (
                            <span key={`ellipsis-${index}`} style={{ padding: '0 0.5rem', color: '#999' }}>
                              ...
                            </span>
                          );
                        }
                        
                        const pageNum = page as number;
                        const isActive = pageNum === currentPage;
                        
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            disabled={newsSearchLoading}
                            style={{
                              padding: '0.5rem 0.75rem',
                              minWidth: '2.5rem',
                              backgroundColor: isActive ? '#007bff' : '#fff',
                              color: isActive ? '#fff' : '#333',
                              border: `1px solid ${isActive ? '#007bff' : '#ddd'}`,
                              borderRadius: '6px',
                              cursor: newsSearchLoading ? 'not-allowed' : 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: isActive ? '600' : '500',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!newsSearchLoading && !isActive) {
                                e.currentTarget.style.backgroundColor = '#f0f0f0';
                                e.currentTarget.style.borderColor = '#007bff';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!newsSearchLoading && !isActive) {
                                e.currentTarget.style.backgroundColor = '#fff';
                                e.currentTarget.style.borderColor = '#ddd';
                              }
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={
                      !newsSearchResult || 
                      currentPage >= Math.ceil(newsSearchResult.total / displayCount) || 
                      newsSearchLoading
                    }
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: (
                        !newsSearchResult || 
                        currentPage >= Math.ceil(newsSearchResult.total / displayCount) || 
                        newsSearchLoading
                      ) ? '#e0e0e0' : '#007bff',
                      color: (
                        !newsSearchResult || 
                        currentPage >= Math.ceil(newsSearchResult.total / displayCount) || 
                        newsSearchLoading
                      ) ? '#999' : '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: (
                        !newsSearchResult || 
                        currentPage >= Math.ceil(newsSearchResult.total / displayCount) || 
                        newsSearchLoading
                      ) ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                  >
                    다음 ▶
                  </button>
                </div>
              )}

              {/* 페이지 정보 */}
              {newsSearchResult && newsSearchResult.total > 0 && (
                <div style={{
                  marginTop: '1rem',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '0.85rem'
                }}>
                  페이지 {currentPage} / {Math.ceil(newsSearchResult.total / displayCount)} 
                  ({newsSearchResult.total.toLocaleString()}개 결과 중)
                  {isFiltered && filteredResult && (
                    <span style={{ color: '#0066cc', marginLeft: '0.5rem' }}>
                      (필터링: {displayResult.items.length}개)
                    </span>
                  )}
                </div>
              )}
              </div>
            );
          })()}

          {!newsSearchResult && !newsSearchLoading && (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#999',
              fontSize: '0.95rem'
            }}>
              검색어를 입력하고 검색 버튼을 클릭하세요
            </div>
          )}
        </div>
      )}

      {activeTab === 'scrape' && error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          marginBottom: '2rem',
          color: '#c33'
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>오류:</strong>
          </div>
          <pre style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.9rem',
            margin: 0,
            fontFamily: 'monospace'
          }}>
            {error}
          </pre>
        </div>
      )}

      {activeTab === 'scrape' && result && (() => {
        const scrapeSummary = generateScrapeSummary();
        
        return (
          <div style={{ marginTop: '2rem' }}>

            {/* 신문 수집 결과 요약 */}
            {scrapeSummary && showScrapeSummary && (
              <div style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
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
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                      총 기사 수
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#007bff' }}>
                      {scrapeSummary.totalArticles.toLocaleString()}개
                    </div>
                  </div>
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                      언론사 수
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#28a745' }}>
                      {scrapeSummary.totalPresses}개
                    </div>
                  </div>
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                      면 수
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#17a2b8' }}>
                      {scrapeSummary.totalPages}면
                    </div>
                  </div>
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                      추출 날짜
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#333' }}>
                      {scrapeSummary.extractionDate}
                    </div>
                  </div>
                </div>

                {/* 언론사별 통계 */}
                {scrapeSummary.pressStats.length > 0 && (
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
                      {scrapeSummary.pressStats.slice(0, 10).map((stat, index) => (
                        <div
                          key={stat.pressId}
                          style={{
                            padding: '0.75rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px',
                            border: '1px solid #e0e0e0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
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
                      ))}
                    </div>
                  </div>
                )}

                {/* 면별 통계 */}
                {scrapeSummary.pageStats.length > 0 && (
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
                      {scrapeSummary.pageStats.slice(0, 15).map(([page, count]) => (
                        <div
                          key={page}
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
                            {page}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#0066cc' }}>
                            {count}개
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 카테고리별 통계 */}
                {scrapeSummary.categoryStats.length > 0 && (
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
                      {scrapeSummary.categoryStats.map(({ category, count }) => (
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
                {Object.keys(scrapeSummary.pressKeywords).length > 0 && (
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
                      {scrapeSummary.pressStats.slice(0, 5).map((stat) => {
                        const keywords = scrapeSummary.pressKeywords[stat.pressId] || [];
                        if (keywords.length === 0) return null;
                        
                        return (
                          <div key={stat.pressId} style={{
                            padding: '0.75rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px',
                            border: '1px solid #e0e0e0'
                          }}>
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
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 면별 주요 키워드 */}
                {Object.keys(scrapeSummary.pageKeywords).length > 0 && (
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
                      {scrapeSummary.pageStats.slice(0, 6).map(([page]) => {
                        const keywords = scrapeSummary.pageKeywords[page] || [];
                        if (keywords.length === 0) return null;
                        
                        return (
                          <div key={page} style={{
                            padding: '0.75rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px',
                            border: '1px solid #e0e0e0'
                          }}>
                            <div style={{
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              color: '#333',
                              marginBottom: '0.5rem'
                            }}>
                              {page}
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
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 언론사 간 공통 주제 */}
                {scrapeSummary.commonTopics.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '0.75rem'
                    }}>
                      🔄 여러 언론사가 다룬 주제 (1면/A1)
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      {scrapeSummary.commonTopics.map((topic, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '0.75rem',
                            backgroundColor: '#fff3cd',
                            borderRadius: '6px',
                            border: '1px solid #ffc107'
                          }}
                        >
                          <div style={{
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: '#856404',
                            marginBottom: '0.5rem'
                          }}>
                            {topic.title}
                          </div>
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#856404',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontWeight: '600' }}>
                              {topic.pressCount}개 언론사:
                            </span>
                            {topic.presses.map((press, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#fff',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {press}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                margin: 0,
                color: '#1a1a1a'
              }}>
                추출된 기사 ({Object.keys(result).length}개 언론사)
              </h2>
            
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              {/* 요약 보기 버튼 */}
              {scrapeSummary && (
                <button
                  type="button"
                  onClick={() => setShowScrapeSummary(!showScrapeSummary)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: showScrapeSummary ? '#6c757d' : '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = showScrapeSummary ? '#5a6268' : '#0056b3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = showScrapeSummary ? '#6c757d' : '#007bff';
                  }}
                >
                  {showScrapeSummary ? '📊 요약 숨기기' : '📊 요약 보기'}
                  <span style={{ fontSize: '0.8rem' }}>
                    {showScrapeSummary ? '▲' : '▼'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExtractSummaries}
                disabled={summaryExtracting}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: summaryExtracting ? '#ccc' : '#17a2b8',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: summaryExtracting ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#fff',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!summaryExtracting) {
                    e.currentTarget.style.backgroundColor = '#138496';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!summaryExtracting) {
                    e.currentTarget.style.backgroundColor = '#17a2b8';
                  }
                }}
              >
                {summaryExtracting ? '⏳ 요약문 추출 중...' : '📝 요약문 추출'}
              </button>
              <button
                type="button"
                onClick={copyToClipboard}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#333',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e0e0e0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
              >
                📋 클립보드 복사
              </button>
              <button
                type="button"
                onClick={downloadCSV}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#28a745',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#fff',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#218838';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#28a745';
                }}
              >
                📊 CSV 다운로드
              </button>
              <button
                type="button"
                onClick={downloadJSON}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#0066cc',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#fff',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0052a3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#0066cc';
                }}
              >
                📄 JSON 다운로드
              </button>
              <button
                type="button"
                onClick={downloadTXT}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#fff',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#5a6268';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6c757d';
                }}
              >
                📄 TXT 다운로드
              </button>
              {wordCloudData.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowWordCloud(!showWordCloud)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: showWordCloud ? '#6c757d' : '#17a2b8',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#fff',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = showWordCloud ? '#5a6268' : '#138496';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = showWordCloud ? '#6c757d' : '#17a2b8';
                  }}
                >
                  {showWordCloud ? '📊 워드 클라우드 숨기기' : '📊 워드 클라우드 보기'}
                </button>
              )}
            </div>
          </div>

          {/* 요약문 추출 에러 표시 */}
          {summaryExtractError && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '6px',
              color: '#856404',
              marginBottom: '1rem'
            }}>
              ⚠️ {summaryExtractError}
            </div>
          )}

          {/* 기사 검색 필터 */}
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{ flex: '1', minWidth: '250px' }}>
                <input
                  type="text"
                  placeholder="기사 제목 검색..."
                  value={articleSearchTerm}
                  onChange={(e) => setArticleSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {articleSearchTerm && (
                <button
                  type="button"
                  onClick={() => setArticleSearchTerm('')}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#6c757d',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#fff'
                  }}
                >
                  검색 초기화
                </button>
              )}
            </div>
            {articleSearchTerm && (
              <div style={{
                marginTop: '0.75rem',
                fontSize: '0.9rem',
                color: '#666'
              }}>
                검색 결과: <strong>{getFilteredArticleCount()}</strong>개 / 전체 <strong>{getTotalArticleCount()}</strong>개
              </div>
            )}
          </div>

          {/* 워드 클라우드 섹션 */}
          {showWordCloud && wordCloudData.length > 0 && (
            <div style={{
              marginBottom: '2rem',
              padding: '1.5rem',
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#333'
              }}>
                📊 키워드 워드 클라우드
              </h3>
              <p style={{
                fontSize: '0.9rem',
                color: '#666',
                marginBottom: '1rem'
              }}>
                기사 제목에서 추출한 주요 키워드를 시각화했습니다. (상위 50개)
              </p>
              <WordCloud words={wordCloudData} width={600} height={300} />
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {Object.entries(result).map(([pressId, pressResult]) => {
              const press = findPressById(pressId);
              const totalArticles = Object.values(pressResult).reduce((sum, articles) => sum + articles.length, 0);
              
              return (
                <div key={pressId} style={{
                  border: '2px solid #0066cc',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#fff'
                }}>
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
                        // 다양한 형식 정렬: "1면", "A1", "2면", "B1" 등
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
                        
                        return normalizePage(pageA) - normalizePage(pageB);
                      })
                      .map(([page, articles]) => {
                        // 검색 필터 적용
                        const filteredArticles = filterArticles(articles, articleSearchTerm);
                        
                        // 검색어가 있고 필터링된 기사가 없으면 해당 면을 표시하지 않음
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
                            
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                              {filteredArticles.map((article, index) => (
                              <li 
                                key={index}
                                style={{
                                  borderBottom: index < filteredArticles.length - 1 ? '1px solid #f0f0f0' : 'none',
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
                                  {highlightText(article.title, articleSearchTerm)}
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
                          </div>
                        );
                      })
                      .filter(Boolean)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      {activeTab === 'scrape' && !result && !error && !loading && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#999',
          backgroundColor: '#fafafa',
          borderRadius: '8px',
          border: '1px dashed #ddd'
        }}>
          <p style={{ margin: 0, fontSize: '1rem' }}>
            언론사를 선택하고 "기사 추출" 버튼을 클릭하세요
          </p>
        </div>
      )}

      {/* 프리셋 모달 */}
      {showPresetModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowPresetModal(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                margin: 0,
                color: '#1a1a1a'
              }}>
                프리셋 관리
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowPresetModal(false);
                  setPresetName('');
                }}
                style={{
                  padding: '0.5rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  color: '#999'
                }}
              >
                ×
              </button>
            </div>

            {/* 프리셋 저장 */}
            {selectedPresses.length > 0 && (
              <div style={{
                marginBottom: '2rem',
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e0e0e0'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: '#333'
                }}>
                  현재 선택된 언론사 저장
                </h3>
                <div style={{
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  color: '#666'
                }}>
                  선택된 언론사: {selectedPresses.map(p => p.name).join(', ')}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    placeholder="프리셋 이름 입력..."
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        savePreset();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={savePreset}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#28a745',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      color: '#fff'
                    }}
                  >
                    저장
                  </button>
                </div>
              </div>
            )}

            {/* 저장된 프리셋 목록 */}
            <div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '0.75rem',
                color: '#333'
              }}>
                저장된 프리셋 ({presets.length}개)
              </h3>
              {presets.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#999',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px'
                }}>
                  저장된 프리셋이 없습니다.
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {presets.map((preset) => {
                    const presetPresses = preset.pressIds
                      .map(id => findPressById(id))
                      .filter(Boolean) as PressInfo[];
                    
                    return (
                      <div
                        key={preset.id}
                        style={{
                          padding: '1rem',
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                          backgroundColor: '#fff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: '600',
                            marginBottom: '0.25rem',
                            color: '#333'
                          }}>
                            {preset.name}
                          </div>
                          <div style={{
                            fontSize: '0.85rem',
                            color: '#666'
                          }}>
                            {presetPresses.length}개 언론사: {presetPresses.map(p => p.name).join(', ')}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#999',
                            marginTop: '0.25rem'
                          }}>
                            {new Date(preset.createdAt).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem'
                        }}>
                          <button
                            type="button"
                            onClick={() => loadPreset(preset)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#0066cc',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              color: '#fff'
                            }}
                          >
                            불러오기
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePreset(preset.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#dc3545',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              color: '#fff'
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

