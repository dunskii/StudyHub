"""
Seed NSW Curriculum Data

This script populates the database with NSW curriculum framework,
subjects, and sample outcomes for initial deployment.

Usage:
    python scripts/seed_nsw_curriculum.py

Requirements:
    - DATABASE_URL environment variable must be set
    - Database migrations must be run first (alembic upgrade head)
"""
import asyncio
import os
import sys
from uuid import uuid4

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models.curriculum_framework import CurriculumFramework
from app.models.subject import Subject
from app.models.curriculum_outcome import CurriculumOutcome


# NSW Framework Configuration
NSW_FRAMEWORK = {
    "code": "NSW",
    "name": "NSW Education Standards Authority (NESA)",
    "country": "Australia",
    "region_type": "state",
    "syllabus_authority": "NSW Education Standards Authority",
    "syllabus_url": "https://curriculum.nsw.edu.au/",
    "is_active": True,
    "is_default": True,
    "display_order": 1,
    "structure": {
        "stages": {
            "ES1": {"name": "Early Stage 1", "years": ["K"], "age_range": "5-6"},
            "S1": {"name": "Stage 1", "years": ["1", "2"], "age_range": "6-8"},
            "S2": {"name": "Stage 2", "years": ["3", "4"], "age_range": "8-10"},
            "S3": {"name": "Stage 3", "years": ["5", "6"], "age_range": "10-12"},
            "S4": {"name": "Stage 4", "years": ["7", "8"], "age_range": "12-14"},
            "S5": {"name": "Stage 5", "years": ["9", "10"], "age_range": "14-16"},
            "S6": {"name": "Stage 6", "years": ["11", "12"], "age_range": "16-18"},
        },
        "pathways": {
            "maths": {
                "S5": ["5.1", "5.2", "5.3"],
                "description": "Stage 5 Mathematics has three pathways based on ability",
            }
        },
        "senior_structure": {
            "preliminary": "Year 11",
            "hsc": "Year 12",
            "unit_types": ["2 Unit", "Extension 1", "Extension 2"],
        },
    },
}


# NSW Subjects (Key Learning Areas)
NSW_SUBJECTS = [
    {
        "code": "MATH",
        "name": "Mathematics",
        "kla": "Mathematics",
        "description": "Development of mathematical understanding, fluency, reasoning and problem-solving skills.",
        "icon": "calculator",
        "color": "#3B82F6",
        "available_stages": ["ES1", "S1", "S2", "S3", "S4", "S5", "S6"],
        "display_order": 1,
        "config": {
            "hasPathways": True,
            "pathways": ["5.1", "5.2", "5.3"],
            "seniorCourses": [
                "Mathematics Standard 1",
                "Mathematics Standard 2",
                "Mathematics Advanced",
                "Mathematics Extension 1",
                "Mathematics Extension 2",
            ],
            "assessmentTypes": ["test", "assignment", "investigation"],
            "tutorStyle": "socratic_stepwise",
        },
    },
    {
        "code": "ENG",
        "name": "English",
        "kla": "English",
        "description": "Development of effective communication skills in speaking, listening, reading, writing, viewing and representing.",
        "icon": "book-open",
        "color": "#8B5CF6",
        "available_stages": ["ES1", "S1", "S2", "S3", "S4", "S5", "S6"],
        "display_order": 2,
        "config": {
            "hasPathways": False,
            "pathways": [],
            "seniorCourses": [
                "English Standard",
                "English Advanced",
                "English Extension 1",
                "English Extension 2",
                "English Studies",
                "English EAL/D",
            ],
            "assessmentTypes": ["essay", "creative_writing", "speech", "analysis"],
            "tutorStyle": "socratic_analytical",
        },
    },
    {
        "code": "SCI",
        "name": "Science",
        "kla": "Science and Technology",
        "description": "Understanding of the natural and made world through inquiry, investigation and critical thinking.",
        "icon": "flask-conical",
        "color": "#10B981",
        "available_stages": ["ES1", "S1", "S2", "S3", "S4", "S5", "S6"],
        "display_order": 3,
        "config": {
            "hasPathways": False,
            "pathways": [],
            "seniorCourses": [
                "Biology",
                "Chemistry",
                "Physics",
                "Earth and Environmental Science",
                "Investigating Science",
                "Science Extension",
            ],
            "assessmentTypes": [
                "practical",
                "research",
                "test",
                "depth_study",
            ],
            "tutorStyle": "inquiry_based",
        },
    },
    {
        "code": "HSIE",
        "name": "Human Society and Its Environment",
        "kla": "HSIE",
        "description": "Understanding of human societies, environments, and how people interact with each other and the world.",
        "icon": "globe",
        "color": "#F59E0B",
        "available_stages": ["ES1", "S1", "S2", "S3", "S4", "S5", "S6"],
        "display_order": 4,
        "config": {
            "hasPathways": False,
            "pathways": [],
            "seniorCourses": [
                "Ancient History",
                "Modern History",
                "History Extension",
                "Geography",
                "Legal Studies",
                "Business Studies",
                "Economics",
                "Society and Culture",
                "Studies of Religion I",
                "Studies of Religion II",
            ],
            "assessmentTypes": ["essay", "source_analysis", "research", "fieldwork"],
            "tutorStyle": "socratic_analytical",
        },
    },
    {
        "code": "PDHPE",
        "name": "Personal Development, Health and Physical Education",
        "kla": "PDHPE",
        "description": "Development of knowledge, understanding and skills for healthy, safe and active lifestyles.",
        "icon": "heart-pulse",
        "color": "#EF4444",
        "available_stages": ["ES1", "S1", "S2", "S3", "S4", "S5", "S6"],
        "display_order": 5,
        "config": {
            "hasPathways": False,
            "pathways": [],
            "seniorCourses": [
                "PDHPE",
                "Community and Family Studies",
                "Sport, Lifestyle and Recreation Studies",
            ],
            "assessmentTypes": ["practical", "theory_test", "research"],
            "tutorStyle": "discussion_based",
        },
    },
    {
        "code": "TAS",
        "name": "Technology and Applied Studies",
        "kla": "TAS",
        "description": "Development of technological capability through design, production and evaluation of solutions.",
        "icon": "wrench",
        "color": "#6366F1",
        "available_stages": ["ES1", "S1", "S2", "S3", "S4", "S5", "S6"],
        "display_order": 6,
        "config": {
            "hasPathways": False,
            "pathways": [],
            "seniorCourses": [
                "Design and Technology",
                "Engineering Studies",
                "Food Technology",
                "Industrial Technology",
                "Information Processes and Technology",
                "Software Design and Development",
                "Textiles and Design",
            ],
            "assessmentTypes": ["project", "portfolio", "practical", "theory"],
            "tutorStyle": "project_based",
        },
    },
    {
        "code": "CA",
        "name": "Creative Arts",
        "kla": "Creative Arts",
        "description": "Development of creative and expressive capabilities through art, music, drama and dance.",
        "icon": "palette",
        "color": "#EC4899",
        "available_stages": ["ES1", "S1", "S2", "S3", "S4", "S5", "S6"],
        "display_order": 7,
        "config": {
            "hasPathways": False,
            "pathways": [],
            "seniorCourses": [
                "Visual Arts",
                "Music 1",
                "Music 2",
                "Music Extension",
                "Drama",
                "Dance",
            ],
            "assessmentTypes": ["performance", "portfolio", "composition", "analysis"],
            "tutorStyle": "creative_mentoring",
        },
    },
    {
        "code": "LANG",
        "name": "Languages",
        "kla": "Languages",
        "description": "Development of communication skills in languages other than English.",
        "icon": "languages",
        "color": "#14B8A6",
        "available_stages": ["S1", "S2", "S3", "S4", "S5", "S6"],
        "display_order": 8,
        "config": {
            "hasPathways": False,
            "pathways": [],
            "seniorCourses": [
                "French Beginners",
                "French Continuers",
                "French Extension",
                "German Beginners",
                "German Continuers",
                "German Extension",
                "Italian Beginners",
                "Italian Continuers",
                "Italian Extension",
                "Japanese Beginners",
                "Japanese Continuers",
                "Japanese Extension",
                "Chinese Beginners",
                "Chinese Continuers",
                "Chinese Extension",
                "Korean Beginners",
                "Korean Continuers",
                "Spanish Beginners",
                "Spanish Continuers",
                "Spanish Extension",
            ],
            "assessmentTypes": ["speaking", "listening", "reading", "writing"],
            "tutorStyle": "immersive",
        },
    },
]


# Sample Curriculum Outcomes (representative samples for each stage)
NSW_OUTCOMES = {
    "MATH": [
        # Early Stage 1
        {
            "outcome_code": "MAE-RWN-01",
            "description": "Demonstrates an understanding of how whole numbers indicate quantity.",
            "stage": "ES1",
            "strand": "Number and Algebra",
            "substrand": "Representing Whole Numbers",
        },
        {
            "outcome_code": "MAE-RWN-02",
            "description": "Reads and represents whole numbers from 0 to 20.",
            "stage": "ES1",
            "strand": "Number and Algebra",
            "substrand": "Representing Whole Numbers",
        },
        # Stage 1
        {
            "outcome_code": "MA1-RWN-01",
            "description": "Represents numbers in a variety of ways.",
            "stage": "S1",
            "strand": "Number and Algebra",
            "substrand": "Representing Whole Numbers",
        },
        {
            "outcome_code": "MA1-CSQ-01",
            "description": "Uses number sequences to solve problems.",
            "stage": "S1",
            "strand": "Number and Algebra",
            "substrand": "Combining and Separating Quantities",
        },
        # Stage 2
        {
            "outcome_code": "MA2-RN-01",
            "description": "Applies place value to partition, rearrange and regroup numbers up to four digits.",
            "stage": "S2",
            "strand": "Number and Algebra",
            "substrand": "Representing Numbers",
        },
        {
            "outcome_code": "MA2-AR-01",
            "description": "Uses mental and written strategies for addition and subtraction involving two-, three- and four-digit numbers.",
            "stage": "S2",
            "strand": "Number and Algebra",
            "substrand": "Additive Relations",
        },
        # Stage 3
        {
            "outcome_code": "MA3-RN-01",
            "description": "Applies an understanding of place value to represent decimals and negative numbers in a variety of ways.",
            "stage": "S3",
            "strand": "Number and Algebra",
            "substrand": "Representing Numbers",
        },
        {
            "outcome_code": "MA3-MR-01",
            "description": "Selects and applies appropriate strategies for multiplication and division and solves problems involving multiplication and division.",
            "stage": "S3",
            "strand": "Number and Algebra",
            "substrand": "Multiplicative Relations",
        },
        # Stage 4
        {
            "outcome_code": "MA4-INT-01",
            "description": "Compares, orders and calculates with integers.",
            "stage": "S4",
            "strand": "Number and Algebra",
            "substrand": "Integers",
        },
        {
            "outcome_code": "MA4-ALG-01",
            "description": "Uses algebraic techniques to solve simple linear equations.",
            "stage": "S4",
            "strand": "Number and Algebra",
            "substrand": "Algebraic Techniques",
        },
        # Stage 5.1
        {
            "outcome_code": "MA5.1-RN-01",
            "description": "Operates with rational numbers to solve problems.",
            "stage": "S5",
            "strand": "Number and Algebra",
            "substrand": "Rational Numbers",
            "pathway": "5.1",
        },
        # Stage 5.2
        {
            "outcome_code": "MA5.2-IND-01",
            "description": "Simplifies algebraic expressions involving indices.",
            "stage": "S5",
            "strand": "Number and Algebra",
            "substrand": "Indices",
            "pathway": "5.2",
        },
        # Stage 5.3
        {
            "outcome_code": "MA5.3-FNC-01",
            "description": "Uses functions to model and solve problems.",
            "stage": "S5",
            "strand": "Number and Algebra",
            "substrand": "Functions",
            "pathway": "5.3",
        },
    ],
    "ENG": [
        # Early Stage 1
        {
            "outcome_code": "ENE-OLC-01",
            "description": "Communicates with peers and known adults in informal and guided activities demonstrating emerging skills and strategies.",
            "stage": "ES1",
            "strand": "Oral Language and Communication",
        },
        {
            "outcome_code": "ENE-UARL-01",
            "description": "Understands and responds to literature read to them.",
            "stage": "ES1",
            "strand": "Understanding and Responding to Literature",
        },
        # Stage 1
        {
            "outcome_code": "EN1-OLC-01",
            "description": "Communicates with a range of people in informal and guided activities demonstrating interaction skills and considers how own communication is adjusted in different situations.",
            "stage": "S1",
            "strand": "Oral Language and Communication",
        },
        {
            "outcome_code": "EN1-RECOM-01",
            "description": "Comprehends independently read texts using reading strategies.",
            "stage": "S1",
            "strand": "Reading Comprehension",
        },
        # Stage 2
        {
            "outcome_code": "EN2-OLC-01",
            "description": "Communicates in a range of informal and formal contexts by adopting a range of roles in discussion.",
            "stage": "S2",
            "strand": "Oral Language and Communication",
        },
        {
            "outcome_code": "EN2-CWT-01",
            "description": "Plans, composes and reviews a range of texts that are more demanding in terms of topic, audience and language.",
            "stage": "S2",
            "strand": "Creating Written Texts",
        },
        # Stage 3
        {
            "outcome_code": "EN3-OLC-01",
            "description": "Communicates effectively for a variety of audiences and purposes using increasingly challenging topics, ideas, issues and language forms and features.",
            "stage": "S3",
            "strand": "Oral Language and Communication",
        },
        {
            "outcome_code": "EN3-UARL-01",
            "description": "Analyses and evaluates how language forms, features and structures of texts vary according to purpose, audience and context.",
            "stage": "S3",
            "strand": "Understanding and Responding to Literature",
        },
        # Stage 4
        {
            "outcome_code": "EN4-OLC-01",
            "description": "Responds to and composes texts for understanding, interpretation, critical analysis, imaginative expression and pleasure.",
            "stage": "S4",
            "strand": "Oral Language and Communication",
        },
        {
            "outcome_code": "EN4-CWT-01",
            "description": "Uses processes of writing to compose a range of texts with control and accuracy.",
            "stage": "S4",
            "strand": "Creating Written Texts",
        },
        # Stage 5
        {
            "outcome_code": "EN5-OLC-01",
            "description": "A student responds to and composes increasingly sophisticated and sustained texts for understanding, interpretation, critical analysis and pleasure.",
            "stage": "S5",
            "strand": "Oral Language and Communication",
        },
        {
            "outcome_code": "EN5-CWT-01",
            "description": "A student crafts controlled, sophisticated texts with purposeful selection of language features.",
            "stage": "S5",
            "strand": "Creating Written Texts",
        },
    ],
    "SCI": [
        # Stage 1
        {
            "outcome_code": "ST1-1WS",
            "description": "Observes, questions and collects data to communicate ideas.",
            "stage": "S1",
            "strand": "Working Scientifically",
        },
        {
            "outcome_code": "ST1-4LW",
            "description": "Describes observable features of living things and their environments.",
            "stage": "S1",
            "strand": "Living World",
        },
        # Stage 2
        {
            "outcome_code": "ST2-1WS",
            "description": "Questions, plans and conducts scientific investigations, collects and summarises data and communicates using scientific representations.",
            "stage": "S2",
            "strand": "Working Scientifically",
        },
        {
            "outcome_code": "ST2-6ES",
            "description": "Describes how scientific knowledge is used to inform decisions and identify new developments in the Earth and space.",
            "stage": "S2",
            "strand": "Earth and Space",
        },
        # Stage 3
        {
            "outcome_code": "ST3-1WS",
            "description": "Plans and conducts scientific investigations to collect reliable data, analyses data and evaluates evidence and conclusions.",
            "stage": "S3",
            "strand": "Working Scientifically",
        },
        {
            "outcome_code": "ST3-5PW",
            "description": "Explains how energy is transferred and transformed within systems.",
            "stage": "S3",
            "strand": "Physical World",
        },
        # Stage 4
        {
            "outcome_code": "SC4-4WS",
            "description": "Identifies questions and problems that can be tested or researched and makes predictions based on scientific knowledge.",
            "stage": "S4",
            "strand": "Working Scientifically",
        },
        {
            "outcome_code": "SC4-14LW",
            "description": "Relates the structure and function of living things to their classification, survival and reproduction.",
            "stage": "S4",
            "strand": "Living World",
        },
        # Stage 5
        {
            "outcome_code": "SC5-4WS",
            "description": "Develops questions or hypotheses to be investigated scientifically.",
            "stage": "S5",
            "strand": "Working Scientifically",
        },
        {
            "outcome_code": "SC5-16CW",
            "description": "Explains how models, theories and laws about matter have been refined over time.",
            "stage": "S5",
            "strand": "Chemical World",
        },
    ],
    "HSIE": [
        # Stage 1 - History
        {
            "outcome_code": "HT1-1",
            "description": "Communicates an understanding of change and continuity in family life using appropriate historical terms.",
            "stage": "S1",
            "strand": "History",
            "substrand": "Present and Past Family Life",
        },
        {
            "outcome_code": "HT1-2",
            "description": "Identifies and describes significant people, events, places and sites in the local community.",
            "stage": "S1",
            "strand": "History",
            "substrand": "The Past in the Present",
        },
        # Stage 2 - History
        {
            "outcome_code": "HT2-1",
            "description": "Identifies celebrations and commemorations of significance in Australia and the world.",
            "stage": "S2",
            "strand": "History",
            "substrand": "Community and Remembrance",
        },
        # Stage 2 - Geography
        {
            "outcome_code": "GE2-1",
            "description": "Examines features and characteristics of places and environments.",
            "stage": "S2",
            "strand": "Geography",
            "substrand": "Places are Similar and Different",
        },
        # Stage 3 - History
        {
            "outcome_code": "HT3-1",
            "description": "Describes and explains the significance of people, groups, places and events to the development of Australia.",
            "stage": "S3",
            "strand": "History",
            "substrand": "The Australian Colonies",
        },
        # Stage 3 - Geography
        {
            "outcome_code": "GE3-1",
            "description": "Describes the diverse features and characteristics of places and environments.",
            "stage": "S3",
            "strand": "Geography",
            "substrand": "Factors that Shape Places",
        },
        # Stage 4 - History
        {
            "outcome_code": "HT4-1",
            "description": "Describes the nature of history and archaeology and explains their contribution to an understanding of the past.",
            "stage": "S4",
            "strand": "History",
            "substrand": "The Ancient World",
        },
        # Stage 4 - Geography
        {
            "outcome_code": "GE4-1",
            "description": "Locates and describes the diverse features and characteristics of a range of places and environments.",
            "stage": "S4",
            "strand": "Geography",
            "substrand": "Landscapes and Landforms",
        },
        # Stage 5 - History
        {
            "outcome_code": "HT5-1",
            "description": "Explains and assesses the historical forces and factors that shaped the modern world and Australia.",
            "stage": "S5",
            "strand": "History",
            "substrand": "The Making of the Modern World",
        },
        # Stage 5 - Geography
        {
            "outcome_code": "GE5-1",
            "description": "Explains the diverse features and characteristics of a range of places and environments.",
            "stage": "S5",
            "strand": "Geography",
            "substrand": "Sustainable Biomes",
        },
    ],
    "PDHPE": [
        # Stage 1
        {
            "outcome_code": "PD1-1",
            "description": "Describes the qualities and characteristics that make them similar and different to others.",
            "stage": "S1",
            "strand": "Health, Wellbeing and Relationships",
        },
        {
            "outcome_code": "PD1-4",
            "description": "Performs fundamental movement skills with equipment in minor games and play situations.",
            "stage": "S1",
            "strand": "Movement Skill and Performance",
        },
        # Stage 2
        {
            "outcome_code": "PD2-1",
            "description": "Explores strategies to manage physical, social and emotional change.",
            "stage": "S2",
            "strand": "Health, Wellbeing and Relationships",
        },
        {
            "outcome_code": "PD2-4",
            "description": "Performs and refines movement skills in a variety of sequences and situations.",
            "stage": "S2",
            "strand": "Movement Skill and Performance",
        },
        # Stage 3
        {
            "outcome_code": "PD3-1",
            "description": "Evaluates factors that influence health decisions and health behaviours.",
            "stage": "S3",
            "strand": "Health, Wellbeing and Relationships",
        },
        {
            "outcome_code": "PD3-4",
            "description": "Refines and applies movement skills creatively to a variety of challenging situations.",
            "stage": "S3",
            "strand": "Movement Skill and Performance",
        },
        # Stage 4
        {
            "outcome_code": "PD4-1",
            "description": "Examines and evaluates strategies to manage current and future challenges.",
            "stage": "S4",
            "strand": "Health, Wellbeing and Relationships",
        },
        {
            "outcome_code": "PD4-4",
            "description": "Demonstrates and refines movement skills in a range of dynamic physical activity contexts.",
            "stage": "S4",
            "strand": "Movement Skill and Performance",
        },
        # Stage 5
        {
            "outcome_code": "PD5-1",
            "description": "Assesses their own and others' capacity to reflect on and respond positively to challenges.",
            "stage": "S5",
            "strand": "Health, Wellbeing and Relationships",
        },
        {
            "outcome_code": "PD5-4",
            "description": "Adapts and improvises movement skills to perform creative movement across a range of dynamic physical activity contexts.",
            "stage": "S5",
            "strand": "Movement Skill and Performance",
        },
    ],
}


async def seed_database():
    """Seed the database with NSW curriculum data."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable is not set.")
        print("Example: DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/studyhub")
        sys.exit(1)

    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            # Check if NSW framework already exists
            result = await session.execute(
                select(CurriculumFramework).where(CurriculumFramework.code == "NSW")
            )
            existing_framework = result.scalar_one_or_none()

            if existing_framework:
                print("NSW framework already exists. Skipping framework creation.")
                framework_id = existing_framework.id
            else:
                # Create NSW Framework
                print("Creating NSW Curriculum Framework...")
                framework = CurriculumFramework(
                    id=uuid4(),
                    **NSW_FRAMEWORK,
                )
                session.add(framework)
                await session.flush()
                framework_id = framework.id
                print(f"  Created framework: {NSW_FRAMEWORK['name']} (ID: {framework_id})")

            # Create Subjects
            print("\nCreating NSW Subjects...")
            subject_ids = {}

            for subject_data in NSW_SUBJECTS:
                # Check if subject already exists
                result = await session.execute(
                    select(Subject).where(
                        Subject.framework_id == framework_id,
                        Subject.code == subject_data["code"],
                    )
                )
                existing_subject = result.scalar_one_or_none()

                if existing_subject:
                    print(f"  Subject {subject_data['code']} already exists. Skipping.")
                    subject_ids[subject_data["code"]] = existing_subject.id
                else:
                    subject = Subject(
                        id=uuid4(),
                        framework_id=framework_id,
                        **subject_data,
                    )
                    session.add(subject)
                    await session.flush()
                    subject_ids[subject_data["code"]] = subject.id
                    print(f"  Created subject: {subject_data['name']} ({subject_data['code']})")

            # Create Curriculum Outcomes
            print("\nCreating NSW Curriculum Outcomes...")
            outcomes_created = 0
            outcomes_skipped = 0

            for subject_code, outcomes in NSW_OUTCOMES.items():
                subject_id = subject_ids.get(subject_code)
                if not subject_id:
                    print(f"  WARNING: Subject {subject_code} not found. Skipping outcomes.")
                    continue

                for outcome_data in outcomes:
                    # Check if outcome already exists
                    result = await session.execute(
                        select(CurriculumOutcome).where(
                            CurriculumOutcome.framework_id == framework_id,
                            CurriculumOutcome.outcome_code == outcome_data["outcome_code"],
                        )
                    )
                    existing_outcome = result.scalar_one_or_none()

                    if existing_outcome:
                        outcomes_skipped += 1
                        continue

                    outcome = CurriculumOutcome(
                        id=uuid4(),
                        framework_id=framework_id,
                        subject_id=subject_id,
                        **outcome_data,
                    )
                    session.add(outcome)
                    outcomes_created += 1

            await session.commit()
            print(f"\n  Created {outcomes_created} outcomes, skipped {outcomes_skipped} existing outcomes.")

            # Summary
            print("\n" + "=" * 60)
            print("SEEDING COMPLETE")
            print("=" * 60)
            print(f"Framework: NSW Education Standards Authority (NESA)")
            print(f"Subjects: {len(NSW_SUBJECTS)}")
            print(f"Sample Outcomes: {outcomes_created} created, {outcomes_skipped} skipped")
            print("\nSubjects seeded:")
            for subject in NSW_SUBJECTS:
                print(f"  - {subject['name']} ({subject['code']})")
            print("\nNote: This seed contains representative sample outcomes.")
            print("Full curriculum data should be imported from NESA syllabus documents.")

        except Exception as e:
            await session.rollback()
            print(f"\nERROR: {e}")
            raise


async def clear_curriculum_data():
    """Clear all curriculum data (for testing/reset purposes)."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable is not set.")
        sys.exit(1)

    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            # Delete in order due to foreign key constraints
            await session.execute(
                CurriculumOutcome.__table__.delete()
            )
            await session.execute(
                Subject.__table__.delete()
            )
            await session.execute(
                CurriculumFramework.__table__.delete()
            )
            await session.commit()
            print("All curriculum data cleared.")
        except Exception as e:
            await session.rollback()
            print(f"ERROR: {e}")
            raise


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed NSW Curriculum Data")
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear all curriculum data before seeding",
    )
    parser.add_argument(
        "--clear-only",
        action="store_true",
        help="Only clear curriculum data, do not seed",
    )
    args = parser.parse_args()

    if args.clear_only:
        asyncio.run(clear_curriculum_data())
    elif args.clear:
        asyncio.run(clear_curriculum_data())
        asyncio.run(seed_database())
    else:
        asyncio.run(seed_database())
