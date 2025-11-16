from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.routing import APIRoute
from modules.inference.application.registry import get_cfg

router = APIRouter()
SomniAI_cfg = get_cfg()


@router.get("/", response_class=HTMLResponse)
def main(request: Request) -> HTMLResponse:
    base_url = str(request.base_url).rstrip("/")
    api_prefix = SomniAI_cfg.FASTAPI.API_PREFIX

    app = request.app 
    rows = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue

        path = route.path

        if not path.startswith(api_prefix):
            continue

        methods = sorted(m for m in route.methods if m not in {"HEAD", "OPTIONS"})
        methods_str = ", ".join(methods) if methods else ""

        summary = route.summary or route.name or ""
        tags = ", ".join(route.tags) if getattr(route, "tags", None) else ""

        rows.append({
            "path": path,
            "methods": methods_str,
            "summary": summary,
            "tags": tags,
        })

    rows.sort(key=lambda x: x["path"])

    def render_table() -> str:
        if not rows:
            return "<p>등록된 엔드포인트가 없습니다.</p>"

        trs = []
        for r in rows:
            link = f'{base_url}{r["path"]}'
            trs.append(f"""
            <tr>
              <td><a href="{link}">{r["path"]}</a></td>
              <td>{r["methods"]}</td>
              <td>{r["summary"]}</td>
              <td>{r["tags"]}</td>
            </tr>
            """)
        return """
        <table>
          <thead>
            <tr>
              <th>Path</th>
              <th>Methods</th>
              <th>Summary</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>
        """.format(rows="".join(trs))

    html_page = f"""
    <html>
      <head>
        <meta charset="utf-8" />
        <title>SomniAI API Index</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          :root {{
            --bg: #f7f7f8;
            --card: #fff;
            --text: #111827;
            --muted: #6b7280;
            --border: #e5e7eb;
          }}
          body {{
            background: var(--bg);
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji';
            padding: 24px;
            color: var(--text);
          }}
          .container {{
            max-width: 1080px;
            margin: 0 auto;
          }}
          .card {{
            background: var(--card);
            border-radius: 16px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.08);
            padding: 24px;
          }}
          h1 {{
            margin: 0 0 8px 0;
            font-size: 24px;
          }}
          .muted {{ color: var(--muted); margin-top: 0; }}
          .links {{
            display: flex;
            gap: 10px;
            margin: 12px 0 20px 0;
          }}
          .links a {{
            border: 1px solid var(--border);
            padding: 8px 12px;
            border-radius: 10px;
            text-decoration: none;
            color: var(--text);
            background: white;
          }}
          .links a:hover {{ background: #f3f4f6; }}
          table {{
            width: 100%;
            border-collapse: collapse;
            overflow: hidden;
            border-radius: 12px;
            border: 1px solid var(--border);
          }}
          th, td {{
            text-align: left;
            padding: 12px 14px;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
          }}
          thead th {{
            background: #fbfbfc;
            font-weight: 600;
          }}
          tbody tr:hover {{ background: #fafafa; }}
          td a {{
            color: #2563eb;
            text-decoration: none;
          }}
          td a:hover {{
            text-decoration: underline;
          }}
          .footer {{
            margin-top: 16px;
            font-size: 12px;
            color: var(--muted);
          }}
          .prefix {{
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            background: #f3f4f6;
            border: 1px solid var(--border);
            padding: 2px 6px;
            border-radius: 6px;
          }}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1>SomniAI API Index</h1>
            <p class="muted">아래는 <span class="prefix">{api_prefix}</span> 하위로 등록된 엔드포인트 목록입니다.</p>
            <div class="links">
              <a href="{base_url}/docs">Swagger UI (/docs)</a>
              <a href="{base_url}/redoc">ReDoc (/redoc)</a>
            </div>
            {render_table()}
            <div class="footer">
              Base URL: {base_url} • Prefix: <span class="prefix">{api_prefix}</span>
            </div>
          </div>
        </div>
      </body>
    </html>
    """
    return HTMLResponse(html_page)