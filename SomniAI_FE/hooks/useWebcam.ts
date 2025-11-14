/**
 * useWebcam Hook
 * Manages webcam access and streaming
 */

import { useRef, useState, useCallback, useEffect } from 'react';

export interface WebcamSettings {
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
  fps: number;
}

export function useWebcam(settings: WebcamSettings) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  // Get available video devices
  const getVideoDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter((device) => device.kind === 'videoinput');
      setDevices(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error('[Webcam] Failed to enumerate devices:', err);
      return [];
    }
  }, []);

  // Start webcam stream
  const startStream = useCallback(async (deviceId?: string) => {
    try {
      setError(null);

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: settings.width },
          height: { ideal: settings.height },
          facingMode: settings.facingMode,
          frameRate: { ideal: settings.fps },
          ...(deviceId && { deviceId: { exact: deviceId } }),
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        console.log('[Webcam] Stream started');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start webcam';
      setError(errorMessage);
      console.error('[Webcam] Error starting stream:', err);
      setIsStreaming(false);
    }
  }, [settings]);

  // Stop webcam stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    console.log('[Webcam] Stream stopped');
  }, []);

  // Capture frame from video
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !isStreaming) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, [isStreaming]);

  // Capture and send frame to server
  const sendFrame = useCallback(async (serverUrl: string): Promise<void> => {
    const frameData = captureFrame();
    if (!frameData) {
      throw new Error('Failed to capture frame');
    }

    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        frame: frameData,
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send frame: ${response.statusText}`);
    }
  }, [captureFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    videoRef,
    isStreaming,
    error,
    devices,
    getVideoDevices,
    startStream,
    stopStream,
    captureFrame,
    sendFrame,
  };
}
