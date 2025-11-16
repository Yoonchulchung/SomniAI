import base64
import io
from typing import Optional, Dict, Any

import cv2
import httpx
import numpy as np
import torch
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse
from PIL import Image

from inference.infrastructure.ai.dataset import Dataset
from inference.application.process import SideProcess
from inference.application.process import AirProcess
from inference.application.registry import get_cfg

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

    if cfg.AI.VISION.MODEL_NAME == "YOLO":
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
    if cfg.AI.VISION.MODEL_NAME == "YOLO":
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
                "raw_result": message.get("result")
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
                "raw_result": message
            }
        },
        status_code=200
    )