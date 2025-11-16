'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { newspaperPressList, findPressById, type PressInfo } from '../data/pressList';

// 워드 클라우드는 클라이언트 사이드에서만 동작하므로 dynamic import
const WordCloud = dynamic(() => import('./WordCloud'), { ssr: false });

interface Article {
  title: string;
  link: string;
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
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          marginBottom: '0.5rem', 
          color: '#1a1a1a',
          lineHeight: '1.4',
          display: 'inline-block'
        }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>신</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 'normal', color: '#666' }}>문 </span>
          <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>기</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 'normal', color: '#666' }}>사 </span>
          <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>한</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 'normal', color: '#666' }}>눈에 보기</span>
        </h1>
        <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.6', marginTop: '0.5rem' }}>
          여러 언론사의 신문 기사를 면별로 모아보고, 키워드 분석과 트렌드를 한눈에 파악하세요
        </p>
      </div>

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

      {error && (
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

      {result && (
        <div style={{ marginTop: '2rem' }}>
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
      )}

      {!result && !error && !loading && (
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

