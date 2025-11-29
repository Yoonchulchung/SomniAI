from PIL import Image
import cv2
import numpy as np
from types import SimpleNamespace
import json
import httpx
import asyncio


async def request_to_server(dataset, cfg, url : str, pil_img : Image.Image, results : dict) -> None:
    
    opencv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    
    pose_analysis = results.get("pose_analysis", {})
    raw_result = results.get("result")

    input_for_drawing = raw_result

    if isinstance(raw_result, dict):
        kp_data = raw_result.get('keypoints') 
        
        if kp_data is not None:
            keypoints_obj = SimpleNamespace(xy=kp_data, xyn=kp_data)
            
            input_for_drawing = SimpleNamespace(keypoints=keypoints_obj)

    if False:
        drawn_img = dataset.draw_yolo_keypoints(
            raw_result,
            opencv_img,
            draw_boxes=True,
            keypoint_radius=3,
            kpt_conf_thresh=0.2,
        )
    else:
        drawn_img = dataset.draw_mmpose_keypoints(
            cfg,
            opencv_img,
            raw_result,
            pose_analysis=pose_analysis
        )

    asyncio.create_task(
        _send_image_to_server(url, drawn_img, results)
    )


async def _send_image_to_server(url, img_cv2, results: dict):
    '''
    그려진 이미지를 인코딩하여 외부 서버로 비동기 전송
    '''
    try:
        success, encoded_img = cv2.imencode(".jpg", img_cv2)
        if not success:
            print("Failed to encode image for upload")
            return
        
        img_bytes = encoded_img.tobytes()
        
        metadata = {
            "timestamp": str(results.get("timestamp", "")),
            "pose_analysis": json.dumps(results.get("pose_analysis", {}))
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                files = {"image": ("result.jpg", img_bytes, "image/jpeg")},
                data=metadata,
                timeout=5.0 # 타임아웃 설정
            )
            
            if response.status_code == 200:
                print(f"Image uploaded successfully: {response.status_code}")
            else:
                print(f"Upload failed: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"Error sending image to server: {e}")