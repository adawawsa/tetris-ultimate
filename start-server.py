#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        super().end_headers()

    def guess_type(self, path):
        mimetype = super().guess_type(path)
        if path.endswith('.js'):
            return 'application/javascript'
        return mimetype

print(f"Starting Tetris Ultimate server on port {PORT}...")
print(f"Serving files from: {DIRECTORY}")

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"\nServer running at http://localhost:{PORT}/")
    print("Press Ctrl+C to stop the server")
    
    # Open browser automatically
    webbrowser.open(f'http://localhost:{PORT}')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")