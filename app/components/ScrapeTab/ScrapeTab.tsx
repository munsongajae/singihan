'use client';

import { useState } from 'react';
import { newspaperPressList, type PressInfo } from '../../data/pressList';
import React from 'react';
import type { ScrapeResult } from '../../types/news';
import { downloadScrapeCSV, downloadScrapeJSON, downloadScrapeTXT, copyScrapeToClipboard } from '../../utils/exportUtils';
import { generateScrapeSummary as generateScrapeSummaryUtil } from '../../utils/summaryUtils';
import { Button, Input, EmptyState } from '../ui';
import { usePresets, useScrapeData, useFilteredResults, useWordCloud } from '../../hooks';
import { COMMON_STYLES } from '../../styles/commonStyles';
import ScrapeForm from './ScrapeForm';
import PressSelector from './PressSelector';
import PresetModal from './PresetModal';
import ScrapeSummary, { type ScrapeSummaryType } from './ScrapeSummary';
import ScrapeResults from './ScrapeResults';
import WordCloud from '../WordCloud';

export default function ScrapeTab() {
  const [selectedPresses, setSelectedPresses] = useState<PressInfo[]>([]);
  const [date, setDate] = useState('');
  const [onlyFirstPage, setOnlyFirstPage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [articleSearchTerm, setArticleSearchTerm] = useState('');
  const [showWordCloud, setShowWordCloud] = useState(false);
  const [showScrapeSummary, setShowScrapeSummary] = useState(false);

  const presetsHook = usePresets();
  const scrapeData = useScrapeData();
  const { filterArticles, highlightText } = useFilteredResults();
  const wordCloudData = useWordCloud(scrapeData.result);

  // 신문 수집 결과 요약 생성
  const generateScrapeSummary = (): ScrapeSummaryType | null => {
    if (!scrapeData.result) return null;
    return generateScrapeSummaryUtil(scrapeData.result) as ScrapeSummaryType;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await scrapeData.handleSubmit(selectedPresses, date, onlyFirstPage);
  };

  const handleExtractSummaries = async () => {
    if (!scrapeData.result) return;
    await scrapeData.handleExtractSummaries(scrapeData.result, scrapeData.setResult);
  };

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

  const toggleCategory = (category: string) => {
    const categoryPresses = newspaperPressList.filter(p => p.category === category);
    const allSelected = categoryPresses.every(press =>
      selectedPresses.some(p => p.id === press.id)
    );

    setSelectedPresses(prev => {
      if (allSelected) {
        return prev.filter(p => !categoryPresses.some(cp => cp.id === p.id));
      } else {
        const newPresses = categoryPresses.filter(press =>
          !prev.some(p => p.id === press.id)
        );
        return [...prev, ...newPresses];
      }
    });
  };

  const downloadCSV = () => {
    if (!scrapeData.result) return;
    downloadScrapeCSV(scrapeData.result, date);
  };

  const downloadJSON = () => {
    if (!scrapeData.result) return;
    downloadScrapeJSON(scrapeData.result, date);
  };

  const downloadTXT = () => {
    if (!scrapeData.result) return;
    downloadScrapeTXT(scrapeData.result, date);
  };

  const copyToClipboard = async () => {
    if (!scrapeData.result) return;
    await copyScrapeToClipboard(scrapeData.result);
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };


  const getFilteredArticleCount = (): number => {
    if (!scrapeData.result || !articleSearchTerm.trim()) {
      return Object.values(scrapeData.result || {}).reduce((total, pressResult) =>
        total + Object.values(pressResult).reduce((sum, articles) => sum + articles.length, 0), 0
      );
    }

    let count = 0;
    for (const pressResult of Object.values(scrapeData.result)) {
      for (const articles of Object.values(pressResult)) {
        count += filterArticles(articles, articleSearchTerm).length;
      }
    }
    return count;
  };

  const getTotalArticleCount = (): number => {
    if (!scrapeData.result) return 0;
    return Object.values(scrapeData.result).reduce((total, pressResult) =>
      total + Object.values(pressResult).reduce((sum, articles) => sum + articles.length, 0), 0
    );
  };

  const handleSavePreset = () => {
    presetsHook.savePreset(selectedPresses);
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = presetsHook.presets.find(p => p.id === presetId);
    if (!preset) return;
    
    const presses = presetsHook.loadPreset(preset);
    if (presses) {
      setSelectedPresses(presses);
    }
  };

  const scrapeSummary = generateScrapeSummary();

  return (
    <>
      <form onSubmit={handleSubmit} style={{ marginBottom: COMMON_STYLES.spacing.xl }}>
        <PressSelector
          selectedPresses={selectedPresses}
          onTogglePress={togglePress}
          onToggleCategory={toggleCategory}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onShowPresetModal={() => presetsHook.setShowPresetModal(true)}
        />

        <ScrapeForm
          date={date}
          onDateChange={setDate}
          onlyFirstPage={onlyFirstPage}
          onOnlyFirstPageChange={setOnlyFirstPage}
          loading={scrapeData.loading}
          onSubmit={(e) => e.preventDefault()}
          getTodayDate={getTodayDate}
        />
      </form>

      {scrapeData.error && (
        <div style={COMMON_STYLES.layout.errorBox}>
          <div style={{ marginBottom: COMMON_STYLES.spacing.sm }}>
            <strong>오류:</strong>
          </div>
          <pre style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: COMMON_STYLES.typography.small.fontSize,
            margin: 0,
            fontFamily: 'monospace'
          }}>
            {scrapeData.error}
          </pre>
        </div>
      )}

      {scrapeData.result && (
        <div style={{ marginTop: COMMON_STYLES.spacing.xl }}>
          {scrapeSummary && showScrapeSummary && (
            <ScrapeSummary summary={scrapeSummary} />
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: COMMON_STYLES.spacing.lg,
            flexWrap: 'wrap',
            gap: COMMON_STYLES.spacing.md
          }}>
            <h2 style={COMMON_STYLES.typography.heading}>
              추출된 기사 ({Object.keys(scrapeData.result).length}개 언론사)
            </h2>

            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              {scrapeSummary && (
                <Button
                  type="button"
                  onClick={() => setShowScrapeSummary(!showScrapeSummary)}
                  variant={showScrapeSummary ? 'secondary' : 'primary'}
                  size="sm"
                >
                  {showScrapeSummary ? '📊 요약 숨기기' : '📊 요약 보기'}
                  <span style={{ fontSize: '0.8rem' }}>
                    {showScrapeSummary ? '▲' : '▼'}
                  </span>
                </Button>
              )}
              <Button
                type="button"
                onClick={handleExtractSummaries}
                disabled={scrapeData.summaryExtracting}
                variant="info"
                size="sm"
              >
                {scrapeData.summaryExtracting ? '⏳ 요약문 추출 중...' : '📝 요약문 추출'}
              </Button>
              <Button
                type="button"
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
              >
                클립보드
              </Button>
              <Button
                type="button"
                onClick={downloadCSV}
                variant="success"
                size="sm"
              >
                CSV
              </Button>
              <Button
                type="button"
                onClick={downloadJSON}
                variant="primary"
                size="sm"
              >
                JSON
              </Button>
              <Button
                type="button"
                onClick={downloadTXT}
                variant="secondary"
                size="sm"
              >
                TXT
              </Button>
              {wordCloudData.length > 0 && (
                <Button
                  type="button"
                  onClick={() => setShowWordCloud(!showWordCloud)}
                  variant={showWordCloud ? 'secondary' : 'info'}
                  size="sm"
                >
                  {showWordCloud ? '📊 워드 클라우드 숨기기' : '📊 워드 클라우드 보기'}
                </Button>
              )}
            </div>
          </div>

          {scrapeData.summaryExtractError && (
            <div style={COMMON_STYLES.layout.warningBox}>
              ⚠️ {scrapeData.summaryExtractError}
            </div>
          )}

          <div style={{
            marginBottom: COMMON_STYLES.spacing.lg,
            padding: COMMON_STYLES.spacing.md,
            backgroundColor: COMMON_STYLES.colors.neutral.background,
            borderRadius: COMMON_STYLES.borderRadius.lg,
            border: `1px solid ${COMMON_STYLES.colors.neutral.border}`
          }}>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <Input
                type="text"
                placeholder="기사 제목 검색..."
                value={articleSearchTerm}
                onChange={(e) => setArticleSearchTerm(e.target.value)}
                fullWidth
                style={{ flex: '1', minWidth: '250px' }}
              />
              {articleSearchTerm && (
                <Button
                  type="button"
                  onClick={() => setArticleSearchTerm('')}
                  variant="secondary"
                  size="md"
                >
                  검색 초기화
                </Button>
              )}
            </div>
            {articleSearchTerm && (
              <div style={{
                marginTop: '0.75rem',
                fontSize: COMMON_STYLES.typography.small.fontSize,
                color: COMMON_STYLES.typography.small.color
              }}>
                검색 결과: <strong>{getFilteredArticleCount()}</strong>개 / 전체 <strong>{getTotalArticleCount()}</strong>개
              </div>
            )}
          </div>

          {showWordCloud && wordCloudData.length > 0 && (
            <div style={{
              marginBottom: COMMON_STYLES.spacing.xl,
              padding: COMMON_STYLES.spacing.lg,
              backgroundColor: '#fafafa',
              borderRadius: COMMON_STYLES.borderRadius.lg,
              border: `1px solid ${COMMON_STYLES.colors.neutral.border}`
            }}>
              <h3 style={{
                ...COMMON_STYLES.typography.subheading,
                marginBottom: COMMON_STYLES.spacing.md
              }}>
                📊 키워드 워드 클라우드
              </h3>
              <p style={{
                fontSize: COMMON_STYLES.typography.small.fontSize,
                color: COMMON_STYLES.typography.small.color,
                marginBottom: COMMON_STYLES.spacing.md
              }}>
                기사 제목에서 추출한 주요 키워드를 시각화했습니다. (상위 50개)
              </p>
              <WordCloud words={wordCloudData} width={600} height={300} />
            </div>
          )}

          <ScrapeResults
            result={scrapeData.result}
            articleSearchTerm={articleSearchTerm}
            filterArticles={filterArticles}
            highlightText={highlightText}
          />
        </div>
      )}

      {!scrapeData.result && !scrapeData.error && !scrapeData.loading && (
        <EmptyState
          message="언론사를 선택하고 '기사 추출' 버튼을 클릭하세요"
        />
      )}

      <PresetModal
        isOpen={presetsHook.showPresetModal}
        onClose={() => {
          presetsHook.setShowPresetModal(false);
          presetsHook.setPresetName('');
        }}
        presets={presetsHook.presets}
        selectedPresses={selectedPresses}
        presetName={presetsHook.presetName}
        onPresetNameChange={presetsHook.setPresetName}
        onSavePreset={handleSavePreset}
        onLoadPreset={(preset) => {
          const presses = presetsHook.loadPreset(preset);
          if (presses) {
            setSelectedPresses(presses);
          }
        }}
        onDeletePreset={presetsHook.deletePreset}
      />
    </>
  );
}

