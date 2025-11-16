import { NextRequest, NextResponse } from 'next/server';

interface Article {
  title: string;
  link: string;
}

interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

interface NaverNewsResponse {
  items: NaverNewsItem[];
}

interface ArticleWithSummary extends Article {
  summary?: string;
  matched?: boolean;
}

// 제목 유사도 계산 (간단한 문자열 매칭)
function calculateSimilarity(title1: string, title2: string): number {
  const clean1 = title1.replace(/<[^>]*>/g, '').trim().toLowerCase();
  const clean2 = title2.replace(/<[^>]*>/g, '').trim().toLowerCase();
  
  // 완전 일치
  if (clean1 === clean2) return 1.0;
  
  // 한쪽이 다른 쪽을 포함하는 경우
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    return 0.8;
  }
  
  // 공통 단어 비율 계산
  const words1 = clean1.split(/\s+/);
  const words2 = clean2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));
  const totalWords = Math.max(words1.length, words2.length);
  
  return totalWords > 0 ? commonWords.length / totalWords : 0;
}

// URL에서 도메인 추출
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

// 딜레이 함수
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const articles: Article[] = body.articles || [];

    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json(
        { error: '기사 목록이 필요합니다.' },
        { status: 400 }
      );
    }

    // 환경 변수에서 네이버 API 인증 정보 가져오기
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { 
          error: '네이버 API 인증 정보가 설정되지 않았습니다.',
          hint: '.env.local 파일에 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 설정해주세요.'
        },
        { status: 500 }
      );
    }

    // API 호출 제한을 피하기 위한 설정
    const BATCH_SIZE = 5; // 한 번에 처리할 기사 수
    const DELAY_BETWEEN_REQUESTS = 200; // 요청 간 딜레이 (ms)
    const DELAY_BETWEEN_BATCHES = 1000; // 배치 간 딜레이 (ms)

    const results: ArticleWithSummary[] = [];

    // 기사를 배치로 나누어 처리
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);
      
      // 배치 내 각 기사 처리
      const batchPromises = batch.map(async (article, index) => {
        // 배치 내 요청 간 딜레이
        if (index > 0) {
          await delay(DELAY_BETWEEN_REQUESTS);
        }

        try {
          // 기사 제목에서 검색어 추출 (특수문자 제거, 최대 20자)
          const searchQuery = article.title
            .replace(/[^\w\s가-힣]/g, ' ')
            .trim()
            .split(/\s+/)
            .slice(0, 5)
            .join(' ')
            .substring(0, 20);

          if (!searchQuery) {
            return {
              ...article,
              matched: false,
            };
          }

          // 네이버 뉴스 검색 API 호출
          const encodedQuery = encodeURIComponent(searchQuery);
          const apiUrl = `https://openapi.naver.com/v1/search/news.json?query=${encodedQuery}&display=10&start=1&sort=sim`;

          const response = await fetch(apiUrl, {
            headers: {
              'X-Naver-Client-Id': clientId,
              'X-Naver-Client-Secret': clientSecret,
            },
          });

          if (!response.ok) {
            console.error(`API 호출 실패: ${response.status} - ${article.title}`);
            return {
              ...article,
              matched: false,
            };
          }

          const data: NaverNewsResponse = await response.json();

          // 검색 결과에서 매칭되는 기사 찾기
          let bestMatch: NaverNewsItem | null = null;
          let bestSimilarity = 0;

          for (const item of data.items) {
            // 제목 유사도 계산
            const titleSimilarity = calculateSimilarity(article.title, item.title);
            
            // 링크 매칭 확인
            const articleDomain = extractDomain(article.link);
            const itemDomain = extractDomain(item.originallink || item.link);
            const linkMatch = articleDomain && itemDomain && articleDomain === itemDomain;

            // 유사도 계산 (제목 유사도 + 링크 매칭 보너스)
            const similarity = linkMatch ? Math.max(titleSimilarity, 0.9) : titleSimilarity;

            if (similarity > bestSimilarity && similarity >= 0.6) {
              bestSimilarity = similarity;
              bestMatch = item;
            }
          }

          if (bestMatch) {
            // HTML 태그 제거
            const summary = bestMatch.description
              .replace(/<[^>]*>/g, '')
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .trim();

            return {
              ...article,
              summary: summary || undefined,
              matched: true,
            };
          }

          return {
            ...article,
            matched: false,
          };
        } catch (error) {
          console.error(`기사 처리 오류: ${article.title}`, error);
          return {
            ...article,
            matched: false,
          };
        }
      });

      // 배치 처리 결과 대기
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 마지막 배치가 아니면 딜레이
      if (i + BATCH_SIZE < articles.length) {
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }

    const matchedCount = results.filter(r => r.matched).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: true,
      articles: results,
      statistics: {
        total: totalCount,
        matched: matchedCount,
        unmatched: totalCount - matchedCount,
        matchRate: totalCount > 0 ? ((matchedCount / totalCount) * 100).toFixed(1) : '0.0',
      },
    });
  } catch (error) {
    console.error('요약문 추출 오류:', error);
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

