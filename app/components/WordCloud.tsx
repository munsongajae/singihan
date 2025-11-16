'use client';

import { useEffect, useRef } from 'react';

interface WordCloudProps {
  words: Array<{ text: string; size: number }>;
  width?: number;
  height?: number;
}

export default function WordCloud({ words, width = 800, height = 400 }: WordCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || words.length === 0 || typeof window === 'undefined') return;

    const canvas = canvasRef.current;
    
    // Canvas 크기를 제한하여 메모리 오류 방지 (최대 1024x512)
    const maxWidth = 1024;
    const maxHeight = 512;
    const actualWidth = Math.min(width, maxWidth);
    const actualHeight = Math.min(height, maxHeight);
    
    // Canvas 크기를 명시적으로 설정
    canvas.width = actualWidth;
    canvas.height = actualHeight;

    // wordcloud는 브라우저에서만 동작하므로 동적으로 로드
    import('wordcloud').then((wordcloudModule) => {
      if (!canvasRef.current) return;

      // wordcloud 라이브러리 초기화 (default export 또는 named export 확인)
      const wordcloud = (wordcloudModule as any).default || wordcloudModule;
      
      // Canvas 컨텍스트 확인
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Canvas context를 가져올 수 없습니다.');
        return;
      }

      // Canvas 초기화 (배경색 설정)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, actualWidth, actualHeight);

      // wordcloud 옵션 설정 (메모리 최적화)
      const options = {
        list: words.map(w => [w.text, w.size]),
        gridSize: 8, // gridSize를 줄여서 메모리 사용량 감소
        weightFactor: function (size: number) {
          // weightFactor를 줄여서 텍스트 크기 제한
          return Math.pow(size, 1.5) * (actualWidth / 1024) * 10;
        },
        fontFamily: 'Arial, sans-serif',
        color: function () {
          // 다양한 색상 생성
          const colors = [
            '#0066cc', '#28a745', '#dc3545', '#ffc107', '#17a2b8',
            '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6610f2'
          ];
          return colors[Math.floor(Math.random() * colors.length)];
        },
        rotateRatio: 0.3,
        rotationSteps: 2,
        backgroundColor: '#ffffff',
        drawOutOfBound: false,
        shrinkToFit: true,
        minSize: 0,
        // 메모리 최적화를 위한 추가 옵션
        ellipticity: 0.65,
        drawMask: false,
      };

      try {
        wordcloud(canvas, options);
      } catch (err) {
        console.error('워드 클라우드 생성 실패:', err);
      }
    }).catch((err) => {
      console.error('워드 클라우드 로드 실패:', err);
    });
  }, [words, width, height]);

  if (words.length === 0) {
    return (
      <div style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        color: '#999'
      }}>
        워드 클라우드를 생성할 단어가 없습니다.
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      padding: '1rem',
      backgroundColor: '#fff',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          maxWidth: '100%',
          height: 'auto'
        }}
      />
    </div>
  );
}

