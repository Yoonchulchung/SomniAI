import { Request, Response } from 'express';
import { ApiResponse } from '../types';

const inferenceQueue = new Map<string, any>();

export class InferController {
  
  /**
   * Upload (큐에 쌓기)
   */
  async upload(req: Request, res: Response) {
    try {
      const file = req.file; 
      const body = req.body;

      if (!file) return res.status(400).json({ message: 'File missing' });

      const fileKey = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

      const queueItem = {
        buffer: file.buffer,
        mimetype: file.mimetype,
        params: { 
          modelName: body.modelName, 
          threshold: Number(body.threshold) 
        },
        createdAt: new Date()
      };

      inferenceQueue.set(fileKey, queueItem);

      console.log(`[Queue] Added. Current Size: ${inferenceQueue.size}`);

      res.status(201).json({
        success: true,
        message: 'Added to queue',
        data: {
          queueSize: inferenceQueue.size // 현재 대기 중인 개수 알려줌
        }
      });

    } catch (error) {
      res.status(500).json({ message: 'Error' });
    }
  }

  /**
   * View (하나씩 꺼내기 - Pop)
   * GET /api/inference/view (파라미터 없음!)
   */
  async view(req: Request, res: Response) {
    try {
      if (inferenceQueue.size === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Queue is empty (대기 중인 데이터 없음)' 
        });
      }

      const firstKey = inferenceQueue.keys().next().value;
      const item = inferenceQueue.get(firstKey);

      inferenceQueue.delete(firstKey);

      console.log(`[Queue] Popped item. Remaining Size: ${inferenceQueue.size}`);
      console.log('PARAMS:', item.params);

      res.setHeader('Content-Type', item.mimetype);
      res.send(item.buffer);

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error' });
    }
  }
}

export default new InferController();