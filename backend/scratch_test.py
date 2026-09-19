import urllib.request
import urllib.error
try:
    resp = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/incidents')
    print("Success:", resp.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}:")
    print(e.read().decode())
except Exception as e:
    print("Error:", e)
