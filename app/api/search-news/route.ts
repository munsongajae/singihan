import { NextRequest, NextResponse } from 'next/server';

interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

interface NaverNewsResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverNewsItem[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const display = searchParams.get('display') || '10';
    const start = searchParams.get('start') || '1';
    const sort = searchParams.get('sort') || 'sim'; // sim: 정확도순, date: 날짜순

    // query는 필수 파라미터
    if (!query) {
      return NextResponse.json(
        { error: 'query 파라미터가 필요합니다.' },
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

    // 검색어를 URL 인코딩
    const encodedQuery = encodeURIComponent(query);
    
    // 네이버 뉴스 검색 API URL 구성
    const apiUrl = `https://openapi.naver.com/v1/search/news.json?query=${encodedQuery}&display=${display}&start=${start}&sort=${sort}`;

    // 네이버 API 호출
    const response = await fetch(apiUrl, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { 
          error: `네이버 API 호출 실패: ${response.status} ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data: NaverNewsResponse = await response.json();

    // HTML 태그 제거 및 정리
    const cleanedItems = data.items.map((item) => ({
      title: item.title.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      link: item.link,
      originallink: item.originallink,
      description: item.description.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      pubDate: item.pubDate,
    }));

    return NextResponse.json({
      total: data.total,
      start: data.start,
      display: data.display,
      items: cleanedItems,
    });
  } catch (error) {
    console.error('뉴스 검색 오류:', error);
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

