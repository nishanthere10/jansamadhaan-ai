from app.ai.models.graph_state import ComplaintGraphState
from groq import Groq
import os
import logging

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self):
        self.client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

    def process(self, state: ComplaintGraphState) -> dict:
        """
        LangGraph Node for audio transcription.
        If the state has an `audio_path`, it transcibes it to text using Groq's fast Whisper model.
        """
        audio_path = state.get("audio_path")
        
        if not audio_path:
            # Skip if there's no audio
            return {"transcription_status": "skipped"}
            
        try:
            # Check if it's a URL
            if audio_path.startswith("http://") or audio_path.startswith("https://"):
                import requests
                logger.info(f"Downloading audio from URL for transcription: {audio_path}")
                response = requests.get(audio_path, timeout=15)
                response.raise_for_status()
                audio_bytes = response.content
                filename = audio_path.split("/")[-1]
                if "?" in filename: filename = filename.split("?")[0]
                
                transcription = self.client.audio.transcriptions.create(
                  file=(filename, audio_bytes),
                  model="whisper-large-v3",
                  response_format="json",
                  language="en"
                )
            else:
                # Local file
                if not os.path.exists(audio_path):
                    return {"transcription_status": "failed", "error": "Audio file not found on disk"}

                with open(audio_path, "rb") as file:
                    transcription = self.client.audio.transcriptions.create(
                      file=(audio_path, file.read()),
                      model="whisper-large-v3",
                      response_format="json",
                      language="en"
                    )
            
            transcript_text = transcription.text
            
            # Since this is an audio input, the transcript BECOMES the original_text for the rest of the flow
            return {
                "transcript": transcript_text,
                "original_text": transcript_text,
                "transcription_status": "completed"
            }
        except Exception as e:
            logger.exception("Transcription failed")
            return {
                "transcription_status": "failed",
                "error": str(e)
            }
