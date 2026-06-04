#!/usr/bin/env python3
"""Servidor local com cache desabilitado para desenvolvimento."""
import http.server, socketserver, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # silencia logs

with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
    print(f"Servidor em http://localhost:{PORT}  (Ctrl+C para parar)")
    httpd.serve_forever()
