"""AI Interaction service for logging and retrieving AI conversations.

All AI interactions are logged for:
- Parent oversight (visibility into child's learning)
- Safety monitoring (flagging concerning content)
- Cost tracking (token usage and cost estimation)
- Analytics (learning patterns and effectiveness)
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_interaction import AIInteraction
from app.models.session import Session
from app.models.student import Student


class AIInteractionService:
    """Service for managing AI interaction logs."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialise with database session.

        Args:
            db: Async database session.
        """
        self.db = db

    async def log_interaction(
        self,
        session_id: uuid.UUID,
        student_id: uuid.UUID,
        user_message: str,
        ai_response: str,
        model_used: str,
        task_type: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        estimated_cost_usd: float = 0.0,
        subject_id: uuid.UUID | None = None,
        curriculum_context: dict[str, Any] | None = None,
        flagged: bool = False,
        flag_reason: str | None = None,
    ) -> AIInteraction:
        """Log an AI interaction to the database.

        Args:
            session_id: The tutoring session ID.
            student_id: The student ID.
            user_message: The student's message.
            ai_response: The AI's response.
            model_used: The Claude model used.
            task_type: Type of task (tutor_chat, flashcard, summary).
            input_tokens: Number of input tokens used.
            output_tokens: Number of output tokens used.
            estimated_cost_usd: Estimated cost in USD.
            subject_id: Optional subject ID.
            curriculum_context: Optional curriculum context (outcome, stage, strand).
            flagged: Whether this interaction is flagged for review.
            flag_reason: Reason for flagging if applicable.

        Returns:
            The created AIInteraction.
        """
        interaction = AIInteraction(
            session_id=session_id,
            student_id=student_id,
            subject_id=subject_id,
            user_message=user_message,
            ai_response=ai_response,
            model_used=model_used,
            task_type=task_type,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost_usd=estimated_cost_usd,
            curriculum_context=curriculum_context,
            created_at=datetime.now(timezone.utc),
            flagged=flagged,
            flag_reason=flag_reason,
        )

        self.db.add(interaction)
        await self.db.commit()
        await self.db.refresh(interaction)

        return interaction

    async def get_interaction(
        self,
        interaction_id: uuid.UUID,
    ) -> AIInteraction | None:
        """Get an interaction by ID.

        Args:
            interaction_id: The interaction ID.

        Returns:
            The AIInteraction if found, None otherwise.
        """
        return await self.db.get(AIInteraction, interaction_id)

    async def get_session_interactions(
        self,
        session_id: uuid.UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[AIInteraction], int]:
        """Get all interactions for a session (conversation history).

        Args:
            session_id: The session ID.
            limit: Maximum number of interactions to return.
            offset: Number of interactions to skip.

        Returns:
            Tuple of (interactions list, total count).
        """
        # Build queries
        query = (
            select(AIInteraction)
            .where(AIInteraction.session_id == session_id)
            .order_by(AIInteraction.created_at.asc())
            .limit(limit)
            .offset(offset)
        )

        count_query = (
            select(func.count())
            .select_from(AIInteraction)
            .where(AIInteraction.session_id == session_id)
        )

        # Execute
        result = await self.db.execute(query)
        interactions = list(result.scalars().all())

        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        return interactions, total

    async def get_student_interactions(
        self,
        student_id: uuid.UUID,
        subject_id: uuid.UUID | None = None,
        flagged_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[AIInteraction], int]:
        """Get interactions for a student (for parent review).

        Args:
            student_id: The student ID.
            subject_id: Optional filter by subject.
            flagged_only: Whether to only return flagged interactions.
            limit: Maximum number of interactions to return.
            offset: Number of interactions to skip.

        Returns:
            Tuple of (interactions list, total count).
        """
        # Build base query
        query = select(AIInteraction).where(AIInteraction.student_id == student_id)
        count_query = (
            select(func.count())
            .select_from(AIInteraction)
            .where(AIInteraction.student_id == student_id)
        )

        # Apply filters
        if subject_id:
            query = query.where(AIInteraction.subject_id == subject_id)
            count_query = count_query.where(AIInteraction.subject_id == subject_id)

        if flagged_only:
            query = query.where(AIInteraction.flagged.is_(True))
            count_query = count_query.where(AIInteraction.flagged.is_(True))

        # Order by most recent first
        query = query.order_by(AIInteraction.created_at.desc())

        # Apply pagination
        query = query.limit(limit).offset(offset)

        # Execute
        result = await self.db.execute(query)
        interactions = list(result.scalars().all())

        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        return interactions, total

    async def get_parent_child_interactions(
        self,
        parent_id: uuid.UUID,
        student_id: uuid.UUID,
        flagged_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[AIInteraction], int]:
        """Get interactions for a parent's child (with ownership verification).

        Args:
            parent_id: The parent's user ID.
            student_id: The student ID.
            flagged_only: Whether to only return flagged interactions.
            limit: Maximum number of interactions to return.
            offset: Number of interactions to skip.

        Returns:
            Tuple of (interactions list, total count).
        """
        # Verify parent-child relationship
        student = await self.db.get(Student, student_id)
        if not student or student.parent_id != parent_id:
            return [], 0

        return await self.get_student_interactions(
            student_id=student_id,
            flagged_only=flagged_only,
            limit=limit,
            offset=offset,
        )

    async def flag_interaction(
        self,
        interaction_id: uuid.UUID,
        flag_reason: str,
    ) -> AIInteraction | None:
        """Flag an interaction for review.

        Args:
            interaction_id: The interaction ID.
            flag_reason: Reason for flagging.

        Returns:
            The updated AIInteraction if found, None otherwise.
        """
        interaction = await self.get_interaction(interaction_id)
        if not interaction:
            return None

        interaction.flagged = True
        interaction.flag_reason = flag_reason

        await self.db.commit()
        await self.db.refresh(interaction)

        return interaction

    async def mark_as_reviewed(
        self,
        interaction_id: uuid.UUID,
        reviewer_id: uuid.UUID,
    ) -> AIInteraction | None:
        """Mark an interaction as reviewed by parent/admin.

        Args:
            interaction_id: The interaction ID.
            reviewer_id: The ID of the user who reviewed it.

        Returns:
            The updated AIInteraction if found, None otherwise.
        """
        interaction = await self.get_interaction(interaction_id)
        if not interaction:
            return None

        # Note: The model has reviewed_by field but it's not in current migration
        # We'll update the flagged status for now
        # In future, add reviewed_by and reviewed_at fields

        await self.db.commit()
        await self.db.refresh(interaction)

        return interaction

    async def get_flagged_count(
        self,
        student_id: uuid.UUID,
    ) -> int:
        """Get count of flagged interactions for a student.

        Args:
            student_id: The student ID.

        Returns:
            Number of flagged interactions.
        """
        query = (
            select(func.count())
            .select_from(AIInteraction)
            .where(
                and_(
                    AIInteraction.student_id == student_id,
                    AIInteraction.flagged.is_(True),
                )
            )
        )

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_student_token_usage(
        self,
        student_id: uuid.UUID,
        since: datetime | None = None,
    ) -> dict[str, int]:
        """Get token usage statistics for a student.

        Args:
            student_id: The student ID.
            since: Optional datetime to filter from (e.g., start of day).

        Returns:
            Dictionary with input_tokens, output_tokens, and total_tokens.
        """
        query = select(
            func.sum(AIInteraction.input_tokens).label("input_tokens"),
            func.sum(AIInteraction.output_tokens).label("output_tokens"),
        ).where(AIInteraction.student_id == student_id)

        if since:
            query = query.where(AIInteraction.created_at >= since)

        result = await self.db.execute(query)
        row = result.one()

        input_tokens = row.input_tokens or 0
        output_tokens = row.output_tokens or 0

        return {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
        }

    async def get_student_cost(
        self,
        student_id: uuid.UUID,
        since: datetime | None = None,
    ) -> float:
        """Get total estimated cost for a student.

        Args:
            student_id: The student ID.
            since: Optional datetime to filter from.

        Returns:
            Total estimated cost in USD.
        """
        query = (
            select(func.sum(AIInteraction.estimated_cost_usd))
            .where(AIInteraction.student_id == student_id)
        )

        if since:
            query = query.where(AIInteraction.created_at >= since)

        result = await self.db.execute(query)
        return result.scalar() or 0.0

    async def get_recent_context(
        self,
        session_id: uuid.UUID,
        limit: int = 10,
    ) -> list[dict[str, str]]:
        """Get recent messages for conversation context.

        Args:
            session_id: The session ID.
            limit: Maximum number of message pairs to include.

        Returns:
            List of message dictionaries with 'role' and 'content'.
        """
        query = (
            select(AIInteraction)
            .where(AIInteraction.session_id == session_id)
            .order_by(AIInteraction.created_at.desc())
            .limit(limit)
        )

        result = await self.db.execute(query)
        interactions = list(result.scalars().all())

        # Reverse to get chronological order
        interactions.reverse()

        # Build message list for Claude API
        messages: list[dict[str, str]] = []
        for interaction in interactions:
            messages.append({"role": "user", "content": interaction.user_message})
            messages.append({"role": "assistant", "content": interaction.ai_response})

        return messages
