import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface Article {
  title: string;
  link: string;
}

interface ScrapeResult {
  [page: string]: Article[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pressId = searchParams.get('pressId');
    const date = searchParams.get('date');

    // pressId는 필수 파라미터
    if (!pressId) {
      return NextResponse.json(
        { error: 'pressId 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // Naver 신문보기 페이지 URL 구성
    // 실제 신문보기 페이지는 /press/{pressId}/newspaper 형식
    // 하지만 모바일 버전은 media.naver.com을 사용
    let url: string;
    if (date) {
      // 날짜 형식: YYYYMMDD (예: 20251113)
      // 모바일 신문보기 페이지 URL
      url = `https://media.naver.com/press/${pressId}/newspaper?date=${date}`;
    } else {
      // 최신 신문 (날짜 없음)
      url = `https://media.naver.com/press/${pressId}/newspaper`;
    }

    // User-Agent 헤더를 포함하여 fetch 요청
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `HTTP 오류: ${response.status} ${response.statusText}` },
        { status: 500 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 결과를 저장할 객체
    const result: ScrapeResult = {};

    // 실제 HTML 구조에 맞는 셀렉터 사용
    // 컨테이너: div.sc_offc_lst._paper_article_list 또는 div._paper_article_list
    const articleListContainer = $('div._paper_article_list, div.sc_offc_lst._paper_article_list');
    
    if (articleListContainer.length === 0) {
      return NextResponse.json(
        { 
          error: '신문 기사 목록을 찾을 수 없습니다.',
          debug: [`URL: ${url}`, `HTML 길이: ${html.length}`, `컨테이너 셀렉터를 찾지 못했습니다.`],
          url: url
        },
        { status: 404 }
      );
    }

    // 각 '면' 블록 찾기: div.newspaper_brick_item
    articleListContainer.find('div.newspaper_brick_item').each((_, element) => {
      const $element = $(element);

      // 면 번호 추출: 다양한 형식 지원 ("1면", "A1", "A1면", "1 면" 등)
      // 실제 구조: <h3><span class="page_notation"><em>1</em>면</span></h3>
      // 또는: <h3><span class="page_notation">A1</span></h3>
      // 또는: <h3><span class="page_notation">A1면</span></h3>
      let pageNotation = '';
      
      // 방법 1: span.page_notation의 전체 텍스트 (가장 정확)
      const pageNotationSpan = $element.find('h3 > span.page_notation');
      if (pageNotationSpan.length > 0) {
        // span 내부의 모든 텍스트를 가져옴 (em 태그 포함)
        pageNotation = pageNotationSpan.text().trim();
        
        // 만약 em 태그가 있고 나머지 텍스트가 있으면 조합
        if (!pageNotation) {
          const pageEm = pageNotationSpan.find('em').text().trim();
          const remainingText = pageNotationSpan.clone().children().remove().end().text().trim();
          if (pageEm && remainingText) {
            pageNotation = pageEm + remainingText;
          } else if (pageEm) {
            pageNotation = pageEm;
          } else if (remainingText) {
            pageNotation = remainingText;
          }
        }
      }
      
      // 방법 2: h3의 전체 텍스트 (span이 없는 경우)
      if (!pageNotation) {
        const h3Text = $element.find('h3').text().trim();
        if (h3Text) {
          pageNotation = h3Text;
        }
      }
      
      // 방법 3: 다른 선택자 시도 (더 넓은 범위)
      if (!pageNotation) {
        // h3 내부의 모든 텍스트
        const h3AllText = $element.find('h3').first().text().trim();
        if (h3AllText) {
          pageNotation = h3AllText;
        }
      }
      
      // 면 번호 정규화 (공백 제거, 통일)
      if (pageNotation) {
        pageNotation = pageNotation.trim().replace(/\s+/g, '');
      }
      
      // 면 번호가 없으면 스킵
      if (!pageNotation) {
        return;
      }

      // 해당 면의 기사 목록
      const articles: Article[] = [];

      // ul.newspaper_article_lst > li를 모두 찾아 반복
      $element.find('ul.newspaper_article_lst > li').each((_, liElement) => {
        const $li = $(liElement);
        const $link = $li.find('a');

        // 링크 추출
        let link = $link.attr('href') || '';
        
        // 상대 경로인 경우 절대 경로로 변환
        if (link && link.startsWith('/')) {
          link = `https://news.naver.com${link}`;
        }
        
        // news.naver.com 링크만 수집
        if (!link || (!link.includes('news.naver.com') && !link.includes('/article/'))) {
          return;
        }

        // 제목 추출: a > strong 또는 a > div.newspaper_txt_box > strong
        // 실제 구조: <a><strong>제목</strong></a> 또는 <a><div class="newspaper_txt_box"><strong>제목</strong></div></a>
        let title = $link.find('div.newspaper_txt_box > strong').text().trim();
        if (!title) {
          title = $link.find('strong').text().trim();
        }
        if (!title) {
          // title_only 클래스가 있는 경우 직접 텍스트
          title = $link.text().trim();
        }

        // 링크와 제목이 모두 있을 때만 추가
        if (link && title && title.length > 0) {
          articles.push({
            title,
            link,
          });
        }
      });

      // 해당 면에 기사가 있으면 결과에 추가
      if (articles.length > 0) {
        result[pageNotation] = articles;
      }
    });

    // 결과가 비어있으면 오류 반환 (디버깅 정보 포함)
    if (Object.keys(result).length === 0) {
      const debugInfo = [
        `URL: ${url}`,
        `HTML 길이: ${html.length}`,
        `컨테이너 요소 개수: ${articleListContainer.length}`,
        `면 블록 개수: ${articleListContainer.find('div.newspaper_brick_item').length}`
      ];
      
      return NextResponse.json(
        { 
          error: '추출된 기사가 없습니다.',
          debug: debugInfo,
          url: url
        },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('스크레이핑 오류:', error);
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

