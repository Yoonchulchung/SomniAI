import asyncio

from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect  # 추가됨
from fastapi.responses import HTMLResponse, JSONResponse

from modules.inference.application.process import AirProcess, SideProcess
from modules.inference.application.registry import get_cfg
from modules.inference.infrastructure.ai.dataset import Dataset
from modules.inference.interface.utils.converter import pil_to_data_url
from modules.inference.interface.utils.view_page import (
    get_live_monitor_html,
    nothing,
    show_image,
)

router = APIRouter()


@router.get("/result-air")
async def result_air(request: Request, ):
    gpu = AirProcess.get_instance()
    
    img, message = await gpu.get_result()
          
    if not message:
        return nothing()
    
    data_url = pil_to_data_url(img, fmt="PNG")
    
    page = show_image(data_url=data_url, message_html=message["vlm_output"])
    return HTMLResponse(page)


@router.get("/result-air-json")
async def result_air_json():
    gpu = AirProcess.get_instance()

    img, message = await gpu.get_result()

    if not message:
        return JSONResponse(
            content={
                "success": False,
                "message": "표시할 결과가 아직 큐에 없습니다.",
                "data": None
            },
            status_code=200
        )

    data_url = pil_to_data_url(img, fmt="PNG")

    return JSONResponse(
        content={
            "success": True,
            "message": "공중 분석 결과",
            "data": {
                "image": data_url,
                "vlm_output": message.get("vlm_output"),
            }
        },
        status_code=200
    )


@router.websocket("/ws/result-air")
async def websocket_result_air(websocket: WebSocket):

    await websocket.accept()
    gpu = AirProcess.get_instance()

    try:
        while True:
            img, message = await gpu.get_result()

            if not message or img is None:
                await asyncio.sleep(0.05)
                continue

            # PIL Image -> Base64 String
            data_url = pil_to_data_url(img, fmt="PNG")

            payload = {
                "image": data_url,
                "vlm_output": message.get("vlm_output", ""),
            }

            await websocket.send_json(payload)
            await asyncio.sleep(0.01)

    except WebSocketDisconnect:
        print("Air Client disconnected")
    except Exception as e:
        print(f"Air WebSocket Error: {e}")


@router.get("/live/air")
async def live_view_air():
    """웹소켓을 통해 실시간으로 공중 결과를 보여주는 페이지"""
    html = get_live_monitor_html(
        title="실시간 공중 분석",
        ws_endpoint="/api/v1/ws/result-air",
        mode="air"
    )
    return HTMLResponse(html)