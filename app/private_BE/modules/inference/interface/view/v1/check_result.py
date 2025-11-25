import base64
import io
from typing import Any, Dict, Optional

import cv2
import httpx
import numpy as np
import torch
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse
from PIL import Image

from modules.inference.application.process import AirProcess, SideProcess
from modules.inference.application.registry import get_cfg
from modules.inference.infrastructure.ai.dataset import Dataset

router = APIRouter()

cfg = get_cfg()

async def get_DataSet():
    return Dataset(cfg.AI)


@router.get("/result-side")
async def result_side(request: Request, dataset=Depends(get_DataSet)):
    gpu = SideProcess.get_instance()

    img, message = await gpu.get_result()
    if not message:
        return _nothing()

    # Pose analysis 정보 추출
    pose_analysis = message.get("pose_analysis", {})

    if cfg.AI.POSE.MODEL_NAME == "YOLO":
        out = dataset.draw_yolo_keypoints(
            message["result"],
            img,
            draw_boxes=True,
            keypoint_radius=3,
            keypoint_thickness=2,
            skeleton_thickness=2,
            use_normalized=False,
            kpt_conf_thresh=0.2,
        )
    else:
        out = dataset.draw_mmpose_keypoints(
            cfg,
            img,
            message["result"],
            pose_analysis=pose_analysis
        )

    data_url = cv2_to_data_url(out, format="PNG")

    # 각도 정보를 HTML로 변환
    angle_info_html = _format_pose_analysis(pose_analysis)

    page = _show_side_result(data_url=data_url, angle_info_html=angle_info_html, pose_analysis=pose_analysis)
    return HTMLResponse(page)    


@router.get("/result-air")
async def result_air(request: Request, ):
    gpu = AirProcess.get_instance()
    
    img, message = await gpu.get_result()
    
    # try:
    #   async with httpx.AsyncClient() as client:
    #       response = await client.get("http://localhost:3000/")
    # except Exception as e:
    #   print(e)
      
    if not message:
        return _nothing()
    
    data_url = pil_to_data_url(img, fmt="PNG")
    
    page = _show_image(data_url=data_url, message_html=message["vlm_output"])
    return HTMLResponse(page)
    
def _nothing():
    return HTMLResponse(
                content="""
                <html>
                <head><meta charset="utf-8"><title>Waiting…</title></head>
                <body style="font-family: system-ui, sans-serif; padding: 24px;">
                    <h2>대기 중…</h2>
                    <p>표시할 결과가 아직 큐에 없습니다.</p>
                </body>
                </html>
                """,
                status_code=200,
            )
    

def _show_image(data_url: str, message_html: str) -> str:
    html_page = f"""
    <html>
      <head>
        <meta charset="utf-8">
        <title>Inference Result</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {{
            font-family: system-ui, sans-serif;
            padding: 24px;
            background: #f7f7f8;
          }}
          .card {{
            max-width: 960px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.08);
            padding: 20px;
          }}
          img {{
            max-width: 100%;
            height: auto;
            border-radius: 12px;
            display: block;
            margin: 0 auto;
          }}
          .message {{
            margin-top: 16px;
            font-size: 16px;
            color: #222;
            white-space: pre-wrap;
            text-align: center;
          }}
          .toolbar {{
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
            justify-content: flex-end;
          }}
          button {{
            padding: 8px 12px;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
            background: #fff;
            cursor: pointer;
          }}
          button:hover {{
            background: #f3f4f6;
          }}
        </style>
      </head>
      <body>
        <div class="card">
          <div class="toolbar">
            <button onclick="location.reload()">새로고침</button>
          </div>
          <div class="message"><strong>결과 메시지:</strong><br>{message_html}</div>
          <img src="{data_url}" alt="inference image" />
          <div class="message"><strong>추론 결과:</strong><br>{message_html}</div>
        </div>
      </body>
    </html>
    """
    return html_page


def pil_to_streaming_response(img: Image.Image, fmt: str = "PNG"):
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    mime = "image/png" if fmt.upper() == "PNG" else f"image/{fmt.lower()}"

def pil_to_data_url(img: Image.Image, fmt: str = "PNG") -> str:
    if isinstance(img, list):
        if len(img) == 1 and isinstance(img[0], Image.Image):
            img = img[0]
        else:
            raise TypeError(f"Expected single PIL.Image.Image, got list: len={len(img)}")
    if not isinstance(img, Image.Image):
        raise TypeError(f"Expected PIL.Image.Image, got {type(img)}")

    buf = io.BytesIO()
    img.save(buf, format=fmt)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    mime = "image/png" if fmt.upper() == "PNG" else f"image/{fmt.lower()}"
    return f"data:{mime};base64,{b64}"
  
def _to_bgr_uint8(img) -> np.ndarray:

    if isinstance(img, Image.Image):
        img = np.array(img)  # RGB
        if img.ndim == 2:  # grayscale
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        else:
            img = img[:, :, ::-1]  # RGB->BGR

    if isinstance(img, torch.Tensor):
        img = img.detach().cpu().numpy()

    if not isinstance(img, np.ndarray):
        img = np.array(img)

    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.ndim == 3 and img.shape[2] == 4:
        # BGRA/ RGBA -> BGR
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR) if img.dtype == np.uint8 else img[:, :, :3]

    if img.dtype != np.uint8:
        mx = float(np.nanmax(img)) if img.size else 0.0
        if mx <= 1.0:
            img = (np.clip(img, 0, 1) * 255.0).astype(np.uint8)
        else:
            img = np.clip(img, 0, 255).astype(np.uint8)

    img = np.ascontiguousarray(img)
    return img

def cv2_to_data_url(img, format: str = "PNG") -> str:

    bgr = _to_bgr_uint8(img)

    ext = format.lower()
    if ext == "jpg":
        ext = "jpeg"
    ok, enc = cv2.imencode(f".{ext}", bgr)
    if not ok:
        raise RuntimeError(f"cv2.imencode failed for format .{ext}")


    b64 = base64.b64encode(enc.tobytes()).decode("ascii")
    mime = "image/png" if ext == "png" else "image/jpeg"
    return f"data:{mime};base64,{b64}"


def _format_pose_analysis(pose_analysis: dict) -> str:
    """Pose analysis 정보를 HTML로 포맷팅합니다."""
    if not pose_analysis or not pose_analysis.get('success'):
        return "<p class='error'>자세 분석 실패: 키포인트를 감지할 수 없습니다.</p>"

    html_parts = []

    # 전체 요약
    valid_persons = pose_analysis.get('valid_persons', 0)
    if valid_persons == 0:
        return "<p class='warning'>유효한 자세 데이터가 없습니다.</p>"

    avg_angle = pose_analysis.get('average_neck_angle')
    if avg_angle is not None:
        html_parts.append(f"<div class='summary'><h3>측면 목 각도 분석 결과</h3>")
        html_parts.append(f"<p class='stat'>감지된 인원: {valid_persons}명</p>")
        html_parts.append(f"<p class='stat'>평균 목 각도: <strong>{avg_angle:.1f}°</strong></p>")
        html_parts.append("</div>")

    # 각 사람별 상세 정보
    for person in pose_analysis.get('person_details', []):
        if not person.get('valid'):
            continue

        person_id = person.get('person_id', 0)
        neck_angle = person.get('neck_angle')
        assessment = person.get('posture_assessment', {})

        status = assessment.get('status', 'Unknown')
        description = assessment.get('description', '')
        color = assessment.get('color', 'gray')

        html_parts.append(f"<div class='person-detail status-{color}'>")
        html_parts.append(f"<h4>Person #{person_id + 1}</h4>")
        html_parts.append(f"<p class='angle'>목 각도: <strong>{neck_angle:.1f}°</strong></p>")
        html_parts.append(f"<p class='status'>상태: <strong>{status}</strong></p>")
        html_parts.append(f"<p class='description'>{description}</p>")

        # 키포인트 정보
        if 'keypoints_used' in person:
            kpts = person['keypoints_used']
            html_parts.append("<div class='keypoints-info'>")
            html_parts.append("<h5>감지된 키포인트:</h5>")
            html_parts.append("<ul>")

            if 'ear' in kpts:
                ear = kpts['ear']
                html_parts.append(
                    f"<li>귀 ({ear['side']}): ({ear['x']:.0f}, {ear['y']:.0f}) - "
                    f"신뢰도: {ear['conf']:.2f}</li>"
                )

            if 'shoulder' in kpts:
                shoulder = kpts['shoulder']
                html_parts.append(
                    f"<li>어깨 ({shoulder['side']}): ({shoulder['x']:.0f}, {shoulder['y']:.0f}) - "
                    f"신뢰도: {shoulder['conf']:.2f}</li>"
                )

            html_parts.append("</ul>")
            html_parts.append("</div>")

        html_parts.append("</div>")

    return "\n".join(html_parts)


def _show_side_result(data_url: str, angle_info_html: str, pose_analysis: dict) -> str:
    """측면 결과 페이지를 생성합니다 (개선된 UI)."""

    # 상태에 따른 색상 매핑
    color_styles = """
        .status-green { border-left: 5px solid #10b981; background: #f0fdf4; }
        .status-yellow { border-left: 5px solid #fbbf24; background: #fefce8; }
        .status-orange { border-left: 5px solid #f97316; background: #fff7ed; }
        .status-red { border-left: 5px solid #ef4444; background: #fef2f2; }
    """

    html_page = f"""
    <html>
      <head>
        <meta charset="utf-8">
        <title>측면 자세 분석 결과</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }}

          body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 24px;
          }}

          .container {{
            max-width: 1400px;
            margin: 0 auto;
          }}

          .header {{
            text-align: center;
            color: white;
            margin-bottom: 32px;
          }}

          .header h1 {{
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 8px;
          }}

          .header p {{
            font-size: 1.1rem;
            opacity: 0.9;
          }}

          .content {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 24px;
          }}

          @media (max-width: 1024px) {{
            .content {{
              grid-template-columns: 1fr;
            }}
          }}

          .card {{
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            padding: 28px;
            transition: transform 0.3s ease;
          }}

          .card:hover {{
            transform: translateY(-5px);
          }}

          .card h2 {{
            font-size: 1.5rem;
            color: #1f2937;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 3px solid #667eea;
          }}

          .image-container {{
            position: relative;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          }}

          .image-container img {{
            width: 100%;
            height: auto;
            display: block;
          }}

          .analysis-card {{
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            padding: 28px;
          }}

          .summary {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 24px;
          }}

          .summary h3 {{
            font-size: 1.4rem;
            margin-bottom: 16px;
          }}

          .summary .stat {{
            font-size: 1.1rem;
            margin: 8px 0;
            opacity: 0.95;
          }}

          .summary strong {{
            font-size: 2rem;
            font-weight: 700;
          }}

          .person-detail {{
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 16px;
          }}

          {color_styles}

          .person-detail h4 {{
            color: #1f2937;
            font-size: 1.2rem;
            margin-bottom: 12px;
          }}

          .person-detail p {{
            margin: 8px 0;
            color: #374151;
            line-height: 1.6;
          }}

          .person-detail .angle {{
            font-size: 1.1rem;
          }}

          .person-detail .status {{
            font-size: 1rem;
          }}

          .person-detail .description {{
            font-style: italic;
            color: #6b7280;
            margin-top: 12px;
          }}

          .keypoints-info {{
            background: #f9fafb;
            padding: 16px;
            border-radius: 8px;
            margin-top: 16px;
          }}

          .keypoints-info h5 {{
            color: #374151;
            font-size: 0.95rem;
            margin-bottom: 8px;
            font-weight: 600;
          }}

          .keypoints-info ul {{
            list-style: none;
            padding-left: 0;
          }}

          .keypoints-info li {{
            padding: 6px 0;
            color: #6b7280;
            font-size: 0.9rem;
            font-family: 'Monaco', 'Courier New', monospace;
          }}

          .toolbar {{
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-top: 24px;
          }}

          button {{
            padding: 14px 28px;
            border-radius: 12px;
            border: none;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }}

          button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
          }}

          button:active {{
            transform: translateY(0);
          }}

          .error, .warning {{
            padding: 16px;
            border-radius: 8px;
            margin: 16px 0;
          }}

          .error {{
            background: #fef2f2;
            color: #991b1b;
            border-left: 4px solid #ef4444;
          }}

          .warning {{
            background: #fefce8;
            color: #854d0e;
            border-left: 4px solid #fbbf24;
          }}

          .legend {{
            background: #f9fafb;
            padding: 20px;
            border-radius: 12px;
            margin-top: 16px;
          }}

          .legend h4 {{
            color: #374151;
            margin-bottom: 12px;
            font-size: 1rem;
          }}

          .legend-item {{
            display: flex;
            align-items: center;
            margin: 8px 0;
            font-size: 0.9rem;
            color: #6b7280;
          }}

          .legend-color {{
            width: 20px;
            height: 20px;
            border-radius: 4px;
            margin-right: 10px;
          }}

          .legend-color.green {{ background: #10b981; }}
          .legend-color.yellow {{ background: #fbbf24; }}
          .legend-color.orange {{ background: #f97316; }}
          .legend-color.red {{ background: #ef4444; }}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>측면 자세 분석 결과</h1>
            <p>Pose Estimation 기반 목 각도 측정</p>
          </div>

          <div class="content">
            <div class="card">
              <h2>시각화 결과</h2>
              <div class="image-container">
                <img src="{data_url}" alt="pose estimation result" />
              </div>

              <div class="legend">
                <h4>상태 기준</h4>
                <div class="legend-item">
                  <div class="legend-color green"></div>
                  <span>Normal (0-15°): 정상 자세</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color yellow"></div>
                  <span>Mild FHP (15-30°): 경미한 거북목</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color orange"></div>
                  <span>Moderate FHP (30-45°): 중등도 거북목</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color red"></div>
                  <span>Severe FHP (45°+): 심한 거북목</span>
                </div>
              </div>
            </div>

            <div class="card">
              <h2>분석 결과</h2>
              {angle_info_html}
            </div>
          </div>

          <div class="toolbar">
            <button onclick="location.reload()">새로고침</button>
            <button onclick="window.print()">결과 저장 (인쇄)</button>
          </div>
        </div>
      </body>
    </html>
    """
    return html_page


# JSON API 엔드포인트
@router.get("/result-side-json")
async def result_side_json(dataset=Depends(get_DataSet)):
    """측면 결과를 JSON 형식으로 반환합니다."""
    gpu = SideProcess.get_instance()

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

    # Pose analysis 정보 추출
    pose_analysis = message.get("pose_analysis", {})

    # 이미지를 base64로 인코딩
    if cfg.AI.POSE.MODEL_NAME == "YOLO":
        out = dataset.draw_yolo_keypoints(
            message["result"],
            img,
            draw_boxes=True,
            keypoint_radius=3,
            keypoint_thickness=2,
            skeleton_thickness=2,
            use_normalized=False,
            kpt_conf_thresh=0.2,
        )
    else:
        out = dataset.draw_mmpose_keypoints(
            cfg,
            img,
            message["result"],
            pose_analysis=pose_analysis
        )

    data_url = cv2_to_data_url(out, format="PNG")

    return JSONResponse(
        content={
            "success": True,
            "message": "측면 자세 분석 결과",
            "data": {
                "image": data_url,
                "pose_analysis": pose_analysis,
            }
        },
        status_code=200
    )


@router.get("/result-air-json")
async def result_air_json():
    """공중 결과를 JSON 형식으로 반환합니다."""
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
    
    
import asyncio
import json

from fastapi import WebSocket, WebSocketDisconnect  # 추가됨

# ... 기존 임포트 유지 ...

# ----------------------------------------------------------------
# WebSocket Endpoints (Real-time Streaming)
# ----------------------------------------------------------------

@router.websocket("/ws/result-side")
async def websocket_result_side(websocket: WebSocket, dataset=Depends(get_DataSet)):
    """측면 분석 결과 실시간 스트리밍"""
    await websocket.accept()
    gpu = SideProcess.get_instance()
    
    try:
        while True:
            # 1. 추론 결과 가져오기
            img, message = await gpu.get_result()
            
            if not message or img is None:
                # 데이터가 없으면 잠시 대기 후 재시도
                await asyncio.sleep(0.05)
                continue

            # 2. 데이터 가공 (이미지 그리기)
            pose_analysis = message.get("pose_analysis", {})
            
            if cfg.AI.POSE.MODEL_NAME == "YOLO":
                out = dataset.draw_yolo_keypoints(
                    message["result"],
                    img,
                    draw_boxes=True,
                    kpt_conf_thresh=0.2,
                )
            else:
                out = dataset.draw_mmpose_keypoints(
                    cfg,
                    img,
                    message["result"],
                    pose_analysis=pose_analysis
                )

            # 3. 이미지 인코딩 (Base64)
            # cv2 image -> base64 string
            data_url = cv2_to_data_url(out, format="PNG")

            # 4. 전송할 데이터 패키징
            payload = {
                "image": data_url,
                "pose_analysis": pose_analysis,
                "timestamp": message.get("timestamp", ""), # 있다면
            }

            # 5. 클라이언트로 전송
            await websocket.send_json(payload)
            
            # 과도한 CPU 사용 방지 (프레임 레이트 조절)
            await asyncio.sleep(0.01)

    except WebSocketDisconnect:
        print("Side Client disconnected")
    except Exception as e:
        print(f"Side WebSocket Error: {e}")
        try:
            await websocket.close()
        except:
            pass


@router.websocket("/ws/result-air")
async def websocket_result_air(websocket: WebSocket):
    """공중 분석 결과 실시간 스트리밍"""
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

# ----------------------------------------------------------------
# Live View HTML Endpoints
# ----------------------------------------------------------------

@router.get("/live/side")
async def live_view_side():
    """웹소켓을 통해 실시간으로 측면 결과를 보여주는 페이지"""
    html = _get_live_monitor_html(
        title="실시간 측면 자세 분석",
        ws_endpoint="/api/v1/ws/result-side",
        mode="side"
    )
    return HTMLResponse(html)

@router.get("/live/air")
async def live_view_air():
    """웹소켓을 통해 실시간으로 공중 결과를 보여주는 페이지"""
    html = _get_live_monitor_html(
        title="실시간 공중 분석",
        ws_endpoint="/api/v1/ws/result-air",
        mode="air"
    )
    return HTMLResponse(html)


def _get_live_monitor_html(title: str, ws_endpoint: str, mode: str) -> str:
    """
    실시간 모니터링을 위한 HTML/JS 템플릿을 생성합니다.
    ws_endpoint: 접속할 웹소켓 경로 (예: /ws/result-side)
    mode: 'side' 또는 'air' (화면 구성 차이)
    """
    
    # 사이드(자세분석)용 JS 로직
    side_js_logic = """
        function updateAnalysis(data) {
            const analysisDiv = document.getElementById('analysis-content');
            const analysis = data.pose_analysis;
            
            if (!analysis || !analysis.valid_persons) {
                analysisDiv.innerHTML = '<p class="warning">감지된 사람이 없습니다.</p>';
                return;
            }

            let html = `<div class="stat-box">
                            <div class="stat-label">감지 인원</div>
                            <div class="stat-value">${analysis.valid_persons}명</div>
                        </div>`;
            
            if (analysis.average_neck_angle) {
                html += `<div class="stat-box">
                            <div class="stat-label">평균 목 각도</div>
                            <div class="stat-value">${analysis.average_neck_angle.toFixed(1)}°</div>
                         </div>`;
            }

            // 개별 인원 상세
            if (analysis.person_details) {
                analysis.person_details.forEach(p => {
                    if (!p.valid) return;
                    const status = p.posture_assessment.status;
                    const color = p.posture_assessment.color;
                    
                    html += `
                        <div class="person-card status-${color}">
                            <h4>Person #${p.person_id + 1}</h4>
                            <p>각도: <strong>${p.neck_angle.toFixed(1)}°</strong></p>
                            <p>상태: <span class="badge ${color}">${status}</span></p>
                        </div>
                    `;
                });
            }
            
            analysisDiv.innerHTML = html;
        }
    """

    # 공중(VLM)용 JS 로직
    air_js_logic = """
        function updateAnalysis(data) {
            const analysisDiv = document.getElementById('analysis-content');
            // 마크다운 줄바꿈 처리 등을 위해 replace
            const text = data.vlm_output || "분석 결과 없음";
            analysisDiv.innerHTML = `<div class="vlm-text">${text.replace(/\\n/g, '<br>')}</div>`;
        }
    """

    selected_js = side_js_logic if mode == "side" else air_js_logic

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {{ font-family: -apple-system, system-ui, sans-serif; background: #1a1a2e; color: #fff; margin: 0; padding: 20px; }}
            .container {{ max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }}
            @media (max-width: 768px) {{ .container {{ grid-template-columns: 1fr; }} }}
            
            .card {{ background: #16213e; border-radius: 15px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }}
            h1 {{ text-align: center; margin-bottom: 30px; color: #e94560; }}
            h2 {{ border-bottom: 2px solid #0f3460; padding-bottom: 10px; margin-top: 0; }}
            
            /* 이미지 영역 */
            #image-container img {{ width: 100%; height: auto; border-radius: 10px; display: block; }}
            
            /* 분석 결과 영역 */
            .stat-box {{ background: #0f3460; padding: 15px; border-radius: 10px; margin-bottom: 10px; text-align: center; }}
            .stat-label {{ font-size: 0.9rem; color: #a0a0a0; }}
            .stat-value {{ font-size: 1.5rem; font-weight: bold; color: #fff; }}
            
            .person-card {{ background: #1a1a2e; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 5px solid gray; }}
            .status-green {{ border-left-color: #10b981; }}
            .status-yellow {{ border-left-color: #fbbf24; }}
            .status-orange {{ border-left-color: #f97316; }}
            .status-red {{ border-left-color: #ef4444; }}
            
            .badge {{ padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: #000; font-weight: bold; background: #ccc; }}
            .badge.green {{ background: #10b981; }}
            .badge.yellow {{ background: #fbbf24; }}
            .badge.orange {{ background: #f97316; }}
            .badge.red {{ background: #ef4444; }}
            
            .vlm-text {{ line-height: 1.6; font-size: 1.1rem; }}
            
            /* 연결 상태 표시 */
            #connection-status {{ position: fixed; top: 10px; right: 10px; padding: 5px 15px; border-radius: 20px; font-size: 0.8rem; }}
            .connected {{ background: #10b981; color: white; }}
            .disconnected {{ background: #ef4444; color: white; }}
        </style>
    </head>
    <body>
        <div id="connection-status" class="disconnected">Disconnected</div>
        <h1>{title}</h1>
        
        <div class="container">
            <div class="card">
                <h2>Live Feed</h2>
                <div id="image-container">
                    <img id="live-image" src="" alt="Waiting for stream..." />
                </div>
            </div>
            
            <div class="card">
                <h2>Analysis Data</h2>
                <div id="analysis-content">
                    <p>데이터 수신 대기 중...</p>
                </div>
            </div>
        </div>

        <script>
            const statusDiv = document.getElementById('connection-status');
            const imgElement = document.getElementById('live-image');
            
            let socket;
            let reconnectInterval = 1000;

            function connect() {{
                // 현재 호스트에 맞춰 웹소켓 주소 생성
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${{protocol}}//${{window.location.host}}{ws_endpoint}`;
                
                socket = new WebSocket(wsUrl);

                socket.onopen = function(e) {{
                    statusDiv.textContent = "Connected";
                    statusDiv.className = "connected";
                    reconnectInterval = 1000; // 재접속 주기 초기화
                }};

                socket.onmessage = function(event) {{
                    const data = JSON.parse(event.data);
                    
                    // 1. 이미지 업데이트
                    if (data.image) {{
                        imgElement.src = data.image;
                    }}
                    
                    // 2. 분석 정보 업데이트 (모드별 함수 호출)
                    updateAnalysis(data);
                }};

                socket.onclose = function(event) {{
                    statusDiv.textContent = "Disconnected (Reconnecting...)";
                    statusDiv.className = "disconnected";
                    setTimeout(connect, reconnectInterval);
                    reconnectInterval = Math.min(reconnectInterval * 2, 5000); // 백오프
                }};

                socket.onerror = function(error) {{
                    console.error(`WebSocket Error: ${{error}}`);
                    socket.close();
                }};
            }}

            // 모드별 분석 로직 주입
            {selected_js}

            // 시작
            connect();
        </script>
    </body>
    </html>
    """