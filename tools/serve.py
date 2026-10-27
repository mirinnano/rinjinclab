# Local preview server that never lets the browser cache (Brave/Chrome would keep old JS/CSS).
# python3 tools/serve.py  → http://localhost:4317
import http.server, os, functools
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
http.server.ThreadingHTTPServer(("", 4317), NoCache).serve_forever()
