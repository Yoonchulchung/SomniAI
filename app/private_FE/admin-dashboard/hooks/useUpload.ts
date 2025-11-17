'use client';

import { useState } from 'react';
import { uploadApi } from '@/lib/api';
import type { UploadType, UploadResponse } from '@/types';

export interface UploadState {
  loading: boolean;
  error: string | null;
  success: boolean;
  response: UploadResponse | null;
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    loading: false,
    error: null,
    success: false,
    response: null,
  });

  const upload = async (files: File[], type: UploadType): Promise<UploadResponse | null> => {
    try {
      setState({ loading: true, error: null, success: false, response: null });

      const uploadFn = type === 'air' ? uploadApi.uploadAir : uploadApi.uploadSide;
      const response = await uploadFn(files);

      setState({ loading: false, error: null, success: true, response });
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '업로드에 실패했습니다.';
      setState({ loading: false, error: errorMessage, success: false, response: null });
      return null;
    }
  };

  const uploadAir = async (files: File[]): Promise<UploadResponse | null> => {
    return upload(files, 'air');
  };

  const uploadSide = async (files: File[]): Promise<UploadResponse | null> => {
    return upload(files, 'side');
  };

  const reset = () => {
    setState({ loading: false, error: null, success: false, response: null });
  };

  return {
    ...state,
    upload,
    uploadAir,
    uploadSide,
    reset,
  };
}
