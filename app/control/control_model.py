import math 

# 1. 각도 계산 (클래스 밖에서 정의)
# ----------------------------------------------------
def calculate_angle(p1_coords, p2_coords):
    """두 점의 좌표를 받아 수평선과의 각도(도, Degree)를 계산"""
    x1, y1 = p1_coords
    x2, y2 = p2_coords
    
    delta_x = x2 - x1
    delta_y = y2 - y1
    
    # atan2를 이용해 라디안 각도 계산 (부호와 사분면을 고려)
    theta_radians = math.atan2(delta_y, delta_x)
    
    # 각도를 '도(Degree)'로 변환
    theta_degrees = math.degrees(theta_radians)
    
    return theta_degrees

# ----------------------------------------------------
# 2.메인 제어 모델 클래스
# ----------------------------------------------------
class PillowControlModel:
 
    # 1. 초기 상수 설정 (팀과 합의된 고정값)
    # ----------------------------------------------------
    HR_REF = 50.0        # H_Rref: 초기 기준 심박수
    DELTA_HR = 10.0      # ΔHR: 허용 심박수 대역
    GAMMA_MIN = 0.2      # γ_min: 최소 보정 계수
    GAMMA_MAX = 0.5      # γ_max: 최대 보정 계수
    KP_CONTROL = 0.8     # P-제어 이득 (튜닝 필요)
    OUTPUT_LIMIT = 5.0   # 모터 출력 제한
    ANGLE_50_DEGREE = 50.0 # D 계산을 위한 기준 각도 (50°)
    
    def __init__(self, CA0_initial):
        """초기 목표 각도(CA0)와 초기 감마(0.3) 설정"""
        self.CA0 = CA0_initial
        self.gamma = 0.3 # 초기 γ = 0.3
        
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
        return self._clip(score, 0.0, 1.0) # S ∈ [0, 1]

    # ----------------------------------------------------
    # 3. 최종 목표 각도 CA* 계산 (핵심 로직: D와 γ 도출)
    # ----------------------------------------------------
    def calculate_final_target_angle(self, HR_med, CVA_upright):
        """
        심박수(HR)와 현재 자세(CVA)를 결합하여 최종 목표 각도 CA*를 계산합니다.
        """
        
        # 1. 자세 분석 단계: D 값 도출 (D = max(0, 50° - CVA_upright))
        D = max(0.0, self.ANGLE_50_DEGREE - CVA_upright)

        # 2. 생체 신호 분석 단계: S 값 도출
        S = self.calculate_state_score(HR_med)
        
        # 3. 최종 보정 계수 도출: γ 업데이트 (γ = γ_min + (γ_max - γ_min) * S)
        gamma_range = self.GAMMA_MAX - self.GAMMA_MIN
        gamma_update = self.GAMMA_MIN + gamma_range * S
        self.gamma = self._clip(gamma_update, self.GAMMA_MIN, self.GAMMA_MAX)
        
        # 4. 최종 목표 각도 CA* 계산 (CA* = CA0 + γ * D)
        CA_star = self.CA0 + self.gamma * D
        
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
