# 신기한 앱 - 신문 기사 한눈에 보기

여러 언론사의 신문 기사를 면별로 모아보고, 키워드 분석과 트렌드를 한눈에 파악하는 똑똑한 뉴스 플랫폼입니다.

## 주요 기능

- 📰 **신문 기사 스크레이핑**: 여러 언론사의 신문 기사를 면별로 추출
- 🔍 **네이버 뉴스 키워드 검색**: 네이버 검색 API를 활용한 실시간 뉴스 검색
- 📊 **워드 클라우드**: 기사 키워드 시각화
- 🔎 **기사 검색**: 추출된 기사 내에서 키워드 검색
- ⭐ **프리셋 관리**: 자주 사용하는 언론사 조합 저장 및 불러오기
- 📤 **결과 내보내기**: CSV, JSON 형식으로 데이터 내보내기

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# 네이버 검색 API 인증 정보
# 네이버 개발자 센터(https://developers.naver.com)에서 발급받은 정보를 입력하세요

NAVER_CLIENT_ID=your_client_id_here
NAVER_CLIENT_SECRET=your_client_secret_here
```

### 3. 네이버 API 키 발급 방법

1. [네이버 개발자 센터](https://developers.naver.com)에 접속하여 로그인
2. 상단 메뉴에서 'Application' → '애플리케이션 등록' 클릭
3. 애플리케이션 정보 입력:
   - 애플리케이션 이름: 원하는 이름 입력
   - 사용 API: **검색** 선택
   - 비로그인 오픈 API 서비스 환경: **WEB** 선택
   - 웹 서비스 URL: `http://localhost:3000` (로컬 개발 시)
4. 등록 완료 후 발급받은 **Client ID**와 **Client Secret**을 `.env.local` 파일에 입력

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 빌드

```bash
npm run build
npm start
```

## 기술 스택

- **Next.js 14** (App Router)
- **TypeScript**
- **React**
- **Cheerio** (HTML 파싱)
- **Wordcloud** (키워드 시각화)
- **네이버 검색 API**

## 주요 파일 구조

```
week1/
├── app/
│   ├── api/
│   │   ├── scrape/          # 신문 기사 스크레이핑 API
│   │   └── search-news/     # 네이버 뉴스 검색 API
│   ├── components/
│   │   ├── NewsScraper.tsx  # 메인 컴포넌트
│   │   └── WordCloud.tsx    # 워드 클라우드 컴포넌트
│   └── data/
│       └── pressList.ts     # 언론사 목록 데이터
└── types/
    └── wordcloud.d.ts       # WordCloud 타입 선언
```

## 사용 방법

### 신문 기사 스크레이핑

1. 언론사 선택 (복수 선택 가능)
2. 날짜 선택 (선택 사항, 미선택 시 최신 신문)
3. "1면/A1 추출" 옵션 선택 (선택 사항)
4. "기사 추출" 버튼 클릭

### 네이버 뉴스 검색

1. "🔍 네이버 뉴스 키워드 검색" 섹션에서 "검색하기" 버튼 클릭
2. 검색할 키워드 입력 (예: 인공지능, 경제, 정치 등)
3. "검색" 버튼 클릭
4. 검색 결과 확인 및 원문 보기

### 워드 클라우드

1. 기사 추출 후 "워드 클라우드 보기" 버튼 클릭
2. 기사 제목에서 추출한 주요 키워드 시각화 확인

## 라이선스

MIT

