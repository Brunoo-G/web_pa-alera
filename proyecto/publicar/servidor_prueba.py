# Servidor local que imita las reglas de _redirects (/p/* → index.html)
import http.server, os, sys
RAIZ = sys.argv[1]; PUERTO = int(sys.argv[2])
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=RAIZ, **k)
    def do_GET(s):
        if s.path.startswith("/p/"): s.path = "/" + (s.path.split("?",1)[1] and "index.html?"+s.path.split("?",1)[1] if "?" in s.path else "index.html")
        return super().do_GET()
    def log_message(s, *a): pass
http.server.ThreadingHTTPServer(("127.0.0.1", PUERTO), H).serve_forever()
