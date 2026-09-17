import base64
import os

import requests
from dotenv import load_dotenv
from groq import Groq

load_dotenv('backend/.env')
api_key = os.environ.get("GROQ_API_KEY")

print(f"Key loaded: {api_key is not None}")

# Get a base64 image
url = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Example.jpg/800px-Example.jpg"
response = requests.get(url)
base64_image = base64.b64encode(response.content).decode("utf-8")
base64_url = f"data:image/jpeg;base64,{base64_image}"


try:
    print("Testing llama-3.2-11b-vision-preview...")
    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model="llama-3.2-11b-vision-preview",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "What's in this image?"},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": base64_url
                        }
                    }
                ]
            }
        ],
        temperature=1,
        max_tokens=256,
        top_p=1,
        stream=False,
    )
    print("SUCCESS: llama-3.2-11b-vision-preview")
    print(completion.choices[0].message.content)
except Exception as e:
    print(f"ERROR llama-3.2: {e}")

try:
    print("\nTesting meta-llama/llama-4-scout-17b-16e-instruct...")
    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "What's in this image?"},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": base64_url
                        }
                    }
                ]
            }
        ],
        temperature=1,
        max_tokens=256,
        top_p=1,
        stream=False,
    )
    print("SUCCESS: meta-llama/llama-4-scout-17b-16e-instruct")
    print(completion.choices[0].message.content)
except Exception as e:
    print(f"ERROR llama-4: {e}")
