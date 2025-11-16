"""
Pose Analyzer Module
측면 사진에서 pose estimation 결과를 분석하여 목 각도 등을 계산합니다.
"""
import math
from typing import Dict, List, Optional, Tuple
import numpy as np


# COCO Keypoint 인덱스
KEYPOINT_INDICES = {
    'nose': 0,
    'left_eye': 1,
    'right_eye': 2,
    'left_ear': 3,
    'right_ear': 4,
    'left_shoulder': 5,
    'right_shoulder': 6,
    'left_elbow': 7,
    'right_elbow': 8,
    'left_wrist': 9,
    'right_wrist': 10,
    'left_hip': 11,
    'right_hip': 12,
}


class PoseAnalyzer:
    """측면 자세 분석을 위한 클래스"""

    def __init__(self, confidence_threshold: float = 0.3):
        """
        Args:
            confidence_threshold: 키포인트 신뢰도 임계값
        """
        self.confidence_threshold = confidence_threshold

    def analyze_side_pose(
        self,
        keypoints: List[np.ndarray],
        scores: List[float]
    ) -> Dict:
        """
        측면 사진의 pose estimation 결과를 분석합니다.

        Args:
            keypoints: List of keypoints arrays [N, K, 3] where 3 = (x, y, confidence)
            scores: List of overall scores for each person

        Returns:
            분석 결과 딕셔너리 (각도, 키포인트 정보 등)
        """
        if not keypoints or len(keypoints) == 0:
            return {
                'success': False,
                'error': 'No keypoints detected',
                'neck_angles': [],
                'valid_persons': 0
            }

        results = {
            'success': True,
            'valid_persons': 0,
            'neck_angles': [],
            'person_details': []
        }

        # 각 사람에 대해 분석
        for person_idx, kpts in enumerate(keypoints):
            person_result = self._analyze_single_person(kpts, person_idx)

            if person_result['valid']:
                results['valid_persons'] += 1
                results['neck_angles'].append(person_result['neck_angle'])
                results['person_details'].append(person_result)

        # 평균 각도 계산
        if results['neck_angles']:
            results['average_neck_angle'] = float(np.mean(results['neck_angles']))
            results['neck_angle_std'] = float(np.std(results['neck_angles']))
        else:
            results['average_neck_angle'] = None
            results['neck_angle_std'] = None

        return results

    def _analyze_single_person(
        self,
        keypoints: np.ndarray,
        person_idx: int
    ) -> Dict:
        """
        한 사람의 키포인트를 분석하여 목 각도를 계산합니다.

        Args:
            keypoints: [K, 3] array (x, y, confidence)
            person_idx: 사람 인덱스

        Returns:
            개인 분석 결과
        """
        result = {
            'person_id': person_idx,
            'valid': False,
            'neck_angle': None,
            'keypoints_used': {},
            'warnings': []
        }

        # 필요한 키포인트 추출
        ear_left = self._get_keypoint(keypoints, 'left_ear')
        ear_right = self._get_keypoint(keypoints, 'right_ear')
        shoulder_left = self._get_keypoint(keypoints, 'left_shoulder')
        shoulder_right = self._get_keypoint(keypoints, 'right_shoulder')

        # 측면 사진에서 보이는 쪽의 키포인트 선택
        ear, ear_side = self._select_visible_side(
            ear_left, ear_right, 'ear'
        )
        shoulder, shoulder_side = self._select_visible_side(
            shoulder_left, shoulder_right, 'shoulder'
        )

        # 키포인트 검증
        if ear is None or shoulder is None:
            result['warnings'].append('Required keypoints (ear, shoulder) not detected')
            return result

        result['keypoints_used'] = {
            'ear': {'x': float(ear[0]), 'y': float(ear[1]), 'conf': float(ear[2]), 'side': ear_side},
            'shoulder': {'x': float(shoulder[0]), 'y': float(shoulder[1]), 'conf': float(shoulder[2]), 'side': shoulder_side}
        }

        # 목 각도 계산 (Forward Head Posture angle)
        neck_angle = self._calculate_neck_angle(ear, shoulder)

        if neck_angle is not None:
            result['valid'] = True
            result['neck_angle'] = neck_angle
            result['posture_assessment'] = self._assess_posture(neck_angle)
        else:
            result['warnings'].append('Failed to calculate neck angle')

        return result

    def _get_keypoint(
        self,
        keypoints: np.ndarray,
        keypoint_name: str
    ) -> Optional[np.ndarray]:
        """
        키포인트를 가져오고 신뢰도를 확인합니다.

        Args:
            keypoints: [K, 3] array
            keypoint_name: 키포인트 이름

        Returns:
            [x, y, confidence] 또는 None
        """
        if keypoint_name not in KEYPOINT_INDICES:
            return None

        idx = KEYPOINT_INDICES[keypoint_name]

        if idx >= len(keypoints):
            return None

        kpt = keypoints[idx]

        # 신뢰도 확인 (3번째 값)
        if len(kpt) >= 3 and kpt[2] < self.confidence_threshold:
            return None

        # 좌표가 유효한지 확인
        if kpt[0] <= 0 or kpt[1] <= 0:
            return None

        return kpt

    def _select_visible_side(
        self,
        left_kpt: Optional[np.ndarray],
        right_kpt: Optional[np.ndarray],
        keypoint_type: str
    ) -> Tuple[Optional[np.ndarray], Optional[str]]:
        """
        측면 사진에서 보이는 쪽의 키포인트를 선택합니다.
        신뢰도가 더 높은 쪽을 선택합니다.

        Args:
            left_kpt: 왼쪽 키포인트
            right_kpt: 오른쪽 키포인트
            keypoint_type: 키포인트 타입 (디버깅용)

        Returns:
            (선택된 키포인트, 'left' 또는 'right')
        """
        if left_kpt is None and right_kpt is None:
            return None, None

        if left_kpt is None:
            return right_kpt, 'right'

        if right_kpt is None:
            return left_kpt, 'left'

        # 둘 다 있으면 신뢰도가 높은 쪽 선택
        if len(left_kpt) >= 3 and len(right_kpt) >= 3:
            if left_kpt[2] >= right_kpt[2]:
                return left_kpt, 'left'
            else:
                return right_kpt, 'right'

        return left_kpt, 'left'

    def _calculate_neck_angle(
        self,
        ear: np.ndarray,
        shoulder: np.ndarray
    ) -> Optional[float]:
        """
        귀와 어깨 키포인트로부터 목 각도를 계산합니다.

        측면에서 본 목의 전방 경사각 (Forward Head Posture angle)을 계산합니다.
        수직선(90도)과 귀-어깨 선 사이의 각도입니다.

        Args:
            ear: 귀 키포인트 [x, y, conf]
            shoulder: 어깨 키포인트 [x, y, conf]

        Returns:
            각도 (degree) 또는 None
        """
        try:
            # 벡터 계산: 어깨에서 귀로
            dx = ear[0] - shoulder[0]
            dy = ear[1] - shoulder[1]

            # 거리가 너무 작으면 계산 불가
            distance = math.sqrt(dx**2 + dy**2)
            if distance < 1.0:
                return None

            # 수직선과의 각도 계산
            # atan2(dx, -dy)를 사용하여 수직선 기준 각도 계산
            # -dy를 사용하는 이유: 이미지 좌표계에서 y축이 아래로 증가하기 때문
            angle_rad = math.atan2(abs(dx), abs(dy))
            angle_deg = math.degrees(angle_rad)

            return float(angle_deg)

        except Exception as e:
            print(f"Error calculating neck angle: {e}")
            return None

    def _assess_posture(self, neck_angle: float) -> Dict:
        """
        목 각도를 기반으로 자세를 평가합니다.

        Args:
            neck_angle: 목 각도 (degree)

        Returns:
            평가 결과 딕셔너리
        """
        # 목 각도 기준:
        # 0-15도: 정상 (Normal)
        # 15-30도: 경미한 전방 머리 자세 (Mild FHP)
        # 30-45도: 중등도 전방 머리 자세 (Moderate FHP)
        # 45도 이상: 심한 전방 머리 자세 (Severe FHP)

        if neck_angle < 15:
            status = 'Normal'
            level = 0
            description = '정상적인 목 자세입니다.'
            color = 'green'
        elif neck_angle < 30:
            status = 'Mild FHP'
            level = 1
            description = '경미한 거북목 증상이 있습니다.'
            color = 'yellow'
        elif neck_angle < 45:
            status = 'Moderate FHP'
            level = 2
            description = '중등도의 거북목 증상이 있습니다. 주의가 필요합니다.'
            color = 'orange'
        else:
            status = 'Severe FHP'
            level = 3
            description = '심한 거북목 증상이 있습니다. 교정이 필요합니다.'
            color = 'red'

        return {
            'status': status,
            'level': level,
            'description': description,
            'color': color,
            'angle': float(neck_angle)
        }


def create_pose_analyzer(confidence_threshold: float = 0.3) -> PoseAnalyzer:
    """PoseAnalyzer 인스턴스를 생성합니다."""
    return PoseAnalyzer(confidence_threshold=confidence_threshold)
