import math
import numpy as np # 클리핑(자르기)을 위해 사용

class PillowControlModel:
    # ----------------------------------------------------
    # 1. 초기 상수 설정 (팀과 합의된 고정값)
    # ----------------------------------------------------
    HR_REF = 50.0       # H_Rref: 초기 기준 심박수 (예: 50 bpm)
    DELTA_HR = 10.0     # ΔHR: 허용 심박수 대역 (±10 bpm)
    GAMMA_MIN = 0.2     # γ_min: 최소 보정 계수
    GAMMA_MAX = 0.5     # γ_max: 최대 보정 계수
    KP_CONTROL = 0.8    # P-제어 이득 (튜닝이 필요하며, 초기값으로 시작)
    OUTPUT_LIMIT = 5.0  # 모터 출력 제한 (예: ±5mm/s 또는 단위)
    ANGLE_50_DEGREE = 50.0 # D 계산을 위한 기준 각도 (50°)
    
    def __init__(self, CA0_initial):
        """초기 목표 각도(CA0)와 초기 감마(0.3) 설정"""
        self.CA0 = CA0_initial
        self.gamma = 0.3 # 자료에 따라 초기 γ = 0.3으로 시작
        
    def _clip(self, value, min_val, max_val):
        """값을 주어진 범위 [min_val, max_val]로 자르는 함수 (clip)"""
        return max(min_val, min(value, max_val))

    # ----------------------------------------------------
    # 2. 상태 점수 S 계산 (안정성 측정)
    # ----------------------------------------------------
    def calculate_state_score(self, HR_med):
        """심박수 중앙값(HR_med)을 이용해 상태 점수 S (0~1)를 계산"""
        # S = (1 - |HR_med - HR_ref| / ΔHR)
        score = 1.0 - abs(HR_med - self.HR_REF) / self.DELTA_HR
        
        # S는 0과 1 사이로 잘라야 합니다.
        return self._clip(score, 0.0, 1.0)

    # ----------------------------------------------------
    # 3. 최종 목표 각도 CA* 계산 (핵심 보정 로직)
    # ----------------------------------------------------
    def calculate_final_target_angle(self, HR_med, CVA_upright):
        """S, γ, D를 계산하여 최종 목표 각도 CA*를 반환"""
        
        # 1. 상태 점수 S 계산
        S = self.calculate_state_score(HR_med)
        
        # 2. 보정 계수 γ 업데이트 (S에 따라 보정 강도 결정)
        # γ = γ_min + (γ_max - γ_min) * S
        gamma_range = self.GAMMA_MAX - self.GAMMA_MIN
        gamma_update = self.GAMMA_MIN + gamma_range * S
        self.gamma = self._clip(gamma_update, self.GAMMA_MIN, self.GAMMA_MAX)
        
        # 3. D 값 계산 (50도 기준, 50도보다 작을 때만 보정 D > 0)
        # D = max(0, 50° - CVA_upright)
        D = max(0.0, self.ANGLE_50_DEGREE - CVA_upright)
        
        # 4. 최종 목표 각도 CA* 계산
        # CA* = CA0 + γ * D
        CA_star = self.CA0 + self.gamma * D
        
        # 현재 계산된 γ 값과 CA* 값을 저장하거나 로그로 출력합니다.
        return CA_star

    # ----------------------------------------------------
    # 4. 제어 명령 U 생성 (P-제어)
    # ----------------------------------------------------
    def generate_control_command(self, current_angle, final_target_angle):
        """
        각도 기반 P-제어를 통해 베개 모터 명령(U)을 생성
        """
        # 1. 오차 계산 (Error)
        error = final_target_angle - current_angle
        
        # 2. P 제어 명령 U 계산: U = Kp * error
        control_output = self.KP_CONTROL * error
        
        # 3. 출력 제한 적용
        control_output = self._clip(control_output, -self.OUTPUT_LIMIT, self.OUTPUT_LIMIT)
        
        return control_output
