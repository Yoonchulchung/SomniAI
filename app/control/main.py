import grpc
import time
from concurrent import futures
import logging

# 1단계에서 컴파일된 gRPC 파일 및 구현한 제어 모델 import
import control_pb2
import control_pb2_grpc
from control_model import PillowControlModel

# 로깅 설정
logging.basicConfig(level=logging.INFO)

# ----------------------------------------------------
# gRPC 서비스 구현체 (Go 서버의 요청을 받는 역할)
# ----------------------------------------------------
class ControllerServicer(control_pb2_grpc.ControllerServicer):
    
    # 초기 설정값 (Go 서버의 초기 설정과 일치해야 함)
    CA0_INITIAL = 90.0  # 예시: 초기 목표 각도 (팀원과 협의된 값)

    def __init__(self):
        # 제어 모델 인스턴스 초기화 (베개의 두뇌)
        self.control_model = PillowControlModel(self.CA0_INITIAL)
        logging.info("Pillow Control Model Initialized (CA0=%.1f)", self.CA0_INITIAL)

    def GetControlCommand(self, request, context):
        """
        Go 서버로부터 ControlInput을 받아 ControlOutput을 반환합니다.
        """
        
        # 1. Go 서버로부터 입력 데이터 추출
        hr_med = request.hr_med
        cva_upright = request.cva_upright
        current_angle = request.current_angle
        
        logging.info(
            "Received: HR=%.1f, CVA=%.1f, Angle=%.1f", 
            hr_med, cva_upright, current_angle
        )

        # 2. 최종 목표 각도 (CA*) 계산 (수학적 알고리즘의 핵심)
        final_target_angle = self.control_model.calculate_final_target_angle(
            hr_med, cva_upright
        )
        
        # 3. 제어 명령 (U) 생성 (P-제어)
        command_u = self.control_model.generate_control_command(
            current_angle, final_target_angle
        )
        
        logging.info("Calculated: CA*=%.2f, Command U=%.2f", 
                     final_target_angle, command_u)

        # 4. Go 서버로 응답 반환
        return control_pb2.ControlOutput(command_u=command_u)

# ----------------------------------------------------
# gRPC 서버 실행
# ----------------------------------------------------
def serve():
    # 스레드 풀 생성 (동시 요청 처리)
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    
    # 서비스 등록
    control_pb2_grpc.add_ControllerServicer_to_server(
        ControllerServicer(), server
    )
    
    # 포트 설정 (Go 서버와 통신할 포트)
    # Go 서버와 Python 서버가 같은 장치에 있다면 'localhost:50052' 또는 Unix Domain Socket 사용
    # 여기서는 예시로 포트 50052 사용 (Go 서버의 gRPC 포트와 겹치지 않게)
    server.add_insecure_port('[::]:50052')
    
    logging.info("Python gRPC Control Server started on port 50052")
    server.start()
    
    # 서버가 종료되지 않도록 대기
    try:
        while True:
            time.sleep(86400) # 24시간 동안 대기
    except KeyboardInterrupt:
        server.stop(0)

if __name__ == '__main__':
    # 'CA0_INITIAL' 값은 반드시 팀원과 협의된 실제 목표 각도로 설정해야 합니다.
    serve()
