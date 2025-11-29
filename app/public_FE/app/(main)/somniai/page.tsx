'use client';

import { useState, useEffect } from 'react';

export default function QueueViewerPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'success' | 'error'>('connecting');
  const [logs, setLogs] = useState<string[]>([]); // 로그 확인용

  useEffect(() => {
    const sseUrl = 'http://localhost:3000/notifications/sse';
    
    console.log(`SSE 연결 시도: ${sseUrl}`);
    const eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      console.log('SSE 연결 성공!');
      setStatus('connected');
      setLogs((prev) => [...prev, '서버와 연결되었습니다. 데이터를 기다리는 중...']);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        console.log('데이터 수신:', parsedData);

        if (parsedData.url) {
          setImageUrl(parsedData.url);
          setStatus('success');
          setLogs((prev) => [`[${new Date().toLocaleTimeString()}] 이미지 수신 완료!`, ...prev]);
        }
      } catch (error) {
        console.error('JSON 파싱 에러:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE 에러:', error);
      setStatus('error');
      eventSource.close();
    };

    return () => {
      console.log('SSE 연결 종료');
      eventSource.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Real-time Inference Viewer (SSE)</h1>
      
      <div className="mb-6 flex gap-2">
        {status === 'connecting' && (
          <span className="px-4 py-2 bg-gray-600 rounded-full animate-pulse">Running Connection...</span>
        )}
        {status === 'connected' && (
          <span className="px-4 py-2 bg-blue-600 rounded-full animate-pulse">Waiting for Data...</span>
        )}
        {status === 'success' && (
          <span className="px-4 py-2 bg-green-600 rounded-full">New Image Received!</span>
        )}
        {status === 'error' && (
          <span className="px-4 py-2 bg-red-600 rounded-full">Connection Error</span>
        )}
      </div>

      <div className="w-full max-w-2xl h-[500px] border-2 border-gray-700 rounded-lg flex items-center justify-center bg-black overflow-hidden relative shadow-2xl">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={imageUrl} 
            alt="Inference Result" 
            className="w-full h-full object-contain fade-in"
          />
        ) : (
          <div className="text-center text-gray-500">
            <p>실시간 데이터를 대기 중입니다.</p>
            <p className="text-xs mt-2">(NestJS Queue → SSE → Next.js)</p>
          </div>
        )}
      </div>

      <div className="mt-8 w-full max-w-2xl bg-gray-800 p-4 rounded-lg h-32 overflow-y-auto text-xs text-gray-300 font-mono">
        <h3 className="font-bold mb-2 text-gray-400">Event Logs:</h3>
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}