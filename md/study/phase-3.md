# Study: Phase 3 - User System & Authentication

## Summary

Phase 3 focuses on implementing the complete user authentication and student management system for StudyHub. This includes parent accounts, student profiles, subject enrolment, and the onboarding flow. The database schema and Pydantic models are already in place from Phase 1, so Phase 3 focuses on building the service layer, API endpoints, and frontend components.

**Status**: Ready to begin (Phases 1 & 2 complete at 100%)
**Duration**: 2 weeks
**Focus**: User auth, student profiles, subject enrolment, access control

---

## Key Requirements

### Core Features
- Parent account creation and management (linked to Supabase Auth)
- Student profile CRUD (parent creates on behalf of children)
- Subject enrolment with pathway selection (Stage 5: 5.1/5.2/5.3)
- HSC course selection for Stage 6 students
- Multi-child support with student switcher
- Onboarding flow for new students

### Access Control (CRITICAL)
- Parents can only access their own students
- Students can access own data if they have a Supabase auth ID
- Framework isolation enforced on all curriculum queries
- Ownership verification on every data access

### Privacy Requirements
- Parental consent for account creation (parent creates on behalf)
- No direct child data exposure without parent linkage
- Data deletion cascades (delete parent → delete students)
- All AI interactions logged for parent oversight

---

## Existing Patterns

### Database Schema (Already Created)
```python
# Migration 003: users table
- id (UUID, PK)
- supabase_auth_id (UUID, unique) - Links to Supabase Auth
- email, display_name, phone_number
- subscription_tier ("free" default)
- preferences (JSONB) - emailNotifications, weeklyReports, language, timezone

# Migration 004: students table
- id (UUID, PK)
- parent_id (FK to users)
- supabase_auth_id (optional - if student has own login)
- grade_level (0-12, where 0=Kindergarten)
- school_stage (ES1, S1, S2, S3, S4, S5, S6)
- framework_id (FK to curriculum_frameworks)
- gamification (JSONB) - xp, level, streak, achievements
- onboarding_completed (Boolean)

# Migration 008: student_subjects table
- student_id (FK to students)
- subject_id (FK to subjects)
- pathway (e.g., "5.1", "5.2", "5.3" for Stage 5 Maths)
- senior_course_id (FK - for Stage 6 HSC courses)
- progress (JSONB) - outcomesCompleted, overallPercentage
- Unique constraint: (student_id, subject_id)
```

### Pydantic Schemas (Ready)
- `backend/app/schemas/user.py` - UserBase, UserCreate, UserUpdate, UserResponse
- `backend/app/schemas/student.py` - StudentBase, StudentCreate, StudentUpdate, StudentResponse, GamificationData

### Stage/Grade Mapping
```
Grade 0    → ES1 (Early Stage 1, Kindergarten)
Grades 1-2 → S1  (Stage 1)
Grades 3-4 → S2  (Stage 2)
Grades 5-6 → S3  (Stage 3)
Grades 7-8 → S4  (Stage 4)
Grades 9-10→ S5  (Stage 5) - Requires pathway selection
Grades 11-12→ S6 (Stage 6) - Requires HSC course selection
```

---

## Technical Considerations

### Backend Services to Implement

**UserService** (`backend/app/services/user_service.py`)
```python
class UserService:
    async def create_user(supabase_auth_id, email, display_name) → User
    async def get_user(user_id) → User
    async def get_user_by_supabase_id(supabase_auth_id) → User
    async def update_user(user_id, updates) → User
    async def update_last_login(user_id) → None
    async def verify_user_owns_student(user_id, student_id) → bool
```

**StudentService** (`backend/app/services/student_service.py`)
```python
class StudentService:
    async def create_student(parent_id, grade_level, framework_id) → Student
    async def get_student(student_id, requesting_user_id) → Student  # ownership check
    async def get_students_for_parent(parent_id) → List[Student]
    async def update_student(student_id, updates, requesting_user_id) → Student
    async def delete_student(student_id, requesting_user_id) → None
    async def mark_onboarding_complete(student_id) → None
```

**StudentSubjectService** (`backend/app/services/student_subject_service.py`)
```python
class StudentSubjectService:
    async def enrol_in_subject(student_id, subject_id, pathway=None, senior_course_id=None)
    async def unenrol_from_subject(student_id, subject_id)
    async def get_student_subjects(student_id) → List[StudentSubject]
    async def update_subject_progress(student_subject_id, progress_data)
    # Validation: framework isolation, pathway for Stage 5, senior_course for Stage 6
```

### API Endpoints Required

**User Endpoints**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/users` | Create user (after Supabase signup) |
| GET | `/api/v1/users/me` | Get current user profile |
| PUT | `/api/v1/users/me` | Update user profile |
| GET | `/api/v1/users/me/students` | Get all students for parent |

**Student Endpoints**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/students` | List parent's students (paginated) |
| POST | `/api/v1/students` | Create new student |
| GET | `/api/v1/students/{id}` | Get student (ownership verified) |
| PUT | `/api/v1/students/{id}` | Update student |
| DELETE | `/api/v1/students/{id}` | Delete student |

**Student Subject Endpoints**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/students/{id}/subjects` | Get enrolled subjects |
| POST | `/api/v1/students/{id}/subjects` | Enrol in subject |
| DELETE | `/api/v1/students/{id}/subjects/{subj_id}` | Unenrol |
| PUT | `/api/v1/students/{id}/subjects/{subj_id}` | Update pathway/progress |

### Authentication Dependency
```python
# backend/app/core/auth.py
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Validate JWT and return current user from database"""
    # Verify token with Supabase
    # Look up user by supabase_auth_id
    # Return User model or raise 401
```

### Frontend Components to Build

**Authentication** (`frontend/src/features/auth/`)
- `LoginForm.tsx` - Email/password login with Supabase
- `SignupForm.tsx` - Parent registration
- `AuthGuard.tsx` - Route protection component
- `AuthCallback.tsx` - Supabase OAuth callback handler

**Onboarding** (`frontend/src/features/onboarding/`)
- `StudentOnboarding.tsx` - Main wizard container
- `GradeSelection.tsx` - Year level picker (K-12)
- `FrameworkSelection.tsx` - Curriculum selection (NSW, VIC, etc.)
- `SubjectSelection.tsx` - Multi-select subjects
- `PathwaySelection.tsx` - Stage 5 pathway (5.1/5.2/5.3)
- `HSCCourseSelection.tsx` - Stage 6 course picker
- `OnboardingComplete.tsx` - Success screen

**Student Management** (`frontend/src/features/subjects/`)
- `StudentProfile.tsx` - View/edit student details
- `StudentSwitcher.tsx` - Switch between children
- `SubjectEnrolmentManager.tsx` - Add/remove subjects

### React Query Hooks
```typescript
// frontend/src/hooks/
useCurrentUser()           // Get logged-in parent
useStudents()              // Get all students for parent
useStudent(studentId)      // Get specific student
useCreateStudent()         // Create student mutation
useUpdateStudent()         // Update student mutation
useStudentSubjects(id)     // Get enrolled subjects
useEnrolSubject(id)        // Enrol mutation
useUnenrolSubject(id)      // Unenrol mutation
useOnboarding()            // Onboarding flow state
```

---

## Curriculum Alignment

### Framework Isolation Rules
- Student's `framework_id` must match subject's `framework_id` when enrolling
- All curriculum outcome queries must filter by `framework_id`
- Stage 5 pathway options are NSW-specific initially

### Subject Pathway System
```
Stage 5 Mathematics (NSW):
- 5.1: Core/Foundation pathway
- 5.2: Standard pathway (most students)
- 5.3: Advanced pathway

Stage 6 (HSC) - Senior Courses:
- Mathematics Standard (2 units)
- Mathematics Advanced (2 units)
- Mathematics Extension 1 (requires Advanced)
- Mathematics Extension 2 (requires Extension 1)
```

---

## Security/Privacy Considerations

### Children's Data Protection
- **Australian Privacy Act**: Parental consent for under-15s (parent creates account)
- **COPPA best practices**: Minimal data collection from children
- **Data minimisation**: Only collect what's necessary
- **Right to deletion**: Cascade delete on parent account deletion

### Access Control Matrix
| Resource | Parent | Student | Other Parent |
|----------|--------|---------|--------------|
| Own profile | Read/Write | - | - |
| Own students | CRUD | - | Denied (403) |
| Student's data | - | Read (own) | Denied (403) |
| Other's students | Denied | Denied | Denied |

### Error Response Codes
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - No access to resource (ownership failure)
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Duplicate enrolment
- `422 Unprocessable` - Invalid pathway for stage

### Skills to Run After Implementation
- `/skill student-data-privacy-audit` - Privacy compliance check
- `/skill api-contract-checker` - Frontend/backend type alignment
- `/skill curriculum-validator` - Pathway/stage validation

---

## Dependencies

### Already Complete (Phase 1 & 2)
- ✅ Database migrations (001-008) including users, students, student_subjects
- ✅ Pydantic schemas for User and Student
- ✅ SQLAlchemy models (User, Student, StudentSubject)
- ✅ JWT authentication framework
- ✅ CSRF, rate limiting, security middleware
- ✅ React Query, Zustand, React Router configured
- ✅ UI component library (10 components, 132 tests)
- ✅ NSW curriculum framework with 8 subjects seeded
- ✅ 55 sample curriculum outcomes

### External Dependencies
- **Supabase Auth** - Handles actual authentication
- **Environment Variables**: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

### Must Create
- Backend services (UserService, StudentService, StudentSubjectService)
- Authentication dependency (`get_current_user`)
- Complete API endpoints with ownership verification
- Frontend auth components and hooks
- Onboarding flow components

---

## Implementation Sequence

### Week 1: Backend Infrastructure

**Days 1-2: Auth & User Service**
- Implement `get_current_user` dependency
- Build `UserService` with Supabase integration
- Create user endpoints (POST, GET /me, PUT /me)
- Add comprehensive tests

**Days 3-4: Student Service**
- Build `StudentService` with ownership verification
- Create student CRUD endpoints
- Implement access control checks
- Add ownership verification tests

**Days 5-7: Subject Enrolment**
- Build `StudentSubjectService`
- Implement enrolment with pathway validation
- Create subject enrolment endpoints
- Add framework isolation tests

### Week 2: Frontend & Integration

**Days 8-9: Authentication UI**
- Build LoginForm, SignupForm with Supabase
- Implement AuthGuard and useAuth hook
- Create auth state persistence

**Days 10-12: Onboarding Flow**
- Build StudentOnboarding wizard
- Implement grade → stage mapping
- Build subject/pathway/course selection
- Integrate with backend APIs

**Days 13-14: Testing & Polish**
- E2E tests for complete flow
- Privacy audit skill verification
- Access control verification
- Documentation updates

---

## Success Criteria

Phase 3 is complete when:

- [ ] All 10+ user/student API endpoints implemented
- [ ] Ownership verification prevents cross-parent access
- [ ] Student onboarding flow works end-to-end
- [ ] Subject enrolment respects framework isolation
- [ ] Stage 5 pathway selection enforces 5.1/5.2/5.3 options
- [ ] Stage 6 students can select HSC courses
- [ ] Parent can manage multiple students with switcher
- [ ] Access control tests pass (parent/student separation)
- [ ] Privacy audit skill passes
- [ ] 80%+ test coverage on new code
- [ ] Zero TypeScript errors
- [ ] Zero Python type errors (mypy)

---

## Open Questions

1. **Student self-login**: When should students get their own Supabase auth? Age-based (13+)?
2. **Pathway change**: Can students change pathway mid-year? What happens to progress?
3. **Multiple frameworks**: Can a student be enrolled in subjects from different frameworks? (e.g., moving schools)
4. **Guest mode**: Should there be a demo mode without signup for marketing?

---

## Sources Referenced

- `PROGRESS.md` - Phase completion status
- `TASKLIST.md` - Sprint task breakdown
- `CLAUDE.md` - Project configuration and conventions
- `Complete_Development_Plan.md` - Database schema and technical specs
- `backend/alembic/versions/003_users.py` - User migration
- `backend/alembic/versions/004_students.py` - Student migration
- `backend/alembic/versions/008_student_subjects.py` - Enrolment migration
- `backend/app/schemas/user.py` - User Pydantic schemas
- `backend/app/schemas/student.py` - Student Pydantic schemas
- `backend/app/models/` - SQLAlchemy models
- `frontend/src/components/` - Existing UI components
