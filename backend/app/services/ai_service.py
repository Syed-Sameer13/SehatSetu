import os
import re
import httpx
from typing import Optional
from app.core.config import settings
from app.schemas.ai import AISummarizeResponse


SYSTEM_SAFETY_PROMPT = """
You are an extractive clinical text assistant for the SehatSetu hospital queue platform.
Your ONLY role is to summarize the patient's chief complaint into 2-3 concise bullet points:
- Onset and reported duration of primary symptoms
- Anatomical location and character (sharp, dull, throbbing, radiating, burning)
- Reported aggravating or associated factors (fever, nausea, exertion)

STRICT SAFETY CONSTRAINTS:
1. Do NOT suggest any disease diagnosis or differential diagnosis.
2. Do NOT recommend any medication, dosage, or medical intervention.
3. Do NOT evaluate or alter the triage urgency score.
4. If the input text is brief or ambiguous, simply extract the stated terms without speculation.
"""


def _extractive_rule_fallback(text: str) -> str:
    """Deterministic, extractive fallback formatter if LLM API is offline."""
    clean = text.strip()
    sentences = [s.strip() for s in re.split(r"[.!?\n]+", clean) if s.strip()]

    bullets = []
    if sentences:
        bullets.append(f"• Primary Complaint: {sentences[0]}")
    if len(sentences) > 1:
        bullets.append(f"• Associated Features: {sentences[1]}")
    if len(sentences) > 2:
        bullets.append(f"• Reported Context: {'. '.join(sentences[2:])}")
    if not bullets:
        bullets.append(f"• Stated Symptoms: {clean}")

    bullets.append("• Clinical Notice: Extractive summary for doctor review; no autonomous diagnosis.")
    return "\n".join(bullets)


async def summarize_chief_complaint(complaint: str) -> AISummarizeResponse:
    """
    Summarizes raw patient symptoms into structured clinical bullets.
    Uses Google Gemini API if configured, with graceful fallback to deterministic extraction.
    """
    if not complaint or len(complaint.strip()) < 3:
        return AISummarizeResponse(
            summary="• No detailed chief complaint recorded.",
            is_ai_generated=False,
            model="extractive-fallback",
        )

    # Check if Gemini is enabled and configured
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if settings.ENABLE_AI_SUMMARIZATION and api_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.AI_MODEL_NAME}:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": f"{SYSTEM_SAFETY_PROMPT}\n\nChief Complaint to summarize:\n\"{complaint}\""}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.0,
                    "maxOutputTokens": 200,
                }
            }

            async with httpx.AsyncClient(timeout=3.5) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if content:
                            return AISummarizeResponse(
                                summary=content.strip(),
                                is_ai_generated=True,
                                model=settings.AI_MODEL_NAME,
                            )
        except Exception as e:
            print(f"[AI Service Warning] Gemini summarization failed, falling back to extractive: {e}")

    # Graceful fallback
    fallback_summary = _extractive_rule_fallback(complaint)
    return AISummarizeResponse(
        summary=fallback_summary,
        is_ai_generated=False,
        model="extractive-fallback",
    )
