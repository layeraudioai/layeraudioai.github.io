#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 3000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class RedirectHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Redirect to HTTPS for layai.ca domain
        host = self.headers.get('Host', '')
        if 'layai.ca' in host:
            self.send_response(301)
            self.send_header('Location', f'https://{host}{self.path}')
            self.end_headers()
            return
        # Otherwise serve normally
        super().do_GET()
    
    def do_HEAD(self):
        # Redirect to HTTPS for layai.ca domain
        host = self.headers.get('Host', '')
        if 'layai.ca' in host:
            self.send_response(301)
            self.send_header('Location', f'https://{host}{self.path}')
            self.end_headers()
            return
        super().do_HEAD()

Handler = RedirectHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"LayAI server running at http://localhost:{PORT}")
    print(f"HTTP requests to layai.ca will redirect to HTTPS")
    httpd.serve_forever()
