'use client';

import { useState, useEffect } from 'react';
import { resultApi } from '@/lib/api';
import type { SideResult, AirResult } from '@/types';

export function useResults() {
  const [sideResult, setSideResult] = useState<SideResult | null>(null);
  const [airResult, setAirResult] = useState<AirResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const [side, air] = await Promise.all([
        resultApi.getSideResult().catch(() => null),
        resultApi.getAirResult().catch(() => null),
      ]);

      setSideResult(side);
      setAirResult(air);
    } catch (err) {
      setError(err instanceof Error ? err.message : '결과를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  return {
    sideResult,
    airResult,
    loading,
    error,
    refetch: fetchResults,
  };
}

export function useSideResult() {
  const [result, setResult] = useState<SideResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResult = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await resultApi.getSideResult();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '측면 뷰 결과를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, []);

  return { result, loading, error, refetch: fetchResult };
}

export function useAirResult() {
  const [result, setResult] = useState<AirResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResult = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await resultApi.getAirResult();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '공중 뷰 결과를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, []);

  return { result, loading, error, refetch: fetchResult };
}
