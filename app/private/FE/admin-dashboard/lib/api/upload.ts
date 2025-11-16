import { apiClient } from './client';
import type { UploadResponse } from '@/types';

export const uploadApi = {
  /**
   * 공중 뷰 이미지 업로드
   */
  uploadAir: async (files: File[]): Promise<UploadResponse> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return apiClient.uploadFile<UploadResponse>('/upload-air', formData);
  },

  /**
   * 측면 뷰 이미지 업로드
   */
  uploadSide: async (files: File[]): Promise<UploadResponse> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return apiClient.uploadFile<UploadResponse>('/upload-side', formData);
  },
};
