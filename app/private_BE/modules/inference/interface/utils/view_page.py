from fastapi.responses import HTMLResponse


def nothing():
    return HTMLResponse(
                content="""
                <html>
                <head><meta charset="utf-8"><title>Waiting…</title></head>
                <body style="font-family: system-ui, sans-serif; padding: 24px;">
                    <h2>대기 중…</h2>
                    <p>표시할 결과가 아직 큐에 없습니다.</p>
                </body>
                </html>
                """,
                status_code=200,
            )
    

def show_image(data_url: str, message_html: str) -> str:
    html_page = f"""
    <html>
      <head>
        <meta charset="utf-8">
        <title>Inference Result</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {{
            font-family: system-ui, sans-serif;
            padding: 24px;
            background: #f7f7f8;
          }}
          .card {{
            max-width: 960px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.08);
            padding: 20px;
          }}
          img {{
            max-width: 100%;
            height: auto;
            border-radius: 12px;
            display: block;
            margin: 0 auto;
          }}
          .message {{
            margin-top: 16px;
            font-size: 16px;
            color: #222;
            white-space: pre-wrap;
            text-align: center;
          }}
          .toolbar {{
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
            justify-content: flex-end;
          }}
          button {{
            padding: 8px 12px;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
            background: #fff;
            cursor: pointer;
          }}
          button:hover {{
            background: #f3f4f6;
          }}
        </style>
      </head>
      <body>
        <div class="card">
          <div class="toolbar">
            <button onclick="location.reload()">새로고침</button>
          </div>
          <div class="message"><strong>결과 메시지:</strong><br>{message_html}</div>
          <img src="{data_url}" alt="inference image" />
          <div class="message"><strong>추론 결과:</strong><br>{message_html}</div>
        </div>
      </body>
    </html>
    """
    return html_page


def get_live_monitor_html(title: str, ws_endpoint: str, mode: str) -> str:
    """
    실시간 모니터링을 위한 HTML/JS 템플릿을 생성합니다.
    ws_endpoint: 접속할 웹소켓 경로 (예: /ws/result-side)
    mode: 'side' 또는 'air' (화면 구성 차이)
    """
    
    # 사이드(자세분석)용 JS 로직
    side_js_logic = """
        function updateAnalysis(data) {
            const analysisDiv = document.getElementById('analysis-content');
            const analysis = data.pose_analysis;
            
            if (!analysis || !analysis.valid_persons) {
                analysisDiv.innerHTML = '<p class="warning">감지된 사람이 없습니다.</p>';
                return;
            }

            let html = `<div class="stat-box">
                            <div class="stat-label">감지 인원</div>
                            <div class="stat-value">${analysis.valid_persons}명</div>
                        </div>`;
            
            if (analysis.average_neck_angle) {
                html += `<div class="stat-box">
                            <div class="stat-label">평균 목 각도</div>
                            <div class="stat-value">${analysis.average_neck_angle.toFixed(1)}°</div>
                         </div>`;
            }

            // 개별 인원 상세
            if (analysis.person_details) {
                analysis.person_details.forEach(p => {
                    if (!p.valid) return;
                    const status = p.posture_assessment.status;
                    const color = p.posture_assessment.color;
                    
                    html += `
                        <div class="person-card status-${color}">
                            <h4>Person #${p.person_id + 1}</h4>
                            <p>각도: <strong>${p.neck_angle.toFixed(1)}°</strong></p>
                            <p>상태: <span class="badge ${color}">${status}</span></p>
                        </div>
                    `;
                });
            }
            
            analysisDiv.innerHTML = html;
        }
    """

    # 공중(VLM)용 JS 로직
    air_js_logic = """
        function updateAnalysis(data) {
            const analysisDiv = document.getElementById('analysis-content');
            // 마크다운 줄바꿈 처리 등을 위해 replace
            const text = data.vlm_output || "분석 결과 없음";
            analysisDiv.innerHTML = `<div class="vlm-text">${text.replace(/\\n/g, '<br>')}</div>`;
        }
    """

    selected_js = side_js_logic if mode == "side" else air_js_logic

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {{ font-family: -apple-system, system-ui, sans-serif; background: #1a1a2e; color: #fff; margin: 0; padding: 20px; }}
            .container {{ max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }}
            @media (max-width: 768px) {{ .container {{ grid-template-columns: 1fr; }} }}
            
            .card {{ background: #16213e; border-radius: 15px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }}
            h1 {{ text-align: center; margin-bottom: 30px; color: #e94560; }}
            h2 {{ border-bottom: 2px solid #0f3460; padding-bottom: 10px; margin-top: 0; }}
            
            /* 이미지 영역 */
            #image-container img {{ width: 100%; height: auto; border-radius: 10px; display: block; }}
            
            /* 분석 결과 영역 */
            .stat-box {{ background: #0f3460; padding: 15px; border-radius: 10px; margin-bottom: 10px; text-align: center; }}
            .stat-label {{ font-size: 0.9rem; color: #a0a0a0; }}
            .stat-value {{ font-size: 1.5rem; font-weight: bold; color: #fff; }}
            
            .person-card {{ background: #1a1a2e; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 5px solid gray; }}
            .status-green {{ border-left-color: #10b981; }}
            .status-yellow {{ border-left-color: #fbbf24; }}
            .status-orange {{ border-left-color: #f97316; }}
            .status-red {{ border-left-color: #ef4444; }}
            
            .badge {{ padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: #000; font-weight: bold; background: #ccc; }}
            .badge.green {{ background: #10b981; }}
            .badge.yellow {{ background: #fbbf24; }}
            .badge.orange {{ background: #f97316; }}
            .badge.red {{ background: #ef4444; }}
            
            .vlm-text {{ line-height: 1.6; font-size: 1.1rem; }}
            
            /* 연결 상태 표시 */
            #connection-status {{ position: fixed; top: 10px; right: 10px; padding: 5px 15px; border-radius: 20px; font-size: 0.8rem; }}
            .connected {{ background: #10b981; color: white; }}
            .disconnected {{ background: #ef4444; color: white; }}
        </style>
    </head>
    <body>
        <div id="connection-status" class="disconnected">Disconnected</div>
        <h1>{title}</h1>
        
        <div class="container">
            <div class="card">
                <h2>Live Feed</h2>
                <div id="image-container">
                    <img id="live-image" src="" alt="Waiting for stream..." />
                </div>
            </div>
            
            <div class="card">
                <h2>Analysis Data</h2>
                <div id="analysis-content">
                    <p>데이터 수신 대기 중...</p>
                </div>
            </div>
        </div>

        <script>
            const statusDiv = document.getElementById('connection-status');
            const imgElement = document.getElementById('live-image');
            
            let socket;
            let reconnectInterval = 1000;

            function connect() {{
                // 현재 호스트에 맞춰 웹소켓 주소 생성
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${{protocol}}//${{window.location.host}}{ws_endpoint}`;
                
                socket = new WebSocket(wsUrl);

                socket.onopen = function(e) {{
                    statusDiv.textContent = "Connected";
                    statusDiv.className = "connected";
                    reconnectInterval = 1000; // 재접속 주기 초기화
                }};

                socket.onmessage = function(event) {{
                    const data = JSON.parse(event.data);
                    
                    // 1. 이미지 업데이트
                    if (data.image) {{
                        imgElement.src = data.image;
                    }}
                    
                    // 2. 분석 정보 업데이트 (모드별 함수 호출)
                    updateAnalysis(data);
                }};

                socket.onclose = function(event) {{
                    statusDiv.textContent = "Disconnected (Reconnecting...)";
                    statusDiv.className = "disconnected";
                    setTimeout(connect, reconnectInterval);
                    reconnectInterval = Math.min(reconnectInterval * 2, 5000); // 백오프
                }};

                socket.onerror = function(error) {{
                    console.error(`WebSocket Error: ${{error}}`);
                    socket.close();
                }};
            }}

            // 모드별 분석 로직 주입
            {selected_js}

            // 시작
            connect();
        </script>
    </body>
    </html>
    """