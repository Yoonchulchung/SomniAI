import asyncio
import base64
from io import BytesIO
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)

from modules.inference.application.parser import RequestParserPIL
from modules.inference.application.process import AirProcess, SideProcess
from modules.inference.application.registry import get_cfg

router = APIRouter()
SomniAI_cfg = get_cfg()


def get_parser():
    return RequestParserPIL(SomniAI_cfg.HTTP)

def get_Process_Air():
    return AirProcess.get_instance()

def get_Process_Side():
    return SideProcess.get_instance()

@router.post("/upload-air")
async def upload_air(request : Request, files: Optional[List[UploadFile]] = File(None), 
                 parser = Depends(get_parser), process = Depends(get_Process_Air)):
    
    try:
        dataset = await parser.get_img(request, files)
        await process.enqueue_request(dataset)   

        return {"msg": "succeed to send data"}
    
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Failed to enqueue VLM data: {str(e)}")


@router.post("/upload-side")
async def upload_side(request : Request, files: Optional[List[UploadFile]] = File(None), 
                 parser = Depends(get_parser), process = Depends(get_Process_Side)):
    '''
    Please send bytes data. Do not send Pytorch Tensor format.
    '''

    try:
        dataset = await parser.get_img(request, files)
        await process.enqueue_request(dataset)
        
        return {"msg": "succeed to send data"}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Failed to enqueue VLM data: {str(e)}")


# ============================================================================
# WebSocket 실시간 스트리밍 (기존 API에 영향 없음)
# ============================================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WebSocket] Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WebSocket] Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast_image(self, image_data: bytes):
        """모든 연결된 클라이언트에게 이미지 전송"""
        if not self.active_connections:
            return
        
        # Base64로 인코딩
        base64_img = base64.b64encode(image_data).decode('utf-8')
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json({
                    "type": "image",
                    "data": base64_img,
                    "timestamp": asyncio.get_event_loop().time()
                })
            except Exception as e:
                print(f"[WebSocket] Error sending to client: {e}")
                disconnected.append(connection)
        
        # 끊어진 연결 제거
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


@router.post("/upload-debug")
async def upload_debug(request : Request, files: Optional[List[UploadFile]] = File(None), 
                       parser = Depends(get_parser)):
    '''
    디버깅 전용: 이미지를 받아서 WebSocket으로만 전송 (처리 없음)
    기존 upload-side와 별개로 동작
    '''
    try:
        dataset = await parser.get_img(request, files)
        
        # WebSocket으로 이미지 브로드캐스트
        buffer = BytesIO()
        dataset.save(buffer, format='JPEG', quality=85)
        image_bytes = buffer.getvalue()
        await manager.broadcast_image(image_bytes)
        
        return {
            "msg": "Image broadcasted to WebSocket clients",
            "clients": len(manager.active_connections),
            "image_size": len(image_bytes)
        }

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Failed to broadcast image: {str(e)}")


@router.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    '''
    WebSocket 연결: ws://your-server:8000/api/v1/stream
    클라이언트가 연결하면 실시간으로 이미지를 받을 수 있음
    '''
    await manager.connect(websocket)
    try:
        while True:
            # 클라이언트로부터 메시지 대기 (keep-alive)
            data = await websocket.receive_text()
            
            # Ping-pong
            if data == "ping":
                await websocket.send_json({"type": "pong"})
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"[WebSocket] Error: {e}")
        manager.disconnect(websocket)