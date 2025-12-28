"""Insight generation service for AI-powered weekly insights.

Uses Claude Haiku for cost-efficient insight generation including:
- Weekly wins and achievements
- Areas needing attention
- Actionable recommendations
- Teacher talking points
- Pathway readiness (Stage 5)
- HSC projections (Stage 6)
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from app.models.weekly_insight import WeeklyInsight
from app.models.session import Session
from app.models.student_subject import StudentSubject
from app.models.subject import Subject
from app.services.claude_service import ClaudeService, TaskType, AIResponse
from app.services.parent_analytics_service import ParentAnalyticsService
from app.schemas.weekly_insight import (
    WeeklyInsightsData,
    InsightItem,
    RecommendationItem,
    PathwayReadiness,
    HSCProjection,
)

logger = logging.getLogger(__name__)


# Insight generation prompts
WEEKLY_INSIGHTS_SYSTEM_PROMPT = """You are an educational analyst generating weekly insights for Australian parents about their child's learning progress in the NSW curriculum.

Guidelines:
- Be encouraging but honest
- Focus on actionable insights
- Use age-appropriate language for the parent (not the student)
- Reference specific curriculum areas where relevant
- Never be alarming - frame concerns as "areas to watch"
- Provide specific, practical recommendations
- Use Australian English spelling (colour, organise, etc.)

You will receive data about a student's weekly activity and must generate structured insights."""

WINS_PROMPT = """Based on this week's activity data for {student_name} (Year {grade_level}), identify 2-3 key wins or achievements.

Weekly Data:
- Study sessions: {sessions_count}
- Study time: {study_time_minutes} minutes
- Topics covered: {topics_covered}
- Flashcards reviewed: {flashcards_reviewed}
- Questions answered: {questions_answered} ({accuracy}% accuracy)
- Current streaks: {current_streak} days

Subject Performance:
{subject_data}

Return a JSON array of wins (2-3 items):
[
  {{"title": "Brief title", "description": "1-2 sentence description", "subject_name": "Subject or null", "priority": "high"}}
]

Focus on: consistency, improvement, effort, specific achievements."""

AREAS_TO_WATCH_PROMPT = """Based on the data for {student_name} (Year {grade_level}), identify 1-2 areas that might need attention.

Current Mastery Levels:
{mastery_data}

Recent Activity:
{activity_data}

Return a JSON array of areas to watch (1-2 items, be gentle not alarming):
[
  {{"title": "Brief title", "description": "Constructive 1-2 sentence description", "subject_name": "Subject or null", "priority": "medium"}}
]

Frame as opportunities for growth, not problems."""

RECOMMENDATIONS_PROMPT = """Based on the data for {student_name} (Year {grade_level}), provide 2-3 actionable recommendations for the coming week.

Current Focus Areas:
{focus_areas}

Mastery Levels:
{mastery_data}

Return a JSON array of recommendations (2-3 items):
[
  {{"title": "Action title", "description": "What to do and why", "action_type": "practice|review|focus|explore", "estimated_time_minutes": 15, "priority": "high|medium|low"}}
]

Keep recommendations specific and achievable within 5-20 minutes each."""

TEACHER_TALKING_POINTS_PROMPT = """Generate 3 curriculum-aligned talking points that a parent could use in a parent-teacher meeting about {student_name} (Year {grade_level}).

Current Progress:
{progress_data}

Subject Focus:
{subject_focus}

Return a JSON array of 3 talking points as strings:
["Question or discussion point 1", "Question or discussion point 2", "Question or discussion point 3"]

Focus on curriculum progress, specific skills, and constructive questions."""


class InsightGenerationService:
    """Service for generating AI-powered weekly insights."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialise with database session.

        Args:
            db: Async database session.
        """
        self.db = db
        self.claude = ClaudeService()
        self.analytics = ParentAnalyticsService(db)

    # =========================================================================
    # Main Generation Methods
    # =========================================================================

    async def generate_weekly_insights(
        self,
        student_id: UUID,
        week_start: date | None = None,
        force_regenerate: bool = False,
    ) -> WeeklyInsight:
        """Generate weekly insights for a student.

        Args:
            student_id: The student UUID.
            week_start: Start of the week (Monday). Defaults to current week.
            force_regenerate: If True, regenerate even if insights exist.

        Returns:
            The weekly insight record.

        Raises:
            ValueError: If student not found.
        """
        # Get week start
        if week_start is None:
            week_start = WeeklyInsight.get_week_start()

        # Check for existing insights
        existing = await self._get_existing_insight(student_id, week_start)
        if existing and not force_regenerate:
            return existing

        # Get student data
        student = await self.db.get(Student, student_id)
        if not student:
            raise ValueError(f"Student {student_id} not found")

        # Gather context data
        weekly_stats = await self.analytics.get_weekly_stats(student_id, week_start)
        subject_progress = await self.analytics.get_subject_progress(student_id)

        # Generate insights using Claude
        insights_data, tokens_used, cost = await self._generate_all_insights(
            student, weekly_stats, subject_progress
        )

        # Create or update insight record
        if existing:
            existing.insights = insights_data.model_dump()
            existing.tokens_used = tokens_used
            existing.cost_estimate = cost
            existing.generated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(existing)
            return existing
        else:
            insight = WeeklyInsight(
                student_id=student_id,
                week_start=week_start,
                insights=insights_data.model_dump(),
                model_used="claude-3-5-haiku",
                tokens_used=tokens_used,
                cost_estimate=cost,
            )
            self.db.add(insight)
            await self.db.commit()
            await self.db.refresh(insight)
            logger.info(f"Generated weekly insights for student {student_id}")
            return insight

    async def get_or_generate_insights(
        self,
        student_id: UUID,
        week_start: date | None = None,
    ) -> WeeklyInsight:
        """Get existing insights or generate if not available.

        Args:
            student_id: The student UUID.
            week_start: Start of the week (Monday).

        Returns:
            The weekly insight record.
        """
        if week_start is None:
            week_start = WeeklyInsight.get_week_start()

        existing = await self._get_existing_insight(student_id, week_start)
        if existing:
            return existing

        return await self.generate_weekly_insights(student_id, week_start)

    async def get_insights(
        self,
        student_id: UUID,
        week_start: date | None = None,
    ) -> WeeklyInsight | None:
        """Get existing insights without generating.

        Args:
            student_id: The student UUID.
            week_start: Start of the week (Monday).

        Returns:
            The weekly insight or None if not generated.
        """
        if week_start is None:
            week_start = WeeklyInsight.get_week_start()

        return await self._get_existing_insight(student_id, week_start)

    async def get_recent_insights(
        self,
        student_id: UUID,
        limit: int = 4,
    ) -> list[WeeklyInsight]:
        """Get recent weekly insights for a student.

        Args:
            student_id: The student UUID.
            limit: Maximum number of weeks to return.

        Returns:
            List of weekly insights, most recent first.
        """
        result = await self.db.execute(
            select(WeeklyInsight)
            .where(WeeklyInsight.student_id == student_id)
            .order_by(WeeklyInsight.week_start.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    # =========================================================================
    # Insight Generation Logic
    # =========================================================================

    async def _generate_all_insights(
        self,
        student: Student,
        weekly_stats: Any,
        subject_progress: list[Any],
    ) -> tuple[WeeklyInsightsData, int, Decimal]:
        """Generate all insight components.

        Args:
            student: The student object.
            weekly_stats: Weekly statistics.
            subject_progress: Subject progress data.

        Returns:
            Tuple of (insights data, total tokens, cost estimate).
        """
        total_tokens = 0
        total_cost = Decimal("0")

        # Prepare context
        context = self._prepare_context(student, weekly_stats, subject_progress)

        # Generate wins
        wins, tokens, cost = await self._generate_wins(context)
        total_tokens += tokens
        total_cost += cost

        # Generate areas to watch
        areas, tokens, cost = await self._generate_areas_to_watch(context)
        total_tokens += tokens
        total_cost += cost

        # Generate recommendations
        recommendations, tokens, cost = await self._generate_recommendations(context)
        total_tokens += tokens
        total_cost += cost

        # Generate teacher talking points
        talking_points, tokens, cost = await self._generate_teacher_points(context)
        total_tokens += tokens
        total_cost += cost

        # Generate pathway readiness for Stage 5
        pathway_readiness = None
        if student.school_stage == "S5":
            pathway_readiness, tokens, cost = await self._generate_pathway_readiness(context)
            total_tokens += tokens
            total_cost += cost

        # Generate HSC projection for Stage 6
        hsc_projection = None
        if student.school_stage == "S6":
            hsc_projection, tokens, cost = await self._generate_hsc_projection(context)
            total_tokens += tokens
            total_cost += cost

        # Create summary
        summary = self._generate_summary(wins, areas, weekly_stats)

        return (
            WeeklyInsightsData(
                wins=wins,
                areas_to_watch=areas,
                recommendations=recommendations,
                teacher_talking_points=talking_points,
                pathway_readiness=pathway_readiness,
                hsc_projection=hsc_projection,
                summary=summary,
            ),
            total_tokens,
            total_cost,
        )

    def _prepare_context(
        self,
        student: Student,
        weekly_stats: Any,
        subject_progress: list[Any],
    ) -> dict[str, Any]:
        """Prepare context data for prompts.

        Args:
            student: The student object.
            weekly_stats: Weekly statistics.
            subject_progress: Subject progress data.

        Returns:
            Context dictionary for prompts.
        """
        gamification = student.gamification or {}
        streaks = gamification.get("streaks", {})

        # Format subject data
        subject_data = []
        mastery_data = []
        for sp in subject_progress:
            subject_data.append(
                f"- {sp.subject_name}: {sp.mastery_level}% mastery, "
                f"{sp.sessions_this_week} sessions, {sp.time_spent_this_week_minutes} mins"
            )
            mastery_data.append(f"- {sp.subject_name}: {sp.mastery_level}%")

        return {
            "student_name": student.display_name,
            "grade_level": student.grade_level,
            "school_stage": student.school_stage,
            "sessions_count": weekly_stats.sessions_count,
            "study_time_minutes": weekly_stats.study_time_minutes,
            "topics_covered": weekly_stats.topics_covered,
            "flashcards_reviewed": weekly_stats.flashcards_reviewed,
            "questions_answered": weekly_stats.questions_answered,
            "accuracy": weekly_stats.accuracy_percentage or 0,
            "current_streak": streaks.get("current", 0),
            "subject_data": "\n".join(subject_data),
            "mastery_data": "\n".join(mastery_data),
            "subject_progress": subject_progress,
        }

    async def _generate_wins(
        self, context: dict[str, Any]
    ) -> tuple[list[InsightItem], int, Decimal]:
        """Generate wins/achievements insights.

        Args:
            context: Context data.

        Returns:
            Tuple of (wins list, tokens used, cost).
        """
        prompt = WINS_PROMPT.format(**context)

        try:
            response = await self.claude.generate(
                prompt=prompt,
                system_prompt=WEEKLY_INSIGHTS_SYSTEM_PROMPT,
                task_type=TaskType.SUMMARY,  # Use simple model
                max_tokens=500,
            )

            wins = self._parse_insights_response(response.content, "wins")
            return wins, response.input_tokens + response.output_tokens, Decimal(str(response.estimated_cost_usd))

        except Exception as e:
            logger.error(f"Error generating wins: {e}")
            # Return default wins
            return self._get_default_wins(context), 0, Decimal("0")

    async def _generate_areas_to_watch(
        self, context: dict[str, Any]
    ) -> tuple[list[InsightItem], int, Decimal]:
        """Generate areas to watch insights.

        Args:
            context: Context data.

        Returns:
            Tuple of (areas list, tokens used, cost).
        """
        prompt = AREAS_TO_WATCH_PROMPT.format(
            student_name=context["student_name"],
            grade_level=context["grade_level"],
            mastery_data=context["mastery_data"],
            activity_data=f"Sessions: {context['sessions_count']}, Time: {context['study_time_minutes']} mins",
        )

        try:
            response = await self.claude.generate(
                prompt=prompt,
                system_prompt=WEEKLY_INSIGHTS_SYSTEM_PROMPT,
                task_type=TaskType.SUMMARY,
                max_tokens=400,
            )

            areas = self._parse_insights_response(response.content, "areas")
            return areas, response.input_tokens + response.output_tokens, Decimal(str(response.estimated_cost_usd))

        except Exception as e:
            logger.error(f"Error generating areas to watch: {e}")
            return [], 0, Decimal("0")

    async def _generate_recommendations(
        self, context: dict[str, Any]
    ) -> tuple[list[RecommendationItem], int, Decimal]:
        """Generate recommendations.

        Args:
            context: Context data.

        Returns:
            Tuple of (recommendations list, tokens used, cost).
        """
        # Get focus areas from subject progress
        focus_areas = [
            sp.subject_name
            for sp in context["subject_progress"]
            if sp.current_focus_outcomes
        ]

        prompt = RECOMMENDATIONS_PROMPT.format(
            student_name=context["student_name"],
            grade_level=context["grade_level"],
            focus_areas=", ".join(focus_areas) if focus_areas else "General revision",
            mastery_data=context["mastery_data"],
        )

        try:
            response = await self.claude.generate(
                prompt=prompt,
                system_prompt=WEEKLY_INSIGHTS_SYSTEM_PROMPT,
                task_type=TaskType.SUMMARY,
                max_tokens=500,
            )

            recommendations = self._parse_recommendations_response(response.content)
            return recommendations, response.input_tokens + response.output_tokens, Decimal(str(response.estimated_cost_usd))

        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return self._get_default_recommendations(), 0, Decimal("0")

    async def _generate_teacher_points(
        self, context: dict[str, Any]
    ) -> tuple[list[str], int, Decimal]:
        """Generate teacher talking points.

        Args:
            context: Context data.

        Returns:
            Tuple of (talking points list, tokens used, cost).
        """
        subject_focus = [sp.subject_name for sp in context["subject_progress"][:3]]

        prompt = TEACHER_TALKING_POINTS_PROMPT.format(
            student_name=context["student_name"],
            grade_level=context["grade_level"],
            progress_data=context["mastery_data"],
            subject_focus=", ".join(subject_focus),
        )

        try:
            response = await self.claude.generate(
                prompt=prompt,
                system_prompt=WEEKLY_INSIGHTS_SYSTEM_PROMPT,
                task_type=TaskType.SUMMARY,
                max_tokens=300,
            )

            points = self._parse_string_list_response(response.content)
            return points, response.input_tokens + response.output_tokens, Decimal(str(response.estimated_cost_usd))

        except Exception as e:
            logger.error(f"Error generating teacher points: {e}")
            return self._get_default_teacher_points(), 0, Decimal("0")

    async def _generate_pathway_readiness(
        self, context: dict[str, Any]
    ) -> tuple[PathwayReadiness | None, int, Decimal]:
        """Generate Stage 5 pathway readiness assessment.

        Args:
            context: Context data.

        Returns:
            Tuple of (pathway readiness, tokens used, cost).
        """
        # Simplified pathway readiness - in production, this would be more sophisticated
        # For now, return a basic assessment based on mastery levels

        math_progress = None
        for sp in context["subject_progress"]:
            if sp.subject_code == "MATH":
                math_progress = sp
                break

        if not math_progress:
            return None, 0, Decimal("0")

        # Determine pathway based on mastery
        mastery = float(math_progress.mastery_level)
        if mastery >= 80:
            current_pathway = "5.3"
            ready_for_higher = True
            blocking_gaps = []
            recommendation = "Excellent progress! Ready for advanced pathway content."
        elif mastery >= 60:
            current_pathway = "5.2"
            ready_for_higher = mastery >= 75
            blocking_gaps = ["Consolidate algebraic manipulation"] if mastery < 70 else []
            recommendation = "Good progress in standard pathway. Focus on key concepts for potential advancement."
        else:
            current_pathway = "5.1"
            ready_for_higher = False
            blocking_gaps = ["Foundation concepts need reinforcement"]
            recommendation = "Focus on building strong foundations before considering pathway changes."

        return (
            PathwayReadiness(
                current_pathway=current_pathway,
                recommended_pathway=current_pathway,
                ready_for_higher=ready_for_higher,
                blocking_gaps=blocking_gaps,
                strengths=["Consistent effort" if context["current_streak"] > 3 else ""],
                recommendation=recommendation,
                confidence=Decimal("0.7"),
            ),
            0,
            Decimal("0"),
        )

    async def _generate_hsc_projection(
        self, context: dict[str, Any]
    ) -> tuple[HSCProjection | None, int, Decimal]:
        """Generate Stage 6 HSC band projection.

        Args:
            context: Context data.

        Returns:
            Tuple of (HSC projection, tokens used, cost).
        """
        # Simplified HSC projection - in production, this would use historical data
        # and more sophisticated analysis

        # Calculate average mastery across subjects
        masteries = [float(sp.mastery_level) for sp in context["subject_progress"]]
        if not masteries:
            return None, 0, Decimal("0")

        avg_mastery = sum(masteries) / len(masteries)

        # Map mastery to predicted band
        if avg_mastery >= 90:
            band = 6
            band_range = "90-100"
        elif avg_mastery >= 80:
            band = 5
            band_range = "80-89"
        elif avg_mastery >= 70:
            band = 4
            band_range = "70-79"
        elif avg_mastery >= 60:
            band = 3
            band_range = "60-69"
        elif avg_mastery >= 50:
            band = 2
            band_range = "50-59"
        else:
            band = 1
            band_range = "0-49"

        # Calculate days until HSC (approximate - October of Year 12)
        today = date.today()
        hsc_date = date(today.year if today.month < 10 else today.year + 1, 10, 15)
        days_until_hsc = max(0, (hsc_date - today).days)

        # Identify strengths and focus areas
        sorted_subjects = sorted(
            context["subject_progress"],
            key=lambda x: float(x.mastery_level),
            reverse=True,
        )
        strengths = [sp.subject_name for sp in sorted_subjects[:2]]
        focus_areas = [sp.subject_name for sp in sorted_subjects[-2:]]

        return (
            HSCProjection(
                predicted_band=band,
                band_range=band_range,
                current_average=Decimal(str(avg_mastery)).quantize(Decimal("0.1")),
                atar_contribution=None,  # Would require more complex calculation
                days_until_hsc=days_until_hsc,
                strengths=strengths,
                focus_areas=focus_areas,
                exam_readiness=Decimal(str(min(avg_mastery / 100, 1.0))).quantize(Decimal("0.01")),
                trajectory="stable",
            ),
            0,
            Decimal("0"),
        )

    def _generate_summary(
        self,
        wins: list[InsightItem],
        areas: list[InsightItem],
        weekly_stats: Any,
    ) -> str:
        """Generate a brief summary.

        Args:
            wins: List of wins.
            areas: List of areas to watch.
            weekly_stats: Weekly statistics.

        Returns:
            Brief summary string.
        """
        parts = []

        if weekly_stats.sessions_count > 0:
            parts.append(
                f"Completed {weekly_stats.sessions_count} study sessions "
                f"({weekly_stats.study_time_minutes} minutes)"
            )

        if wins:
            parts.append(f"Key win: {wins[0].title}")

        if areas:
            parts.append(f"Focus area: {areas[0].title}")

        return ". ".join(parts) + "." if parts else "Keep up the great work!"

    # =========================================================================
    # Response Parsing
    # =========================================================================

    def _parse_insights_response(
        self, response: str, insight_type: str
    ) -> list[InsightItem]:
        """Parse AI response into InsightItems.

        Args:
            response: AI response text.
            insight_type: Type of insight for logging.

        Returns:
            List of InsightItems.
        """
        try:
            # Extract JSON from response
            data = self._extract_json(response)
            if not isinstance(data, list):
                data = [data]

            items = []
            for item in data[:3]:  # Limit to 3 items
                items.append(
                    InsightItem(
                        title=item.get("title", "Insight"),
                        description=item.get("description", ""),
                        subject_name=item.get("subject_name"),
                        priority=item.get("priority", "medium"),
                    )
                )
            return items

        except Exception as e:
            logger.error(f"Error parsing {insight_type} response: {e}")
            return []

    def _parse_recommendations_response(
        self, response: str
    ) -> list[RecommendationItem]:
        """Parse AI response into RecommendationItems.

        Args:
            response: AI response text.

        Returns:
            List of RecommendationItems.
        """
        try:
            data = self._extract_json(response)
            if not isinstance(data, list):
                data = [data]

            items = []
            for item in data[:3]:
                items.append(
                    RecommendationItem(
                        title=item.get("title", "Recommendation"),
                        description=item.get("description", ""),
                        action_type=item.get("action_type", "practice"),
                        estimated_time_minutes=item.get("estimated_time_minutes", 15),
                        priority=item.get("priority", "medium"),
                    )
                )
            return items

        except Exception as e:
            logger.error(f"Error parsing recommendations: {e}")
            return self._get_default_recommendations()

    def _parse_string_list_response(self, response: str) -> list[str]:
        """Parse AI response into list of strings.

        Args:
            response: AI response text.

        Returns:
            List of strings.
        """
        try:
            data = self._extract_json(response)
            if isinstance(data, list):
                return [str(item) for item in data[:5]]
            return []

        except Exception as e:
            logger.error(f"Error parsing string list: {e}")
            return self._get_default_teacher_points()

    def _extract_json(self, text: str) -> Any:
        """Extract JSON from text that might contain other content.

        Args:
            text: Text that contains JSON.

        Returns:
            Parsed JSON data.
        """
        # Try to find JSON array or object
        import re

        # Look for [...] or {...}
        match = re.search(r'(\[[\s\S]*\]|\{[\s\S]*\})', text)
        if match:
            return json.loads(match.group(1))

        # Try parsing the whole thing
        return json.loads(text)

    # =========================================================================
    # Default Fallbacks
    # =========================================================================

    def _get_default_wins(self, context: dict[str, Any]) -> list[InsightItem]:
        """Get default wins if AI generation fails.

        Args:
            context: Context data.

        Returns:
            Default wins.
        """
        wins = []
        if context["sessions_count"] > 0:
            wins.append(
                InsightItem(
                    title="Active learner",
                    description=f"Completed {context['sessions_count']} study sessions this week.",
                    priority="high",
                )
            )
        if context["current_streak"] > 0:
            wins.append(
                InsightItem(
                    title=f"{context['current_streak']}-day streak",
                    description="Maintaining consistent study habits.",
                    priority="high",
                )
            )
        return wins

    def _get_default_recommendations(self) -> list[RecommendationItem]:
        """Get default recommendations if AI generation fails.

        Returns:
            Default recommendations.
        """
        return [
            RecommendationItem(
                title="Regular revision",
                description="Continue with regular flashcard reviews to reinforce learning.",
                action_type="review",
                estimated_time_minutes=15,
                priority="medium",
            ),
            RecommendationItem(
                title="Focus on weak areas",
                description="Spend extra time on subjects that need more attention.",
                action_type="practice",
                estimated_time_minutes=20,
                priority="medium",
            ),
        ]

    def _get_default_teacher_points(self) -> list[str]:
        """Get default teacher talking points if AI generation fails.

        Returns:
            Default talking points.
        """
        return [
            "How is my child progressing compared to curriculum expectations?",
            "Are there specific areas where additional support would be beneficial?",
            "What can we do at home to reinforce classroom learning?",
        ]

    # =========================================================================
    # Helper Methods
    # =========================================================================

    async def _get_existing_insight(
        self, student_id: UUID, week_start: date
    ) -> WeeklyInsight | None:
        """Get existing insight for a student and week.

        Args:
            student_id: The student UUID.
            week_start: Start of the week.

        Returns:
            Existing insight or None.
        """
        result = await self.db.execute(
            select(WeeklyInsight)
            .where(WeeklyInsight.student_id == student_id)
            .where(WeeklyInsight.week_start == week_start)
        )
        return result.scalar_one_or_none()
