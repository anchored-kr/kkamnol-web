#!/usr/bin/env python3
"""로컬 미리보기용 정적 서버 — 캐시 비활성(개발 중 모듈 캐시 방지). 운영(Vercel)과 무관."""
import http.server, socketserver, os, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # kkamnol-web

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"devserver (no-cache) on :{PORT} root={ROOT}", flush=True)
    httpd.serve_forever()
