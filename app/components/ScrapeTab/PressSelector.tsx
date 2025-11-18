'use client';

import React from 'react';
import { newspaperPressList, findPressById, type PressInfo } from '../../data/pressList';
import { Button, Input } from '../ui';

interface PressSelectorProps {
  selectedPresses: PressInfo[];
  onTogglePress: (press: PressInfo) => void;
  onToggleCategory: (category: string) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onShowPresetModal: () => void;
}

export default function PressSelector({
  selectedPresses,
  onTogglePress,
  onToggleCategory,
  searchTerm,
  onSearchTermChange,
  onShowPresetModal,
}: PressSelectorProps) {
  const filtered = newspaperPressList.filter(press => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      press.name.toLowerCase().includes(term) ||
      press.id.includes(term) ||
      press.category.toLowerCase().includes(term)
    );
  });

  const grouped = filtered.reduce((acc, press) => {
    if (!acc[press.category]) {
      acc[press.category] = [];
    }
    acc[press.category].push(press);
    return acc;
  }, {} as Record<string, typeof newspaperPressList>);

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <label
          style={{
            fontWeight: '500',
            color: '#333',
            margin: 0
          }}
        >
          언론사 선택 *
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            type="button"
            onClick={onShowPresetModal}
            variant="info"
            size="sm"
          >
            ⭐ 프리셋 관리
          </Button>
          {selectedPresses.length > 0 && (
            <Button
              type="button"
              onClick={() => {
                onShowPresetModal();
              }}
              variant="success"
              size="sm"
            >
              💾 현재 선택 저장
            </Button>
          )}
        </div>
      </div>

      <Input
        type="text"
        placeholder="언론사 검색..."
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        fullWidth
        style={{ marginBottom: '1rem' }}
      />

      <div style={{
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: '1rem',
        backgroundColor: '#fafafa',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
            검색 결과가 없습니다.
          </div>
        ) : (
          Object.entries(grouped).map(([category, presses]) => {
            const categorySelectedCount = presses.filter(press =>
              selectedPresses.some(p => p.id === press.id)
            ).length;
            const isCategoryFullySelected = categorySelectedCount === presses.length;
            const isCategoryPartiallySelected = categorySelectedCount > 0 && !isCategoryFullySelected;

            return (
              <div key={category} style={{ marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => onToggleCategory(category)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: isCategoryFullySelected
                      ? '#0066cc'
                      : isCategoryPartiallySelected
                      ? '#b3d9ff'
                      : '#f0f0f0',
                    color: isCategoryFullySelected || isCategoryPartiallySelected
                      ? '#fff'
                      : '#555',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    borderRadius: '4px',
                    marginBottom: '0.75rem',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCategoryFullySelected) {
                      e.currentTarget.style.backgroundColor = isCategoryPartiallySelected
                        ? '#99ccff'
                        : '#e0e0e0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isCategoryFullySelected
                      ? '#0066cc'
                      : isCategoryPartiallySelected
                      ? '#b3d9ff'
                      : '#f0f0f0';
                  }}
                >
                  <span>
                    {category}
                    {isCategoryPartiallySelected && ` (${categorySelectedCount}/${presses.length})`}
                    {isCategoryFullySelected && ' (전체 선택됨)'}
                  </span>
                  <span style={{ fontSize: '0.8rem' }}>
                    {isCategoryFullySelected ? '✓' : isCategoryPartiallySelected ? '◐' : '○'}
                  </span>
                </button>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  {presses.map((press) => {
                    const isSelected = selectedPresses.some(p => p.id === press.id);
                    return (
                      <button
                        key={press.id}
                        type="button"
                        onClick={() => onTogglePress(press)}
                        style={{
                          padding: '0.6rem 1rem',
                          border: isSelected
                            ? '2px solid #0066cc'
                            : '1px solid #ddd',
                          borderRadius: '6px',
                          backgroundColor: isSelected
                            ? '#0066cc'
                            : '#fff',
                          color: isSelected
                            ? '#fff'
                            : '#333',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: isSelected ? '600' : '400',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = '#f0f0f0';
                            e.currentTarget.style.borderColor = '#bbb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = '#fff';
                            e.currentTarget.style.borderColor = '#ddd';
                          }
                        }}
                      >
                        {press.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedPresses.length > 0 && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          backgroundColor: '#e6f2ff',
          borderRadius: '6px',
          fontSize: '0.9rem',
          color: '#0066cc'
        }}>
          <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
            선택된 언론사 ({selectedPresses.length}개):
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {selectedPresses.map((press) => (
              <span
                key={press.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  fontSize: '0.85rem'
                }}
              >
                <strong>{press.name}</strong>
                <span style={{ color: '#999', fontSize: '0.8rem' }}>
                  ({press.category})
                </span>
                <button
                  type="button"
                  onClick={() => onTogglePress(press)}
                  style={{
                    marginLeft: '0.25rem',
                    padding: '0 0.25rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#cc0000',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}
                  title="선택 해제"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
        신문보기 가능한 언론사만 표시됩니다
      </small>
    </div>
  );
}

