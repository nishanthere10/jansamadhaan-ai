
from pydantic import BaseModel, Field


class TranslationResponse(BaseModel):
    translated_text: str = Field(description="The English translation of the complaint. If it is already in English, output the exact original text.")
    detected_language: str = Field(description="The ISO language code of the original text, e.g., 'hi', 'en', 'mr'")

class ClassificationResponse(BaseModel):
    category: str = Field(description="The most relevant category for the incident (e.g. 'Pothole', 'Garbage', 'Streetlight', 'Water Leak', 'Other')")
    generated_title: str = Field(description="A concise, professional 4-6 word title for the incident")
    generated_summary: str = Field(description="A brief 1-2 sentence summary of the incident")
    keywords: list[str] = Field(description="List of maximum 5 important keywords extracting the core problem")
    is_spam: bool = Field(description="True if the report is gibberish, clearly fake, abusive, or a test string (e.g., 'asdf'). False if it is a plausible report", default=False)
    spam_score: float = Field(description="Integrity confidence score between 0.0 and 1.0, where 1.0 means 100% certainly spam/fake.", default=0.0)
    spam_reason: str = Field(description="If is_spam is True, provide a concise 1-sentence reason why it is flagged. Otherwise, output 'Genuine'.", default="Genuine")

class SeverityResponse(BaseModel):
    severity: str = Field(description="Severity/Risk level: 'Low Risk', 'Medium Risk', 'High Risk', 'Emergency'")
    severity_score: float = Field(description="A priority score from 0.0 to 1.0, where 1.0 is maximum priority", ge=0.0, le=1.0)
    severity_explanation: str = Field(description="A brief 1-sentence reason why this severity was assigned")

class DepartmentRoutingResponse(BaseModel):
    primary_department: str = Field(description="The primary municipal department responsible for this fix (e.g. 'Roads', 'Sanitation', 'Water', 'Electricity')")
    secondary_departments: list[str] = Field(description="Secondary departments that might need to be involved to resolve this complaint", default_factory=list)
    escalation_level: str = Field(description="Escalation priority: 'Routine', 'Expedited', 'Emergency'")

class TranscriptionResponse(BaseModel):
    transcript_text: str = Field(description="The text transcribed from the audio")
    confidence: float = Field(description="The confidence score of the transcription")

class VisionAnalysisResponse(BaseModel):
    has_visible_damage: bool = Field(description="True if there is visible physical damage to infrastructure/property")
    safety_hazard: bool = Field(description="True if the photo displays an active or immediate danger to public safety")
    hazard_description: str = Field(description="Brief explanation of the hazard, or 'None' if safe")
    estimated_size: str = Field(description="Estimated magnitude/size (e.g. 'Small', 'Medium', 'Large', 'Widespread')")
    objects_detected: list[str] = Field(description="Array of 2-5 concrete objects/issues visible (e.g. ['broken pipe', 'water pool'])", default_factory=list)
    vision_summary: str = Field(description="A concise objective summary describing exactly what is seen in the photo")
