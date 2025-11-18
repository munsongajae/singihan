import { useState, useEffect } from 'react';
import type { Preset } from '../types/news';
import { findPressById, type PressInfo } from '../data/pressList';

const PRESETS_STORAGE_KEY = 'newsScraperPresets';

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showPresetModal, setShowPresetModal] = useState(false);

  // 프리셋 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (savedPresets) {
        try {
          setPresets(JSON.parse(savedPresets));
        } catch (err) {
          console.error('프리셋 로드 실패:', err);
        }
      }
    }
  }, []);

  // 프리셋 저장
  const savePreset = (selectedPresses: PressInfo[]) => {
    if (!presetName.trim() || selectedPresses.length === 0) {
      alert('프리셋 이름을 입력하고 언론사를 선택해주세요.');
      return false;
    }

    const newPreset: Preset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      pressIds: selectedPresses.map(p => p.id),
      createdAt: Date.now()
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);

    if (typeof window !== 'undefined') {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updatedPresets));
    }

    setPresetName('');
    setShowPresetModal(false);
    alert('프리셋이 저장되었습니다.');
    return true;
  };

  // 프리셋 불러오기
  const loadPreset = (preset: Preset): PressInfo[] | null => {
    const presses = preset.pressIds
      .map(id => findPressById(id))
      .filter(Boolean) as PressInfo[];

    if (presses.length > 0) {
      setShowPresetModal(false);
      return presses;
    } else {
      alert('프리셋에 유효한 언론사가 없습니다.');
      return null;
    }
  };

  // 프리셋 삭제
  const deletePreset = (presetId: string) => {
    if (!confirm('이 프리셋을 삭제하시겠습니까?')) return;

    const updatedPresets = presets.filter(p => p.id !== presetId);
    setPresets(updatedPresets);

    if (typeof window !== 'undefined') {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updatedPresets));
    }
  };

  return {
    presets,
    presetName,
    setPresetName,
    showPresetModal,
    setShowPresetModal,
    savePreset,
    loadPreset,
    deletePreset,
  };
}

