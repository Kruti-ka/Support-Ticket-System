"""
LLM Integration — Groq (llama-3.3-70b-versatile)

Why Groq?
- Generous free tier: 14,400 requests/day, no billing required
- Extremely fast inference (~200ms) — ideal for real-time UX as the user types
- OpenAI-compatible API — simple, well-documented SDK
- llama-3.3-70b-versatile: excellent instruction-following for JSON classification

Prompt Design:
I use a strict zero-shot classification prompt that:
1. Defines the exact output format (JSON only, no prose)
2. Provides clear category/priority definitions to reduce ambiguity
3. Uses low temperature for consistent, deterministic results
4. Instructs the model to default gracefully when uncertain
"""

import json
import logging

from groq import Groq
from django.conf import settings

logger = logging.getLogger(__name__)

# ── Prompt ────────────────────────────────────────────────────────────────────
CLASSIFY_PROMPT = """You are a support ticket classifier for a software company.
Given a support ticket description, return ONLY a valid JSON object with exactly two fields.

Output format (no markdown, no explanation, just raw JSON):
{{"category": "<category>", "priority": "<priority>"}}

Category definitions:
- "billing"   : payment issues, invoices, subscriptions, refunds, charges
- "technical" : bugs, errors, crashes, performance problems, integration failures
- "account"   : login issues, password reset, profile changes, access permissions
- "general"   : feature requests, general questions, feedback, anything else

Priority definitions:
- "critical" : system completely down, data loss, security breach, blocking all users
- "high"     : major feature broken, significant portion of users affected, no workaround
- "medium"   : partial functionality affected, workaround exists, moderate impact
- "low"      : minor cosmetic issues, general questions, feature requests, low urgency

Ticket description:
{description}

Respond with ONLY the JSON object. No markdown code blocks, no explanation."""


def classify_ticket(description: str) -> dict | None:
    """
    Call Groq to classify a ticket description.

    Returns a dict with 'suggested_category' and 'suggested_priority',
    or None if the LLM is unavailable or returns invalid data.
    Failures are logged but never raised — callers must handle None gracefully.
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.warning("GROQ_API_KEY not set — skipping LLM classification")
        return None

    try:
        client = Groq(api_key=api_key)

        prompt = CLASSIFY_PROMPT.format(description=description.strip())

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,       # Low temperature for consistent classification
            max_tokens=64,         # We only need a tiny JSON response
        )

        raw_text = response.choices[0].message.content.strip()

        # Strip markdown code fences if the model adds them despite instructions
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        data = json.loads(raw_text)

        valid_categories = {'billing', 'technical', 'account', 'general'}
        valid_priorities = {'low', 'medium', 'high', 'critical'}

        category = data.get('category', '').lower()
        priority = data.get('priority', '').lower()

        if category not in valid_categories or priority not in valid_priorities:
            logger.warning("LLM returned invalid values: category=%s priority=%s", category, priority)
            return None

        return {
            'suggested_category': category,
            'suggested_priority': priority,
        }

    except json.JSONDecodeError as exc:
        logger.error("LLM returned non-JSON response: %s", exc)
        return None
    except Exception as exc:
        logger.error("LLM classification failed: %s", exc)
        return None
