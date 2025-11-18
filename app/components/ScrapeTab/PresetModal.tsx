'use client';

import React from 'react';
import { findPressById, type PressInfo } from '../../data/pressList';
import type { Preset } from '../../types/news';
import { Modal, Button, Input, EmptyState } from '../ui';

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: Preset[];
  selectedPresses: PressInfo[];
  presetName: string;
  onPresetNameChange: (name: string) => void;
  onSavePreset: () => void;
  onLoadPreset: (preset: Preset) => void;
  onDeletePreset: (presetId: string) => void;
}

export default function PresetModal({
  isOpen,
  onClose,
  presets,
  selectedPresses,
  presetName,
  onPresetNameChange,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}: PresetModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="프리셋 관리"
    >
      {selectedPresses.length > 0 && (
        <div style={{
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '600',
            marginBottom: '0.75rem',
            color: '#333'
          }}>
            현재 선택된 언론사 저장
          </h3>
          <div style={{
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            color: '#666'
          }}>
            선택된 언론사: {selectedPresses.map(p => p.name).join(', ')}
          </div>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            <Input
              type="text"
              placeholder="프리셋 이름 입력..."
              value={presetName}
              onChange={(e) => onPresetNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSavePreset();
                }
              }}
              fullWidth
            />
            <Button
              type="button"
              onClick={onSavePreset}
              variant="success"
              size="md"
            >
              저장
            </Button>
          </div>
        </div>
      )}

      <div>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: '600',
          marginBottom: '0.75rem',
          color: '#333'
        }}>
          저장된 프리셋 ({presets.length}개)
        </h3>
        {presets.length === 0 ? (
          <EmptyState message="저장된 프리셋이 없습니다." />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            {presets.map((preset) => {
              const presetPresses = preset.pressIds
                .map(id => findPressById(id))
                .filter(Boolean) as PressInfo[];

              return (
                <div
                  key={preset.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: '600',
                      marginBottom: '0.25rem',
                      color: '#333'
                    }}>
                      {preset.name}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#666'
                    }}>
                      {presetPresses.length}개 언론사: {presetPresses.map(p => p.name).join(', ')}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#999',
                      marginTop: '0.25rem'
                    }}>
                      {new Date(preset.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem'
                  }}>
                    <Button
                      type="button"
                      onClick={() => onLoadPreset(preset)}
                      variant="primary"
                      size="sm"
                    >
                      불러오기
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onDeletePreset(preset.id)}
                      variant="danger"
                      size="sm"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

