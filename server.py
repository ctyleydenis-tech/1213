from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os

KEYS_FILE = "keys.json"

if not os.path.exists(KEYS_FILE):
    with open(KEYS_FILE, "w") as f:
        json.dump({"DEAD-2223-0000-4567": "UNBOUND"}, f)

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/keys.json":
            with open(KEYS_FILE) as f:
                data = json.load(f)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"keys": data}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/bind":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length))
                key = body.get("key", "")
                hwid = body.get("hwid", "")

                with open(KEYS_FILE) as f:
                    data = json.load(f)

                if key not in data:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(b"INVALID_KEY")
                    return

                if data[key] != "UNBOUND" and data[key] != hwid:
                    self.send_response(403)
                    self.end_headers()
                    self.wfile.write(b"HWID_MISMATCH")
                    return

                data[key] = hwid
                with open(KEYS_FILE, "w") as f:
                    json.dump(data, f)

                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"OK")
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            self.send_response(404)
            self.end_headers()

HTTPServer(("0.0.0.0", 10000), Handler).serve_forever()
