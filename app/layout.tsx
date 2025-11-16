import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Naver News Scraper',
  description: 'Naver 뉴스 스크레이핑 API',
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

