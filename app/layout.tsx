import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '신기한 앱 - 신문 기사 한눈에 보기',
  description: '여러 언론사의 신문 기사를 면별로 한눈에 모아보고, 키워드 분석과 트렌드를 파악하는 똑똑한 뉴스 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

