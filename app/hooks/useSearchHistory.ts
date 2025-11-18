import { useState, useEffect } from 'react';

const SEARCH_HISTORY_STORAGE_KEY = 'newsSearchHistory';
const MAX_HISTORY_SIZE = 10;

export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // 검색어 히스토리 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
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
    const trimmedKeyword = keyword.trim();
    setSearchHistory((prev) => {
      const filtered = prev.filter(item => item !== trimmedKeyword);
      const newHistory = [trimmedKeyword, ...filtered].slice(0, MAX_HISTORY_SIZE);

      if (typeof window !== 'undefined') {
        localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
      }

      return newHistory;
    });
  };

  // 검색어 히스토리에서 삭제
  const removeFromSearchHistory = (keyword: string) => {
    setSearchHistory((prev) => {
      const newHistory = prev.filter(item => item !== keyword);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
      }
      return newHistory;
    });
  };

  // 검색어 히스토리 전체 삭제
  const clearSearchHistory = () => {
    setSearchHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
    }
  };

  // 자동완성 필터링된 검색어 목록
  const getAutocompleteSuggestions = (currentKeyword: string): string[] => {
    if (!currentKeyword.trim()) {
      return searchHistory.slice(0, 5);
    }

    const keyword = currentKeyword.trim().toLowerCase();
    return searchHistory
      .filter(item => item.toLowerCase().includes(keyword) && item.toLowerCase() !== keyword)
      .slice(0, 5);
  };

  return {
    searchHistory,
    addToSearchHistory,
    removeFromSearchHistory,
    clearSearchHistory,
    getAutocompleteSuggestions,
  };
}

