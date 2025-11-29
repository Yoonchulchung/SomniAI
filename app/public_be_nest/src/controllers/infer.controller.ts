import { 
  Controller, 
  Post, 
  Body, 
  UploadedFile, 
  UseInterceptors, 
  ParseFilePipeBuilder, 
  HttpStatus 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs';
import * as path from 'path';

import type { Express } from 'express'; 

@Controller('upload')
export class InferController {
  constructor(private eventEmitter: EventEmitter2) {

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async receiveResult(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png)$/,
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1024 * 1024, // 10MB 제한
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: true,
        }),
    )
    file: Express.Multer.File,

    @Body() body: { timestamp: string; pose_analysis: string }
  ) {
    
    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `${Date.now()}_result${ext}`;
    
    const uploadPath = path.join(process.cwd(), 'uploads', fileName);
    fs.writeFileSync(uploadPath, file.buffer);

    const localUrl = `http://0.0.0.0:3000/uploads/${fileName}`;
    console.log(`[Upload] Image Saved: ${localUrl}`);

    let analysisData = {};
    try {
      if (body.pose_analysis) {
        analysisData = JSON.parse(body.pose_analysis);
      }
    } catch (e) {
      console.warn('[Upload] JSON parsing warning:', e);
    }

    this.eventEmitter.emit('python.ai.image.uploaded', {
      resultUrl: localUrl,
      analysis: analysisData,
      timestamp: body.timestamp,
    });

    return { status: 'success', url: localUrl };
  }
}