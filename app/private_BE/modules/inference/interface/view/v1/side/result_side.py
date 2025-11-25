import asyncio

from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse

from modules.inference.application.process import SideProcess
from modules.inference.application.registry import get_cfg
from modules.inference.infrastructure.ai.dataset import Dataset
from modules.inference.interface.utils.converter import cv2_to_data_url
from modules.inference.interface.utils.view_page import get_live_monitor_html, nothing
from modules.inference.interface.view.v1.side.html import show_side_result

router = APIRouter()

cfg = get_cfg()

async def get_DataSet():
    return Dataset(cfg.AI)

@router.get("/result-side")
async def result_side(request: Request, dataset=Depends(get_DataSet)):
    gpu = SideProcess.get_instance()

    img, message = await gpu.get_result()
    if not message:
        return nothing()

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

    page = show_side_result(data_url=data_url, angle_info_html=angle_info_html, pose_analysis=pose_analysis)
    return HTMLResponse(page)    


@router.get("/result-side-json")
async def result_side_json(dataset=Depends(get_DataSet)):
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

    # image -> base64
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

@router.websocket("/ws/result-side")
async def websocket_result_side(websocket: WebSocket, dataset=Depends(get_DataSet)):
    await websocket.accept()
    gpu = SideProcess.get_instance()
    
    try:
        while True:
            img, message = await gpu.get_result()
            
            if not message or img is None:
                # 데이터가 없으면 잠시 대기 후 재시도
                await asyncio.sleep(0.05)
                continue

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

            # cv2 image -> base64 string
            data_url = cv2_to_data_url(out, format="PNG")

            payload = {
                "image": data_url,
                "pose_analysis": pose_analysis,
                "timestamp": message.get("timestamp", ""),
            }

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

@router.get("/live/side")
async def live_view_side():
    """웹소켓을 통해 실시간으로 측면 결과를 보여주는 페이지"""

    html = get_live_monitor_html(
        title="실시간 측면 자세 분석",
        ws_endpoint="/api/v1/ws/result-side",
        mode="side"
    )
    return HTMLResponse(html)


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


