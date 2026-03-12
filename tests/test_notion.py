import urllib.request
import json
import threading
import time

# 1. Establish SSE session
sse_url = "https://mcp.flatfrog.games/notion/sse"
req = urllib.request.Request(sse_url, headers={'User-Agent': 'curl/7.68.0'})
print(f"Connecting to {sse_url}...")

session_id = None
ready_event = threading.Event()

def read_sse():
    global session_id
    try:
        with urllib.request.urlopen(req) as response:
            for line in response:
                line = line.decode('utf-8').strip()
                if line:
                    print("SSE Received:", line)
                if "sessionId=" in line and not session_id:
                    session_id = line.split("sessionId=")[1].strip()
                    print(f"Got Session ID: {session_id}")
                    ready_event.set()
    except Exception as e:
        print(f"SSE Error: {e}")

# Start background thread to listen
t = threading.Thread(target=read_sse)
t.daemon = True
t.start()

# Wait for session_id
if not ready_event.wait(timeout=10):
    print("Error: Timeout waiting for session ID")
    exit(1)

# 2. Send JSON-RPC initialize
msg_url = f"https://mcp.flatfrog.games/notion/messages?sessionId={session_id}"
payload = json.dumps({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
}).encode('utf-8')

post_req = urllib.request.Request(msg_url, data=payload, headers={'Content-Type': 'application/json', 'User-Agent': 'curl/7.68.0'})
print(f"Sending POST to {msg_url} ...")
try:
    with urllib.request.urlopen(post_req) as post_res:
        print("POST Response status:", post_res.getcode())
except Exception as e:
    print(f"POST Error: {e}")

# keep alive slightly longer to see Notion response and heartbeat
time.sleep(20)
