from typing import Dict

import cv2
import numpy as np
import torch
from mmengine.structures import InstanceData
from mmpose.structures import PoseDataSample
from PIL import Image
from torchvision import transforms

COCO_SKELETON = [
    (5, 7), (7, 9),       # Left arm: L-Shoulder -> L-Elbow -> L-Wrist
    (6, 8), (8,10),       # Right arm: R-Shoulder -> R-Elbow -> R-Wrist
    (11,13), (13,15),     # Left leg: L-Hip -> L-Knee -> L-Ankle
    (12,14), (14,16),     # Right leg: R-Hip -> R-Knee -> R-Ankle
    (5,6),                # Shoulders
    (11,12),              # Hips
    (5,11), (6,12),       # Torso diagonals
    (0,1), (1,2), (2,3), (3,4), (1,5), (1,6)  # Head / Face & to shoulders
]
KP_COLOR = (0, 255, 255)   # yellow-ish
SK_COLOR = (0, 165, 255)   # orange-ish
BOX_COLOR = (0, 255, 0)    # green

class Dataset:
    
    def __init__(self, cfg):
        self.cfg = cfg
        self.transform_pipeline = transforms.Compose([
                                        transforms.ToTensor(),
                                        transforms.Normalize(mean=self.cfg.NORM_MEAN,
                                                             std=self.cfg.NORM_STD)
                                    ])

        self.normalize_only = transforms.Normalize(mean=self.cfg.NORM_MEAN,
                                                   std=self.cfg.NORM_STD)

    def preprocess(self, imgs):

        if isinstance(imgs, (Image.Image, np.ndarray)):
            return self.transform_pipeline(imgs)

        if isinstance(imgs, torch.Tensor):
            tensor = imgs

            if tensor.ndim == 4 and tensor.shape[1] == 3:

                if tensor.dtype != torch.float32:
                    tensor = tensor.float()
                if tensor.max() > 1.0:
                    tensor = tensor / 255.0

                mean = torch.tensor(self.cfg.NORM_MEAN, device=tensor.device)[None, :, None, None]
                std  = torch.tensor(self.cfg.NORM_STD, device=tensor.device)[None, :, None, None]
                tensor = (tensor - mean) / std
                return tensor

            if tensor.ndim == 3 and tensor.shape[0] == 3:
                if tensor.dtype != torch.float32:
                    tensor = tensor.float()
                if tensor.max() > 1.0:
                    tensor = tensor / 255.0
                return self.normalize_only(tensor)

            raise ValueError(f"Unsupported tensor shape {tensor.shape}, expected [3,H,W] or [B,3,H,W]")

        raise TypeError(f"Unsupported input type: {type(imgs)}")
            
    def draw_yolo_keypoints(
        self,
        yolo_result,
        image_input,
        draw_boxes: bool = False,
        keypoint_radius: int = 3,
        keypoint_thickness: int = 2,
        skeleton_thickness: int = 2,
        use_normalized: bool = False,
        kpt_conf_thresh: float = 0.0,
    ):
        """
        yolo_result: ultralytics YOLO 예측 결과 중 하나 (ex. results[0])
                    - results[i].keypoints.xy  shape: [N, 17, 2] (픽셀 좌표)
                    - results[i].keypoints.xyn shape: [N, 17, 2] (정규화 좌표)
                    - results[i].keypoints.data shape: [N, 17, 3] (x,y,conf)
                    - results[i].boxes.xyxy     shape: [N, 4]
        """

        if isinstance(image_input, Image.Image):
            image_bgr = cv2.cvtColor(np.array(image_input), cv2.COLOR_RGB2BGR)
        elif isinstance(image_input, np.ndarray):
            image_bgr = image_input
        else:
            raise TypeError(f"Unsupported image type: {type(image_input)}")
        
        h, w = image_bgr.shape[:2]
        out = image_bgr.copy()

        kps_xy = yolo_result.keypoints.xyn if use_normalized else yolo_result.keypoints.xy  # [N,17,2]
        kps_data = getattr(yolo_result.keypoints, "data", None)  # [N,17,3]

        boxes = getattr(yolo_result, "boxes", None)

        if kps_xy is None:
            return out

        kps_xy = kps_xy.cpu().numpy() if hasattr(kps_xy, "cpu") else np.asarray(kps_xy)
        if use_normalized:
            # 정규화 좌표 -> 픽셀 좌표
            kps_xy[..., 0] *= w
            kps_xy[..., 1] *= h

        kps_conf = None
        if kps_data is not None:
            arr = kps_data.cpu().numpy() if hasattr(kps_data, "cpu") else np.asarray(kps_data)
            if arr.shape[-1] == 3:
                kps_conf = arr[..., 2]  # [N,17]

        num_persons = kps_xy.shape[0]

        for i in range(num_persons):
            for a, b in COCO_SKELETON:
                if a >= kps_xy.shape[1] or b >= kps_xy.shape[1]:
                    continue

                p1 = kps_xy[i, a]
                p2 = kps_xy[i, b]

                if kps_conf is not None and kpt_conf_thresh > 0:
                    if kps_conf[i, a] < kpt_conf_thresh or kps_conf[i, b] < kpt_conf_thresh:
                        continue

                cv2.line(out, self._to_int_tuple(p1), self._to_int_tuple(p2), SK_COLOR, skeleton_thickness, cv2.LINE_AA)

            for j in range(kps_xy.shape[1]):
                if kps_conf is not None and kpt_conf_thresh > 0 and kps_conf[i, j] < kpt_conf_thresh:
                    continue
                x, y = self._to_int_tuple(kps_xy[i, j])
                cv2.circle(out, (x, y), keypoint_radius, KP_COLOR, keypoint_thickness, cv2.LINE_AA)

            if draw_boxes and boxes is not None and len(boxes) > i:
                xyxy = boxes.xyxy[i].cpu().numpy() if hasattr(boxes.xyxy, "cpu") else np.asarray(boxes.xyxy[i])
                x1, y1, x2, y2 = map(int, xyxy)
                cv2.rectangle(out, (x1, y1), (x2, y2), BOX_COLOR, 2)

        return out
    
    def _to_int_tuple(self, xy):
        return tuple(int(float(v)) for v in xy)
        

    def draw_mmpose_keypoints(self, cfg, img_bgr, pose_results : list):
        from mmengine import Config
        from mmpose.visualization import PoseLocalVisualizer

        cfg = Config.fromfile(self.cfg.VISION.MODEL_CFG_PATH)
        
        dataset_meta = cfg.get('dataset_meta', None)

        visualizer = PoseLocalVisualizer(vis_backends=None, save_dir=None)
        visualizer.set_dataset_meta(dataset_meta)
    
        img_bgr = np.array(img_bgr)
        H, W = img_bgr.shape[:2]

        pose_ds = self._dict_to_datasample(pose_results, img_shape=(H, W))

        return visualizer.add_datasample(
            name='result',
            image=img_bgr,    
            data_sample=pose_ds,
            draw_gt=False,
            draw_pred=True,
            draw_heatmap=False,
            show=False,
            out_file=None,
        )
    
    def _dict_to_datasample(self, pose_result_dict : Dict, img_shape : tuple = None) -> PoseDataSample:
       
        preds_wrapped = pose_result_dict.get('predictions', [])
        if not preds_wrapped or not preds_wrapped[0]:
            ds = PoseDataSample()
            ds.pred_instances = InstanceData()
            if img_shape is not None:
                ds.set_metainfo(dict(img_shape=img_shape))
            return ds

        preds = preds_wrapped[0]
        all_kpts, all_kpt_scores, all_bboxes, all_bbox_scores = [], [], [], []

        for p in preds:
            kpts = np.asarray(p['keypoints'], dtype=np.float32) # (K, 2)
            all_kpts.append(kpts)

            ksc = np.asarray(p.get('keypoint_scores', p.get('scores', [])), dtype=np.float32)
            if ksc.size == 0:
                ksc = np.ones((kpts.shape[0],), dtype=np.float32)
            all_kpt_scores.append(ksc)

            bbox = p.get('bbox', [0, 0, 0, 0])
            if isinstance(bbox, (list, tuple)) and len(bbox) == 1 and isinstance(bbox[0], (list, tuple)):
                bbox = bbox[0]
            bbox = np.asarray(bbox, dtype=np.float32).reshape(4)
            all_bboxes.append(bbox)

            all_bbox_scores.append(float(p.get('bbox_score', 1.0)))

        kpts_arr       = torch.from_numpy(np.stack(all_kpts, axis=0))            # float32
        kpt_scores_arr = torch.from_numpy(np.stack(all_kpt_scores, axis=0))      # float32
        bboxes_arr     = torch.from_numpy(np.stack(all_bboxes, axis=0))          # float32
        bbox_scores_ts = torch.tensor(all_bbox_scores, dtype=torch.float32)

        inst = InstanceData()
        inst.keypoints       = kpts_arr
        inst.keypoint_scores = kpt_scores_arr
        inst.bboxes          = bboxes_arr
        inst.bbox_scores     = bbox_scores_ts

        ds = PoseDataSample()
        ds.pred_instances = inst
        if img_shape is not None:
            ds.set_metainfo(dict(img_shape=img_shape))
        return ds