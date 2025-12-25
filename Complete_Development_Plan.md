# Complete Development Plan: AI-Powered Study Assistant with NSW Curriculum Integration

## 🎯 Project Vision

Transform our AI-powered study assistant into **Australia's first curriculum-aligned educational platform** by integrating official NSW Mathematics curriculum standards, with expansion capability to all Australian states.

---

## 📋 Technology Stack (Final)

### Frontend Stack
```json
{
  "framework": "React 18.3 + TypeScript 5.3",
  "build": "Vite 5.x",
  "styling": "Tailwind CSS 3.4 + Tailwind UI",
  "state": "@tanstack/react-query v5 + Zustand 4.5",
  "routing": "React Router v6.22",
  "forms": "React Hook Form 7.50 + Zod 3.22",
  "ui_components": "Radix UI + Framer Motion + Lucide Icons",
  "pwa": "Vite PWA Plugin + Workbox 7.0",
  "testing": "Vitest + React Testing Library + Playwright",
  "offline": "IndexedDB (idb) + Background Sync API",
  "monitoring": "Sentry + Plausible Analytics"
}
```

### Backend Stack
```json
{
  "runtime": "Python 3.11",
  "framework": "FastAPI 0.109 + Uvicorn",
  "async": "asyncio + httpx + aiofiles",
  "validation": "Pydantic v2",
  "database_orm": "SQLAlchemy 2.0 + asyncpg",
  "migrations": "Alembic",
  "cors": "fastapi-cors",
  "rate_limiting": "slowapi",
  "testing": "pytest + pytest-asyncio + pytest-cov",
  "monitoring": "OpenTelemetry + Sentry",
  "deployment": "Docker + Digital Ocean App Platform"
}
```

### Infrastructure Stack
```json
{
  "ai_primary": "Anthropic Claude API (Sonnet 4 + Haiku 3.5)",
  "ai_ocr": "Google Cloud Vision API (pay-per-use)",
  "database": "Digital Ocean Managed PostgreSQL",
  "storage": "Digital Ocean Spaces (S3-compatible)",
  "auth": "Supabase Auth",
  "email": "Resend API",
  "hosting": "Digital Ocean App Platform",
  "cdn": "Cloudflare (free tier)",
  "ci_cd": "GitHub Actions",
  "monitoring": "Digital Ocean Monitoring + Sentry + Uptime Robot",
  "analytics": "Plausible Analytics (privacy-focused)",
  "cache": "Digital Ocean Managed Redis"
}
```

### AI Model Strategy
```json
{
  "model_routing": {
    "simple_tasks": {
      "model": "claude-3-5-haiku-20241022",
      "use_cases": ["flashcard_generation", "summaries", "simple_qa", "keyword_extraction"],
      "cost_per_1M_tokens": {"input": "$0.80", "output": "$4.00"},
      "avg_latency": "~500ms"
    },
    "complex_tasks": {
      "model": "claude-sonnet-4-20250514",
      "use_cases": ["socratic_tutoring", "curriculum_alignment", "misconception_detection", "essay_feedback"],
      "cost_per_1M_tokens": {"input": "$3.00", "output": "$15.00"},
      "avg_latency": "~1500ms"
    },
    "ocr": {
      "service": "Google Cloud Vision API",
      "use_cases": ["handwriting_recognition", "document_text_extraction"],
      "cost": "$1.50 per 1000 images"
    }
  },
  "safety_features": {
    "content_filtering": "Claude's built-in safety",
    "age_appropriate": "Custom system prompts for student interactions",
    "parent_oversight": "All AI interactions logged for parent review"
  }
}
```

### Cost Comparison (Monthly Estimates)

| Component | Previous (GCP/Firebase) | New (Digital Ocean) | Savings |
|-----------|------------------------|---------------------|---------|
| Hosting | $50-100 | $12-24 (App Platform) | ~70% |
| Database | $50-100 (Firestore) | $15 (Managed PostgreSQL) | ~80% |
| Storage | $25 | $5 (Spaces) | ~80% |
| Auth | $0-50 (Firebase) | $0-25 (Supabase) | ~50% |
| AI (Vertex AI) | $200-500 | $50-150 (Claude API) | ~70% |
| **Total** | **$325-775** | **$82-219** | **~70%** |

---

## 🏗️ Complete Project Structure

```typescript
studyhub/
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # Base UI components
│   │   │   │   ├── Button/
│   │   │   │   ├── Card/
│   │   │   │   ├── Modal/
│   │   │   │   ├── Form/
│   │   │   │   └── Toast/
│   │   │   ├── curriculum/    # Curriculum-specific components
│   │   │   │   ├── OutcomeCard/
│   │   │   │   ├── ProgressChart/
│   │   │   │   ├── CurriculumDashboard/
│   │   │   │   ├── SkillTracker/
│   │   │   │   └── StrandNavigator/
│   │   │   ├── subjects/      # Subject-specific components
│   │   │   │   ├── SubjectSelector/
│   │   │   │   ├── SubjectCard/
│   │   │   │   ├── SubjectProgress/
│   │   │   │   ├── PathwaySelector/   # For Stage 5 pathways
│   │   │   │   └── HSCCourseSelector/ # For Stage 6 courses
│   │   │   ├── notes/         # Note management components
│   │   │   │   ├── NoteUpload/
│   │   │   │   ├── NoteViewer/
│   │   │   │   ├── NoteAnnotation/
│   │   │   │   └── OCRProcessor/
│   │   │   └── shared/        # Shared components
│   │   │       ├── Layout/
│   │   │       ├── Navigation/
│   │   │       └── ErrorBoundary/
│   │   ├── features/          # Feature modules
│   │   │   ├── auth/
│   │   │   ├── onboarding/
│   │   │   │   ├── StudentOnboarding.tsx
│   │   │   │   ├── SubjectSelection.tsx    # Multi-subject selection
│   │   │   │   ├── PathwaySelection.tsx    # Subject-specific pathways
│   │   │   │   └── HSCCourseSelection.tsx  # HSC course picker
│   │   │   ├── subjects/      # Subject management
│   │   │   │   ├── SubjectDashboard.tsx
│   │   │   │   ├── SubjectSettings.tsx
│   │   │   │   └── EnrolmentManager.tsx
│   │   │   ├── revision/
│   │   │   │   ├── RevisionSession.tsx
│   │   │   │   ├── SubjectRevision.tsx     # Subject-specific revision
│   │   │   │   └── CrossSubjectReview.tsx  # Mixed subject sessions
│   │   │   ├── socratic-tutor/
│   │   │   │   ├── TutorChat.tsx
│   │   │   │   ├── SubjectTutorConfig.ts   # Subject-specific tutor styles
│   │   │   │   └── tutorPrompts/           # Per-subject AI prompts
│   │   │   │       ├── mathsTutor.ts
│   │   │   │       ├── englishTutor.ts
│   │   │   │       ├── scienceTutor.ts
│   │   │   │       ├── hsieTutor.ts
│   │   │   │       └── languagesTutor.ts
│   │   │   ├── rewards/
│   │   │   └── parent-dashboard/
│   │   │       ├── ParentDashboard.tsx
│   │   │       ├── SubjectProgress.tsx     # Per-subject progress view
│   │   │       └── AllSubjectsOverview.tsx
│   │   ├── lib/              # Core libraries
│   │   │   ├── api/
│   │   │   ├── supabase/     # Supabase client
│   │   │   ├── curriculum/
│   │   │   │   ├── curriculumLoader.ts
│   │   │   │   ├── outcomeMapper.ts
│   │   │   │   └── subjectConfig.ts    # Subject-specific configurations
│   │   │   ├── offline/
│   │   │   └── ai/
│   │   ├── hooks/            # Custom React hooks
│   │   │   ├── useSubjects.ts          # Subject management hook
│   │   │   ├── useStudentSubjects.ts   # Student's enrolled subjects
│   │   │   ├── useCurriculum.ts
│   │   │   └── useAuth.ts
│   │   ├── stores/           # Zustand state stores
│   │   │   ├── authStore.ts
│   │   │   ├── subjectStore.ts         # Active subject state
│   │   │   ├── curriculumStore.ts
│   │   │   └── revisionStore.ts
│   │   ├── types/            # TypeScript definitions
│   │   │   ├── subject.types.ts
│   │   │   ├── curriculum.types.ts
│   │   │   ├── hsc.types.ts
│   │   │   └── student.types.ts
│   │   ├── utils/            # Utility functions
│   │   ├── styles/           # Global styles
│   │   └── tests/            # Test files
│   ├── public/               # Static assets
│   ├── .env.example
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── package.json
│
├── backend/                   # Python FastAPI application
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── notes.py
│   │   │   │   │   ├── subjects.py         # Subject CRUD
│   │   │   │   │   ├── curriculum.py
│   │   │   │   │   ├── hsc_courses.py      # HSC course management
│   │   │   │   │   ├── student_subjects.py # Student enrolments
│   │   │   │   │   ├── revision.py
│   │   │   │   │   ├── socratic.py
│   │   │   │   │   └── analytics.py
│   │   │   │   └── router.py
│   │   │   └── middleware/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/           # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── student.py
│   │   │   ├── subject.py              # Subject model
│   │   │   ├── hsc_course.py           # HSC course model
│   │   │   ├── student_subject.py      # Student-subject enrolment
│   │   │   ├── curriculum.py
│   │   │   ├── note.py
│   │   │   └── session.py
│   │   ├── schemas/          # Pydantic schemas
│   │   │   ├── subject.py
│   │   │   ├── hsc_course.py
│   │   │   ├── curriculum.py
│   │   │   └── student_subject.py
│   │   ├── services/
│   │   │   ├── claude_service.py      # Claude AI integration
│   │   │   ├── ocr_service.py         # Google Vision OCR
│   │   │   ├── ai_router.py           # Model routing logic
│   │   │   ├── subject_service.py     # Subject business logic
│   │   │   ├── curriculum_service.py
│   │   │   ├── tutor_prompts/         # Subject-specific AI prompts
│   │   │   │   ├── base_tutor.py
│   │   │   │   ├── maths_tutor.py
│   │   │   │   ├── english_tutor.py
│   │   │   │   ├── science_tutor.py
│   │   │   │   ├── hsie_tutor.py
│   │   │   │   ├── creative_arts_tutor.py
│   │   │   │   └── languages_tutor.py
│   │   │   └── spaced_repetition.py
│   │   └── utils/
│   ├── alembic/              # Database migrations
│   │   ├── versions/
│   │   └── alembic.ini
│   ├── tests/
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── .env.example
│
├── infrastructure/           # Infrastructure as Code
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.dev.yml
│   │   └── docker-compose.prod.yml
│   └── scripts/
│       ├── deploy.ps1        # PowerShell deployment script
│       └── setup-do.ps1      # Digital Ocean setup script
│
├── docs/                    # Documentation
│   ├── api/
│   ├── architecture/
│   ├── curriculum/
│   └── deployment/
│
└── .github/                # GitHub configuration
    └── workflows/
        ├── frontend-ci.yml
        ├── backend-ci.yml
        └── deploy-digitalocean.yml
```

---

## 📊 Complete Database Schema (PostgreSQL)

```sql
-- PostgreSQL Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table - Parent accounts (synced with Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supabase_auth_id UUID UNIQUE NOT NULL,  -- Links to Supabase Auth
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    -- Subscription info
    subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'school')),
    subscription_started_at TIMESTAMPTZ,
    subscription_expires_at TIMESTAMPTZ,
    stripe_customer_id VARCHAR(255),
    
    -- Preferences (JSONB for flexibility)
    preferences JSONB DEFAULT '{
        "emailNotifications": true,
        "weeklyReports": true,
        "language": "en-AU",
        "timezone": "Australia/Sydney"
    }',
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- 2. Students Table - Student profiles
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    supabase_auth_id UUID UNIQUE,  -- Optional: if student has own login
    email VARCHAR(255),
    display_name VARCHAR(255) NOT NULL,
    grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 13),  -- Extended for international
    school_stage VARCHAR(20) NOT NULL,  -- Framework-specific stage
    school VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,
    onboarding_completed BOOLEAN DEFAULT FALSE,

    -- Curriculum framework (defaults to NSW)
    framework_id UUID REFERENCES curriculum_frameworks(id),

    -- Preferences
    preferences JSONB DEFAULT '{
        "theme": "auto",
        "studyReminders": true,
        "dailyGoalMinutes": 30,
        "language": "en-AU"
    }',

    -- Gamification (global across all subjects)
    gamification JSONB DEFAULT '{
        "totalXP": 0,
        "level": 1,
        "achievements": [],
        "streaks": {"current": 0, "longest": 0, "lastActiveDate": null}
    }'
);

-- Index for parent and framework lookups
CREATE INDEX idx_students_parent_id ON students(parent_id);
CREATE INDEX idx_students_grade_level ON students(grade_level);
CREATE INDEX idx_students_framework ON students(framework_id);

-- 3. Curriculum Frameworks Table - Supports multiple states/countries
CREATE TABLE curriculum_frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "NSW", "VIC", "QLD", "AU_NATIONAL", "UK_GCSE"
    name VARCHAR(100) NOT NULL,  -- e.g., "New South Wales", "Victoria", "Australian Curriculum"
    country VARCHAR(50) NOT NULL DEFAULT 'Australia',
    region_type VARCHAR(20) NOT NULL CHECK (region_type IN ('state', 'national', 'international')),

    -- Framework structure (JSONB)
    structure JSONB DEFAULT '{
        "stages": [],
        "gradeMapping": {},
        "pathwaySystem": {},
        "seniorSecondary": {}
    }',

    -- Metadata
    syllabus_authority VARCHAR(100),  -- e.g., "NESA", "VCAA", "QCAA", "ACARA"
    syllabus_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,  -- NSW will be default initially
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial curriculum frameworks (NSW as default, others for future)
INSERT INTO curriculum_frameworks (code, name, country, region_type, syllabus_authority, is_active, is_default, structure) VALUES
('NSW', 'New South Wales', 'Australia', 'state', 'NESA', TRUE, TRUE, '{
    "stages": ["ES1", "stage1", "stage2", "stage3", "stage4", "stage5", "stage6"],
    "gradeMapping": {
        "K": "ES1", "1": "stage1", "2": "stage1",
        "3": "stage2", "4": "stage2",
        "5": "stage3", "6": "stage3",
        "7": "stage4", "8": "stage4",
        "9": "stage5", "10": "stage5",
        "11": "stage6", "12": "stage6"
    },
    "pathwaySystem": {
        "stage5": {"subjects": ["Mathematics"], "pathways": ["5.1", "5.2", "5.3"]}
    },
    "seniorSecondary": {
        "name": "HSC",
        "fullName": "Higher School Certificate",
        "years": [11, 12]
    }
}'),
('VIC', 'Victoria', 'Australia', 'state', 'VCAA', FALSE, FALSE, '{
    "stages": ["foundation", "1-2", "3-4", "5-6", "7-8", "9-10", "VCE"],
    "seniorSecondary": {
        "name": "VCE",
        "fullName": "Victorian Certificate of Education",
        "years": [11, 12]
    }
}'),
('QLD', 'Queensland', 'Australia', 'state', 'QCAA', FALSE, FALSE, '{
    "seniorSecondary": {
        "name": "QCE",
        "fullName": "Queensland Certificate of Education",
        "years": [11, 12]
    }
}'),
('SA', 'South Australia', 'Australia', 'state', 'SACE Board', FALSE, FALSE, '{
    "seniorSecondary": {
        "name": "SACE",
        "fullName": "South Australian Certificate of Education",
        "years": [11, 12]
    }
}'),
('WA', 'Western Australia', 'Australia', 'state', 'SCSA', FALSE, FALSE, '{
    "seniorSecondary": {
        "name": "WACE",
        "fullName": "Western Australian Certificate of Education",
        "years": [11, 12]
    }
}'),
('AU_NATIONAL', 'Australian Curriculum', 'Australia', 'national', 'ACARA', FALSE, FALSE, '{
    "stages": ["foundation", "1-2", "3-4", "5-6", "7-8", "9-10"],
    "description": "National curriculum framework used as base by all states"
}'),
('UK_GCSE', 'UK GCSE/A-Levels', 'United Kingdom', 'international', 'Various Exam Boards', FALSE, FALSE, '{
    "stages": ["KS1", "KS2", "KS3", "KS4", "KS5"],
    "seniorSecondary": {
        "name": "A-Levels",
        "fullName": "Advanced Level",
        "years": [12, 13]
    }
}'),
('IB', 'International Baccalaureate', 'International', 'international', 'IBO', FALSE, FALSE, '{
    "programmes": ["PYP", "MYP", "DP"],
    "seniorSecondary": {
        "name": "IB Diploma",
        "years": [11, 12]
    }
}');

CREATE INDEX idx_frameworks_code ON curriculum_frameworks(code);
CREATE INDEX idx_frameworks_country ON curriculum_frameworks(country);
CREATE INDEX idx_frameworks_active ON curriculum_frameworks(is_active);

-- 4. Subjects Table - All Curriculum Subjects/KLAs (linked to framework)
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID REFERENCES curriculum_frameworks(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,  -- e.g., "MATH", "ENG", "SCI", "HSIE"
    name VARCHAR(100) NOT NULL,  -- e.g., "Mathematics", "English", "Science"
    kla VARCHAR(100) NOT NULL,  -- Key Learning Area
    description TEXT,
    icon VARCHAR(50),  -- Icon identifier for UI
    color VARCHAR(7),  -- Hex color for UI theming

    -- Stage availability (framework-specific)
    available_stages TEXT[] NOT NULL,  -- e.g., {"stage2", "stage3", "stage4", "stage5", "stage6"}

    -- Subject-specific configuration (JSONB)
    config JSONB DEFAULT '{
        "hasPathways": false,
        "pathways": [],
        "seniorCourses": [],
        "assessmentTypes": [],
        "tutorStyle": "socratic"
    }',

    -- Metadata
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique per framework
    UNIQUE(framework_id, code)
);

-- Seed NSW subjects (using subquery to get NSW framework ID)
INSERT INTO subjects (framework_id, code, name, kla, available_stages, config, icon, color)
SELECT
    (SELECT id FROM curriculum_frameworks WHERE code = 'NSW'),
    vals.code, vals.name, vals.kla, vals.stages::TEXT[], vals.config::JSONB, vals.icon, vals.color
FROM (VALUES
    ('MATH', 'Mathematics', 'Mathematics', '{"stage2","stage3","stage4","stage5","stage6"}', '{
        "hasPathways": true,
        "pathways": [{"stage": "stage5", "options": ["5.1", "5.2", "5.3"]}],
        "seniorCourses": ["Mathematics Standard 1", "Mathematics Standard 2", "Mathematics Advanced", "Mathematics Extension 1", "Mathematics Extension 2"],
        "assessmentTypes": ["problem_solving", "calculation", "reasoning", "proof"],
        "tutorStyle": "socratic_stepwise"
    }', 'calculator', '#3B82F6'),
    ('ENG', 'English', 'English', '{"stage2","stage3","stage4","stage5","stage6"}', '{
        "hasPathways": true,
        "pathways": [{"stage": "stage5", "options": ["Standard", "Advanced"]}],
        "seniorCourses": ["English Standard", "English Advanced", "English Extension 1", "English Extension 2", "English Studies", "EAL/D"],
        "assessmentTypes": ["essay", "creative_writing", "analysis", "comprehension", "oral_presentation"],
        "tutorStyle": "socratic_analytical"
    }', 'book-open', '#8B5CF6'),
    ('SCI', 'Science', 'Science', '{"stage2","stage3","stage4","stage5","stage6"}', '{
        "hasPathways": false,
        "pathways": [],
        "seniorCourses": ["Biology", "Chemistry", "Physics", "Earth and Environmental Science", "Investigating Science"],
        "assessmentTypes": ["experiment", "report", "analysis", "theory"],
        "tutorStyle": "inquiry_based"
    }', 'flask-conical', '#10B981'),
    ('HSIE', 'History/Geography', 'Human Society and Its Environment', '{"stage2","stage3","stage4","stage5","stage6"}', '{
        "hasPathways": false,
        "pathways": [],
        "seniorCourses": ["Ancient History", "Modern History", "History Extension", "Geography", "Legal Studies", "Business Studies", "Economics"],
        "assessmentTypes": ["essay", "source_analysis", "research", "case_study"],
        "tutorStyle": "socratic_analytical"
    }', 'globe', '#F59E0B'),
    ('PDHPE', 'PDHPE', 'Personal Development, Health and Physical Education', '{"stage2","stage3","stage4","stage5","stage6"}', '{
        "hasPathways": false,
        "pathways": [],
        "seniorCourses": ["PDHPE", "Community and Family Studies"],
        "assessmentTypes": ["theory", "practical", "research"],
        "tutorStyle": "discussion_based"
    }', 'heart-pulse', '#EF4444'),
    ('TAS', 'Technology', 'Technology and Applied Studies', '{"stage4","stage5","stage6"}', '{
        "hasPathways": false,
        "pathways": [],
        "seniorCourses": ["Design and Technology", "Engineering Studies", "Food Technology", "Industrial Technology", "Information Processes and Technology", "Software Design and Development", "Textiles and Design"],
        "assessmentTypes": ["project", "design", "theory", "practical"],
        "tutorStyle": "project_based"
    }', 'wrench', '#6366F1'),
    ('CA', 'Creative Arts', 'Creative Arts', '{"stage2","stage3","stage4","stage5","stage6"}', '{
        "hasPathways": false,
        "pathways": [],
        "seniorCourses": ["Visual Arts", "Music 1", "Music 2", "Music Extension", "Drama", "Dance"],
        "assessmentTypes": ["performance", "portfolio", "analysis", "creative_work"],
        "tutorStyle": "creative_mentoring"
    }', 'palette', '#EC4899'),
    ('LANG', 'Languages', 'Languages', '{"stage4","stage5","stage6"}', '{
        "hasPathways": false,
        "pathways": [],
        "seniorCourses": ["French Beginners", "French Continuers", "German Beginners", "German Continuers", "Japanese Beginners", "Japanese Continuers", "Chinese Beginners", "Chinese Continuers", "Italian Beginners", "Italian Continuers", "Spanish Beginners", "Spanish Continuers"],
        "assessmentTypes": ["listening", "speaking", "reading", "writing"],
        "tutorStyle": "immersive"
    }', 'languages', '#14B8A6')
) AS vals(code, name, kla, stages, config, icon, color);

CREATE INDEX idx_subjects_code ON subjects(code);
CREATE INDEX idx_subjects_kla ON subjects(kla);
CREATE INDEX idx_subjects_framework ON subjects(framework_id);

-- 5. Senior Secondary Courses Table - HSC, VCE, QCE, A-Levels, IB, etc.
CREATE TABLE senior_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID REFERENCES curriculum_frameworks(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,  -- e.g., "NSW-HSC-MATH-ADV", "VIC-VCE-MATHS-METHODS"
    name VARCHAR(100) NOT NULL,

    -- Framework-specific categorization
    category VARCHAR(50),  -- e.g., 'Category A'/'Category B' for HSC, 'Group 1-6' for IB
    units INTEGER CHECK (units BETWEEN 1 AND 4),  -- 1-2 for HSC, 1-4 for VCE
    level VARCHAR(30),  -- e.g., 'Standard', 'Advanced', 'Extension 1', 'Higher Level', 'Standard Level'

    -- Extension/prerequisite info
    is_extension BOOLEAN DEFAULT FALSE,
    extension_of UUID REFERENCES senior_courses(id),  -- Self-reference for extensions

    -- Tertiary entrance eligibility
    tertiary_eligible BOOLEAN DEFAULT TRUE,  -- ATAR, VCE score, etc.
    scaling_info JSONB DEFAULT '{}',  -- Historical scaling data if available

    -- Course structure (JSONB - flexible for different frameworks)
    structure JSONB DEFAULT '{
        "modules": [],
        "units": [],
        "assessmentWeights": {},
        "examStructure": {},
        "internalAssessment": {},
        "externalAssessment": {}
    }',

    -- Prerequisites
    prerequisites TEXT[],
    corequisites TEXT[],
    assumed_knowledge TEXT[],

    -- Metadata
    syllabus_url TEXT,
    syllabus_version VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(framework_id, code)
);

CREATE INDEX idx_senior_courses_framework ON senior_courses(framework_id);
CREATE INDEX idx_senior_courses_subject ON senior_courses(subject_id);

-- 6. Curriculum Outcomes Table - All Stages, All Subjects, All Frameworks
-- Renamed from nsw_curriculum to be framework-agnostic
CREATE TABLE curriculum_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID REFERENCES curriculum_frameworks(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    outcome_code VARCHAR(30) NOT NULL,  -- e.g., "MA3-RN-01", "EN4-VOCAB-01", "SC5-WS-02"
    stage VARCHAR(20) NOT NULL,  -- Framework-specific stage
    grade_range INTEGER[] NOT NULL,  -- e.g., {3, 4} for Stage 2
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    -- Subject-specific pathway (if applicable)
    pathway VARCHAR(20),  -- e.g., "5.1", "5.2", "5.3" for Maths; "Standard", "Advanced" for English

    -- Senior course linkage (for senior secondary)
    senior_course_id UUID REFERENCES senior_courses(id),

    -- Strand/Focus area within subject
    strand VARCHAR(100),  -- e.g., "Number and Algebra", "Reading and Viewing", "Working Scientifically"
    sub_strand VARCHAR(100),  -- e.g., "Fractions and Decimals", "Comprehension", "Questioning and Predicting"

    -- Content details (JSONB - flexible per subject and framework)
    content JSONB NOT NULL DEFAULT '{
        "knowledge": [],
        "skills": [],
        "understanding": [],
        "values_attitudes": []
    }',

    -- Learning progression
    prerequisites TEXT[],  -- Array of outcome codes
    related_outcomes TEXT[],
    progression_to TEXT[],
    cross_curriculum_priorities TEXT[],  -- e.g., "Aboriginal and Torres Strait Islander histories", "Sustainability"
    general_capabilities TEXT[],  -- e.g., "Critical and Creative Thinking", "Literacy", "Numeracy"

    -- Assessment criteria (JSONB)
    assessment_criteria JSONB DEFAULT '{
        "indicators": [],
        "rubric": {}
    }',

    -- Search optimization
    keywords TEXT[] NOT NULL DEFAULT '{}',
    examples TEXT[],
    teaching_strategies TEXT[],

    -- Senior secondary specific (for Stage 6/VCE/etc outcomes)
    exam_weight DECIMAL(5,2),
    common_exam_questions TEXT[],

    -- Metadata
    syllabus_version VARCHAR(20),  -- e.g., "2023", "2019"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique per framework
    UNIQUE(framework_id, outcome_code)
);

-- Comprehensive indexes for curriculum outcomes
CREATE INDEX idx_curriculum_framework ON curriculum_outcomes(framework_id);
CREATE INDEX idx_curriculum_subject ON curriculum_outcomes(subject_id);
CREATE INDEX idx_curriculum_keywords ON curriculum_outcomes USING GIN(keywords);
CREATE INDEX idx_curriculum_stage ON curriculum_outcomes(stage);
CREATE INDEX idx_curriculum_grade ON curriculum_outcomes USING GIN(grade_range);
CREATE INDEX idx_curriculum_pathway ON curriculum_outcomes(pathway);
CREATE INDEX idx_curriculum_strand ON curriculum_outcomes(strand);
CREATE INDEX idx_curriculum_senior_course ON curriculum_outcomes(senior_course_id);

-- 7. Student Subject Enrolments - Tracks which subjects each student is studying
CREATE TABLE student_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,

    -- Subject-specific pathway/course
    pathway VARCHAR(20),  -- e.g., "5.2" for Stage 5 Maths
    senior_course_id UUID REFERENCES senior_courses(id),  -- For senior secondary students

    -- Progress tracking per subject
    mastery_level DECIMAL(5,2) DEFAULT 0,  -- Overall mastery percentage
    current_focus_outcomes TEXT[],  -- Current learning focus

    -- Preferences
    preferences JSONB DEFAULT '{
        "notificationsEnabled": true,
        "dailyGoalMinutes": 20
    }',

    -- Gamification per subject
    subject_xp INTEGER DEFAULT 0,
    subject_level INTEGER DEFAULT 1,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ,

    UNIQUE(student_id, subject_id)
);

CREATE INDEX idx_student_subjects_student ON student_subjects(student_id);
CREATE INDEX idx_student_subjects_subject ON student_subjects(subject_id);

-- 7. Notes Table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES users(id),
    subject_id UUID REFERENCES subjects(id),  -- Links to subjects table
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Source information
    source_type VARCHAR(20) CHECK (source_type IN ('camera', 'upload', 'text')),
    original_url TEXT,  -- Digital Ocean Spaces URL
    mime_type VARCHAR(100),
    size_bytes INTEGER,
    
    -- Processing status
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_error TEXT,
    
    -- Extracted content
    extracted_text TEXT,
    extraction_language VARCHAR(10) DEFAULT 'en',
    extraction_confidence DECIMAL(5,4),
    
    -- AI Analysis (JSONB)
    ai_analysis JSONB DEFAULT '{
        "summary": "",
        "keyPoints": [],
        "concepts": [],
        "difficulty": 5,
        "estimatedStudyTime": 15
    }',
    
    -- Curriculum alignment (JSONB)
    curriculum_alignment JSONB DEFAULT '{
        "outcomes": [],
        "skills": [],
        "misconceptions": [],
        "nextSteps": []
    }',
    
    -- Student annotations (JSONB)
    student_annotations JSONB DEFAULT '{}',
    
    -- Spaced repetition
    next_review_date DATE,
    review_interval INTEGER DEFAULT 1,
    ease_factor DECIMAL(4,2) DEFAULT 2.5,
    review_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    
    -- AI model tracking
    ai_model_used VARCHAR(50),
    ai_tokens_used INTEGER
);

CREATE INDEX idx_notes_student_id ON notes(student_id);
CREATE INDEX idx_notes_next_review ON notes(next_review_date);
CREATE INDEX idx_notes_processing_status ON notes(processing_status);

-- 5. Revision History Table
CREATE TABLE revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
    item_type VARCHAR(20) CHECK (item_type IN ('flashcard', 'quiz', 'practice')),
    curriculum_outcome VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Reviews array (JSONB)
    reviews JSONB DEFAULT '[]',
    
    -- Spaced repetition state
    sr_interval INTEGER DEFAULT 1,
    sr_ease_factor DECIMAL(4,2) DEFAULT 2.5,
    sr_next_review TIMESTAMPTZ,
    sr_consecutive_correct INTEGER DEFAULT 0
);

CREATE INDEX idx_revision_student_id ON revision_history(student_id);
CREATE INDEX idx_revision_next_review ON revision_history(sr_next_review);

-- 6. Sessions Table - Learning analytics
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Activities (JSONB array)
    activities JSONB DEFAULT '[]',
    
    -- Metrics
    metrics JSONB DEFAULT '{
        "focusScore": 0,
        "productivityScore": 0,
        "curriculumCoverage": [],
        "conceptsMastered": []
    }',
    
    -- Device info
    device_type VARCHAR(20),
    device_os VARCHAR(50),
    device_browser VARCHAR(50),
    screen_size VARCHAR(20)
);

CREATE INDEX idx_sessions_student_id ON sessions(student_id);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);

-- 10. AI Interactions Log - For safety and parent oversight
CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES subjects(id),  -- Which subject the interaction relates to
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Interaction details
    interaction_type VARCHAR(50) NOT NULL,  -- 'socratic_tutor', 'curriculum_alignment', etc.
    model_used VARCHAR(50) NOT NULL,  -- 'claude-sonnet-4', 'claude-3-5-haiku', 'vision-api'
    tutor_style VARCHAR(50),  -- Subject-specific tutor style used

    -- Request/Response (sanitized for storage)
    user_message TEXT,
    ai_response TEXT,

    -- Context used
    curriculum_context JSONB DEFAULT '{}',  -- Outcome codes, strand, etc.

    -- Metadata
    tokens_input INTEGER,
    tokens_output INTEGER,
    latency_ms INTEGER,
    cost_estimate DECIMAL(10,6),

    -- Safety flags
    flagged_for_review BOOLEAN DEFAULT FALSE,
    review_reason TEXT
);

CREATE INDEX idx_ai_interactions_student ON ai_interactions(student_id);
CREATE INDEX idx_ai_interactions_subject ON ai_interactions(subject_id);
CREATE INDEX idx_ai_interactions_flagged ON ai_interactions(flagged_for_review) WHERE flagged_for_review = TRUE;

-- 8. Communications Table
CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    type VARCHAR(30) CHECK (type IN ('progress_report', 'concern', 'achievement', 'teacher_note')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Curriculum context
    curriculum_data JSONB DEFAULT '{}',
    
    -- Content
    subject VARCHAR(255),
    body TEXT,
    attachments TEXT[],
    
    -- Delivery
    delivery_method VARCHAR(20) CHECK (delivery_method IN ('email', 'in_app', 'both')),
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    opened BOOLEAN DEFAULT FALSE,
    opened_at TIMESTAMPTZ
);

CREATE INDEX idx_communications_parent ON communications(parent_id);

-- 9. Daily Analytics Table (aggregated)
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    
    -- Metrics (JSONB)
    metrics JSONB DEFAULT '{}',
    performance JSONB DEFAULT '{}',
    engagement JSONB DEFAULT '{}',
    ai_usage JSONB DEFAULT '{}'  -- Track AI costs
);

CREATE INDEX idx_daily_analytics_date ON daily_analytics(date);

-- 10. Feedback Table
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    user_type VARCHAR(20) CHECK (user_type IN ('parent', 'student')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    type VARCHAR(20) CHECK (type IN ('bug', 'feature', 'content', 'general')),
    category VARCHAR(50),
    title VARCHAR(255),
    description TEXT,
    attachments TEXT[],
    app_version VARCHAR(20),
    device_info TEXT,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'wont_fix')),
    response_message TEXT,
    responded_at TIMESTAMPTZ
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_curriculum_updated_at BEFORE UPDATE ON curriculum_outcomes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_frameworks_updated_at BEFORE UPDATE ON curriculum_frameworks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_senior_courses_updated_at BEFORE UPDATE ON senior_courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 🤖 Claude AI Integration

### AI Service Architecture

```python
# backend/app/services/claude_service.py
"""
Claude AI Service - Handles all Anthropic API interactions
Uses intelligent routing between Haiku (fast/cheap) and Sonnet (powerful)
Supports multi-subject tutoring with subject-specific prompts and styles
"""

import anthropic
from typing import Optional, Literal
from pydantic import BaseModel
from enum import Enum
import asyncio
from functools import lru_cache

class ModelTier(str, Enum):
    HAIKU = "claude-3-5-haiku-20241022"      # Fast, cheap - simple tasks
    SONNET = "claude-sonnet-4-20250514"      # Powerful - complex reasoning

class TaskComplexity(str, Enum):
    SIMPLE = "simple"      # Haiku
    COMPLEX = "complex"    # Sonnet

# Task to model mapping
TASK_MODEL_MAP = {
    # Simple tasks -> Haiku ($0.80/$4.00 per 1M tokens)
    "flashcard_generation": ModelTier.HAIKU,
    "summary_generation": ModelTier.HAIKU,
    "keyword_extraction": ModelTier.HAIKU,
    "simple_qa": ModelTier.HAIKU,
    "format_conversion": ModelTier.HAIKU,
    "vocabulary_practice": ModelTier.HAIKU,

    # Complex tasks -> Sonnet ($3.00/$15.00 per 1M tokens)
    "socratic_tutoring": ModelTier.SONNET,
    "curriculum_alignment": ModelTier.SONNET,
    "misconception_detection": ModelTier.SONNET,
    "essay_feedback": ModelTier.SONNET,
    "multi_step_reasoning": ModelTier.SONNET,
    "senior_exam_analysis": ModelTier.SONNET,
    "creative_writing_feedback": ModelTier.SONNET,
    "scientific_inquiry": ModelTier.SONNET,
    "source_analysis": ModelTier.SONNET,
    "language_conversation": ModelTier.SONNET,
}

# Subject-specific tutor styles and approaches
SUBJECT_TUTOR_STYLES = {
    "MATH": {
        "style": "socratic_stepwise",
        "approach": """Use step-by-step problem decomposition. Guide through mathematical
reasoning with questions like 'What do we know?', 'What are we trying to find?',
'What method might help here?'. Encourage showing working and checking answers.""",
        "example_prompts": ["Can you break this problem into smaller steps?",
                           "What operation would help us here?",
                           "Let's check: does your answer make sense?"]
    },
    "ENG": {
        "style": "socratic_analytical",
        "approach": """Focus on text analysis and interpretation. Guide students to find
evidence in texts, analyze language techniques, structure arguments, and develop their
voice in writing. Ask 'What is the author trying to convey?', 'What evidence supports this?'""",
        "example_prompts": ["What techniques has the author used here?",
                           "How does this quote support your argument?",
                           "What's another way you could express this idea?"]
    },
    "SCI": {
        "style": "inquiry_based",
        "approach": """Encourage scientific thinking through hypothesis formation,
experimental design, and evidence-based conclusions. Ask 'What do you predict will happen?',
'How could we test this?', 'What does the evidence suggest?'""",
        "example_prompts": ["What variables might affect this?",
                           "How could we design an experiment to test this?",
                           "What does your data tell you?"]
    },
    "HSIE": {
        "style": "socratic_analytical",
        "approach": """Develop critical thinking about historical and geographical concepts.
Guide source analysis, cause-and-effect reasoning, and multiple perspectives.
Ask 'What bias might this source have?', 'What were the causes and consequences?'""",
        "example_prompts": ["What perspectives are missing from this account?",
                           "How reliable is this source?",
                           "What patterns can you identify?"]
    },
    "PDHPE": {
        "style": "discussion_based",
        "approach": """Encourage reflection on health, wellbeing, and physical concepts.
Connect theory to personal experience and real-world applications. Be sensitive to
personal topics while maintaining educational focus.""",
        "example_prompts": ["How might this apply to your own life?",
                           "What factors influence this health outcome?",
                           "How are these body systems connected?"]
    },
    "TAS": {
        "style": "project_based",
        "approach": """Focus on design thinking, problem-solving, and practical application.
Guide through design processes: identify, research, design, produce, evaluate.
Encourage iteration and reflection on choices.""",
        "example_prompts": ["What problem are you trying to solve?",
                           "What constraints do you need to consider?",
                           "How could you improve this design?"]
    },
    "CA": {
        "style": "creative_mentoring",
        "approach": """Nurture creative expression while building technical skills.
Balance encouragement of personal voice with teaching techniques and conventions.
Help students articulate their artistic choices and interpret others' work.""",
        "example_prompts": ["What mood are you trying to create?",
                           "What techniques could enhance this effect?",
                           "How does this work make you feel, and why?"]
    },
    "LANG": {
        "style": "immersive",
        "approach": """Encourage target language use with scaffolded support.
Build confidence through authentic communication tasks. Correct errors gently
with modeling correct forms. Incorporate cultural context.""",
        "example_prompts": ["Comment dit-on... en français?",
                           "Can you try saying that in [language]?",
                           "What cultural context helps explain this?"]
    },
}

class SubjectContext(BaseModel):
    """Context for subject-specific tutoring"""
    subject_code: str
    subject_name: str
    framework_code: str = "NSW"
    tutor_style: Optional[str] = None
    strand: Optional[str] = None
    current_outcomes: Optional[list[str]] = None

class ClaudeService:
    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.async_client = anthropic.AsyncAnthropic(api_key=api_key)
        self.subject_styles = SUBJECT_TUTOR_STYLES

    def _get_base_tutor_prompt(self) -> str:
        return """You are a friendly, encouraging tutor helping Australian students.

Key guidelines:
- Use age-appropriate language based on the student's year level
- Be patient, positive, and celebrate small wins
- If a student seems frustrated, offer encouragement and break problems into smaller steps
- Always prioritize student safety and wellbeing
- Flag any concerning messages for parent/teacher review
- Reference specific curriculum outcomes when relevant

Remember: Your goal is to build understanding and confidence, not just provide answers."""

    def _get_subject_tutor_prompt(self, subject: SubjectContext) -> str:
        """Generate a subject-specific tutor prompt"""
        base_prompt = self._get_base_tutor_prompt()

        subject_config = self.subject_styles.get(subject.subject_code, {})
        style = subject_config.get("style", "socratic")
        approach = subject_config.get("approach", "")

        subject_prompt = f"""
{base_prompt}

SUBJECT: {subject.subject_name}
CURRICULUM FRAMEWORK: {subject.framework_code}
TUTORING STYLE: {style}

SUBJECT-SPECIFIC APPROACH:
{approach}
"""
        if subject.strand:
            subject_prompt += f"\nCURRENT STRAND/TOPIC: {subject.strand}"

        if subject.current_outcomes:
            subject_prompt += f"\nFOCUS OUTCOMES: {', '.join(subject.current_outcomes)}"

        return subject_prompt

    def _get_curriculum_analyzer_prompt(self, subject: Optional[SubjectContext] = None) -> str:
        """Generate curriculum analyzer prompt, optionally subject-specific"""
        subject_name = subject.subject_name if subject else "the curriculum"
        subject_code = subject.subject_code if subject else ""
        framework = subject.framework_code if subject else "NSW"

        # Subject-specific outcome code patterns
        outcome_examples = {
            "MATH": "MA3-RN-01, MA5.2-NA-01",
            "ENG": "EN3-VOCAB-01, EN5-URB-01",
            "SCI": "SC4-WS-01, SC5-CW-02",
            "HSIE": "HT3-1, GE4-1",
            "PDHPE": "PD3-6, PD5-9",
            "TAS": "TE4-1DP, TE5-2DP",
            "CA": "VAS3.1, MUS4.1",
            "LANG": "LFR4-1C, LCH5-2C",
        }

        example_codes = outcome_examples.get(subject_code, "XX3-01, XX5-02")

        return f"""You are an expert in the {framework} {subject_name} curriculum,
analyzing student work to identify curriculum alignment and learning gaps.

For each piece of student work, identify:
1. Which curriculum outcomes are being addressed (use official codes like {example_codes})
2. The student's current mastery level (developing/consolidating/secure)
3. Any misconceptions or gaps in understanding
4. Prerequisite skills that may need reinforcement
5. Recommended next steps for learning

Always provide evidence-based assessments with specific examples from the student's work.
Format your response as structured JSON for easy parsing."""

    def _get_content_generator_prompt(self, subject: Optional[SubjectContext] = None) -> str:
        """Generate content creator prompt, optionally subject-specific"""
        subject_name = subject.subject_name if subject else "educational content"
        framework = subject.framework_code if subject else "NSW"

        return f"""You are an educational content creator specializing in {framework} {subject_name} curriculum.
Generate engaging, age-appropriate study materials that:
- Align with specific curriculum outcomes
- Use Australian context and examples
- Include clear explanations and worked examples
- Build on prior knowledge
- Incorporate visual descriptions where helpful
- Match the appropriate difficulty level for the student's year

Always specify which curriculum outcomes your content addresses."""

    def get_model_for_task(self, task_type: str) -> str:
        """Route task to appropriate model based on complexity"""
        return TASK_MODEL_MAP.get(task_type, ModelTier.HAIKU).value

    async def generate_response(
        self,
        task_type: str,
        messages: list[dict],
        system_context: str = "student_tutor",
        student_grade: Optional[int] = None,
        subject: Optional[SubjectContext] = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> dict:
        """
        Generate a response using the appropriate Claude model

        Args:
            task_type: Type of task for model routing
            messages: Conversation messages
            system_context: Type of system prompt to use
            student_grade: Student's year level
            subject: Subject context for subject-specific prompts
            max_tokens: Maximum response tokens
            temperature: Response creativity (0-1)

        Returns:
            dict with 'content', 'model_used', 'tokens_used', 'cost_estimate', 'tutor_style'
        """
        model = self.get_model_for_task(task_type)

        # Get appropriate system prompt based on context and subject
        if system_context == "student_tutor" and subject:
            system_prompt = self._get_subject_tutor_prompt(subject)
        elif system_context == "curriculum_analyzer":
            system_prompt = self._get_curriculum_analyzer_prompt(subject)
        elif system_context == "content_generator":
            system_prompt = self._get_content_generator_prompt(subject)
        else:
            system_prompt = self._get_base_tutor_prompt()

        # Add grade context if provided
        if student_grade:
            framework = subject.framework_code if subject else "NSW"
            system_prompt += f"\n\nStudent is in Year {student_grade} ({framework} curriculum)."

        try:
            response = await self.async_client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=messages,
                temperature=temperature,
            )

            # Calculate cost estimate
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens

            if model == ModelTier.HAIKU.value:
                cost = (input_tokens * 0.80 + output_tokens * 4.00) / 1_000_000
            else:  # Sonnet
                cost = (input_tokens * 3.00 + output_tokens * 15.00) / 1_000_000

            # Get tutor style if subject provided
            tutor_style = None
            if subject and subject.subject_code in self.subject_styles:
                tutor_style = self.subject_styles[subject.subject_code].get("style")

            return {
                "content": response.content[0].text,
                "model_used": model,
                "tokens_input": input_tokens,
                "tokens_output": output_tokens,
                "cost_estimate": cost,
                "tutor_style": tutor_style,
                "subject_code": subject.subject_code if subject else None,
            }

        except anthropic.APIError as e:
            raise Exception(f"Claude API error: {str(e)}")

    async def analyze_curriculum_alignment(
        self,
        student_text: str,
        student_grade: int,
        subject: SubjectContext,
        pathway: Optional[str] = None,
        senior_course: Optional[str] = None,
    ) -> dict:
        """
        Analyze student work for curriculum alignment (any subject, any framework)
        Uses Sonnet for complex analysis
        """
        context_parts = [f"Year {student_grade}", f"Subject: {subject.subject_name}"]
        if pathway:
            context_parts.append(f"Pathway: {pathway}")
        if senior_course:
            context_parts.append(f"Senior Course: {senior_course}")
        if subject.strand:
            context_parts.append(f"Strand: {subject.strand}")

        messages = [
            {
                "role": "user",
                "content": f"""Analyze this student's work for {subject.framework_code} {subject.subject_name} curriculum alignment.

Student Context: {', '.join(context_parts)}

Student Work:
{student_text}

Provide your analysis as JSON with the following structure:
{{
    "primary_outcomes": [
        {{"code": "XX3-01", "confidence": 0.85, "evidence": ["specific example"]}}
    ],
    "mastery_level": "developing|consolidating|secure",
    "misconceptions": ["list any identified misconceptions"],
    "prerequisite_gaps": ["any foundational skills needing review"],
    "next_steps": ["recommended learning activities"],
    "strengths": ["what the student did well"]
}}"""
            }
        ]

        response = await self.generate_response(
            task_type="curriculum_alignment",
            messages=messages,
            system_context="curriculum_analyzer",
            student_grade=student_grade,
            subject=subject,
            max_tokens=2048,
            temperature=0.3,  # Lower temperature for more consistent analysis
        )
        
        return response

    async def socratic_tutor_response(
        self,
        conversation_history: list[dict],
        student_grade: int,
        current_topic: Optional[str] = None,
    ) -> dict:
        """
        Generate a Socratic tutoring response
        Uses Sonnet for nuanced teaching interactions
        """
        # Add topic context if provided
        if current_topic:
            system_addition = f"\n\nCurrent learning topic: {current_topic}"
        else:
            system_addition = ""
        
        response = await self.generate_response(
            task_type="socratic_tutoring",
            messages=conversation_history,
            system_context="student_tutor",
            student_grade=student_grade,
            max_tokens=1024,
            temperature=0.8,  # Slightly higher for more natural conversation
        )
        
        return response

    async def generate_flashcards(
        self,
        content: str,
        curriculum_outcome: str,
        count: int = 5,
        student_grade: int = 6,
    ) -> dict:
        """
        Generate flashcards from content
        Uses Haiku for fast, cost-effective generation
        """
        messages = [
            {
                "role": "user",
                "content": f"""Create {count} flashcards based on this content for a Year {student_grade} student.

Content:
{content}

Curriculum Outcome: {curriculum_outcome}

Return as JSON array:
[
    {{"front": "question", "back": "answer", "hint": "optional hint"}},
    ...
]

Make questions progressively more challenging."""
            }
        ]
        
        response = await self.generate_response(
            task_type="flashcard_generation",
            messages=messages,
            system_context="content_generator",
            student_grade=student_grade,
            max_tokens=1024,
            temperature=0.7,
        )
        
        return response

    async def generate_summary(
        self,
        content: str,
        student_grade: int,
        length: Literal["brief", "detailed"] = "brief",
    ) -> dict:
        """
        Generate a summary of content
        Uses Haiku for speed and cost efficiency
        """
        length_instruction = "2-3 sentences" if length == "brief" else "1-2 paragraphs"
        
        messages = [
            {
                "role": "user",
                "content": f"""Summarize this content for a Year {student_grade} student in {length_instruction}.

Content:
{content}

Use age-appropriate language and highlight the key concepts."""
            }
        ]
        
        response = await self.generate_response(
            task_type="summary_generation",
            messages=messages,
            system_context="content_generator",
            student_grade=student_grade,
            max_tokens=512,
            temperature=0.5,
        )
        
        return response
```

### AI Router Service

```python
# backend/app/services/ai_router.py
"""
AI Router - Intelligently routes requests between Claude and other services
"""

from typing import Optional
from .claude_service import ClaudeService
from .ocr_service import OCRService
import logging

logger = logging.getLogger(__name__)

class AIRouter:
    def __init__(
        self,
        claude_service: ClaudeService,
        ocr_service: OCRService,
    ):
        self.claude = claude_service
        self.ocr = ocr_service
        
        # Track usage for cost monitoring
        self.usage_stats = {
            "haiku_calls": 0,
            "sonnet_calls": 0,
            "ocr_calls": 0,
            "total_cost": 0.0,
        }
    
    async def process_uploaded_note(
        self,
        image_data: bytes,
        student_grade: int,
        pathway: Optional[str] = None,
        hsc_course: Optional[str] = None,
    ) -> dict:
        """
        Complete pipeline for processing an uploaded note:
        1. OCR extraction (Google Vision)
        2. Curriculum alignment (Claude Sonnet)
        3. Generate study materials (Claude Haiku)
        """
        
        # Step 1: Extract text using OCR
        logger.info("Starting OCR extraction")
        ocr_result = await self.ocr.extract_text(image_data)
        self.usage_stats["ocr_calls"] += 1
        
        if not ocr_result["text"]:
            return {
                "success": False,
                "error": "Could not extract text from image",
                "confidence": ocr_result["confidence"],
            }
        
        extracted_text = ocr_result["text"]
        
        # Step 2: Analyze curriculum alignment (Sonnet - complex task)
        logger.info("Analyzing curriculum alignment")
        alignment = await self.claude.analyze_curriculum_alignment(
            student_text=extracted_text,
            student_grade=student_grade,
            pathway=pathway,
            hsc_course=hsc_course,
        )
        self._update_usage_stats(alignment)
        
        # Step 3: Generate summary (Haiku - simple task)
        logger.info("Generating summary")
        summary = await self.claude.generate_summary(
            content=extracted_text,
            student_grade=student_grade,
            length="brief",
        )
        self._update_usage_stats(summary)
        
        # Step 4: Generate flashcards (Haiku - simple task)
        primary_outcome = ""
        if alignment.get("content"):
            try:
                import json
                alignment_data = json.loads(alignment["content"])
                if alignment_data.get("primary_outcomes"):
                    primary_outcome = alignment_data["primary_outcomes"][0]["code"]
            except:
                pass
        
        flashcards = await self.claude.generate_flashcards(
            content=extracted_text,
            curriculum_outcome=primary_outcome,
            count=5,
            student_grade=student_grade,
        )
        self._update_usage_stats(flashcards)
        
        return {
            "success": True,
            "extracted_text": extracted_text,
            "ocr_confidence": ocr_result["confidence"],
            "curriculum_alignment": alignment["content"],
            "summary": summary["content"],
            "flashcards": flashcards["content"],
            "processing_stats": {
                "models_used": [
                    alignment["model_used"],
                    summary["model_used"],
                    flashcards["model_used"],
                ],
                "total_tokens": (
                    alignment["tokens_input"] + alignment["tokens_output"] +
                    summary["tokens_input"] + summary["tokens_output"] +
                    flashcards["tokens_input"] + flashcards["tokens_output"]
                ),
                "estimated_cost": (
                    alignment["cost_estimate"] +
                    summary["cost_estimate"] +
                    flashcards["cost_estimate"]
                ),
            }
        }
    
    def _update_usage_stats(self, response: dict):
        """Track usage statistics"""
        model = response.get("model_used", "")
        if "haiku" in model.lower():
            self.usage_stats["haiku_calls"] += 1
        elif "sonnet" in model.lower():
            self.usage_stats["sonnet_calls"] += 1
        
        self.usage_stats["total_cost"] += response.get("cost_estimate", 0)
    
    def get_usage_stats(self) -> dict:
        """Return current usage statistics"""
        return self.usage_stats.copy()
```

### OCR Service (Google Cloud Vision)

```python
# backend/app/services/ocr_service.py
"""
OCR Service - Uses Google Cloud Vision API for text extraction
Pay-per-use model: ~$1.50 per 1000 images
"""

from google.cloud import vision
from google.oauth2 import service_account
import base64
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self, credentials_path: Optional[str] = None):
        """
        Initialize Google Cloud Vision client
        
        Args:
            credentials_path: Path to service account JSON file
                             If None, uses GOOGLE_APPLICATION_CREDENTIALS env var
        """
        if credentials_path:
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path
            )
            self.client = vision.ImageAnnotatorClient(credentials=credentials)
        else:
            self.client = vision.ImageAnnotatorClient()
    
    async def extract_text(self, image_data: bytes) -> dict:
        """
        Extract text from an image using Google Cloud Vision
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            dict with 'text', 'confidence', 'language', 'blocks'
        """
        try:
            image = vision.Image(content=image_data)
            
            # Use document_text_detection for better handwriting recognition
            response = self.client.document_text_detection(image=image)
            
            if response.error.message:
                raise Exception(f"Vision API error: {response.error.message}")
            
            # Extract full text
            full_text = response.full_text_annotation.text if response.full_text_annotation else ""
            
            # Calculate average confidence
            confidence = 0.0
            block_count = 0
            blocks = []
            
            if response.full_text_annotation:
                for page in response.full_text_annotation.pages:
                    for block in page.blocks:
                        block_confidence = block.confidence
                        confidence += block_confidence
                        block_count += 1
                        
                        # Extract block text
                        block_text = ""
                        for paragraph in block.paragraphs:
                            for word in paragraph.words:
                                word_text = "".join([
                                    symbol.text for symbol in word.symbols
                                ])
                                block_text += word_text + " "
                        
                        blocks.append({
                            "text": block_text.strip(),
                            "confidence": block_confidence,
                            "type": vision.Block.BlockType(block.block_type).name,
                        })
            
            avg_confidence = confidence / block_count if block_count > 0 else 0.0
            
            # Detect language
            language = "en"
            if response.full_text_annotation and response.full_text_annotation.pages:
                page = response.full_text_annotation.pages[0]
                if page.property and page.property.detected_languages:
                    language = page.property.detected_languages[0].language_code
            
            logger.info(f"OCR extracted {len(full_text)} characters with {avg_confidence:.2%} confidence")
            
            return {
                "text": full_text,
                "confidence": avg_confidence,
                "language": language,
                "blocks": blocks,
            }
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {str(e)}")
            return {
                "text": "",
                "confidence": 0.0,
                "language": "unknown",
                "blocks": [],
                "error": str(e),
            }
    
    async def extract_from_url(self, image_url: str) -> dict:
        """
        Extract text from an image URL
        
        Args:
            image_url: URL of the image (must be publicly accessible)
        """
        try:
            image = vision.Image()
            image.source.image_uri = image_url
            
            response = self.client.document_text_detection(image=image)
            
            # Process same as extract_text
            full_text = response.full_text_annotation.text if response.full_text_annotation else ""
            
            return {
                "text": full_text,
                "confidence": 0.9,  # Simplified for URL-based extraction
                "language": "en",
                "blocks": [],
            }
            
        except Exception as e:
            logger.error(f"OCR from URL failed: {str(e)}")
            return {
                "text": "",
                "confidence": 0.0,
                "error": str(e),
            }
```

---

## 🚀 Development Phases with Code Review Points

### Phase 1: Foundation & Infrastructure (Weeks 1-3)

#### Week 1: Project Setup & Core Infrastructure

**Day 1-2: Development Environment**
```powershell
# Task 1.1: Initialize repositories and tooling (PowerShell)

# Create project structure
New-Item -ItemType Directory -Path "study-assistant/frontend", "study-assistant/backend", "study-assistant/infrastructure" -Force

# Initialize Git repository
cd study-assistant
git init
git branch -M main

# Set up frontend with Vite + React + TypeScript
cd frontend
npm create vite@latest . -- --template react-ts
npm install

# Install frontend dependencies
npm install @tanstack/react-query zustand react-router-dom react-hook-form zod
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu framer-motion lucide-react
npm install @supabase/supabase-js  # Supabase client
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react playwright

# Initialize Tailwind
npx tailwindcss init -p

# Set up backend
cd ../backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install fastapi uvicorn sqlalchemy asyncpg alembic pydantic python-dotenv
pip install anthropic google-cloud-vision boto3  # AI and storage
pip install pytest pytest-asyncio httpx

# Create requirements.txt
pip freeze > requirements.txt
```

**Task 1.2: Digital Ocean & External Services Setup**
```powershell
# Digital Ocean CLI setup
# Install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/
doctl auth init

# Create Digital Ocean resources
doctl databases create study-assistant-db --engine pg --region syd1 --size db-s-1vcpu-1gb
doctl spaces create study-assistant-storage --region syd1

# Set up environment variables template
@"
# Digital Ocean
DO_SPACES_KEY=your_spaces_key
DO_SPACES_SECRET=your_spaces_secret
DO_SPACES_BUCKET=study-assistant-storage
DO_SPACES_REGION=syd1
DO_DATABASE_URL=postgresql://user:pass@host:port/db

# Supabase Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Anthropic Claude
ANTHROPIC_API_KEY=your_claude_api_key

# Google Cloud Vision (for OCR)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Email
RESEND_API_KEY=your_resend_key

# App Config
APP_ENV=development
APP_SECRET_KEY=generate_secure_key_here
"@ | Out-File -FilePath ".env.example" -Encoding UTF8
```

**🔍 Code Review Point 1.1:**
- Review project structure and configuration
- Validate security setup and environment variables
- Check tooling configuration

**Day 3-4: Database Schema & Migrations**
```powershell
# Task 1.3: Set up Alembic migrations
cd backend
alembic init alembic

# Edit alembic.ini to use async driver
# sqlalchemy.url = postgresql+asyncpg://...

# Create initial migration
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head

# Task 1.4: Set up Supabase Auth
# 1. Create project at supabase.com
# 2. Enable Email and Google OAuth providers
# 3. Configure redirect URLs
# 4. Set up Row Level Security policies
```

**Day 5: CI/CD Pipeline**
```yaml
# .github/workflows/deploy-digitalocean.yml
name: Deploy to Digital Ocean

on:
  push:
    branches: [main, staging, develop]

env:
  NODE_VERSION: '20'
  PYTHON_VERSION: '3.11'
  REGISTRY: registry.digitalocean.com/study-assistant

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Run backend tests
        run: |
          cd backend
          pip install -r requirements.txt
          pytest --cov=app tests/
      
      - name: Run frontend tests
        run: |
          cd frontend
          npm ci
          npm run test

  deploy-dev:
    if: github.ref == 'refs/heads/develop'
    needs: test
    runs-on: ubuntu-latest
    environment: development
    steps:
      - uses: actions/checkout@v4
      
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
      
      - name: Build and push Docker images
        run: |
          doctl registry login
          
          # Build and push backend
          docker build -t ${{ env.REGISTRY }}/backend:dev-${{ github.sha }} ./backend
          docker push ${{ env.REGISTRY }}/backend:dev-${{ github.sha }}
          
          # Build and push frontend
          docker build -t ${{ env.REGISTRY }}/frontend:dev-${{ github.sha }} ./frontend
          docker push ${{ env.REGISTRY }}/frontend:dev-${{ github.sha }}
      
      - name: Deploy to App Platform
        run: |
          doctl apps update ${{ secrets.DO_APP_ID_DEV }} --spec .do/app-dev.yaml

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
      
      - name: Build and push Docker images
        run: |
          doctl registry login
          docker build -t ${{ env.REGISTRY }}/backend:staging-${{ github.sha }} ./backend
          docker push ${{ env.REGISTRY }}/backend:staging-${{ github.sha }}
          docker build -t ${{ env.REGISTRY }}/frontend:staging-${{ github.sha }} ./frontend
          docker push ${{ env.REGISTRY }}/frontend:staging-${{ github.sha }}
      
      - name: Deploy to App Platform
        run: |
          doctl apps update ${{ secrets.DO_APP_ID_STAGING }} --spec .do/app-staging.yaml

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release v${{ github.run_number }}
      
      - name: Build and push Docker images
        run: |
          doctl registry login
          docker build -t ${{ env.REGISTRY }}/backend:${{ github.sha }} ./backend
          docker build -t ${{ env.REGISTRY }}/backend:latest ./backend
          docker push ${{ env.REGISTRY }}/backend:${{ github.sha }}
          docker push ${{ env.REGISTRY }}/backend:latest
          
          docker build -t ${{ env.REGISTRY }}/frontend:${{ github.sha }} ./frontend
          docker build -t ${{ env.REGISTRY }}/frontend:latest ./frontend
          docker push ${{ env.REGISTRY }}/frontend:${{ github.sha }}
          docker push ${{ env.REGISTRY }}/frontend:latest
      
      - name: Deploy to App Platform
        run: |
          doctl apps update ${{ secrets.DO_APP_ID_PROD }} --spec .do/app-prod.yaml
      
      - name: Notify Team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed! 🚀'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Digital Ocean App Spec**
```yaml
# .do/app-prod.yaml
name: study-assistant-prod
region: syd
services:
  - name: api
    image:
      registry_type: DOCR
      repository: backend
      tag: latest
    instance_count: 2
    instance_size_slug: basic-xs
    http_port: 8000
    routes:
      - path: /api
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
      - key: ANTHROPIC_API_KEY
        scope: RUN_TIME
        type: SECRET
      - key: SUPABASE_URL
        scope: RUN_TIME
        type: SECRET
      - key: APP_ENV
        scope: RUN_TIME
        value: production
    health_check:
      http_path: /health

  - name: web
    image:
      registry_type: DOCR
      repository: frontend
      tag: latest
    instance_count: 2
    instance_size_slug: basic-xs
    http_port: 80
    routes:
      - path: /

databases:
  - name: db
    engine: PG
    production: true
    cluster_name: study-assistant-db
    db_name: study_assistant
    db_user: app_user

jobs:
  - name: migrate
    image:
      registry_type: DOCR
      repository: backend
      tag: latest
    kind: PRE_DEPLOY
    run_command: alembic upgrade head
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
```

**🔍 Code Review Point 1.2:**
- Review database schema and migrations
- Validate CI/CD pipeline configuration
- Check Docker configurations

#### Week 2: Authentication & Core UI

**Day 6-7: Authentication System with Supabase**
```typescript
// frontend/src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// frontend/src/lib/supabase/auth.ts
import { supabase } from './client';

export const authService = {
  async signUp(email: string, password: string, metadata?: { displayName?: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  },

  onAuthStateChange(callback: (session: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session);
    });
  },
};

// frontend/src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
```

**Task 2.1: Student Onboarding with Grade Mapping**
```typescript
// frontend/src/features/onboarding/StudentOnboarding.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const onboardingSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  gradeLevel: z.number().min(3).max(12),
  school: z.string().optional(),
  // Stage 5 specific
  stage5Pathway: z.enum(['5.1', '5.2', '5.3']).optional(),
  // Stage 6 specific
  hscCourse: z.enum([
    'Mathematics Standard',
    'Mathematics Advanced',
    'Mathematics Extension 1',
    'Mathematics Extension 2',
  ]).optional(),
  // Assessment
  subjectDifficulty: z.enum(['easy', 'medium', 'hard']),
  specificChallenges: z.array(z.string()).optional(),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

// Grade to Stage mapping
const GRADE_STAGE_MAP: Record<number, { stage: string; needsPathway: boolean; needsHSC: boolean }> = {
  3: { stage: 'stage2', needsPathway: false, needsHSC: false },
  4: { stage: 'stage2', needsPathway: false, needsHSC: false },
  5: { stage: 'stage3', needsPathway: false, needsHSC: false },
  6: { stage: 'stage3', needsPathway: false, needsHSC: false },
  7: { stage: 'stage4', needsPathway: false, needsHSC: false },
  8: { stage: 'stage4', needsPathway: false, needsHSC: false },
  9: { stage: 'stage5', needsPathway: true, needsHSC: false },
  10: { stage: 'stage5', needsPathway: true, needsHSC: false },
  11: { stage: 'stage6', needsPathway: false, needsHSC: true },
  12: { stage: 'stage6', needsPathway: false, needsHSC: true },
};

export function StudentOnboarding({ onComplete }: { onComplete: (data: OnboardingData) => void }) {
  const [step, setStep] = useState(1);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
  });

  const gradeLevel = watch('gradeLevel');
  const stageInfo = gradeLevel ? GRADE_STAGE_MAP[gradeLevel] : null;

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Welcome! Let's get started</h2>
          
          <div>
            <label className="block text-sm font-medium">Your Name</label>
            <input {...register('displayName')} className="mt-1 block w-full rounded-md border-gray-300" />
            {errors.displayName && <p className="text-red-500 text-sm">{errors.displayName.message}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium">What year are you in?</label>
            <select {...register('gradeLevel', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300">
              <option value="">Select your year</option>
              {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(year => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
          </div>
          
          <button type="button" onClick={() => setStep(2)} className="btn-primary">
            Continue
          </button>
        </div>
      )}

      {step === 2 && stageInfo?.needsPathway && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Mathematics Pathway</h2>
          <p className="text-gray-600">Which mathematics pathway are you following?</p>
          
          <div className="space-y-2">
            <label className="flex items-center space-x-3">
              <input type="radio" value="5.1" {...register('stage5Pathway')} />
              <span><strong>5.1 (Core)</strong> - Foundation mathematics</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="radio" value="5.2" {...register('stage5Pathway')} />
              <span><strong>5.2 (Standard)</strong> - Standard mathematics</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="radio" value="5.3" {...register('stage5Pathway')} />
              <span><strong>5.3 (Advanced)</strong> - Advanced mathematics</span>
            </label>
          </div>
          
          <button type="button" onClick={() => setStep(3)} className="btn-primary">
            Continue
          </button>
        </div>
      )}

      {step === 2 && stageInfo?.needsHSC && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">HSC Mathematics Course</h2>
          <p className="text-gray-600">Which HSC mathematics course are you studying?</p>
          
          <select {...register('hscCourse')} className="mt-1 block w-full rounded-md border-gray-300">
            <option value="">Select your course</option>
            <option value="Mathematics Standard">Mathematics Standard</option>
            <option value="Mathematics Advanced">Mathematics Advanced</option>
            <option value="Mathematics Extension 1">Mathematics Extension 1</option>
            <option value="Mathematics Extension 2">Mathematics Extension 2</option>
          </select>
          
          <button type="button" onClick={() => setStep(3)} className="btn-primary">
            Continue
          </button>
        </div>
      )}

      {step === 2 && !stageInfo?.needsPathway && !stageInfo?.needsHSC && (
        <button type="button" onClick={() => setStep(3)} className="btn-primary">
          Continue
        </button>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">How's maths going?</h2>
          
          <div>
            <label className="block text-sm font-medium">How do you find maths?</label>
            <select {...register('subjectDifficulty')} className="mt-1 block w-full rounded-md border-gray-300">
              <option value="easy">Pretty easy for me</option>
              <option value="medium">It's okay, some parts are tricky</option>
              <option value="hard">I find it challenging</option>
            </select>
          </div>
          
          <button type="submit" className="btn-primary">
            Start Learning! 🚀
          </button>
        </div>
      )}
    </form>
  );
}
```

**🔍 Code Review Point 2.1:**
- Review auth implementation and security
- Check error handling
- Validate testing coverage

*[Continuing with the rest of the development phases...]*

---

## 🔒 Security & Privacy Implementation

### Row Level Security (PostgreSQL + Supabase)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (supabase_auth_id = auth.uid());

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (supabase_auth_id = auth.uid());

-- Parents can see their students
CREATE POLICY "Parents can view their students" ON students
    FOR SELECT USING (
        parent_id IN (
            SELECT id FROM users WHERE supabase_auth_id = auth.uid()
        )
    );

-- Students can see their own data (if they have login)
CREATE POLICY "Students can view own data" ON students
    FOR SELECT USING (supabase_auth_id = auth.uid());

-- Notes: students and parents can access
CREATE POLICY "Access own notes" ON notes
    FOR ALL USING (
        student_id IN (
            SELECT id FROM students 
            WHERE supabase_auth_id = auth.uid()
            OR parent_id IN (
                SELECT id FROM users WHERE supabase_auth_id = auth.uid()
            )
        )
    );

-- Curriculum is readable by all authenticated users
CREATE POLICY "Curriculum is public" ON nsw_curriculum
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- AI interactions: parents can review, students can see their own
CREATE POLICY "AI interaction access" ON ai_interactions
    FOR SELECT USING (
        student_id IN (
            SELECT id FROM students 
            WHERE supabase_auth_id = auth.uid()
            OR parent_id IN (
                SELECT id FROM users WHERE supabase_auth_id = auth.uid()
            )
        )
    );
```

### API Security Middleware

```python
# backend/app/api/middleware/security.py
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import os

security = HTTPBearer()

def get_supabase_client() -> Client:
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY")
    )

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
) -> dict:
    """Verify Supabase JWT token"""
    try:
        token = credentials.credentials
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

async def rate_limit_check(request: Request):
    """Simple rate limiting using Redis"""
    # Implementation with Digital Ocean Managed Redis
    pass
```

---

## 📊 Monitoring & Analytics Setup

### Application Monitoring with Sentry

```typescript
// frontend/src/lib/monitoring/sentry.ts
import * as Sentry from "@sentry/react";

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_APP_ENV,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event) {
        // Filter out sensitive data
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        return event;
      },
    });
  }
}
```

### Privacy-Focused Analytics (Plausible)

```typescript
// frontend/src/lib/analytics/plausible.ts
// Plausible is privacy-focused, GDPR compliant, no cookies
export function trackEvent(name: string, props?: Record<string, string | number>) {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(name, { props });
  }
}

// Usage examples
trackEvent('note_uploaded');
trackEvent('curriculum_alignment', { outcome: 'MA3-RN-01', confidence: 0.85 });
trackEvent('revision_completed', { duration_seconds: 300, score: 85 });
```

---

## 📈 Success Metrics & KPIs

### Technical Metrics
| Metric | Target | Measurement | Alert Threshold |
|--------|--------|-------------|-----------------|
| API Response Time (p95) | <2s | Sentry APM | >3s |
| Error Rate | <1% | Sentry | >2% |
| Uptime | 99.9% | Uptime Robot | <99.5% |
| Core Web Vitals (LCP) | <2.5s | Lighthouse | >4s |
| Claude API Latency | <3s | Custom logging | >5s |
| OCR Success Rate | >95% | Custom analytics | <90% |
| AI Cost per User | <$0.50/month | Usage tracking | >$1.00 |

### Cost Metrics (Monthly)
| Component | Budget | Alert |
|-----------|--------|-------|
| Digital Ocean (total) | $100 | >$150 |
| Claude API | $100 | >$200 |
| Google Vision OCR | $20 | >$50 |
| **Total Infrastructure** | **$220** | **>$400** |

---

## ✅ Final Launch Checklist

### Technical Readiness
- [ ] All tests passing (unit, integration, E2E)
- [ ] Performance targets met
- [ ] Security audit completed
- [ ] Monitoring and alerts configured (Sentry, Uptime Robot)
- [ ] Backup and recovery tested (DO automated backups)
- [ ] Documentation complete

### AI Safety
- [ ] Claude system prompts reviewed for age-appropriateness
- [ ] AI interaction logging working
- [ ] Parent oversight dashboard functional
- [ ] Content filtering tested
- [ ] Cost monitoring alerts configured

### Infrastructure
- [ ] Digital Ocean App Platform configured for all environments
- [ ] Database migrations tested
- [ ] CDN (Cloudflare) configured
- [ ] SSL certificates active
- [ ] Environment variables secured

---

## 🎯 Post-Launch Roadmap

### Month 1-3: Stabilization
- Performance optimization based on real usage
- AI prompt refinement based on user feedback
- Bug fixes and UX improvements
- Cost optimization (monitor AI usage patterns)

### Month 4-6: Enhancement
- Victorian curriculum integration
- Voice input for notes (Whisper API)
- Teacher dashboard and tools
- Mobile app development (React Native or Expo)

### Month 7-12: Expansion
- National curriculum coverage
- B2B school platform
- Advanced AI features (personalized learning paths)
- Research partnerships with universities

---

This comprehensive development plan provides a clear, actionable path from concept to production-ready curriculum-aligned study assistant using Digital Ocean infrastructure and Claude AI, with robust testing, monitoring, and cost management built into every phase.
