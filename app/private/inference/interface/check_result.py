import base64
import io

import cv2
import numpy as np
import torch
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from PIL import Image

from SomniAI.application.AI.dataset import Dataset
from SomniAI.application.process import Process
from SomniAI.application.registry import get_cfg

router = APIRouter()

cfg = get_cfg()

async def get_DataSet():
    return Dataset(cfg.AI)


@router.get("/result-side")
async def result_side(request: Request, dataset=Depends(get_DataSet)):
    gpu = Process.get_instance()
    
    img, message = await gpu.get_side_result()
    if not message:
        return _nothing()
    

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
        message["result"]
      )
    
    
    
    data_url = cv2_to_data_url(out, format="PNG")
    page = _show_image(data_url=data_url, message_html="NONE")
    return HTMLResponse(page)    


@router.get("/result-air")
async def result_air(request: Request, ):
    gpu = ProcessGPU.get_instance()
    
    img, message = await gpu.get_air_result()
    
    # try:
    #   async with httpx.AsyncClient() as client:
    #       response = await client.get("http://localhost:3000/")
    # except Exception as e:
    #   print(e)
      
    if not message:
        return _nothing()
    
    data_url = pil_to_data_url(img, fmt="PNG")

    page = _show_image(data_url=data_url, message_html=message["ans"])
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