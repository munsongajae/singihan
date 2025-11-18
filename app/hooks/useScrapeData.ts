import { useState } from 'react';
import type { ScrapeResult, Article, Preset } from '../types/news';
import type { PressInfo } from '../data/pressList';

interface UseScrapeDataReturn {
  loading: boolean;
  error: string | null;
  result: Record<string, ScrapeResult> | null;
  summaryExtracting: boolean;
  summaryExtractError: string | null;
  handleSubmit: (selectedPresses: PressInfo[], date: string, onlyFirstPage: boolean) => Promise<void>;
  handleExtractSummaries: (result: Record<string, ScrapeResult>, setResult: (result: Record<string, ScrapeResult>) => void) => Promise<void>;
  setError: (error: string | null) => void;
  setResult: (result: Record<string, ScrapeResult> | null) => void;
}

export function useScrapeData(): UseScrapeDataReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, ScrapeResult> | null>(null);
  const [summaryExtracting, setSummaryExtracting] = useState(false);
  const [summaryExtractError, setSummaryExtractError] = useState<string | null>(null);

  const handleSubmit = async (selectedPresses: PressInfo[], date: string, onlyFirstPage: boolean) => {
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

      const responses = await Promise.all(fetchPromises);

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

      if (onlyFirstPage) {
        const filteredResults: Record<string, ScrapeResult> = {};
        for (const [pressId, pressResult] of Object.entries(results)) {
          const firstPageKeys = Object.keys(pressResult).filter(key => {
            const normalizedKey = key.trim().replace(/\s+/g, '');
            if (/^1면$/.test(normalizedKey)) return true;
            if (/^A1$/.test(normalizedKey)) return true;
            if (/^A1면$/.test(normalizedKey)) return true;
            if (normalizedKey === '1') return true;
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

  const handleExtractSummaries = async (
    currentResult: Record<string, ScrapeResult>,
    setResultCallback: (result: Record<string, ScrapeResult>) => void
  ) => {
    if (!currentResult) {
      setSummaryExtractError('먼저 기사를 추출해주세요.');
      return;
    }

    const allArticles: Article[] = [];
    for (const pressResult of Object.values(currentResult)) {
      for (const articles of Object.values(pressResult)) {
        allArticles.push(...articles);
      }
    }

    if (allArticles.length === 0) {
      setSummaryExtractError('추출된 기사가 없습니다.');
      return;
    }

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

      const updatedResult: Record<string, ScrapeResult> = { ...currentResult };
      const summaryMap = new Map<string, Article>();

      data.articles.forEach((article: Article) => {
        if (article.summary) {
          summaryMap.set(`${article.title}|${article.link}`, article);
        }
      });

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

      setResultCallback(updatedResult);

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

  return {
    loading,
    error,
    result,
    summaryExtracting,
    summaryExtractError,
    handleSubmit,
    handleExtractSummaries,
    setError,
    setResult,
  };
}

