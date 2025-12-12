<div align='center'>
    <h1> SomniAI AI Server </h1>
</div>


## 서버 아키텍처
![architecture](./image/architecture.png)

MQTT를 이용하여 AI 서버에서 ESP32로 데이터를 전송할 수 있는 메시지 브로커를 사용했습니다.

시연 때 직관적으로 동작 과정을 파악하기 위해 아래와 같이 아키텍처를 구성하고 웹 사이트를 만들었습니다.

![Flow](./image/Flow.png)

Private BE를 이용해 MoJI에서 전달받은 이미지를 이용해 Pose Estimation으로 사용자의 자세를 추정합니다. 추정된 자세 결과를 Public FE에서 확인할 수 있습니다.  
Public BE와 Public FE는 생성형 AI를 이용해 제작되었습니다.