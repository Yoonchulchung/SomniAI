'use client';

import { useState, useEffect } from 'react';
import { healthApi } from '@/lib/api';
import type { ModelInfo, ModelStats, HealthStatus } from '@/types';

export function useModelInfo() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [info, stats, health] = await Promise.all([
        healthApi.getModelInfo().catch(() => null),
        healthApi.getModelStats().catch(() => null),
        healthApi.health().catch(() => null),
      ]);

      setModelInfo(info);
      setModelStats(stats);
      setHealthStatus(health);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const reloadModel = async (model_type: 'side' | 'air' | 'all', config_path?: string) => {
    try {
      setError(null);
      await healthApi.reloadModel(model_type, config_path);
      // 모델 재로드 후 정보 다시 가져오기
      await fetchData();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '모델 재로드에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    modelInfo,
    modelStats,
    healthStatus,
    loading,
    error,
    refetch: fetchData,
    reloadModel,
  };
}
