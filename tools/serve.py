"""Serve the game for development, telling the browser never to cache, so a
reload always runs the latest scripts.   python tools/serve.py [port]

POST /save/<name>.png with an image body writes it to screenshots/<name>.png
(names of letters, digits and hyphens only): how map renders get out of the
browser for review."""
import http.server, sys, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

class Dev(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        m = re.fullmatch(r"/save/([a-z0-9-]{1,60})\.png", self.path)
        if not m or self.client_address[0] != "127.0.0.1":
            self.send_error(404); return
        n = int(self.headers.get("Content-Length", 0))
        if n <= 0 or n > 40_000_000:
            self.send_error(413); return
        os.makedirs(os.path.join(ROOT, "screenshots"), exist_ok=True)
        with open(os.path.join(ROOT, "screenshots", m.group(1) + ".png"), "wb") as f:
            f.write(self.rfile.read(n))
        self.send_response(204); self.end_headers()

os.chdir(ROOT)
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
http.server.ThreadingHTTPServer(("127.0.0.1", port), Dev).serve_forever()
