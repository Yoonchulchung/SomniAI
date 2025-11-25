'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { resultApi } from '@/lib/api';
import type { SideResult, AirResult } from '@/types';

export default function ResultsPage() {
  const router = useRouter();
  const [sideResult, setSideResult] = useState<SideResult | null>(null);
  const [airResult, setAirResult] = useState<AirResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'side' | 'air'>('side');

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const [side, air] = await Promise.all([
        resultApi.getSideResult().catch(() => null),
        resultApi.getAirResult().catch(() => null),
      ]);
      setSideResult(side);
      setAirResult(air);
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentResult = activeTab === 'side' ? sideResult : airResult;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">분석 결과</h1>
          <p className="mt-2 text-gray-600">자세 분석 결과를 확인하세요</p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('side')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'side'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                측면 분석
              </button>
              <button
                onClick={() => setActiveTab('air')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'air'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                공중 분석
              </button>
            </nav>
          </div>
        </div>

        {/* 컨텐츠 영역 */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">로딩 중...</p>
          </div>
        ) : !currentResult ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">결과가 없습니다.</p>
            <button
              onClick={loadResults}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* TODO: 향후 상세한 UI로 리팩토링 필요 */}
            {/* 이미지 표시 */}
            {currentResult.analysis_image_url && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">분석 이미지</h2>
                <div className="flex justify-center">
                  <img
                    src={currentResult.analysis_image_url}
                    alt="분석 결과"
                    className="max-w-full h-auto rounded-lg shadow-md"
                  />
                </div>
              </div>
            )}

            {/* JSON 데이터 표시 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">분석 데이터</h2>
              <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96 text-sm">
                {JSON.stringify(currentResult, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
