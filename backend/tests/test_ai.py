import asyncio
import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv('backend/.env')
sys.path.append(os.path.join(os.getcwd(), 'backend'))

logging.basicConfig(level=logging.DEBUG)

from app.ai.tasks import process_incident_ai_background

async def main():
    print('Testing AI pipeline on real incident data...')
    await process_incident_ai_background('d36a995e-1bc1-45bd-8ff1-7440409a2df9', 'test', None, None)

asyncio.run(main())
