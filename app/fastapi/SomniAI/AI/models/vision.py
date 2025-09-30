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
        self.model.to(cfg.DEVICE).eval()
        
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

        self.model = YOLO(self.cfg.MODEL_ID)

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

        # bboxes, scores
        bboxes = r.boxes.xyxy.cpu().numpy() if r.boxes is not None else np.zeros((0, 4), dtype=np.float32)
        scores = r.boxes.conf.cpu().numpy() if r.boxes is not None else np.zeros((0,), dtype=np.float32)

        return r, keypoints, list(scores), bboxes
    

@vision_register.register("MMPose")
class MMPoseAdapter(BasePoseAdapter):
    def build(self):
        try:
            from mmpose.apis import init_model
        except Exception as e:
            raise ImportError("mmpose가 필요합니다: `pip install mmpose -U`") from e

        if not self.cfg.MODEL_CFG_PATH or not self.cfg.CHECKPOINT:
            raise ValueError("MMPose는 cfg(.py/.yaml)와 checkpoint(.pth)가 필요합니다")

        self.model = init_model(self.cfg.MODEL_CFG_PATH, self.cfg.CHECKPOINT, device=self.cfg.DEVICE)

    @torch.inference_mode()
    def predict(self, img : Image.Image):
        from mmpose.apis import inference_topdown
        from mmpose.structures import PoseDataSample

        np_img = np.array(img)[:, :, ::-1]  # RGB->BGR
        
        # Only One person
        h, w = np_img.shape[:2]
        pred_instances = [dict(bbox=np.array([0, 0, w, h], dtype=np.float32))]

        result: List[PoseDataSample] = inference_topdown(self.model, np_img, pred_instances)

        keypoints, scores, bboxes = [], [], []
        for ds in result:
            if not hasattr(ds, "pred_instances"):
                continue
            inst = ds.pred_instances
            if not hasattr(inst, "keypoints"):
                continue
            kpts = inst.keypoints.numpy()  # [K, 2]
            kcon = inst.keypoint_scores.numpy() if hasattr(inst, "keypoint_scores") else np.ones((kpts.shape[0],))
            # [K, 3] (x, y, conf)
            kpts_xyc = np.concatenate([kpts, kcon[:, None]], axis=1)
            keypoints.append(kpts_xyc)
            scores.append(float(np.mean(kcon)))
            if hasattr(inst, "bboxes") and inst.bboxes is not None:
                bboxes.append(inst.bboxes.numpy()[0])
            else:
                bboxes.append(np.array([0, 0, w, h], dtype=np.float32))

        bboxes = np.stack(bboxes, axis=0) if bboxes else np.zeros((0, 4), dtype=np.float32)
        return keypoints, scores, bboxes