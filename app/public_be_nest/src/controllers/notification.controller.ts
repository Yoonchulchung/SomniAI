import { Controller, Sse, MessageEvent, Query } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent } from 'rxjs';
import { map, filter } from 'rxjs/operators';

@Controller('notifications')
export class NotificationController {
  constructor(private eventEmitter: EventEmitter2) {}

  @Sse('sse')
  sse(): Observable<MessageEvent> {
    
    return fromEvent(this.eventEmitter, 'python.ai.image.uploaded').pipe(
      
      map((payload: any) => {
        return {
          data: { 
            message: '이미지 변환 완료!', 
            url: payload.resultUrl,      
            analysis: payload.analysis,  
            timestamp: payload.timestamp 
          }
        } as MessageEvent;
      })
    );
  }
}