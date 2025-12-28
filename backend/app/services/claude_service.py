"""Claude AI service for Socratic tutoring.

This service handles all interactions with the Anthropic Claude API,
including model routing, cost tracking, and response generation.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum
from typing import TYPE_CHECKING

from anthropic import AsyncAnthropic, APIError, APIConnectionError, RateLimitError

from app.core.config import get_settings

if TYPE_CHECKING:
    from anthropic.types import Message

logger = logging.getLogger(__name__)


class TaskType(str, Enum):
    """Types of AI tasks for model routing."""

    TUTOR_CHAT = "tutor_chat"  # Socratic tutoring conversation
    FLASHCARD = "flashcard"  # Generate flashcards from text
    SUMMARY = "summary"  # Summarise text
    ESSAY_FEEDBACK = "essay_feedback"  # Detailed essay analysis
    QUESTION_ANALYSIS = "question_analysis"  # Analyse student question


# Cost per million tokens (USD)
MODEL_COSTS = {
    "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
    "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
}

# Task to model routing - simple tasks use cheaper model
TASK_MODEL_ROUTING = {
    TaskType.TUTOR_CHAT: "complex",  # Needs nuanced Socratic responses
    TaskType.FLASHCARD: "simple",  # Straightforward extraction
    TaskType.SUMMARY: "simple",  # Straightforward summarisation
    TaskType.ESSAY_FEEDBACK: "complex",  # Detailed analysis needed
    TaskType.QUESTION_ANALYSIS: "complex",  # Understanding student needs
}


@dataclass
class AIResponse:
    """Response from Claude AI with metadata."""

    content: str
    model_used: str
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float
    stop_reason: str | None = None


class ClaudeService:
    """Service for interacting with Claude AI.

    Handles:
    - Model routing (Sonnet for complex, Haiku for simple tasks)
    - Token counting and cost estimation
    - Retry logic for transient failures
    - Error handling
    """

    def __init__(self) -> None:
        """Initialise the Claude service."""
        self.settings = get_settings()
        self._client: AsyncAnthropic | None = None

    @property
    def client(self) -> AsyncAnthropic:
        """Get or create the Anthropic client."""
        if self._client is None:
            if not self.settings.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY not configured")
            self._client = AsyncAnthropic(api_key=self.settings.anthropic_api_key)
        return self._client

    def _get_model_for_task(self, task_type: TaskType) -> str:
        """Get the appropriate model for the given task type.

        Args:
            task_type: The type of AI task to perform.

        Returns:
            Model identifier string.
        """
        complexity = TASK_MODEL_ROUTING.get(task_type, "complex")
        if complexity == "simple":
            return self.settings.ai_model_simple
        return self.settings.ai_model_complex

    def _calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate the estimated cost for a request.

        Args:
            model: Model identifier.
            input_tokens: Number of input tokens.
            output_tokens: Number of output tokens.

        Returns:
            Estimated cost in USD.
        """
        costs = MODEL_COSTS.get(model, MODEL_COSTS["claude-sonnet-4-20250514"])
        input_cost = (input_tokens / 1_000_000) * costs["input"]
        output_cost = (output_tokens / 1_000_000) * costs["output"]
        return round(input_cost + output_cost, 6)

    async def chat(
        self,
        system_prompt: str,
        messages: list[dict[str, str]],
        task_type: TaskType = TaskType.TUTOR_CHAT,
        max_tokens: int | None = None,
    ) -> AIResponse:
        """Send a chat request to Claude.

        Args:
            system_prompt: The system prompt defining AI behaviour.
            messages: List of conversation messages with 'role' and 'content'.
            task_type: Type of task for model routing.
            max_tokens: Maximum tokens in response (uses config default if None).

        Returns:
            AIResponse with content and metadata.

        Raises:
            ValueError: If API key not configured.
            APIError: If Claude API returns an error.
        """
        model = self._get_model_for_task(task_type)
        max_tokens = max_tokens or self.settings.ai_max_tokens

        try:
            response: Message = await self.client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=messages,  # type: ignore[arg-type]
            )

            # Extract text content from response
            content = ""
            for block in response.content:
                if block.type == "text":
                    content += block.text

            # Calculate cost
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            cost = self._calculate_cost(model, input_tokens, output_tokens)

            logger.info(
                "Claude response generated",
                extra={
                    "model": model,
                    "task_type": task_type.value,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cost_usd": cost,
                },
            )

            return AIResponse(
                content=content,
                model_used=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                estimated_cost_usd=cost,
                stop_reason=response.stop_reason,
            )

        except RateLimitError as e:
            logger.warning("Claude rate limit hit", extra={"error": str(e)})
            raise
        except APIConnectionError as e:
            logger.error("Claude connection error", extra={"error": str(e)})
            raise
        except APIError as e:
            logger.error("Claude API error", extra={"error": str(e)})
            raise

    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        task_type: TaskType = TaskType.SUMMARY,
        max_tokens: int | None = None,
    ) -> AIResponse:
        """Simple prompt-based generation (wrapper around chat).

        Args:
            prompt: The user prompt.
            system_prompt: The system prompt defining AI behaviour.
            task_type: Type of task for model routing.
            max_tokens: Maximum tokens in response.

        Returns:
            AIResponse with content and metadata.
        """
        return await self.chat(
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": prompt}],
            task_type=task_type,
            max_tokens=max_tokens,
        )

    async def generate_flashcards(
        self,
        text: str,
        subject_context: str | None = None,
        num_cards: int = 5,
    ) -> AIResponse:
        """Generate flashcards from provided text.

        Args:
            text: Source text to create flashcards from.
            subject_context: Optional subject context for better cards.
            num_cards: Number of flashcards to generate.

        Returns:
            AIResponse with JSON-formatted flashcards.
        """
        subject_hint = f" for {subject_context}" if subject_context else ""

        system_prompt = f"""You are a flashcard generator{subject_hint}.
Create exactly {num_cards} flashcards from the provided text.
Each flashcard should test a key concept or fact.

Output as JSON array:
[
  {{"front": "Question or prompt", "back": "Answer or explanation"}},
  ...
]

Guidelines:
- Questions should test understanding, not just recall
- Answers should be concise but complete
- Cover the most important concepts
- Use Australian English spelling"""

        messages = [{"role": "user", "content": text}]

        return await self.chat(
            system_prompt=system_prompt,
            messages=messages,
            task_type=TaskType.FLASHCARD,
            max_tokens=1024,
        )

    async def summarise(
        self,
        text: str,
        target_length: str = "medium",
        subject_context: str | None = None,
    ) -> AIResponse:
        """Summarise provided text.

        Args:
            text: Text to summarise.
            target_length: "short" (1-2 sentences), "medium" (paragraph), "long" (detailed).
            subject_context: Optional subject context.

        Returns:
            AIResponse with summary.
        """
        length_guide = {
            "short": "1-2 sentences",
            "medium": "a paragraph (4-6 sentences)",
            "long": "2-3 paragraphs with key details",
        }

        subject_hint = f" This is {subject_context} content." if subject_context else ""

        system_prompt = f"""You are a summarisation assistant.{subject_hint}
Summarise the provided text in {length_guide.get(target_length, length_guide['medium'])}.

Guidelines:
- Capture the main ideas and key points
- Use clear, accessible language
- Use Australian English spelling
- Maintain accuracy - don't add information not in the original"""

        messages = [{"role": "user", "content": text}]

        return await self.chat(
            system_prompt=system_prompt,
            messages=messages,
            task_type=TaskType.SUMMARY,
            max_tokens=512 if target_length == "short" else 1024,
        )

    async def health_check(self) -> bool:
        """Check if the Claude service is available.

        Returns:
            True if service is healthy, False otherwise.
        """
        if not self.settings.anthropic_api_key:
            return False

        try:
            # Simple test message
            response = await self.chat(
                system_prompt="Reply with 'ok'.",
                messages=[{"role": "user", "content": "health check"}],
                task_type=TaskType.SUMMARY,  # Use cheaper model
                max_tokens=10,
            )
            return bool(response.content)
        except Exception as e:
            logger.error("Claude health check failed", extra={"error": str(e)})
            return False


# Singleton instance
_claude_service: ClaudeService | None = None


def get_claude_service() -> ClaudeService:
    """Get the Claude service singleton."""
    global _claude_service
    if _claude_service is None:
        _claude_service = ClaudeService()
    return _claude_service
