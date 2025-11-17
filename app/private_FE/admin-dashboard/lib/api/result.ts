import { apiClient } from './client';
import type { SideResult, AirResult } from '@/types';

export const resultApi = {
  /**
   * 측면 뷰 분석 결과 조회
   */
  getSideResult: async (): Promise<SideResult> => {
    return apiClient.get<SideResult>('/result-side-json');
  },

  /**
   * 공중 뷰 분석 결과 조회
   */
  getAirResult: async (): Promise<AirResult> => {
    return apiClient.get<AirResult>('/result-air-json');
  },
};
