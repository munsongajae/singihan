// Naver 뉴스 언론사 목록
// HTML 소스에서 추출한 언론사 정보

export interface PressInfo {
  id: string;
  name: string;
  category: string;
  hasNewspaper: boolean; // 신문보기 가능 여부
}

export const pressList: PressInfo[] = [
  // 종합
  { id: '032', name: '경향신문', category: '종합', hasNewspaper: true },
  { id: '005', name: '국민일보', category: '종합', hasNewspaper: true },
  { id: '020', name: '동아일보', category: '종합', hasNewspaper: true },
  { id: '021', name: '문화일보', category: '종합', hasNewspaper: true },
  { id: '081', name: '서울신문', category: '종합', hasNewspaper: true },
  { id: '022', name: '세계일보', category: '종합', hasNewspaper: true },
  { id: '023', name: '조선일보', category: '종합', hasNewspaper: true },
  { id: '025', name: '중앙일보', category: '종합', hasNewspaper: true },
  { id: '028', name: '한겨레', category: '종합', hasNewspaper: true },
  { id: '469', name: '한국일보', category: '종합', hasNewspaper: true },
  
  // 방송/통신
  { id: '421', name: '뉴스1', category: '방송/통신', hasNewspaper: false },
  { id: '003', name: '뉴시스', category: '방송/통신', hasNewspaper: false },
  { id: '001', name: '연합뉴스', category: '방송/통신', hasNewspaper: false },
  { id: '422', name: '연합뉴스TV', category: '방송/통신', hasNewspaper: false },
  { id: '449', name: '채널A', category: '방송/통신', hasNewspaper: false },
  { id: '215', name: '한국경제TV', category: '방송/통신', hasNewspaper: false },
  { id: '437', name: 'JTBC', category: '방송/통신', hasNewspaper: false },
  { id: '056', name: 'KBS', category: '방송/통신', hasNewspaper: false },
  { id: '214', name: 'MBC', category: '방송/통신', hasNewspaper: false },
  { id: '057', name: 'MBN', category: '방송/통신', hasNewspaper: false },
  { id: '055', name: 'SBS', category: '방송/통신', hasNewspaper: false },
  { id: '374', name: 'SBS Biz', category: '방송/통신', hasNewspaper: false },
  { id: '448', name: 'TV조선', category: '방송/통신', hasNewspaper: false },
  { id: '052', name: 'YTN', category: '방송/통신', hasNewspaper: false },
  
  // 경제
  { id: '009', name: '매일경제', category: '경제', hasNewspaper: true },
  { id: '008', name: '머니투데이', category: '경제', hasNewspaper: true },
  { id: '648', name: '비즈워치', category: '경제', hasNewspaper: false },
  { id: '011', name: '서울경제', category: '경제', hasNewspaper: true },
  { id: '277', name: '아시아경제', category: '경제', hasNewspaper: true },
  { id: '018', name: '이데일리', category: '경제', hasNewspaper: true },
  { id: '366', name: '조선비즈', category: '경제', hasNewspaper: false },
  { id: '123', name: '조세일보', category: '경제', hasNewspaper: false },
  { id: '014', name: '파이낸셜뉴스', category: '경제', hasNewspaper: true },
  { id: '015', name: '한국경제', category: '경제', hasNewspaper: true },
  { id: '016', name: '헤럴드경제', category: '경제', hasNewspaper: true },
  
  // 인터넷
  { id: '079', name: '노컷뉴스', category: '인터넷', hasNewspaper: false },
  { id: '629', name: '더팩트', category: '인터넷', hasNewspaper: false },
  { id: '119', name: '데일리안', category: '인터넷', hasNewspaper: false },
  { id: '417', name: '머니S', category: '인터넷', hasNewspaper: false },
  { id: '006', name: '미디어오늘', category: '인터넷', hasNewspaper: false },
  { id: '031', name: '아이뉴스24', category: '인터넷', hasNewspaper: false },
  { id: '047', name: '오마이뉴스', category: '인터넷', hasNewspaper: false },
  { id: '002', name: '프레시안', category: '인터넷', hasNewspaper: false },
  
  // IT
  { id: '138', name: '디지털데일리', category: 'IT', hasNewspaper: false },
  { id: '029', name: '디지털타임스', category: 'IT', hasNewspaper: true },
  { id: '293', name: '블로터', category: 'IT', hasNewspaper: false },
  { id: '030', name: '전자신문', category: 'IT', hasNewspaper: true },
  { id: '092', name: '지디넷코리아', category: 'IT', hasNewspaper: false },
  
  // 매거진
  { id: '665', name: '더스쿠프', category: '매거진', hasNewspaper: false },
  { id: '145', name: '레이디경향', category: '매거진', hasNewspaper: false },
  { id: '024', name: '매경이코노미', category: '매거진', hasNewspaper: false },
  { id: '308', name: '시사IN', category: '매거진', hasNewspaper: false },
  { id: '586', name: '시사저널', category: '매거진', hasNewspaper: false },
  { id: '262', name: '신동아', category: '매거진', hasNewspaper: false },
  { id: '094', name: '월간 산', category: '매거진', hasNewspaper: false },
  { id: '243', name: '이코노미스트', category: '매거진', hasNewspaper: false },
  { id: '033', name: '주간경향', category: '매거진', hasNewspaper: false },
  { id: '037', name: '주간동아', category: '매거진', hasNewspaper: false },
  { id: '053', name: '주간조선', category: '매거진', hasNewspaper: false },
  { id: '353', name: '중앙SUNDAY', category: '매거진', hasNewspaper: true },
  { id: '036', name: '한겨레21', category: '매거진', hasNewspaper: false },
  { id: '050', name: '한경비즈니스', category: '매거진', hasNewspaper: false },
  
  // 전문지
  { id: '127', name: '기자협회보', category: '전문지', hasNewspaper: false },
  { id: '662', name: '농민신문', category: '전문지', hasNewspaper: false },
  { id: '607', name: '뉴스타파', category: '전문지', hasNewspaper: false },
  { id: '584', name: '동아사이언스', category: '전문지', hasNewspaper: false },
  { id: '310', name: '여성신문', category: '전문지', hasNewspaper: false },
  { id: '007', name: '일다', category: '전문지', hasNewspaper: false },
  { id: '640', name: '코리아중앙데일리', category: '전문지', hasNewspaper: true },
  { id: '044', name: '코리아헤럴드', category: '전문지', hasNewspaper: true },
  { id: '296', name: '코메디닷컴', category: '전문지', hasNewspaper: false },
  { id: '346', name: '헬스조선', category: '전문지', hasNewspaper: false },
  
  // 지역
  { id: '654', name: '강원도민일보', category: '지역', hasNewspaper: true },
  { id: '087', name: '강원일보', category: '지역', hasNewspaper: true },
  { id: '666', name: '경기일보', category: '지역', hasNewspaper: true },
  { id: '658', name: '국제신문', category: '지역', hasNewspaper: true },
  { id: '657', name: '대구MBC', category: '지역', hasNewspaper: false },
  { id: '656', name: '대전일보', category: '지역', hasNewspaper: true },
  { id: '088', name: '매일신문', category: '지역', hasNewspaper: true },
  { id: '082', name: '부산일보', category: '지역', hasNewspaper: true },
  { id: '659', name: '전주MBC', category: '지역', hasNewspaper: false },
  { id: '655', name: 'CJB청주방송', category: '지역', hasNewspaper: false },
  { id: '661', name: 'JIBS', category: '지역', hasNewspaper: false },
  { id: '660', name: 'kbc광주방송', category: '지역', hasNewspaper: false },
  
  // 포토
  { id: '348', name: '신화사 연합뉴스', category: '포토', hasNewspaper: false },
  { id: '077', name: 'AP연합뉴스', category: '포토', hasNewspaper: false },
  { id: '091', name: 'EPA연합뉴스', category: '포토', hasNewspaper: false },
];

// 카테고리별로 그룹화
export const pressListByCategory = pressList.reduce((acc, press) => {
  if (!acc[press.category]) {
    acc[press.category] = [];
  }
  acc[press.category].push(press);
  return acc;
}, {} as Record<string, PressInfo[]>);

// 신문보기 가능한 언론사만 필터링
export const newspaperPressList = pressList.filter(press => press.hasNewspaper);

// ID로 언론사 찾기
export function findPressById(id: string): PressInfo | undefined {
  return pressList.find(press => press.id === id);
}

// 이름으로 언론사 찾기
export function findPressByName(name: string): PressInfo | undefined {
  return pressList.find(press => press.name === name);
}

