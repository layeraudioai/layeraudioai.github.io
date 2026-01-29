#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 3000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"LayerAudio server running at http://localhost:{PORT}")
    httpd.serve_forever()
