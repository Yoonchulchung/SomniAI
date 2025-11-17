import { apiClient } from './client';
import type { HealthStatus, ModelInfo, ModelStats } from '@/types';

export const healthApi = {
  /**
   * 서버 상태 확인
   */
  health: async (): Promise<HealthStatus> => {
    return apiClient.get<HealthStatus>('/health');
  },

  /**
   * Ping 테스트
   */
  ping: async (): Promise<{ message: string }> => {
    return apiClient.get('/ping');
  },

  /**
   * 모델 정보 조회
   */
  getModelInfo: async (): Promise<ModelInfo> => {
    return apiClient.get<ModelInfo>('/model/info');
  },

  /**
   * 모델 통계 조회
   */
  getModelStats: async (): Promise<ModelStats> => {
    return apiClient.get<ModelStats>('/model/stats');
  },

  /**
   * 모델 재로드
   */
  reloadModel: async (model_type: 'side' | 'air' | 'all', config_path?: string): Promise<{ message: string }> => {
    return apiClient.post('/model/reload', { model_type, config_path });
  },
};
