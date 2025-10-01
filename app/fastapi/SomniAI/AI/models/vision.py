import types
from typing import List, Tuple, Union

import numpy as np
import torch
from PIL import Image

from SomniAI.AI.registry import vision_register


class BasePoseAdapter:
    def __init__(self, cfg):
        self.cfg = cfg
        
        self.model = None
        self._build()
        
        self.half = (self.cfg.DTYPE in (torch.float16, torch.bfloat16)) and self.cfg.DEVICE == "cuda"

    def _build(self):
        raise NotImplementedError

    @torch.inference_mode()
    def predict(self, img: Union[str, np.ndarray, Image.Image]
                ) -> Tuple[List[np.ndarray], List[np.ndarray], List[np.ndarray]]:
        """Returns: keypoints[N, K, 3(x,y,conf)], scores[N], bboxes[N,4(xyxy)]"""
        raise NotImplementedError


@vision_register.register("YOLO")
class YOLOv8PoseAdapter(BasePoseAdapter):
    
    def _build(self):
        try:
            from ultralytics import YOLO
        except Exception as e:
            raise ImportError("ultralytics 가 필요합니다: `pip install ultralytics`") from e

        self.model = YOLO(self.cfg.MODEL_ID).to(self.cfg.DEVICE).eval()

    @torch.inference_mode()
    def predict(self, img: Image.Image):

        res = self.model.predict(
            img,
            imgsz=640,
            conf=self.cfg.CONF_THRES,
            iou=self.cfg.IOU_THRES,
            device=str(self.cfg.DEVICE),
            half=self.half,
            verbose=False
        )

        r = res[0]
        # keypoints: [N, K, 3]  (x, y, conf)
        kpts = r.keypoints.xyn if hasattr(r, "keypoints") and r.keypoints is not None else None
        if kpts is None:
            return [], [], [], {"backend": "yolov8", "model": self.cfg.MODEL_ID}

        # xyn -> xy (pixel) 변환
        h, w = r.orig_shape
        kpts_xyc = kpts.clone()
        kpts_xyc[..., 0] *= w
        kpts_xyc[..., 1] *= h
        keypoints = [kp.cpu().numpy() for kp in kpts_xyc]  # List[N, K, 3]
        
        print(keypoints)

        # bboxes, scores
        bboxes = r.boxes.xyxy.cpu().numpy() if r.boxes is not None else np.zeros((0, 4), dtype=np.float32)
        scores = r.boxes.conf.cpu().numpy() if r.boxes is not None else np.zeros((0,), dtype=np.float32)

        return r, keypoints, list(scores), bboxes
    

@vision_register.register("MMPose")
class MMPoseAdapter(BasePoseAdapter):
            
    def _build(self):
        from mmpose.apis import MMPoseInferencer
        
        if not self.cfg.MODEL_CFG_PATH or not self.cfg.MODEL_ID:
            raise ValueError("MMPose는 cfg(.py/.yaml)와 checkpoint(.pth)가 필요합니다")

        self.model = MMPoseInferencer(pose2d=self.cfg.MODEL_CFG_PATH, pose2d_weights=self.cfg.MODEL_ID, device=self.cfg.DEVICE)

    @torch.inference_mode()
    def predict(self, img : Image.Image) -> dict:

        w, h = img[0].size         
        img_np = np.array(img[0])
        
        # model에 Image.Image 넣으면 에러 발생.
        # PIL 대신에 numpy 사용.
        result = self.model(img_np, show=False, return_vis=False)

        keypoints, scores, bboxes = [], [], []
        for ds in result:

            if not ds["predictions"]:
                continue
            inst = ds["predictions"][0][0]  
            
            if not inst["keypoints"]:
                continue
            kpts = np.array(inst["keypoints"]) #[K, 2]
            # [K, 3] (x, y, conf)
            kcon = np.array(inst["keypoint_scores"]) if inst["keypoint_scores"] else np.ones((kpts.shape[0],)) 
            kpts_xyc = np.concatenate([kpts, kcon[:, None]], axis=1)
            keypoints.append(kpts_xyc)
            scores.append(float(np.mean(kcon)))
            
            if inst["bbox"] : 
                bboxes.append(np.array(inst["bbox"])[0]) 
            
            else: 
                bboxes.append(np.array([0, 0, w, h], dtype=np.float32))
            
            bboxes = np.stack(bboxes, axis=0) if bboxes else np.zeros((0, 4), dtype=np.float32)
            
            bbox_score = inst["bbox_score"]
            result = ds
            
        return result, keypoints, scores, bboxes