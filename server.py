#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 3000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class RedirectHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        host = self.headers.get('Host', '')
        # Force HTTPS redirect for any domain (not just localhost development)
        if self.headers.get('X-Forwarded-Proto') == 'http' or (host and 'localhost' not in host and '127.0.0.1' not in host):
            self.send_response(301)
            protocol = 'https' if self.headers.get('X-Forwarded-Proto') else 'https'
            self.send_header('Location', f'{protocol}://{host}{self.path}')
            self.end_headers()
            return
        # Add HSTS header for secure redirect
        self.send_response(200)
        self.send_header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.end_headers()
        # Serve the file
        super().do_GET()
    
    def do_HEAD(self):
        host = self.headers.get('Host', '')
        # Force HTTPS redirect for any domain (not just localhost development)
        if self.headers.get('X-Forwarded-Proto') == 'http' or (host and 'localhost' not in host and '127.0.0.1' not in host):
            self.send_response(301)
            protocol = 'https' if self.headers.get('X-Forwarded-Proto') else 'https'
            self.send_header('Location', f'{protocol}://{host}{self.path}')
            self.end_headers()
            return
        # Add HSTS header
        self.send_response(200)
        self.send_header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
        self.end_headers()

Handler = RedirectHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"LayAI server running at http://localhost:{PORT}")
    print(f"HTTP requests to layai.ca will redirect to HTTPS")
    httpd.serve_forever()
