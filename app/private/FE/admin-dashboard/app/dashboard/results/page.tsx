'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { resultApi } from '@/lib/api-client';

interface ResultData {
  success: boolean;
  message: string;
  data: {
    image: string;
    pose_analysis?: any;
    vlm_output?: string;
    raw_result?: any;
  } | null;
}

export default function ResultsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sideResult, setSideResult] = useState<ResultData | null>(null);
  const [airResult, setAirResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'side' | 'air'>('side');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadResults();
    }
  }, [user]);

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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  const currentResult = activeTab === 'side' ? sideResult : airResult;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← 대시보드로
            </button>
            <h1 className="text-2xl font-bold text-gray-900">분석 결과</h1>
          </div>
          <button
            onClick={loadResults}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
          >
            새로고침
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('side')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'side'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                측면 자세 분석
              </button>
              <button
                onClick={() => setActiveTab('air')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
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

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">로딩 중...</p>
          </div>
        ) : !currentResult?.success || !currentResult?.data ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">{currentResult?.message || '결과가 없습니다.'}</p>
            <button
              onClick={loadResults}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 이미지 표시 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">분석 이미지</h2>
              <div className="flex justify-center">
                <img
                  src={currentResult.data.image}
                  alt="분석 결과"
                  className="max-w-full h-auto rounded-lg shadow-md"
                />
              </div>
            </div>

            {/* 측면 분석 결과 */}
            {activeTab === 'side' && currentResult.data.pose_analysis && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">자세 분석 결과</h2>
                {currentResult.data.pose_analysis.success ? (
                  <div className="space-y-4">
                    {/* 요약 정보 */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-lg">
                      <h3 className="text-xl font-bold mb-3">측면 목 각도 분석 결과</h3>
                      <div className="space-y-2">
                        <p className="text-lg">
                          감지된 인원: <strong>{currentResult.data.pose_analysis.valid_persons}명</strong>
                        </p>
                        {currentResult.data.pose_analysis.average_neck_angle !== null && (
                          <p className="text-lg">
                            평균 목 각도:{' '}
                            <strong className="text-2xl">
                              {currentResult.data.pose_analysis.average_neck_angle.toFixed(1)}°
                            </strong>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 개인별 상세 정보 */}
                    {currentResult.data.pose_analysis.person_details?.map((person: any, index: number) => {
                      if (!person.valid) return null;

                      const statusColors: any = {
                        green: 'border-green-500 bg-green-50',
                        yellow: 'border-yellow-500 bg-yellow-50',
                        orange: 'border-orange-500 bg-orange-50',
                        red: 'border-red-500 bg-red-50',
                      };

                      const color = person.posture_assessment?.color || 'gray';

                      return (
                        <div
                          key={index}
                          className={`border-l-4 p-6 rounded-lg ${statusColors[color] || 'border-gray-500 bg-gray-50'}`}
                        >
                          <h4 className="text-lg font-semibold mb-3">Person #{person.person_id + 1}</h4>
                          <div className="space-y-2">
                            <p className="text-base">
                              목 각도: <strong className="text-xl">{person.neck_angle.toFixed(1)}°</strong>
                            </p>
                            <p className="text-base">
                              상태: <strong>{person.posture_assessment?.status || 'Unknown'}</strong>
                            </p>
                            <p className="text-sm text-gray-600 italic">
                              {person.posture_assessment?.description || ''}
                            </p>

                            {/* 키포인트 정보 */}
                            {person.keypoints_used && (
                              <div className="mt-4 bg-white p-4 rounded">
                                <h5 className="text-sm font-semibold mb-2">감지된 키포인트:</h5>
                                <ul className="text-sm text-gray-600 space-y-1 font-mono">
                                  {person.keypoints_used.ear && (
                                    <li>
                                      귀 ({person.keypoints_used.ear.side}): (
                                      {person.keypoints_used.ear.x.toFixed(0)},{' '}
                                      {person.keypoints_used.ear.y.toFixed(0)}) - 신뢰도:{' '}
                                      {person.keypoints_used.ear.conf.toFixed(2)}
                                    </li>
                                  )}
                                  {person.keypoints_used.shoulder && (
                                    <li>
                                      어깨 ({person.keypoints_used.shoulder.side}): (
                                      {person.keypoints_used.shoulder.x.toFixed(0)},{' '}
                                      {person.keypoints_used.shoulder.y.toFixed(0)}) - 신뢰도:{' '}
                                      {person.keypoints_used.shoulder.conf.toFixed(2)}
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* 상태 기준 범례 */}
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h4 className="font-semibold mb-3">상태 기준</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-green-500 rounded"></div>
                          <span>Normal (0-15°): 정상 자세</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-yellow-500 rounded"></div>
                          <span>Mild FHP (15-30°): 경미한 거북목</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-orange-500 rounded"></div>
                          <span>Moderate FHP (30-45°): 중등도 거북목</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-red-500 rounded"></div>
                          <span>Severe FHP (45°+): 심한 거북목</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-600">자세 분석 실패: 키포인트를 감지할 수 없습니다.</p>
                )}
              </div>
            )}

            {/* 공중 분석 결과 */}
            {activeTab === 'air' && currentResult.data.vlm_output && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">VLM 분석 결과</h2>
                <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap text-sm">
                  {currentResult.data.vlm_output}
                </div>
              </div>
            )}

            {/* Raw Result (디버깅용) */}
            <details className="bg-white rounded-lg shadow p-6">
              <summary className="text-lg font-semibold cursor-pointer">Raw Data (개발자용)</summary>
              <pre className="mt-4 bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(currentResult.data.raw_result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </main>
    </div>
  );
}
