import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { EventEmitterModule } from '@nestjs/event-emitter'; // 1. import 추가
import { join } from 'path';

import { InferController } from './controllers/infer.controller';
import { NotificationController } from './controllers/notification.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot(), 

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [InferController, NotificationController], 
  providers: [],
})
export class AppModule {}