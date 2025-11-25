'use client';

import { useState, useEffect, useRef } from 'react';

export default function QueueViewerPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'waiting' | 'loading' | 'success'>('waiting');
  const [intervalMs, setIntervalMs] = useState(1000); // 1초마다 확인

  // 컴포넌트가 언마운트될 때 메모리 누수 방지
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  // 폴링 로직
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const fetchImage = async () => {
      try {
        // 백엔드 주소 (프록시 설정이 안되어 있다면 http://localhost:8000 등 풀주소 필요)
        const res = await fetch('http://localhost:4000/api/inference/view');

        if (res.status === 200) {
          // 1. 이미지가 큐에 있음!
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);
          
          setImageUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev); // 이전 이미지 메모리 해제
            return objectUrl;
          });
          setStatus('success');
          
          // 이미지를 찾았으면 다음 요청을 조금 천천히 할지 결정 (여기선 3초 뒤에 다시 찾음)
          timeoutId = setTimeout(fetchImage, 3000); 

        } else if (res.status === 404) {
          // 2. 큐가 비어있음
          setStatus('waiting');
          // 1초 뒤 다시 확인
          timeoutId = setTimeout(fetchImage, 1000);
        } else {
          // 에러 발생 시
          console.error('Server Error');
          timeoutId = setTimeout(fetchImage, 2000);
        }

      } catch (error) {
        console.error('Fetch Error:', error);
        timeoutId = setTimeout(fetchImage, 2000);
      }
    };

    // 시작
    fetchImage();

    // 클린업: 컴포넌트가 사라지면 폴링 중단
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Inference Queue Viewer</h1>
      
      {/* 상태 표시 */}
      <div className="mb-4">
        {status === 'waiting' && (
          <span className="px-4 py-2 bg-yellow-600 rounded-full animate-pulse">
            대기 중 (Queue Empty)...
          </span>
        )}
        {status === 'success' && (
          <span className="px-4 py-2 bg-green-600 rounded-full">
            이미지 수신 완료!
          </span>
        )}
      </div>

      {/* 이미지 표시 영역 */}
      <div className="w-full max-w-2xl h-[500px] border-2 border-gray-700 rounded-lg flex items-center justify-center bg-black overflow-hidden relative">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={imageUrl} 
            alt="Inference Result" 
            className="w-full h-full object-contain"
          />
        ) : (
          <p className="text-gray-500">데이터가 들어오면 여기에 표시됩니다.</p>
        )}
      </div>

      <p className="mt-4 text-sm text-gray-400">
        * 1초마다 큐를 확인하여 이미지를 가져옵니다.
      </p>
    </div>
  );
}