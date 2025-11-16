from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict
from PIL import Image


class IInference(ABC):
    '''
    SomniAI 서버의 AI 추론을 담당합니다. 모델 추론의 결과를 책임지는 클래스로 AI 추론의
    파이프라인을 담당해요. 어떤 모델을 사용할지는 몰라요. 입력과 출력만 알고 있는 구조에요.

    모델을 넘겨받을 때는 모델의 메타 정보가 포함되어 있어야 해요. 모델이 어떤 이미지 사이즈를 가지고
    추론하는지, 어떤 데이터 타입 형식이어야 하는지 알 수 있어야 해요.
    '''

    def __init__(self, model_loader, cfg):

        self.model_loader = model_loader
        self.cfg = cfg
        self.pose_model = self.model_loader.get_pose()

    def _pose_infer(self, img: Image.Image) -> tuple:
        '''
        HRNet 모델을 이용하여 좌표를 계산합니다.
        '''
        
        if not isinstance(img, Image.Image):
            raise ValueError("Wrong image type is inserted to Inference")

        result, keypoints, scores, bboxes = self.pose_model.predict(img)
        return result, keypoints, scores, bboxes

    @abstractmethod
    def forward(self, img: Image.Image) -> Dict:
        '''
        추론을 실행합니다. 자식 클래스에서 구현해야 합니다.
        '''

        raise NotImplementedError


class AirInference(IInference):

    '''
    항공 촬영 데이터를 위한 추론 엔진
    Pose + VLM 모델을 사용합니다.
    '''

    def __init__(self, model_loader, cfg):

        super().__init__(model_loader, cfg)
        self.vlm_model = self.model_loader.get_vlm()


    def _vlm_infer(self, img: Image.Image) -> Dict:

        '''VLM을 이용하여 추론합니다.'''

        result = self.vlm_model(img)
        return {"result": result}


    def forward(self, img: Image.Image) -> Dict:

        '''Air 추론: Pose + VLM'''
        
        pose_output = self._pose_infer(img)
        vlm_output = self._vlm_infer(img)

        return {
            "pose_output": pose_output,
            "vlm_output": vlm_output["result"],
            "model_info": {
                "vision_model": self.model_loader.get_pose_name(),
                "vlm_model": self.model_loader.get_vlm_name(),
            },
            "inference_meta": {
                "timestamp": datetime.now(),
                "device": "cuda:0",
                "type": "air"
            },
        }


class SideInference(IInference):

    '''
    측면 촬영 데이터를 위한 추론 엔진
    Pose 모델만 사용합니다.
    '''

    def __init__(self, model_loader, cfg):
        super().__init__(model_loader, cfg)
    
    
    def forward(self, img: Image.Image) -> Dict:
        '''Side 추론: Pose만'''
        
        pose_output = self._pose_infer(img)
        return {
            "pose_output": pose_output,
            "model_info": {
                "vision_model": self.model_loader.get_pose_name(),
            },
            "inference_meta": {
                "timestamp": datetime.now(),
                "device": "cuda:0",
                "type": "side"
            },
        }