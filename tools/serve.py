# Dev server for the game that tells the browser never to cache, so every reload runs the latest modules.
#   python3 frosthouse/tools/serve.py [port]   (serves frosthouse/game, default port 8086)
import functools, http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8086
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(NoCache, directory=root)).serve_forever()
