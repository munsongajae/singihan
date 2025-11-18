'use client';

import { useState, useEffect, useRef } from 'react';
import type { NaverNewsSearchResult } from '../../types/news';
import { downloadNewsCSV as downloadNewsCSVUtil, downloadNewsJSON as downloadNewsJSONUtil, downloadNewsTXT as downloadNewsTXTUtil, copyNewsToClipboard as copyNewsToClipboardUtil } from '../../utils/exportUtils';
import { getFilteredNewsResults as getFilteredNewsResultsUtil } from '../../utils/filterUtils';
import { generateTrendData as generateTrendDataUtil } from '../../utils/trendUtils';
import type { TrendData } from './TrendAnalysis';
import { generateSearchSummary as generateSearchSummaryUtil } from '../../utils/summaryUtils';
import { Button, Card, EmptyState } from '../ui';
import { useSearchHistory } from '../../hooks';
import { COMMON_STYLES } from '../../styles/commonStyles';
import SearchForm from './SearchForm';
import SearchFilters from './SearchFilters';
import SearchResults from './SearchResults';
import SearchSummary, { type SearchSummaryType } from './SearchSummary';
import TrendAnalysis from './TrendAnalysis';
import SaveCompareModal from './SaveCompareModal';

export default function SearchTab() {
  const [newsKeyword, setNewsKeyword] = useState('');
  const [newsSearchLoading, setNewsSearchLoading] = useState(false);
  const [newsSearchResult, setNewsSearchResult] = useState<NaverNewsSearchResult | null>(null);
  const [newsSearchError, setNewsSearchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [displayCount, setDisplayCount] = useState(10);
  const [sortOption, setSortOption] = useState<'sim' | 'date'>('date');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [useDateRange, setUseDateRange] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filterDomain, setFilterDomain] = useState<string>('');
  const [filterText, setFilterText] = useState<string>('');
  const [filterInTitle, setFilterInTitle] = useState(true);
  const [filterInDescription, setFilterInDescription] = useState(true);
  const [savedSearchResults, setSavedSearchResults] = useState<Array<{ keyword: string; result: NaverNewsSearchResult; timestamp: number }>>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showSaveCompare, setShowSaveCompare] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const searchHistoryHook = useSearchHistory();
  const exportMenuRef = useRef<HTMLDivElement>(null);

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

  // 외부 클릭 시 내보내기 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showExportMenu]);

  // 뉴스 검색 실행
  const handleNewsSearch = async (page: number = 1) => {
    if (!newsKeyword.trim()) {
      setNewsSearchError('검색어를 입력해주세요.');
      return;
    }

    setNewsSearchLoading(true);
    setNewsSearchError(null);
    setCurrentPage(page);

    try {
      if (displayCount > 100) {
        const requestsNeeded = Math.ceil(displayCount / 100);
        const start = (page - 1) * displayCount + 1;

        const requests = [];
        for (let i = 0; i < requestsNeeded; i++) {
          const requestStart = start + (i * 100);
          const requestDisplay = Math.min(100, displayCount - (i * 100));

          if (requestStart > 1000) break;

          const params = new URLSearchParams({
            query: newsKeyword.trim(),
            display: requestDisplay.toString(),
            start: requestStart.toString(),
            sort: sortOption
          });

          requests.push(fetch(`/api/search-news?${params.toString()}`));
        }

        const responses = await Promise.all(requests);
        const results = await Promise.all(responses.map(r => r.json()));

        if (!responses[0].ok) {
          throw new Error(results[0].error || '뉴스 검색에 실패했습니다.');
        }

        const allItems = results.flatMap(r => r.items || []);
        const totalItems = Math.min(displayCount, allItems.length);

        const firstResult = results[0];
        setNewsSearchResult({
          total: firstResult.total,
          start: start,
          display: totalItems,
          items: allItems.slice(0, displayCount)
        });
      } else {
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
    setCurrentPage(1);
    setShowAutocomplete(false);
    searchHistoryHook.addToSearchHistory(newsKeyword);
    await handleNewsSearch(1);
  };

  // 검색어 선택 핸들러
  const handleSelectKeyword = async (keyword: string) => {
    setNewsKeyword(keyword);
    setShowAutocomplete(false);
    setCurrentPage(1);
    searchHistoryHook.addToSearchHistory(keyword);
    await handleNewsSearch(1);
  };

  // 페이지 변경 핸들러
  const handlePageChange = async (newPage: number) => {
    if (newPage < 1) return;
    if (newsSearchResult && newPage > Math.ceil(newsSearchResult.total / displayCount)) return;
    await handleNewsSearch(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 날짜 범위로 필터링된 결과 계산
  const getFilteredNewsResults = () => {
    return getFilteredNewsResultsUtil(
      newsSearchResult,
      filterDomain,
      filterText,
      filterInTitle,
      filterInDescription,
      useDateRange,
      dateRangeStart,
      dateRangeEnd
    );
  };

  // 트렌드 분석 데이터 생성
  const generateTrendData = (): TrendData | null => {
    return generateTrendDataUtil(
      newsSearchResult,
      filterDomain,
      filterText,
      filterInTitle,
      filterInDescription,
      useDateRange,
      dateRangeStart,
      dateRangeEnd
    );
  };

  // 검색 결과 요약 생성
  const generateSearchSummary = (): SearchSummaryType | null => {
    return generateSearchSummaryUtil(
      newsSearchResult,
      filterDomain,
      filterText,
      filterInTitle,
      filterInDescription,
      useDateRange,
      dateRangeStart,
      dateRangeEnd
    ) as SearchSummaryType | null;
  };

  // 검색 결과 저장
  const saveSearchResult = () => {
    if (!newsSearchResult) return;

    setSavedSearchResults(prev => {
      const newResults = [...prev, {
        keyword: newsKeyword,
        result: newsSearchResult,
        timestamp: Date.now()
      }].slice(-5);

      if (typeof window !== 'undefined') {
        localStorage.setItem('savedSearchResults', JSON.stringify(newResults));
      }

      return newResults;
    });
  };

  // 겹치는 기사 찾기
  const findOverlappingArticles = () => {
    if (savedSearchResults.length < 2) return [];

    const allArticles: Array<{ title: string; link: string; keywords: string[] }> = [];
    const articleMap = new Map<string, Set<string>>();

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
    downloadNewsCSVUtil(displayResult, displayResult.items, newsKeyword);
  };

  // 뉴스 검색 결과 JSON 다운로드
  const downloadNewsJSON = () => {
    if (!newsSearchResult) return;
    const filteredResult = getFilteredNewsResults();
    const displayResult = filteredResult || newsSearchResult;
    downloadNewsJSONUtil(
      displayResult,
      displayResult.items,
      newsKeyword,
      useDateRange,
      dateRangeStart,
      dateRangeEnd,
      sortOption
    );
  };

  // 뉴스 검색 결과 텍스트 파일 다운로드
  const downloadNewsTXT = () => {
    if (!newsSearchResult) return;
    const filteredResult = getFilteredNewsResults();
    const displayResult = filteredResult || newsSearchResult;
    downloadNewsTXTUtil(
      displayResult,
      displayResult.items,
      newsKeyword,
      useDateRange,
      dateRangeStart,
      dateRangeEnd,
      sortOption
    );
  };

  // 뉴스 검색 결과 클립보드 복사
  const copyNewsToClipboard = async () => {
    if (!newsSearchResult) return;
    const filteredResult = getFilteredNewsResults();
    const displayResult = filteredResult || newsSearchResult;
    await copyNewsToClipboardUtil(displayResult.items);
  };

  // 뉴스 키워드 검색 탭 전체 초기화
  const handleResetNewsSearch = () => {
    setNewsKeyword('');
    setNewsSearchResult(null);
    setNewsSearchError(null);
    setCurrentPage(1);
    setDisplayCount(10);
    setSortOption('date');
    setDateRangeStart('');
    setDateRangeEnd('');
    setUseDateRange(false);
    setFilterDomain('');
    setFilterText('');
    setFilterInTitle(true);
    setFilterInDescription(true);
    setShowFilters(false);
    setShowTrend(false);
    setShowSummary(false);
    setShowSaveCompare(false);
    setShowAutocomplete(false);
  };

  const filteredResult = getFilteredNewsResults();
  const displayResult = filteredResult || newsSearchResult;
  const isFiltered = useDateRange && (dateRangeStart || dateRangeEnd);
  const trendData = generateTrendData();
  const summary = generateSearchSummary();
  const overlappingArticles = findOverlappingArticles();

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#333',
          margin: 0
        }}>
          🔍 뉴스 키워드 검색
        </h2>
        <Button
          type="button"
          onClick={handleResetNewsSearch}
          variant="danger"
          size="sm"
        >
          🔄 전체 초기화
        </Button>
      </div>

      <SearchForm
        newsKeyword={newsKeyword}
        onNewsKeywordChange={(keyword) => {
          setNewsKeyword(keyword);
          setShowAutocomplete(true);
        }}
        newsSearchLoading={newsSearchLoading}
        onSubmit={handleNewsSearchSubmit}
        sortOption={sortOption}
        onSortOptionChange={setSortOption}
        displayCount={displayCount}
        onDisplayCountChange={(count) => {
          setDisplayCount(count);
          setCurrentPage(1);
        }}
        showAutocomplete={showAutocomplete}
        autocompleteSuggestions={searchHistoryHook.getAutocompleteSuggestions(newsKeyword)}
        onSelectKeyword={handleSelectKeyword}
        onRemoveFromHistory={searchHistoryHook.removeFromSearchHistory}
        onFocus={() => setShowAutocomplete(true)}
        onBlur={() => {
          setTimeout(() => setShowAutocomplete(false), 200);
        }}
      />

      {searchHistoryHook.searchHistory.length > 0 && (
        <Card variant="bordered" padding="md" style={{ marginBottom: '1rem' }}>
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
            <Button
              type="button"
              onClick={searchHistoryHook.clearSearchHistory}
              variant="ghost"
              size="sm"
            >
              전체 삭제
            </Button>
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {searchHistoryHook.searchHistory.map((item, index) => (
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
                    searchHistoryHook.removeFromSearchHistory(item);
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
        </Card>
      )}


      {newsSearchResult && (
        <Card variant="bordered" padding="md" style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginBottom: (showFilters || showSaveCompare || showTrend || showSummary) ? '1rem' : '0'
          }}>
            <Button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'primary' : 'outline'}
              size="sm"
            >
              🔍 결과 내 재검색
              {(filterDomain || filterText) && (
                <span style={{
                  padding: '0.15rem 0.4rem',
                  backgroundColor: showFilters ? 'rgba(255,255,255,0.3)' : '#007bff',
                  color: '#fff',
                  borderRadius: '10px',
                  fontSize: '0.65rem',
                  marginLeft: '0.25rem'
                }}>
                  활성
                </span>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => setShowSaveCompare(!showSaveCompare)}
              variant={showSaveCompare ? 'success' : 'outline'}
              size="sm"
            >
              🔄 결과 비교
              {savedSearchResults.length > 0 && (
                <span style={{
                  padding: '0.15rem 0.4rem',
                  backgroundColor: showSaveCompare ? 'rgba(255,255,255,0.3)' : '#28a745',
                  color: '#fff',
                  borderRadius: '10px',
                  fontSize: '0.65rem',
                  marginLeft: '0.25rem'
                }}>
                  {savedSearchResults.length}
                </span>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => setShowTrend(!showTrend)}
              variant={showTrend ? 'info' : 'outline'}
              size="sm"
            >
              📈 트렌드 분석
            </Button>
            <Button
              type="button"
              onClick={() => setShowSummary(!showSummary)}
              variant={showSummary ? 'secondary' : 'outline'}
              size="sm"
            >
              📊 결과 요약
            </Button>
            {newsSearchResult && (
              <div ref={exportMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
                <Button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  variant="outline"
                  size="sm"
                >
                  📥 내보내기
                </Button>
                {showExportMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: COMMON_STYLES.spacing.xs,
                    backgroundColor: '#fff',
                    border: `1px solid ${COMMON_STYLES.colors.neutral.border}`,
                    borderRadius: COMMON_STYLES.borderRadius.md,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    minWidth: '120px',
                    padding: COMMON_STYLES.spacing.xs
                  }}>
                    <Button
                      type="button"
                      onClick={() => {
                        copyNewsToClipboard();
                        setShowExportMenu(false);
                      }}
                      variant="ghost"
                      size="sm"
                      style={{ width: '100%', justifyContent: 'flex-start' }}
                    >
                      클립보드
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        downloadNewsCSV();
                        setShowExportMenu(false);
                      }}
                      variant="ghost"
                      size="sm"
                      style={{ width: '100%', justifyContent: 'flex-start' }}
                    >
                      CSV
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        downloadNewsJSON();
                        setShowExportMenu(false);
                      }}
                      variant="ghost"
                      size="sm"
                      style={{ width: '100%', justifyContent: 'flex-start' }}
                    >
                      JSON
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        downloadNewsTXT();
                        setShowExportMenu(false);
                      }}
                      variant="ghost"
                      size="sm"
                      style={{ width: '100%', justifyContent: 'flex-start' }}
                    >
                      TXT
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {showFilters && (
            <div style={{
              marginTop: COMMON_STYLES.spacing.md,
              padding: COMMON_STYLES.spacing.md,
              backgroundColor: COMMON_STYLES.colors.neutral.background,
              borderRadius: COMMON_STYLES.borderRadius.md,
              border: `1px solid ${COMMON_STYLES.colors.neutral.border}`
            }}>
              <SearchFilters
                newsSearchResult={newsSearchResult}
                filterDomain={filterDomain}
                onFilterDomainChange={setFilterDomain}
                filterText={filterText}
                onFilterTextChange={setFilterText}
                filterInTitle={filterInTitle}
                onFilterInTitleChange={setFilterInTitle}
                filterInDescription={filterInDescription}
                onFilterInDescriptionChange={setFilterInDescription}
                useDateRange={useDateRange}
                onUseDateRangeChange={setUseDateRange}
                dateRangeStart={dateRangeStart}
                onDateRangeStartChange={setDateRangeStart}
                dateRangeEnd={dateRangeEnd}
                onDateRangeEndChange={setDateRangeEnd}
                onResetFilters={() => {
                  setFilterDomain('');
                  setFilterText('');
                }}
                onSetQuickDateRange={setQuickDateRange}
                onSetTodayDateRange={setTodayDateRange}
              />
            </div>
          )}

          {showSaveCompare && (
            <SaveCompareModal
              newsSearchResult={newsSearchResult}
              newsKeyword={newsKeyword}
              savedSearchResults={savedSearchResults}
              onSaveSearchResult={saveSearchResult}
              onRemoveSavedResult={(index) => {
                setSavedSearchResults(prev => {
                  const newResults = prev.filter((_, i) => i !== index);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('savedSearchResults', JSON.stringify(newResults));
                  }
                  return newResults;
                });
              }}
              showComparison={showComparison}
              onToggleComparison={() => setShowComparison(!showComparison)}
              overlappingArticles={overlappingArticles}
            />
          )}

          {showTrend && trendData && (
            <TrendAnalysis trendData={trendData} />
          )}

          {showSummary && summary && (
            <SearchSummary summary={summary} />
          )}
        </Card>
      )}

      {newsSearchError && (
        <div style={COMMON_STYLES.layout.warningBox}>
          ⚠️ {newsSearchError}
        </div>
      )}

      {newsSearchResult && displayResult && (
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
                padding: COMMON_STYLES.spacing.sm,
                backgroundColor: '#e6f2ff',
                borderRadius: COMMON_STYLES.borderRadius.sm,
                color: '#0066cc',
                fontSize: COMMON_STYLES.typography.small.fontSize
              }}>
                📅 날짜 범위 필터 적용: {displayResult.items.length}개 결과 표시
                {dateRangeStart && dateRangeEnd && (
                  <span> ({dateRangeStart} ~ {dateRangeEnd})</span>
                )}
              </div>
            )}
          </div>

          {displayResult.items.length === 0 ? (
            <EmptyState message="선택한 날짜 범위에 해당하는 검색 결과가 없습니다." />
          ) : (
            <SearchResults
              items={displayResult.items}
              currentPage={currentPage}
              total={newsSearchResult.total}
              displayCount={displayCount}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}

      {!newsSearchResult && !newsSearchLoading && (
        <EmptyState message="검색어를 입력하고 검색 버튼을 클릭하세요" />
      )}
    </div>
  );
}

