"""Moderation service for AI content safety.

This service handles:
- Pre-checking student messages for concerning content
- Post-checking AI responses for safety
- Flagging interactions for parent/admin review
- Detecting patterns that may indicate issues
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum


class FlagCategory(str, Enum):
    """Categories for flagged content."""

    OFF_TOPIC = "off_topic"
    EMOTIONAL_DISTRESS = "emotional_distress"
    ACADEMIC_DISHONESTY = "academic_dishonesty"
    SAFETY_CONCERN = "safety_concern"
    INAPPROPRIATE_REQUEST = "inappropriate_request"
    PERSONAL_INFO = "personal_info"


@dataclass
class ModerationResult:
    """Result of content moderation check."""

    should_flag: bool
    flag_category: FlagCategory | None = None
    flag_reason: str | None = None
    should_block: bool = False  # If True, don't process the message
    suggested_response: str | None = None  # Alternative response if blocked


# Patterns indicating emotional distress (handle sensitively)
DISTRESS_PATTERNS = [
    r"\b(want to die|kill myself|hurt myself|self[- ]?harm)\b",
    r"\b(suicidal|suicide|end my life|end it all)\b",
    r"\b(no point|worthless|nobody cares|hate myself)\b",
    r"\b(cutting|cuts? myself)\b",
]

# Patterns indicating academic dishonesty requests
DISHONESTY_PATTERNS = [
    r"\b(write (my|the) essay for me)\b",
    r"\b(do (my|the) homework for me)\b",
    r"\b(give me the answers?)\b",
    r"\b(complete (my|this) assignment)\b",
    r"\b(just tell me (the|what to write))\b",
    r"\b(copy paste|plagiari[sz]e?)\b",
]

# Patterns that are clearly off-topic for education
OFF_TOPIC_PATTERNS = [
    r"\b(dating|girlfriend|boyfriend|crush)\b",
    r"\b(video games?|fortnite|minecraft|roblox)\b",
    r"\b(tiktok|instagram|snapchat|youtube)\b",
    r"\b(gossip|drama|rumou?rs?)\b",
]

# Patterns indicating inappropriate requests
INAPPROPRIATE_PATTERNS = [
    r"\b(how to (hack|cheat|steal))\b",
    r"\b(make (a )?(bomb|weapon|drug))\b",
    r"\b(sex|porn|naked|nude)\b",
    r"\b(swear words?|curse words?|bad words?)\b",
]

# Patterns indicating personal information sharing
PERSONAL_INFO_PATTERNS = [
    r"\b(my (phone number|address|password) is)\b",
    r"\b(i live at|my school is)\b",
    r"\b(\d{10,})\b",  # Long numbers (phone numbers)
    r"\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b",  # Email addresses
]


class ModerationService:
    """Service for moderating AI interactions for safety."""

    def __init__(self) -> None:
        """Initialise the moderation service."""
        # Compile regex patterns for efficiency
        self._distress_patterns = [
            re.compile(p, re.IGNORECASE) for p in DISTRESS_PATTERNS
        ]
        self._dishonesty_patterns = [
            re.compile(p, re.IGNORECASE) for p in DISHONESTY_PATTERNS
        ]
        self._off_topic_patterns = [
            re.compile(p, re.IGNORECASE) for p in OFF_TOPIC_PATTERNS
        ]
        self._inappropriate_patterns = [
            re.compile(p, re.IGNORECASE) for p in INAPPROPRIATE_PATTERNS
        ]
        self._personal_info_patterns = [
            re.compile(p, re.IGNORECASE) for p in PERSONAL_INFO_PATTERNS
        ]

    def check_student_message(self, message: str) -> ModerationResult:
        """Check a student's message for concerning content.

        Args:
            message: The student's message text.

        Returns:
            ModerationResult with flagging decision.
        """
        message_lower = message.lower()

        # Check for safety concerns (highest priority)
        for pattern in self._distress_patterns:
            if pattern.search(message):
                return ModerationResult(
                    should_flag=True,
                    flag_category=FlagCategory.SAFETY_CONCERN,
                    flag_reason="Message may indicate emotional distress",
                    should_block=False,  # Still process but flag for review
                    suggested_response=self._get_support_response(),
                )

        # Check for inappropriate requests
        for pattern in self._inappropriate_patterns:
            if pattern.search(message):
                return ModerationResult(
                    should_flag=True,
                    flag_category=FlagCategory.INAPPROPRIATE_REQUEST,
                    flag_reason="Inappropriate content request",
                    should_block=True,
                    suggested_response="I'm here to help with your studies. "
                    "Let's focus on your learning! What subject are you working on?",
                )

        # Check for academic dishonesty
        for pattern in self._dishonesty_patterns:
            if pattern.search(message):
                return ModerationResult(
                    should_flag=True,
                    flag_category=FlagCategory.ACADEMIC_DISHONESTY,
                    flag_reason="Possible academic dishonesty request",
                    should_block=False,  # Still respond but redirect
                )

        # Check for personal information
        for pattern in self._personal_info_patterns:
            if pattern.search(message):
                return ModerationResult(
                    should_flag=True,
                    flag_category=FlagCategory.PERSONAL_INFO,
                    flag_reason="Personal information shared",
                    should_block=False,
                )

        # Check for off-topic content (low priority, just flag)
        for pattern in self._off_topic_patterns:
            if pattern.search(message):
                # Only flag if the message is primarily off-topic
                # Short mentions mixed with study content are okay
                if len(message) < 100:  # Short messages that are off-topic
                    return ModerationResult(
                        should_flag=True,
                        flag_category=FlagCategory.OFF_TOPIC,
                        flag_reason="Off-topic conversation",
                        should_block=False,
                    )

        # No concerning content found
        return ModerationResult(should_flag=False)

    def check_ai_response(self, response: str) -> ModerationResult:
        """Check an AI response for safety issues.

        This is a secondary check - Claude has built-in safety, but we
        verify responses don't contain direct answers or inappropriate content.

        Args:
            response: The AI's response text.

        Returns:
            ModerationResult with any concerns.
        """
        response_lower = response.lower()

        # Check if response might be giving direct answers
        # (This is a heuristic - the prompt should prevent this)
        direct_answer_indicators = [
            "the answer is",
            "the correct answer is",
            "the solution is",
            "you should write",
            "here's what to write",
            "copy this",
        ]

        for indicator in direct_answer_indicators:
            if indicator in response_lower:
                return ModerationResult(
                    should_flag=True,
                    flag_category=FlagCategory.ACADEMIC_DISHONESTY,
                    flag_reason="AI may have provided direct answer",
                    should_block=False,  # Log for prompt improvement
                )

        # Check for inappropriate content in response
        for pattern in self._inappropriate_patterns:
            if pattern.search(response):
                return ModerationResult(
                    should_flag=True,
                    flag_category=FlagCategory.INAPPROPRIATE_REQUEST,
                    flag_reason="AI response contains inappropriate content",
                    should_block=True,
                )

        return ModerationResult(should_flag=False)

    def _get_support_response(self) -> str:
        """Get a supportive response for distressed students.

        Returns:
            A caring message with support resources.
        """
        return """I noticed you might be going through a difficult time, and I want you to know that's okay.

While I'm here to help with your studies, if you're feeling overwhelmed or upset, it's really important to talk to someone who can support you properly.

Here are some people who can help:
- **Kids Helpline**: 1800 55 1800 (free, 24/7)
- **Lifeline**: 13 11 14 (free, 24/7)
- **Beyond Blue**: 1300 22 4636

You could also talk to a trusted adult like a parent, teacher, or school counsellor.

Would you like to continue with your studies, or is there something else I can help you with?"""

    def get_flag_category_description(self, category: FlagCategory) -> str:
        """Get a human-readable description for a flag category.

        Args:
            category: The flag category.

        Returns:
            Description string.
        """
        descriptions = {
            FlagCategory.OFF_TOPIC: "Conversation went off-topic from studies",
            FlagCategory.EMOTIONAL_DISTRESS: "Student may be experiencing emotional distress",
            FlagCategory.ACADEMIC_DISHONESTY: "Request appeared to seek help with cheating",
            FlagCategory.SAFETY_CONCERN: "Content raised safety concerns",
            FlagCategory.INAPPROPRIATE_REQUEST: "Inappropriate content was requested",
            FlagCategory.PERSONAL_INFO: "Personal information was shared",
        }
        return descriptions.get(category, "Unknown concern")

    def should_notify_parent_immediately(self, category: FlagCategory) -> bool:
        """Determine if a flag category requires immediate parent notification.

        Args:
            category: The flag category.

        Returns:
            True if immediate notification recommended.
        """
        # Safety concerns should be reviewed promptly
        immediate_categories = {
            FlagCategory.SAFETY_CONCERN,
            FlagCategory.EMOTIONAL_DISTRESS,
        }
        return category in immediate_categories


# Singleton instance
_moderation_service: ModerationService | None = None


def get_moderation_service() -> ModerationService:
    """Get the moderation service singleton."""
    global _moderation_service
    if _moderation_service is None:
        _moderation_service = ModerationService()
    return _moderation_service
