'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { healthApi, uploadApi } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [modelStats, setModelStats] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadType, setUploadType] = useState<'air' | 'side'>('air');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [info, stats, health] = await Promise.all([
        healthApi.getModelInfo().catch(() => null),
        healthApi.getModelStats().catch(() => null),
        healthApi.health().catch(() => null),
      ]);
      setModelInfo(info);
      setModelStats(stats);
      setHealthStatus(health);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      alert('파일을 선택해주세요');
      return;
    }

    setUploadLoading(true);
    setUploadResult('');

    try {
      const result = uploadType === 'air'
        ? await uploadApi.uploadAir(uploadFiles)
        : await uploadApi.uploadSide(uploadFiles);

      setUploadResult(JSON.stringify(result, null, 2));
      setUploadFiles([]);
      if (document.getElementById('file-input') as HTMLInputElement) {
        (document.getElementById('file-input') as HTMLInputElement).value = '';
      }
    } catch (error: any) {
      setUploadResult(`Error: ${error.message}`);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleReloadModel = async (modelType: 'air' | 'side' | 'all') => {
    try {
      await healthApi.reloadModel(modelType);
      alert(`${modelType} 모델이 재로드되었습니다`);
      loadData();
    } catch (error: any) {
      alert(`모델 재로드 실패: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">SomniAI Admin Dashboard</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Health Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">시스템 상태</h2>
            {loading ? (
              <p className="text-gray-500">로딩 중...</p>
            ) : (
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-64">
                {JSON.stringify(healthStatus, null, 2)}
              </pre>
            )}
          </div>

          {/* Model Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">모델 정보</h2>
            {loading ? (
              <p className="text-gray-500">로딩 중...</p>
            ) : (
              <div>
                <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-64">
                  {JSON.stringify(modelInfo, null, 2)}
                </pre>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleReloadModel('air')}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Air 재로드
                  </button>
                  <button
                    onClick={() => handleReloadModel('side')}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Side 재로드
                  </button>
                  <button
                    onClick={() => handleReloadModel('all')}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                  >
                    전체 재로드
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Model Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">프로세스 통계</h2>
            {loading ? (
              <p className="text-gray-500">로딩 중...</p>
            ) : (
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-64">
                {JSON.stringify(modelStats, null, 2)}
              </pre>
            )}
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">이미지 업로드</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  업로드 타입
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as 'air' | 'side')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="air">Air</option>
                  <option value="side">Side</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  파일 선택
                </label>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                {uploadFiles.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    {uploadFiles.length}개 파일 선택됨
                  </p>
                )}
              </div>
              <button
                onClick={handleUpload}
                disabled={uploadLoading || uploadFiles.length === 0}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {uploadLoading ? '업로드 중...' : '업로드'}
              </button>
              {uploadResult && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">결과:</p>
                  <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-64">
                    {uploadResult}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => router.push('/dashboard/results')}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg p-6 hover:from-indigo-600 hover:to-purple-700 transition-all transform hover:scale-105"
          >
            <h3 className="text-xl font-bold mb-2">분석 결과 보기</h3>
            <p className="text-sm opacity-90">측면 자세 및 공중 분석 결과를 확인하세요</p>
          </button>
          <button
            onClick={() => router.push('/dashboard/logs')}
            className="bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg shadow-lg p-6 hover:from-green-600 hover:to-teal-700 transition-all transform hover:scale-105"
          >
            <h3 className="text-xl font-bold mb-2">API 로그</h3>
            <p className="text-sm opacity-90">API 요청 로그 및 통계를 확인하세요</p>
          </button>
        </div>

        {/* API Endpoints */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">사용 가능한 API 엔드포인트</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded p-4">
              <h3 className="font-medium text-green-600">헬스체크</h3>
              <ul className="mt-2 text-sm space-y-1 text-gray-600">
                <li>GET/POST /api/v1/health - 헬스체크</li>
                <li>GET /api/v1/ping - 핑</li>
              </ul>
            </div>
            <div className="border rounded p-4">
              <h3 className="font-medium text-purple-600">모델 관리</h3>
              <ul className="mt-2 text-sm space-y-1 text-gray-600">
                <li>GET /api/v1/model/info - 모델 정보</li>
                <li>GET /api/v1/model/stats - 통계</li>
                <li>POST /api/v1/model/reload - 모델 재로드</li>
              </ul>
            </div>
            <div className="border rounded p-4">
              <h3 className="font-medium text-orange-600">업로드 & 결과</h3>
              <ul className="mt-2 text-sm space-y-1 text-gray-600">
                <li>POST /api/v1/upload-air - Air 이미지</li>
                <li>POST /api/v1/upload-side - Side 이미지</li>
                <li>GET /api/v1/result-side-json - 측면 결과</li>
                <li>GET /api/v1/result-air-json - 공중 결과</li>
              </ul>
            </div>
            <div className="border rounded p-4">
              <h3 className="font-medium text-blue-600">API 로그</h3>
              <ul className="mt-2 text-sm space-y-1 text-gray-600">
                <li>GET /api/v1/api-logs - 로그 목록</li>
                <li>GET /api/v1/api-logs/:id - 로그 상세</li>
                <li>GET /api/v1/api-logs/stats/summary - 통계</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
