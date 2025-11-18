'use client';

import React from 'react';
import { Button, Input, Checkbox } from '../ui';

interface ScrapeFormProps {
  date: string;
  onDateChange: (date: string) => void;
  onlyFirstPage: boolean;
  onOnlyFirstPageChange: (value: boolean) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  getTodayDate: () => string;
}

export default function ScrapeForm({
  date,
  onDateChange,
  onlyFirstPage,
  onOnlyFirstPageChange,
  loading,
  onSubmit,
  getTodayDate,
}: ScrapeFormProps) {
  return (
    <>
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'flex-end'
      }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label
            htmlFor="date"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333'
            }}
          >
            날짜 (선택)
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            max={getTodayDate().slice(0, 4) + '-' + getTodayDate().slice(4, 6) + '-' + getTodayDate().slice(6, 8)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
          <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
            날짜를 선택하지 않으면 최신 신문을 가져옵니다
          </small>
        </div>

        <div style={{ flex: '1', minWidth: '200px' }}>
          <Checkbox
            checked={onlyFirstPage}
            onChange={(e) => onOnlyFirstPageChange(e.target.checked)}
            label="1면/A1 추출"
            style={{
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: '#fff',
            }}
          />
          <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block', paddingLeft: '0.75rem' }}>
            체크 시 1면과 A1 기사만 추출합니다
          </small>
        </div>

        <div>
          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            size="md"
            style={{
              whiteSpace: 'nowrap',
              height: 'fit-content'
            }}
          >
            {loading ? '추출 중...' : '기사 추출'}
          </Button>
        </div>
      </div>
    </>
  );
}

