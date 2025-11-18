'use client';

import { useState } from 'react';
import ScrapeTab from './ScrapeTab/ScrapeTab';
import SearchTab from './SearchTab/SearchTab';

export default function NewsScraper() {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<'scrape' | 'search'>('scrape');

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem 1rem'
    }}>
      {/* 헤더 */}
      <div style={{
        textAlign: 'center',
        marginBottom: '3rem'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '800',
            margin: 0,
            lineHeight: '1.4',
            display: 'inline-block',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif',
            letterSpacing: '-0.02em'
          }}>
            <span style={{ 
              fontSize: '2.5rem', 
              fontWeight: '800',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              display: 'inline-block',
              letterSpacing: '0.02em'
            }}>신</span>
            <span style={{ 
              fontSize: '1.2rem', 
              fontWeight: '500', 
              color: '#6b7280',
              letterSpacing: '0.01em'
            }}>문 </span>
            <span style={{ 
              fontSize: '2.5rem', 
              fontWeight: '800',
              background: 'linear-gradient(135deg, #f093fb 0%, #4facfe 50%, #00f2fe 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              display: 'inline-block',
              letterSpacing: '0.02em'
            }}>기</span>
            <span style={{ 
              fontSize: '1.2rem', 
              fontWeight: '500', 
              color: '#6b7280',
              letterSpacing: '0.01em'
            }}>사 </span>
            <span style={{ 
              fontSize: '2.5rem', 
              fontWeight: '800',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 50%, #43e97b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              display: 'inline-block',
              letterSpacing: '0.02em'
            }}>한</span>
            <span style={{ 
              fontSize: '1.2rem', 
              fontWeight: '500', 
              color: '#6b7280',
              letterSpacing: '0.01em'
            }}>눈에 보기</span>
          </h1>
        </div>
        <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.6', marginTop: '0.5rem' }}>
          여러 언론사의 신문 기사를 면별로 모아보고, 키워드 분석과 트렌드를 한눈에 파악하세요
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div style={{
        marginBottom: '1.5rem',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('scrape')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'scrape' ? '#007bff' : 'transparent',
              color: activeTab === 'scrape' ? '#fff' : '#666',
              border: 'none',
              borderBottom: activeTab === 'scrape' ? '3px solid #007bff' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: activeTab === 'scrape' ? '600' : '500',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            📰 신문 수집
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'search' ? '#007bff' : 'transparent',
              color: activeTab === 'search' ? '#fff' : '#666',
              border: 'none',
              borderBottom: activeTab === 'search' ? '3px solid #007bff' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: activeTab === 'search' ? '600' : '500',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            🔍 뉴스 키워드 검색
          </button>
        </div>
      </div>

      {/* 신문 수집 탭 */}
      {activeTab === 'scrape' && <ScrapeTab />}

      {/* 뉴스 키워드 검색 탭 */}
      {activeTab === 'search' && <SearchTab />}
    </div>
  );
}
