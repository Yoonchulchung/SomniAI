def show_side_result(data_url: str, angle_info_html: str, pose_analysis: dict) -> str:
    """측면 결과 페이지를 생성합니다 (개선된 UI)."""

    # 상태에 따른 색상 매핑
    color_styles = """
        .status-green { border-left: 5px solid #10b981; background: #f0fdf4; }
        .status-yellow { border-left: 5px solid #fbbf24; background: #fefce8; }
        .status-orange { border-left: 5px solid #f97316; background: #fff7ed; }
        .status-red { border-left: 5px solid #ef4444; background: #fef2f2; }
    """

    html_page = f"""
    <html>
      <head>
        <meta charset="utf-8">
        <title>측면 자세 분석 결과</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }}

          body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 24px;
          }}

          .container {{
            max-width: 1400px;
            margin: 0 auto;
          }}

          .header {{
            text-align: center;
            color: white;
            margin-bottom: 32px;
          }}

          .header h1 {{
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 8px;
          }}

          .header p {{
            font-size: 1.1rem;
            opacity: 0.9;
          }}

          .content {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 24px;
          }}

          @media (max-width: 1024px) {{
            .content {{
              grid-template-columns: 1fr;
            }}
          }}

          .card {{
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            padding: 28px;
            transition: transform 0.3s ease;
          }}

          .card:hover {{
            transform: translateY(-5px);
          }}

          .card h2 {{
            font-size: 1.5rem;
            color: #1f2937;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 3px solid #667eea;
          }}

          .image-container {{
            position: relative;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          }}

          .image-container img {{
            width: 100%;
            height: auto;
            display: block;
          }}

          .analysis-card {{
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            padding: 28px;
          }}

          .summary {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 24px;
          }}

          .summary h3 {{
            font-size: 1.4rem;
            margin-bottom: 16px;
          }}

          .summary .stat {{
            font-size: 1.1rem;
            margin: 8px 0;
            opacity: 0.95;
          }}

          .summary strong {{
            font-size: 2rem;
            font-weight: 700;
          }}

          .person-detail {{
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 16px;
          }}

          {color_styles}

          .person-detail h4 {{
            color: #1f2937;
            font-size: 1.2rem;
            margin-bottom: 12px;
          }}

          .person-detail p {{
            margin: 8px 0;
            color: #374151;
            line-height: 1.6;
          }}

          .person-detail .angle {{
            font-size: 1.1rem;
          }}

          .person-detail .status {{
            font-size: 1rem;
          }}

          .person-detail .description {{
            font-style: italic;
            color: #6b7280;
            margin-top: 12px;
          }}

          .keypoints-info {{
            background: #f9fafb;
            padding: 16px;
            border-radius: 8px;
            margin-top: 16px;
          }}

          .keypoints-info h5 {{
            color: #374151;
            font-size: 0.95rem;
            margin-bottom: 8px;
            font-weight: 600;
          }}

          .keypoints-info ul {{
            list-style: none;
            padding-left: 0;
          }}

          .keypoints-info li {{
            padding: 6px 0;
            color: #6b7280;
            font-size: 0.9rem;
            font-family: 'Monaco', 'Courier New', monospace;
          }}

          .toolbar {{
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-top: 24px;
          }}

          button {{
            padding: 14px 28px;
            border-radius: 12px;
            border: none;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }}

          button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
          }}

          button:active {{
            transform: translateY(0);
          }}

          .error, .warning {{
            padding: 16px;
            border-radius: 8px;
            margin: 16px 0;
          }}

          .error {{
            background: #fef2f2;
            color: #991b1b;
            border-left: 4px solid #ef4444;
          }}

          .warning {{
            background: #fefce8;
            color: #854d0e;
            border-left: 4px solid #fbbf24;
          }}

          .legend {{
            background: #f9fafb;
            padding: 20px;
            border-radius: 12px;
            margin-top: 16px;
          }}

          .legend h4 {{
            color: #374151;
            margin-bottom: 12px;
            font-size: 1rem;
          }}

          .legend-item {{
            display: flex;
            align-items: center;
            margin: 8px 0;
            font-size: 0.9rem;
            color: #6b7280;
          }}

          .legend-color {{
            width: 20px;
            height: 20px;
            border-radius: 4px;
            margin-right: 10px;
          }}

          .legend-color.green {{ background: #10b981; }}
          .legend-color.yellow {{ background: #fbbf24; }}
          .legend-color.orange {{ background: #f97316; }}
          .legend-color.red {{ background: #ef4444; }}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>측면 자세 분석 결과</h1>
            <p>Pose Estimation 기반 목 각도 측정</p>
          </div>

          <div class="content">
            <div class="card">
              <h2>시각화 결과</h2>
              <div class="image-container">
                <img src="{data_url}" alt="pose estimation result" />
              </div>

              <div class="legend">
                <h4>상태 기준</h4>
                <div class="legend-item">
                  <div class="legend-color green"></div>
                  <span>Normal (0-15°): 정상 자세</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color yellow"></div>
                  <span>Mild FHP (15-30°): 경미한 거북목</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color orange"></div>
                  <span>Moderate FHP (30-45°): 중등도 거북목</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color red"></div>
                  <span>Severe FHP (45°+): 심한 거북목</span>
                </div>
              </div>
            </div>

            <div class="card">
              <h2>분석 결과</h2>
              {angle_info_html}
            </div>
          </div>

          <div class="toolbar">
            <button onclick="location.reload()">새로고침</button>
            <button onclick="window.print()">결과 저장 (인쇄)</button>
          </div>
        </div>
      </body>
    </html>
    """
    return html_page
