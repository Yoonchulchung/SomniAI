/**
 * Webcam Player Component
 * Displays webcam stream with controls
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Video, VideoOff, Camera } from 'lucide-react';

interface WebcamPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isStreaming: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onCapture?: () => void;
}

export function WebcamPlayer({
  videoRef,
  isStreaming,
  error,
  onStart,
  onStop,
  onCapture,
}: WebcamPlayerProps) {
  return (
    <Card elevated>
      <CardHeader
        title="웹캠 스트리밍"
        subtitle="실시간 카메라 피드"
        icon={<Video className="w-6 h-6 text-blue-600" />}
      />
      <CardContent>
        <div className="space-y-4">
          {/* Video Display */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90">
                <div className="text-center">
                  <VideoOff className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-300 text-sm">카메라가 비활성화되어 있습니다</p>
                </div>
              </div>
            )}
            {isStreaming && (
              <div className="absolute top-4 left-4">
                <Badge label="LIVE" variant="error" dot />
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            {!isStreaming ? (
              <Button onClick={onStart} variant="success" fullWidth>
                <Video className="w-5 h-5" />
                스트리밍 시작
              </Button>
            ) : (
              <>
                <Button onClick={onStop} variant="danger" fullWidth>
                  <VideoOff className="w-5 h-5" />
                  스트리밍 중지
                </Button>
                {onCapture && (
                  <Button onClick={onCapture} variant="primary">
                    <Camera className="w-5 h-5" />
                    캡처
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
