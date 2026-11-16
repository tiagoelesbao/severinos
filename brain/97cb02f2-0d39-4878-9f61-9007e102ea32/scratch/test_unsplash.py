import requests
url = "https://source.unsplash.com/featured/1080x1920/?content+creation"
try:
    r = requests.get(url, timeout=10)
    print(f"Status: {r.status_code}")
    print(f"Final URL: {r.url}")
except Exception as e:
    print(f"Error: {e}")
