# StudyHub

AI-powered study assistant for Australian students (Years 1-13) with curriculum-aligned learning.

## Overview

StudyHub transforms education by integrating official curriculum standards with AI-powered tutoring. The platform uses a Socratic method approach, guiding students to discover answers rather than providing them directly.

### Key Features

- **Multi-Subject Support**: All NSW Key Learning Areas (Mathematics, English, Science, HSIE, PDHPE, TAS, Creative Arts, Languages)
- **Multi-Framework Architecture**: NSW first, designed for expansion to VIC, QLD, SA, WA, ACARA, and international curricula
- **AI Socratic Tutoring**: Subject-specific tutor styles powered by Claude
- **Note Management**: Upload and OCR handwritten notes
- **Spaced Repetition**: SM-2 algorithm for effective revision
- **Parent Dashboard**: Monitor progress and AI conversations
- **Gamification**: XP, levels, achievements, and streaks

## Tech Stack

### Frontend
- React 18 + TypeScript 5
- Vite
- Tailwind CSS
- TanStack Query (React Query)
- Zustand
- React Router v6

### Backend
- Python 3.11
- FastAPI
- SQLAlchemy 2.0 (async)
- Alembic
- Pydantic v2

### Infrastructure
- Digital Ocean App Platform
- Digital Ocean Managed PostgreSQL
- Digital Ocean Spaces (S3-compatible)
- Supabase Auth
- Claude API (Sonnet + Haiku)
- Google Cloud Vision (OCR)

## Project Structure

```
studyhub/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── features/      # Feature modules
│   │   ├── lib/           # Core libraries
│   │   ├── hooks/         # Custom React hooks
│   │   ├── stores/        # Zustand state stores
│   │   ├── types/         # TypeScript definitions
│   │   └── utils/         # Utility functions
│   └── ...
├── backend/               # Python FastAPI application
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Configuration, security
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # Business logic
│   ├── alembic/           # Database migrations
│   └── tests/
├── infrastructure/        # Docker, scripts
├── docs/                  # Documentation
└── Planning/              # Development planning
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd studyhub
   ```

2. **Start with Docker (recommended)**
   ```bash
   docker-compose up -d
   ```

3. **Or run locally**

   Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   Backend:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

### Environment Variables

Copy the example files and configure:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `ANTHROPIC_API_KEY` - Claude API key
- `GCP_VISION_KEY` - Google Cloud Vision API key (for OCR)

## Development

### Running Tests

Frontend:
```bash
cd frontend
npm run test        # Unit tests
npm run test:e2e    # E2E tests with Playwright
```

Backend:
```bash
cd backend
pytest              # All tests
pytest --cov       # With coverage
```

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Code Quality

Frontend:
```bash
npm run lint
npm run typecheck
```

Backend:
```bash
ruff check .
mypy app
```

## Architecture Decisions

### Multi-Framework Curriculum

All curriculum data is framework-scoped:
- `curriculum_frameworks` table defines each state/country framework
- All subject and outcome queries must filter by `framework_id`
- NSW is the default, others can be activated as needed

### Subject-Specific AI Tutoring

Each subject has a configured tutor style:
- Mathematics: `socratic_stepwise` - Step-by-step problem solving
- English: `mentor_guide` - Writing workshops, literary analysis
- Science: `inquiry_based` - Hypothesis-driven exploration
- HSIE: `socratic_discussion` - Evidence-based reasoning
- Languages: `immersive_coach` - Target language practice

### Privacy & Security

- Children's data protection is critical
- All AI interactions are logged for parent review
- Parents have full visibility into their child's learning

## Contributing

1. Create a feature branch from `main`
2. Follow conventional commit messages
3. Ensure tests pass and coverage doesn't drop
4. Submit a pull request

## License

Private - All rights reserved

## Support

For issues or questions, contact the development team.
