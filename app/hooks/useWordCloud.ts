import { useMemo } from 'react';
import type { ScrapeResult } from '../types/news';

interface WordCloudWord {
  text: string;
  size: number;
}

const STOP_WORDS = new Set([
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
  '포토뉴스', '동정', '지원', '논란', '단독', '개최', '추진', '협력', '강화',
  '글로벌', '협력',
]);

export function useWordCloud(result: Record<string, ScrapeResult> | null): WordCloudWord[] {
  return useMemo(() => {
    if (!result) return [];

    const allTitles: string[] = [];
    for (const pressResult of Object.values(result)) {
      for (const articles of Object.values(pressResult)) {
        for (const article of articles) {
          allTitles.push(article.title);
        }
      }
    }

    const wordCount: Record<string, number> = {};

    allTitles.forEach(title => {
      const words = title.match(/[가-힣]{2,}|[A-Za-z]{3,}/g) || [];

      words.forEach(word => {
        const lowerWord = word.toLowerCase();
        if (!STOP_WORDS.has(word) && !STOP_WORDS.has(lowerWord) && word.length >= 2) {
          wordCount[word] = (wordCount[word] || 0) + 1;
        }
      });
    });

    const sortedWords = Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50)
      .map(([text, count]) => ({
        text,
        size: count
      }));

    return sortedWords;
  }, [result]);
}

