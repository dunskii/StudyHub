"""Email service for sending notifications via Resend API.

Handles:
- Weekly summary emails
- Achievement notifications
- Concern alerts
- Goal achieved notifications
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.user import User
from app.models.student import Student
from app.models.weekly_insight import WeeklyInsight
from app.services.parent_analytics_service import ParentAnalyticsService

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via Resend API."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialise with database session.

        Args:
            db: Async database session.
        """
        self.db = db
        self.settings = get_settings()
        self.analytics = ParentAnalyticsService(db)

    # =========================================================================
    # Email Sending
    # =========================================================================

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None = None,
    ) -> bool:
        """Send an email via Resend API.

        Args:
            to_email: Recipient email address.
            subject: Email subject.
            html_content: HTML body content.
            text_content: Optional plain text body.

        Returns:
            True if sent successfully, False otherwise.
        """
        if not self.settings.resend_api_key:
            logger.warning("Resend API key not configured, skipping email")
            return False

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {self.settings.resend_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": self.settings.email_from_address,
                        "to": [to_email],
                        "subject": subject,
                        "html": html_content,
                        "text": text_content or self._html_to_text(html_content),
                    },
                    timeout=30.0,
                )

                if response.status_code == 200:
                    logger.info(f"Email sent successfully to {to_email}")
                    return True
                else:
                    logger.error(
                        f"Failed to send email: {response.status_code} - {response.text}"
                    )
                    return False

        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False

    # =========================================================================
    # Weekly Summary Email
    # =========================================================================

    async def send_weekly_summary(
        self,
        parent_id: UUID,
        student_id: UUID,
        week_start: date | None = None,
    ) -> bool:
        """Send weekly summary email to parent.

        Args:
            parent_id: The parent's user UUID.
            student_id: The student UUID.
            week_start: Start of the week (defaults to last week).

        Returns:
            True if sent successfully.
        """
        # Get parent
        parent = await self.db.get(User, parent_id)
        if not parent:
            logger.error(f"Parent {parent_id} not found")
            return False

        # Get student
        result = await self.db.execute(
            select(Student)
            .where(Student.id == student_id)
            .where(Student.parent_id == parent_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            logger.error(f"Student {student_id} not found or not owned by parent")
            return False

        # Get week dates
        if week_start is None:
            today = date.today()
            week_start = today - timedelta(days=today.weekday() + 7)  # Last Monday

        week_end = week_start + timedelta(days=6)

        # Get data
        weekly_stats = await self.analytics.get_weekly_stats(student_id, week_start)
        subject_progress = await self.analytics.get_subject_progress(student_id)

        # Get insights if available
        insight_result = await self.db.execute(
            select(WeeklyInsight)
            .where(WeeklyInsight.student_id == student_id)
            .where(WeeklyInsight.week_start == week_start)
        )
        weekly_insight = insight_result.scalar_one_or_none()

        # Generate email content
        html_content = self._generate_weekly_summary_html(
            parent_name=parent.display_name,
            student_name=student.display_name,
            week_start=week_start,
            week_end=week_end,
            weekly_stats=weekly_stats,
            subject_progress=subject_progress,
            insights=weekly_insight.insights if weekly_insight else None,
        )

        # Send email
        subject = f"Weekly Progress Report for {student.display_name} - {week_start.strftime('%d %b')}"
        success = await self.send_email(parent.email, subject, html_content)

        # Mark insight as sent
        if success and weekly_insight:
            weekly_insight.sent_to_parent_at = datetime.now(timezone.utc)
            await self.db.commit()

        return success

    def _generate_weekly_summary_html(
        self,
        parent_name: str,
        student_name: str,
        week_start: date,
        week_end: date,
        weekly_stats: Any,
        subject_progress: list[Any],
        insights: dict[str, Any] | None = None,
    ) -> str:
        """Generate HTML content for weekly summary email.

        Args:
            parent_name: Parent's name.
            student_name: Student's name.
            week_start: Start of week.
            week_end: End of week.
            weekly_stats: Weekly statistics.
            subject_progress: Subject progress data.
            insights: AI-generated insights if available.

        Returns:
            HTML email content.
        """
        # Build subject progress HTML
        subjects_html = ""
        for sp in subject_progress[:5]:  # Top 5 subjects
            progress_color = self._get_progress_color(float(sp.mastery_level))
            subjects_html += f"""
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">{sp.subject_name}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
                    <div style="background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                        <div style="background: {progress_color}; height: 20px; width: {sp.mastery_level}%;"></div>
                    </div>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: bold;">{sp.mastery_level}%</td>
            </tr>
            """

        # Build insights HTML
        insights_html = ""
        if insights:
            wins = insights.get("wins", [])
            if wins:
                insights_html += "<h3 style='color: #22c55e; margin-top: 24px;'>This Week's Wins</h3><ul>"
                for win in wins[:3]:
                    insights_html += f"<li><strong>{win.get('title', '')}</strong>: {win.get('description', '')}</li>"
                insights_html += "</ul>"

            recommendations = insights.get("recommendations", [])
            if recommendations:
                insights_html += "<h3 style='color: #3b82f6; margin-top: 24px;'>Recommendations</h3><ul>"
                for rec in recommendations[:3]:
                    insights_html += f"<li><strong>{rec.get('title', '')}</strong>: {rec.get('description', '')}</li>"
                insights_html += "</ul>"

        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Weekly Progress Report</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">{student_name} | {week_start.strftime('%d %b')} - {week_end.strftime('%d %b %Y')}</p>
    </div>

    <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hi {parent_name},</p>
        <p>Here's how {student_name} progressed this week:</p>

        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="margin-top: 0; font-size: 18px; color: #1f2937;">Weekly Summary</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                <div style="text-align: center; padding: 16px; background: #f0fdf4; border-radius: 8px;">
                    <div style="font-size: 28px; font-weight: bold; color: #22c55e;">{weekly_stats.sessions_count}</div>
                    <div style="color: #6b7280; font-size: 14px;">Study Sessions</div>
                </div>
                <div style="text-align: center; padding: 16px; background: #eff6ff; border-radius: 8px;">
                    <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">{weekly_stats.study_time_minutes}</div>
                    <div style="color: #6b7280; font-size: 14px;">Minutes Studied</div>
                </div>
                <div style="text-align: center; padding: 16px; background: #fefce8; border-radius: 8px;">
                    <div style="font-size: 28px; font-weight: bold; color: #eab308;">{weekly_stats.topics_covered}</div>
                    <div style="color: #6b7280; font-size: 14px;">Topics Covered</div>
                </div>
                <div style="text-align: center; padding: 16px; background: #fdf4ff; border-radius: 8px;">
                    <div style="font-size: 28px; font-weight: bold; color: #a855f7;">{weekly_stats.flashcards_reviewed}</div>
                    <div style="color: #6b7280; font-size: 14px;">Cards Reviewed</div>
                </div>
            </div>
        </div>

        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="margin-top: 0; font-size: 18px; color: #1f2937;">Subject Progress</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8fafc;">
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Subject</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Progress</th>
                        <th style="padding: 12px; text-align: right; font-weight: 600;">Mastery</th>
                    </tr>
                </thead>
                <tbody>
                    {subjects_html}
                </tbody>
            </table>
        </div>

        {insights_html}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
            <a href="#" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Full Dashboard</a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            You're receiving this because you have weekly reports enabled.
            <a href="#" style="color: #3b82f6;">Update preferences</a>
        </p>
    </div>

    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>StudyHub - Helping Australian students learn smarter</p>
    </div>
</body>
</html>
        """

    # =========================================================================
    # Achievement Email
    # =========================================================================

    async def send_achievement_email(
        self,
        parent_id: UUID,
        student_id: UUID,
        achievement_name: str,
        achievement_description: str,
    ) -> bool:
        """Send achievement notification email.

        Args:
            parent_id: Parent's user UUID.
            student_id: Student UUID.
            achievement_name: Name of achievement.
            achievement_description: Description.

        Returns:
            True if sent successfully.
        """
        parent = await self.db.get(User, parent_id)
        if not parent:
            return False

        student = await self.db.get(Student, student_id)
        if not student:
            return False

        html_content = f"""
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; border-radius: 8px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">🏆</div>
        <h1 style="color: white; margin: 0;">{achievement_name}</h1>
    </div>
    <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hi {parent.display_name},</p>
        <p><strong>{student.display_name}</strong> has earned a new achievement!</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <h3 style="margin-top: 0; color: #22c55e;">{achievement_name}</h3>
            <p style="margin-bottom: 0;">{achievement_description}</p>
        </div>
        <p>Keep encouraging their great work!</p>
    </div>
</body>
</html>
        """

        return await self.send_email(
            parent.email,
            f"🏆 {student.display_name} earned: {achievement_name}",
            html_content,
        )

    # =========================================================================
    # Goal Achieved Email
    # =========================================================================

    async def send_goal_achieved_email(
        self,
        parent_id: UUID,
        student_id: UUID,
        goal_title: str,
        reward: str | None = None,
    ) -> bool:
        """Send goal achieved notification email.

        Args:
            parent_id: Parent's user UUID.
            student_id: Student UUID.
            goal_title: Title of achieved goal.
            reward: Optional reward.

        Returns:
            True if sent successfully.
        """
        parent = await self.db.get(User, parent_id)
        if not parent:
            return False

        student = await self.db.get(Student, student_id)
        if not student:
            return False

        reward_html = ""
        if reward:
            reward_html = f"""
            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin-top: 16px; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 8px;">🎁</div>
                <p style="margin: 0; font-weight: 600; color: #d97706;">Reward: {reward}</p>
            </div>
            """

        html_content = f"""
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 30px; border-radius: 8px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
        <h1 style="color: white; margin: 0;">Goal Achieved!</h1>
    </div>
    <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hi {parent.display_name},</p>
        <p>Great news! <strong>{student.display_name}</strong> has achieved their goal:</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
            <h3 style="margin-top: 0; color: #8b5cf6;">{goal_title}</h3>
        </div>
        {reward_html}
        <p>Celebrate this achievement together!</p>
    </div>
</body>
</html>
        """

        return await self.send_email(
            parent.email,
            f"🎯 Goal Achieved: {goal_title}",
            html_content,
        )

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _get_progress_color(self, percentage: float) -> str:
        """Get color based on progress percentage.

        Args:
            percentage: Progress percentage.

        Returns:
            Hex color code.
        """
        if percentage >= 80:
            return "#22c55e"  # Green
        elif percentage >= 60:
            return "#3b82f6"  # Blue
        elif percentage >= 40:
            return "#eab308"  # Yellow
        else:
            return "#ef4444"  # Red

    def _html_to_text(self, html: str) -> str:
        """Convert HTML to plain text (basic).

        Args:
            html: HTML content.

        Returns:
            Plain text version.
        """
        import re

        # Remove style and script tags
        text = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', html)
        text = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', text)
        # Replace br and p with newlines
        text = re.sub(r'<br\s*/?>', '\n', text)
        text = re.sub(r'</p>', '\n\n', text)
        # Remove remaining tags
        text = re.sub(r'<[^>]+>', '', text)
        # Clean up whitespace
        text = re.sub(r'\n\s*\n', '\n\n', text)
        text = text.strip()
        return text
