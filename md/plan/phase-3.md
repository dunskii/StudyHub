# Implementation Plan: Phase 3 - User System & Authentication

## Overview

Phase 3 implements the complete user authentication and student management system for StudyHub. This includes:
- Parent account management (linked to Supabase Auth)
- Student profile CRUD with ownership verification
- Subject enrolment with pathway/HSC course selection
- Student onboarding flow
- Multi-child support with student switcher

**Duration**: 2 weeks
**Complexity**: Medium-High
**Dependencies**: Phase 1 & 2 complete (100%)

---

## Prerequisites

- [x] Database migrations created (003_users, 004_students, 008_student_subjects)
- [x] SQLAlchemy models defined (User, Student, StudentSubject)
- [x] Pydantic schemas ready (UserBase/Create/Update/Response, StudentBase/Create/Update/Response)
- [x] JWT authentication framework in place (`backend/app/core/security.py`)
- [x] `get_current_user` dependency implemented
- [x] Supabase client configured (`frontend/src/lib/supabase/client.ts`)
- [x] API client with auth support (`frontend/src/lib/api/client.ts`)
- [x] NSW curriculum framework seeded with 8 subjects

---

## Phase 1: Backend Services

### 1.1 User Service
**File**: `backend/app/services/user_service.py`

```
- [ ] create(supabase_auth_id, email, display_name) → User
- [ ] get_by_id(user_id) → User | None
- [ ] get_by_supabase_id(supabase_auth_id) → User | None
- [ ] get_by_email(email) → User | None
- [ ] update(user_id, data: UserUpdate) → User
- [ ] update_last_login(user_id) → None
- [ ] verify_owns_student(user_id, student_id) → bool
- [ ] delete(user_id) → bool (cascades to students)
```

### 1.2 Student Service
**File**: `backend/app/services/student_service.py`

```
- [ ] create(data: StudentCreate) → Student
- [ ] get_by_id(student_id) → Student | None
- [ ] get_by_id_for_user(student_id, user_id) → Student | None  # ownership check
- [ ] get_all_for_parent(parent_id, offset, limit) → list[Student]
- [ ] count_for_parent(parent_id) → int
- [ ] update(student_id, data: StudentUpdate, requesting_user_id) → Student
- [ ] delete(student_id, requesting_user_id) → bool
- [ ] mark_onboarding_complete(student_id) → Student
- [ ] update_last_active(student_id) → None
- [ ] update_gamification(student_id, xp_delta, achievements) → Student
```

### 1.3 Student Subject Service
**File**: `backend/app/services/student_subject_service.py`

```
- [ ] enrol(student_id, subject_id, pathway?, senior_course_id?) → StudentSubject
- [ ] unenrol(student_id, subject_id) → bool
- [ ] get_by_id(student_subject_id) → StudentSubject | None
- [ ] get_all_for_student(student_id) → list[StudentSubject]
- [ ] update_pathway(student_subject_id, pathway, senior_course_id?) → StudentSubject
- [ ] update_progress(student_subject_id, progress_data) → StudentSubject
- [ ] validate_enrolment(student, subject_id, pathway?, senior_course_id?) → raises ValidationError
```

**Validation Rules**:
```python
# Framework isolation: student.framework_id must match subject.framework_id
# Stage 5 pathway: if school_stage == "S5", pathway must be in ["5.1", "5.2", "5.3"]
# Stage 6 course: if school_stage == "S6", senior_course_id is required
# Unique enrolment: (student_id, subject_id) must be unique
```

---

## Phase 2: Backend API Endpoints

### 2.1 User Endpoints
**File**: `backend/app/api/v1/endpoints/users.py` (new)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/users` | Create user after Supabase signup | Public* |
| GET | `/api/v1/users/me` | Get current user profile | Required |
| PUT | `/api/v1/users/me` | Update user profile | Required |
| GET | `/api/v1/users/me/students` | Get all students for parent | Required |

*POST /users requires valid Supabase token to prevent abuse

### 2.2 Student Endpoints
**File**: `backend/app/api/v1/endpoints/students.py` (update existing)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/students` | List parent's students (paginated) | Required |
| POST | `/api/v1/students` | Create new student | Required |
| GET | `/api/v1/students/{id}` | Get student (ownership verified) | Required |
| PUT | `/api/v1/students/{id}` | Update student | Required |
| DELETE | `/api/v1/students/{id}` | Delete student | Required |
| POST | `/api/v1/students/{id}/onboarding/complete` | Mark onboarding done | Required |

### 2.3 Student Subject Endpoints
**File**: `backend/app/api/v1/endpoints/student_subjects.py` (new)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/students/{id}/subjects` | Get enrolled subjects | Required |
| POST | `/api/v1/students/{id}/subjects` | Enrol in subject | Required |
| DELETE | `/api/v1/students/{id}/subjects/{subject_id}` | Unenrol from subject | Required |
| PUT | `/api/v1/students/{id}/subjects/{subject_id}` | Update pathway/progress | Required |

### 2.4 New Pydantic Schemas
**File**: `backend/app/schemas/student_subject.py` (new)

```python
- [ ] StudentSubjectBase(subject_id, pathway?, senior_course_id?)
- [ ] StudentSubjectCreate(StudentSubjectBase)
- [ ] StudentSubjectUpdate(pathway?, senior_course_id?, progress?)
- [ ] StudentSubjectProgress(outcomesCompleted, outcomesInProgress, overallPercentage, xpEarned)
- [ ] StudentSubjectResponse(id, student_id, subject_id, pathway, senior_course_id, enrolled_at, progress)
- [ ] StudentSubjectWithSubject(StudentSubjectResponse + subject details)
- [ ] EnrolmentRequest(subject_id, pathway?, senior_course_id?)
- [ ] EnrolmentListResponse(enrolments, total)
```

### 2.5 Update Router Registration
**File**: `backend/app/api/v1/router.py`

```python
- [ ] Add users router
- [ ] Add student_subjects router
- [ ] Update students router prefix
```

---

## Phase 3: AI Integration

*Not applicable for Phase 3 - AI tutoring is Phase 4*

---

## Phase 4: Frontend Components

### 4.1 Authentication Components
**Directory**: `frontend/src/features/auth/`

```
- [ ] LoginForm.tsx - Email/password login with Supabase
- [ ] SignupForm.tsx - Parent registration form
- [ ] AuthGuard.tsx - Route protection wrapper
- [ ] AuthCallback.tsx - Handle Supabase OAuth callback
- [ ] ForgotPasswordForm.tsx - Password reset request
- [ ] ResetPasswordForm.tsx - Password reset completion
- [ ] index.ts - Exports
```

### 4.2 Onboarding Components
**Directory**: `frontend/src/features/onboarding/`

```
- [ ] StudentOnboarding.tsx - Main wizard container
- [ ] OnboardingProgress.tsx - Step indicator
- [ ] GradeSelection.tsx - Year level picker (K-12)
- [ ] FrameworkSelection.tsx - Curriculum framework selection
- [ ] SubjectSelection.tsx - Multi-select subject cards
- [ ] PathwaySelection.tsx - Stage 5 pathway picker (5.1/5.2/5.3)
- [ ] HSCCourseSelection.tsx - Stage 6 course picker
- [ ] OnboardingComplete.tsx - Success screen with next steps
- [ ] index.ts - Exports
```

### 4.3 Student Management Components
**Directory**: `frontend/src/features/students/`

```
- [ ] StudentProfile.tsx - View/edit student details
- [ ] StudentProfileForm.tsx - Edit form
- [ ] StudentSwitcher.tsx - Dropdown to switch between children
- [ ] StudentList.tsx - List of all students (for parent dashboard)
- [ ] StudentCard.tsx - Summary card for student
- [ ] AddStudentModal.tsx - Quick add student dialog
- [ ] DeleteStudentModal.tsx - Confirm delete dialog
- [ ] index.ts - Exports
```

### 4.4 Subject Enrolment Components
**Directory**: `frontend/src/features/enrolment/`

```
- [ ] EnrolmentManager.tsx - Add/remove subjects
- [ ] EnrolledSubjectCard.tsx - Show enrolled subject with progress
- [ ] EnrolledSubjectsList.tsx - List of enrolled subjects
- [ ] PathwaySelector.tsx - Reusable pathway dropdown
- [ ] HSCCourseSelector.tsx - Reusable HSC course dropdown
- [ ] index.ts - Exports
```

### 4.5 Page Components
**Directory**: `frontend/src/pages/`

```
- [ ] LoginPage.tsx
- [ ] SignupPage.tsx
- [ ] ForgotPasswordPage.tsx
- [ ] ResetPasswordPage.tsx
- [ ] OnboardingPage.tsx
- [ ] StudentProfilePage.tsx
- [ ] ManageSubjectsPage.tsx
```

---

## Phase 5: Frontend State & API

### 5.1 API Functions
**Directory**: `frontend/src/lib/api/`

**File**: `users.ts` (new)
```typescript
- [ ] getCurrentUser() → User
- [ ] updateCurrentUser(data) → User
- [ ] createUser(data) → User
```

**File**: `students.ts` (new)
```typescript
- [ ] getStudents(params?) → StudentListResponse
- [ ] getStudent(id) → Student
- [ ] createStudent(data) → Student
- [ ] updateStudent(id, data) → Student
- [ ] deleteStudent(id) → void
- [ ] completeOnboarding(id) → Student
```

**File**: `enrolments.ts` (new)
```typescript
- [ ] getStudentSubjects(studentId) → StudentSubjectListResponse
- [ ] enrolInSubject(studentId, data) → StudentSubject
- [ ] unenrolFromSubject(studentId, subjectId) → void
- [ ] updateEnrolment(studentId, subjectId, data) → StudentSubject
```

### 5.2 React Query Hooks
**Directory**: `frontend/src/hooks/`

**File**: `useAuth.ts` (new)
```typescript
- [ ] useAuth() → { user, isLoading, isAuthenticated, login, logout, signup }
- [ ] useCurrentUser() → Query<User>
- [ ] useUpdateProfile() → Mutation<User>
```

**File**: `useStudents.ts` (new)
```typescript
- [ ] studentKeys - Query key factory
- [ ] useStudents() → Query<StudentListResponse>
- [ ] useStudent(id) → Query<Student>
- [ ] useCreateStudent() → Mutation<Student>
- [ ] useUpdateStudent(id) → Mutation<Student>
- [ ] useDeleteStudent() → Mutation<void>
```

**File**: `useEnrolments.ts` (new)
```typescript
- [ ] enrolmentKeys - Query key factory
- [ ] useStudentSubjects(studentId) → Query<StudentSubjectListResponse>
- [ ] useEnrolSubject(studentId) → Mutation<StudentSubject>
- [ ] useUnenrolSubject(studentId) → Mutation<void>
- [ ] useUpdateEnrolment(studentId) → Mutation<StudentSubject>
```

**File**: `useOnboarding.ts` (new)
```typescript
- [ ] useOnboarding(studentId) → { step, next, prev, data, setData, submit }
```

### 5.3 Zustand Stores
**Directory**: `frontend/src/stores/`

**File**: `authStore.ts` (new)
```typescript
- [ ] AuthStore { user, token, isAuthenticated, setUser, setToken, logout }
```

**File**: `studentStore.ts` (new)
```typescript
- [ ] StudentStore { currentStudentId, setCurrentStudent, students }
```

### 5.4 Type Definitions
**Directory**: `frontend/src/types/`

**File**: `user.types.ts` (new)
```typescript
- [ ] User interface
- [ ] UserPreferences interface
- [ ] UserUpdate interface
```

**File**: `student.types.ts` (new)
```typescript
- [ ] Student interface
- [ ] StudentCreate interface
- [ ] StudentUpdate interface
- [ ] GamificationData interface
- [ ] StudentPreferences interface
```

**File**: `enrolment.types.ts` (new)
```typescript
- [ ] StudentSubject interface
- [ ] StudentSubjectProgress interface
- [ ] EnrolmentRequest interface
```

---

## Phase 6: Frontend Integration

### 6.1 Auth Provider Setup
**File**: `frontend/src/providers/AuthProvider.tsx` (new)

```
- [ ] Wrap app with Supabase auth listener
- [ ] Sync Supabase session with backend
- [ ] Handle token refresh
- [ ] Set API client token provider
```

### 6.2 Route Protection
**File**: `frontend/src/App.tsx` (update)

```
- [ ] Add protected routes with AuthGuard
- [ ] Add onboarding redirect logic
- [ ] Add student context provider
```

### 6.3 Error Handling
```
- [ ] 401 → Redirect to login
- [ ] 403 → Show forbidden message
- [ ] Handle token expiry gracefully
```

### 6.4 Loading States
```
- [ ] Auth loading skeleton
- [ ] Student list loading skeleton
- [ ] Subject selection loading skeleton
```

### 6.5 Offline Support Considerations
```
- [ ] Cache current user in localStorage
- [ ] Cache student list in localStorage
- [ ] Queue offline enrolment changes (future)
```

---

## Phase 7: Testing

### 7.1 Backend Unit Tests
**Directory**: `backend/tests/services/`

```
- [ ] test_user_service.py
  - test_create_user
  - test_get_user_by_id
  - test_get_user_by_supabase_id
  - test_update_user
  - test_verify_owns_student_success
  - test_verify_owns_student_failure

- [ ] test_student_service.py
  - test_create_student
  - test_get_student_for_parent
  - test_get_student_wrong_parent_fails
  - test_update_student
  - test_delete_student
  - test_mark_onboarding_complete

- [ ] test_student_subject_service.py
  - test_enrol_in_subject
  - test_enrol_duplicate_fails
  - test_enrol_wrong_framework_fails
  - test_stage5_requires_pathway
  - test_stage6_requires_senior_course
  - test_unenrol_from_subject
  - test_update_progress
```

### 7.2 Backend Integration Tests
**Directory**: `backend/tests/api/`

```
- [ ] test_users_api.py
  - test_create_user_endpoint
  - test_get_current_user
  - test_update_current_user
  - test_get_current_user_students

- [ ] test_students_api.py
  - test_list_students
  - test_create_student
  - test_get_student_success
  - test_get_student_wrong_parent_403
  - test_update_student
  - test_delete_student

- [ ] test_student_subjects_api.py
  - test_get_enrolled_subjects
  - test_enrol_in_subject
  - test_unenrol_from_subject
  - test_update_enrolment_pathway
```

### 7.3 Frontend Unit Tests
**Directory**: `frontend/src/features/**/__tests__/`

```
- [ ] LoginForm.test.tsx
- [ ] SignupForm.test.tsx
- [ ] AuthGuard.test.tsx
- [ ] GradeSelection.test.tsx
- [ ] SubjectSelection.test.tsx
- [ ] PathwaySelection.test.tsx
- [ ] StudentSwitcher.test.tsx
- [ ] StudentProfile.test.tsx
```

### 7.4 Frontend Hook Tests
**Directory**: `frontend/src/hooks/__tests__/`

```
- [ ] useAuth.test.ts
- [ ] useStudents.test.ts
- [ ] useEnrolments.test.ts
- [ ] useOnboarding.test.ts
```

### 7.5 E2E Tests
**Directory**: `frontend/e2e/`

```
- [ ] auth.spec.ts
  - Parent can sign up
  - Parent can log in
  - Parent can log out
  - Auth redirects work

- [ ] onboarding.spec.ts
  - Complete onboarding flow
  - Select grade and framework
  - Select subjects
  - Select pathway for Stage 5
  - Complete onboarding

- [ ] student-management.spec.ts
  - Parent can add student
  - Parent can edit student
  - Parent can delete student
  - Parent can switch students

- [ ] enrolment.spec.ts
  - Student can enrol in subject
  - Student can unenrol from subject
  - Pathway validation works
```

---

## Phase 8: Documentation

### 8.1 API Documentation
```
- [ ] Update OpenAPI schema with new endpoints
- [ ] Add request/response examples
- [ ] Document error codes and responses
```

### 8.2 Component Documentation
```
- [ ] Storybook stories for auth components
- [ ] Storybook stories for onboarding components
- [ ] Storybook stories for student management
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase token sync issues | High | Implement token refresh, handle edge cases in AuthProvider |
| Cross-parent data leakage | Critical | Ownership checks at service AND endpoint level, comprehensive tests |
| Stage 5/6 validation gaps | Medium | Centralise validation in StudentSubjectService, unit test all cases |
| Onboarding abandonment | Medium | Save progress to localStorage, allow resume |
| Token expiry during long session | Medium | Auto-refresh, graceful redirect to login |

---

## Curriculum Considerations

### Framework Isolation (CRITICAL)
- Student `framework_id` determines available subjects
- Enrolment validation must verify `student.framework_id == subject.framework_id`
- All subject queries for a student must filter by their framework

### Stage/Pathway Mapping
```
Grade 0    → ES1 (Early Stage 1)
Grades 1-2 → S1  (Stage 1)
Grades 3-4 → S2  (Stage 2)
Grades 5-6 → S3  (Stage 3)
Grades 7-8 → S4  (Stage 4)
Grades 9-10→ S5  (Stage 5) - Requires pathway selection (5.1, 5.2, 5.3)
Grades 11-12→ S6 (Stage 6) - Requires HSC course selection
```

### Pathway Rules (NSW Mathematics)
- **5.1**: Core/Foundation - basic outcomes only
- **5.2**: Standard - core + extension outcomes
- **5.3**: Advanced - all outcomes including advanced
- Pathways are subject-specific (not all subjects have pathways)

---

## Privacy/Security Checklist

- [x] Parent creates account on behalf of child (parental consent)
- [ ] Ownership verification on ALL student data access
- [ ] No student data exposed without parent linkage
- [ ] Cascade delete: parent deletion removes all students
- [ ] All student endpoints verify requesting user is parent
- [ ] JWT tokens validated on every request
- [ ] Rate limiting on auth endpoints
- [ ] Email verification for new accounts
- [ ] Audit logging for student data changes

---

## Skills to Run After Implementation

```
/skill student-data-privacy-audit  → Verify privacy compliance
/skill api-contract-checker        → Verify frontend/backend types match
/skill curriculum-validator        → Verify pathway/stage validation
```

---

## Implementation Sequence

### Week 1: Backend (Days 1-7)

**Day 1-2: Services**
```
1. UserService implementation
2. StudentService implementation
3. StudentSubjectService implementation
4. Service unit tests
```

**Day 3-4: API Endpoints**
```
1. Create users.py endpoints
2. Update students.py endpoints
3. Create student_subjects.py endpoints
4. Add StudentSubject schemas
5. Register routers
```

**Day 5-7: Backend Testing**
```
1. Integration tests for all endpoints
2. Access control tests (403 scenarios)
3. Validation tests (pathways, frameworks)
4. Fix any issues found
```

### Week 2: Frontend (Days 8-14)

**Day 8-9: Auth Foundation**
```
1. Create AuthProvider
2. Create auth store
3. Create useAuth hook
4. Build LoginForm, SignupForm
5. Build AuthGuard
6. Set up protected routes
```

**Day 10-11: Student Management**
```
1. Create student API functions
2. Create useStudents hooks
3. Build StudentProfile
4. Build StudentSwitcher
5. Build AddStudentModal
```

**Day 12-13: Onboarding Flow**
```
1. Build onboarding components
2. Create useOnboarding hook
3. Build grade/framework selection
4. Build subject selection
5. Build pathway/HSC selection
6. Build completion screen
```

**Day 14: Testing & Polish**
```
1. Frontend component tests
2. E2E tests
3. Fix any issues
4. Update documentation
```

---

## Files to Create/Update

### Backend - New Files
```
backend/app/services/user_service.py
backend/app/services/student_service.py
backend/app/services/student_subject_service.py
backend/app/api/v1/endpoints/users.py
backend/app/api/v1/endpoints/student_subjects.py
backend/app/schemas/student_subject.py
backend/tests/services/test_user_service.py
backend/tests/services/test_student_service.py
backend/tests/services/test_student_subject_service.py
backend/tests/api/test_users_api.py
backend/tests/api/test_students_api.py
backend/tests/api/test_student_subjects_api.py
```

### Backend - Update Files
```
backend/app/api/v1/endpoints/students.py
backend/app/api/v1/router.py
backend/app/services/__init__.py
backend/app/schemas/__init__.py
```

### Frontend - New Files
```
frontend/src/features/auth/LoginForm.tsx
frontend/src/features/auth/SignupForm.tsx
frontend/src/features/auth/AuthGuard.tsx
frontend/src/features/auth/AuthCallback.tsx
frontend/src/features/auth/ForgotPasswordForm.tsx
frontend/src/features/auth/index.ts
frontend/src/features/onboarding/StudentOnboarding.tsx
frontend/src/features/onboarding/GradeSelection.tsx
frontend/src/features/onboarding/FrameworkSelection.tsx
frontend/src/features/onboarding/SubjectSelection.tsx
frontend/src/features/onboarding/PathwaySelection.tsx
frontend/src/features/onboarding/HSCCourseSelection.tsx
frontend/src/features/onboarding/OnboardingComplete.tsx
frontend/src/features/onboarding/index.ts
frontend/src/features/students/StudentProfile.tsx
frontend/src/features/students/StudentSwitcher.tsx
frontend/src/features/students/StudentList.tsx
frontend/src/features/students/AddStudentModal.tsx
frontend/src/features/students/index.ts
frontend/src/features/enrolment/EnrolmentManager.tsx
frontend/src/features/enrolment/EnrolledSubjectCard.tsx
frontend/src/features/enrolment/index.ts
frontend/src/lib/api/users.ts
frontend/src/lib/api/students.ts
frontend/src/lib/api/enrolments.ts
frontend/src/hooks/useAuth.ts
frontend/src/hooks/useStudents.ts
frontend/src/hooks/useEnrolments.ts
frontend/src/hooks/useOnboarding.ts
frontend/src/stores/authStore.ts
frontend/src/stores/studentStore.ts
frontend/src/providers/AuthProvider.tsx
frontend/src/types/user.types.ts
frontend/src/types/student.types.ts
frontend/src/types/enrolment.types.ts
frontend/src/pages/LoginPage.tsx
frontend/src/pages/SignupPage.tsx
frontend/src/pages/OnboardingPage.tsx
frontend/src/pages/StudentProfilePage.tsx
frontend/e2e/auth.spec.ts
frontend/e2e/onboarding.spec.ts
frontend/e2e/student-management.spec.ts
```

### Frontend - Update Files
```
frontend/src/App.tsx
frontend/src/lib/api/index.ts
frontend/src/hooks/index.ts
frontend/src/types/index.ts
```

---

## Success Criteria

Phase 3 is complete when:

- [ ] All backend services implemented with full test coverage
- [ ] All API endpoints implemented with ownership verification
- [ ] Access control tests pass (parent-student separation)
- [ ] Authentication flow works end-to-end (Supabase → Backend)
- [ ] Onboarding flow works for all stages (K-12)
- [ ] Subject enrolment respects framework isolation
- [ ] Stage 5 pathway selection enforces 5.1/5.2/5.3 options
- [ ] Stage 6 students can select HSC courses
- [ ] Parent can manage multiple students with switcher
- [ ] Privacy audit skill passes
- [ ] 80%+ test coverage on new code
- [ ] Zero TypeScript errors
- [ ] Zero Python type errors (mypy)
- [ ] E2E tests pass

---

## Recommended Agent

**Primary**: `full-stack-developer` - For end-to-end feature implementation

**Supporting Agents**:
- `backend-architect` - For service layer design
- `frontend-developer` - For React components
- `security-auditor` - For access control review
- `testing-qa-specialist` - For comprehensive testing

---

## Open Questions

1. **Email verification**: Required before account activation?
2. **Password requirements**: Minimum complexity rules?
3. **Student self-login age**: At what age can students create their own login?
4. **Pathway changes**: Can students change pathway mid-year? What happens to progress?
5. **Multi-framework support**: Can a student be in multiple frameworks? (e.g., moving schools)
