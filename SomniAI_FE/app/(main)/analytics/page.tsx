/**
 * Analytics Page
 * Data visualization and analytics
 */

'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, BarChart3, TrendingUp, Clock, Zap } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <p className="text-sm text-gray-600">데이터 분석 및 시각화</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card elevated>
            <CardHeader
              title="프레임 전송 통계"
              subtitle="지난 24시간"
              icon={<BarChart3 className="w-6 h-6 text-blue-600" />}
            />
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-blue-400 mx-auto mb-3" />
                  <p className="text-gray-600">차트 영역</p>
                  <p className="text-sm text-gray-500 mt-1">데이터 수집 중...</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card elevated>
            <CardHeader
              title="MQTT 메시지 트래픽"
              subtitle="실시간 데이터"
              icon={<TrendingUp className="w-6 h-6 text-green-600" />}
            />
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-600">차트 영역</p>
                  <p className="text-sm text-gray-500 mt-1">데이터 수집 중...</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card elevated>
            <CardHeader
              title="응답 시간"
              subtitle="평균 지연 시간"
              icon={<Clock className="w-6 h-6 text-purple-600" />}
            />
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">평균</span>
                  <span className="text-2xl font-bold text-purple-600">24ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">최소</span>
                  <span className="text-lg font-semibold text-gray-900">12ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">최대</span>
                  <span className="text-lg font-semibold text-gray-900">87ms</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card elevated>
            <CardHeader
              title="시스템 성능"
              subtitle="리소스 사용량"
              icon={<Zap className="w-6 h-6 text-orange-600" />}
            />
            <CardContent>
              <div className="space-y-4">
                {['CPU', 'Memory', 'Network'].map((resource, index) => (
                  <div key={resource}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{resource}</span>
                      <span className="text-sm font-semibold text-gray-900">{[45, 62, 28][index]}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${[45, 62, 28][index]}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
