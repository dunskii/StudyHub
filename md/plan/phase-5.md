# Implementation Plan: Phase 5 - Notes & OCR

## Overview

Build the note management system with OCR capabilities using Google Cloud Vision for text extraction and Digital Ocean Spaces for file storage. This phase enables students to upload photos of handwritten notes, search them, and tag them with curriculum outcomes.

**Key Deliverables:**
1. Storage service for Digital Ocean Spaces
2. OCR service with Google Cloud Vision
3. Note service for business logic
4. Note API endpoints
5. Frontend note components
6. Curriculum alignment integration

---

## Prerequisites

- [x] Phase 1-4 complete
- [x] Notes table migration exists (009)
- [x] Note model exists
- [ ] **ACTION REQUIRED**: Configure `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- [ ] **ACTION REQUIRED**: Configure `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_BUCKET`
- [ ] **ACTION REQUIRED**: Install `google-cloud-vision`, `boto3`, `Pillow`, `python-magic` packages

---

## Phase 5.1: Backend - Dependencies & Configuration

### 5.1.1 Install Dependencies
- [ ] Add to `backend/requirements.txt`:
  ```
  google-cloud-vision>=3.0.0
  boto3>=1.34.0
  Pillow>=10.0.0
  python-magic>=0.4.27
  ```

### 5.1.2 Update Configuration (`backend/app/core/config.py`)
- [ ] Add storage settings:
  ```python
  # Digital Ocean Spaces
  do_spaces_key: str = ""
  do_spaces_secret: str = ""
  do_spaces_bucket: str = "studyhub-notes"
  do_spaces_region: str = "syd1"
  do_spaces_endpoint: str = ""  # https://syd1.digitaloceanspaces.com

  # OCR Settings
  ocr_enabled: bool = True
  ocr_max_file_size_mb: int = 10
  ocr_supported_formats: list[str] = ["image/jpeg", "image/png", "image/heic", "application/pdf"]

  # Note Settings
  note_max_per_student: int = 1000
  note_thumbnail_size: tuple[int, int] = (300, 300)
  note_max_dimension: int = 2048
  ```

---

## Phase 5.2: Backend - Storage Service

### 5.2.1 Create Storage Service (`backend/app/services/storage_service.py`)
- [ ] Create `StorageService` class with S3-compatible operations
- [ ] Implement `__init__()` - initialize boto3 client for DO Spaces
- [ ] Implement `generate_upload_key()` - create unique storage path
  ```python
  # Pattern: notes/{student_id}/{year}/{month}/{uuid}.{ext}
  ```
- [ ] Implement `generate_presigned_upload_url()` - for direct browser upload
  ```python
  async def generate_presigned_upload_url(
      self,
      key: str,
      content_type: str,
      expires_in: int = 3600,
  ) -> dict[str, str]:
      """Returns {'url': '...', 'fields': {...}} for POST upload"""
  ```
- [ ] Implement `generate_presigned_download_url()` - for secure file access
  ```python
  async def generate_presigned_download_url(
      self,
      key: str,
      expires_in: int = 3600,
  ) -> str:
      """Returns signed URL for GET request"""
  ```
- [ ] Implement `upload_file()` - server-side upload (for thumbnails)
- [ ] Implement `delete_file()` - remove file from storage
- [ ] Implement `file_exists()` - check if file exists
- [ ] Implement `get_file_metadata()` - get content type, size, etc.
- [ ] Add error handling and logging

### 5.2.2 Create Image Processor (`backend/app/services/image_processor.py`)
- [ ] Create `ImageProcessor` class using Pillow
- [ ] Implement `validate_image()` - check format, size, dimensions
- [ ] Implement `resize_for_ocr()` - max 2048px on longest side
- [ ] Implement `create_thumbnail()` - 300x300 thumbnail
- [ ] Implement `convert_heic_to_jpeg()` - HEIC support
- [ ] Implement `get_image_metadata()` - EXIF data, dimensions

---

## Phase 5.3: Backend - OCR Service

### 5.3.1 Create OCR Service (`backend/app/services/ocr_service.py`)
- [ ] Create `OCRService` class
- [ ] Implement `__init__()` - initialize Google Vision client
  ```python
  def __init__(self, credentials_path: str | None = None):
      """Use GOOGLE_APPLICATION_CREDENTIALS if no path provided"""
  ```
- [ ] Implement `extract_text()` - main OCR method
  ```python
  async def extract_text(self, image_data: bytes) -> OCRResult:
      """
      Extract text from image bytes.
      Returns OCRResult with text, confidence, language, blocks.
      """
  ```
- [ ] Implement `extract_from_url()` - OCR from public URL
- [ ] Implement `process_pdf()` - handle multi-page PDFs
- [ ] Create `OCRResult` dataclass:
  ```python
  @dataclass
  class OCRResult:
      text: str
      confidence: float
      language: str
      blocks: list[TextBlock]
      error: str | None = None

  @dataclass
  class TextBlock:
      text: str
      confidence: float
      block_type: str  # TEXT, TABLE, PICTURE
      bounding_box: dict | None = None
  ```
- [ ] Add retry logic with exponential backoff
- [ ] Add error handling for API failures

### 5.3.2 Create Mock OCR Service (for testing)
- [ ] Create `MockOCRService` with same interface
- [ ] Return configurable mock results
- [ ] Use in tests and local development without credentials

---

## Phase 5.4: Backend - Note Service

### 5.4.1 Create Note Service (`backend/app/services/note_service.py`)
- [ ] Create `NoteService` class
- [ ] Implement `__init__()` - inject db, storage, ocr, claude services
- [ ] Implement `create_note()`:
  ```python
  async def create_note(
      self,
      student_id: UUID,
      title: str,
      content_type: str,
      file_data: bytes | None = None,
      storage_url: str | None = None,
      subject_id: UUID | None = None,
      tags: list[str] | None = None,
  ) -> Note:
      """Create a new note and trigger OCR if image/PDF"""
  ```
- [ ] Implement `get_note()` - with ownership verification
- [ ] Implement `get_student_notes()` - list with pagination
  ```python
  async def get_student_notes(
      self,
      student_id: UUID,
      subject_id: UUID | None = None,
      search_query: str | None = None,
      offset: int = 0,
      limit: int = 50,
  ) -> tuple[list[Note], int]:
  ```
- [ ] Implement `update_note()` - update metadata
- [ ] Implement `delete_note()` - delete note and file
- [ ] Implement `search_notes()` - full-text search on OCR text
- [ ] Implement `process_ocr()` - trigger OCR processing
  ```python
  async def process_ocr(self, note_id: UUID) -> bool:
      """Fetch image, run OCR, update note. Returns success."""
  ```
- [ ] Implement `align_curriculum()` - AI-assisted tagging
  ```python
  async def align_curriculum(
      self,
      note_id: UUID,
  ) -> list[CurriculumOutcome]:
      """Use Claude to suggest curriculum outcomes"""
  ```
- [ ] Implement `add_curriculum_outcomes()` - link outcomes to note
- [ ] Implement `get_notes_by_outcome()` - find notes for an outcome
- [ ] Add ownership verification on all methods

---

## Phase 5.5: Backend - Pydantic Schemas

### 5.5.1 Create Note Schemas (`backend/app/schemas/note.py`)
- [ ] `NoteCreate` - create note request
  ```python
  class NoteCreate(BaseModel):
      title: str = Field(..., min_length=1, max_length=255)
      subject_id: UUID | None = None
      tags: list[str] | None = None
  ```
- [ ] `NoteUpdate` - update note request
  ```python
  class NoteUpdate(BaseModel):
      title: str | None = None
      subject_id: UUID | None = None
      tags: list[str] | None = None
  ```
- [ ] `NoteResponse` - note details response
  ```python
  class NoteResponse(BaseModel):
      id: UUID
      student_id: UUID
      subject_id: UUID | None
      title: str
      content_type: str
      storage_url: str | None
      download_url: str | None  # Signed URL for display
      thumbnail_url: str | None  # Signed thumbnail URL
      ocr_text: str | None
      ocr_status: str
      curriculum_outcomes: list[UUID] | None
      tags: list[str] | None
      created_at: datetime
      updated_at: datetime
  ```
- [ ] `NoteListResponse` - paginated list
  ```python
  class NoteListResponse(BaseModel):
      notes: list[NoteResponse]
      total: int
      limit: int
      offset: int
  ```
- [ ] `UploadUrlRequest` - request presigned URL
  ```python
  class UploadUrlRequest(BaseModel):
      filename: str
      content_type: str = Field(..., pattern=r"^(image/(jpeg|png|heic)|application/pdf)$")
  ```
- [ ] `UploadUrlResponse` - presigned URL response
  ```python
  class UploadUrlResponse(BaseModel):
      upload_url: str
      fields: dict[str, str]  # Form fields for POST
      storage_key: str
      expires_at: datetime
  ```
- [ ] `OCRStatusResponse` - OCR progress
  ```python
  class OCRStatusResponse(BaseModel):
      status: str  # pending, processing, completed, failed
      text: str | None
      confidence: float | None
      error: str | None
  ```
- [ ] `CurriculumAlignmentResponse` - suggested outcomes
  ```python
  class CurriculumAlignmentResponse(BaseModel):
      suggested_outcomes: list[OutcomeResponse]
      detected_subject: str | None
      confidence: float
  ```

### 5.5.2 Update Schema Exports
- [ ] Add note schemas to `backend/app/schemas/__init__.py`

---

## Phase 5.6: Backend - API Endpoints

### 5.6.1 Create Notes Router (`backend/app/api/v1/endpoints/notes.py`)
- [ ] `POST /api/v1/notes/upload-url` - Get presigned upload URL
  ```python
  @router.post("/upload-url", response_model=UploadUrlResponse)
  async def get_upload_url(
      request: UploadUrlRequest,
      current_user: User = Depends(get_current_user),
      student_id: UUID = Query(...),
  ):
      """Get presigned URL for direct upload to DO Spaces"""
  ```
- [ ] `POST /api/v1/notes` - Create note after upload
  ```python
  @router.post("/", response_model=NoteResponse)
  async def create_note(
      request: NoteCreate,
      storage_key: str = Query(...),
      current_user: User = Depends(get_current_user),
      student_id: UUID = Query(...),
  ):
      """Create note record after successful upload"""
  ```
- [ ] `GET /api/v1/notes` - List notes for student
  ```python
  @router.get("/", response_model=NoteListResponse)
  async def list_notes(
      student_id: UUID = Query(...),
      subject_id: UUID | None = None,
      search: str | None = None,
      offset: int = 0,
      limit: int = 50,
      current_user: User = Depends(get_current_user),
  ):
      """List notes for a student with optional filters"""
  ```
- [ ] `GET /api/v1/notes/{note_id}` - Get note details
- [ ] `PUT /api/v1/notes/{note_id}` - Update note
- [ ] `DELETE /api/v1/notes/{note_id}` - Delete note
- [ ] `POST /api/v1/notes/{note_id}/process-ocr` - Trigger OCR
  ```python
  @router.post("/{note_id}/process-ocr", response_model=OCRStatusResponse)
  async def trigger_ocr(
      note_id: UUID,
      background_tasks: BackgroundTasks,
      current_user: User = Depends(get_current_user),
  ):
      """Trigger OCR processing (async)"""
  ```
- [ ] `GET /api/v1/notes/{note_id}/ocr-status` - Check OCR status
- [ ] `POST /api/v1/notes/{note_id}/align-curriculum` - AI tagging
  ```python
  @router.post("/{note_id}/align-curriculum", response_model=CurriculumAlignmentResponse)
  async def align_curriculum(
      note_id: UUID,
      current_user: User = Depends(get_current_user),
  ):
      """Get AI-suggested curriculum outcomes"""
  ```
- [ ] `PUT /api/v1/notes/{note_id}/outcomes` - Set curriculum outcomes
  ```python
  @router.put("/{note_id}/outcomes")
  async def update_outcomes(
      note_id: UUID,
      outcome_ids: list[UUID],
      current_user: User = Depends(get_current_user),
  ):
      """Update linked curriculum outcomes"""
  ```
- [ ] `GET /api/v1/notes/search` - Full-text search
  ```python
  @router.get("/search", response_model=NoteListResponse)
  async def search_notes(
      query: str = Query(..., min_length=2),
      student_id: UUID = Query(...),
      current_user: User = Depends(get_current_user),
  ):
      """Search notes by title and OCR text"""
  ```

### 5.6.2 Update Router Configuration
- [ ] Add notes router to `backend/app/api/v1/router.py`

---

## Phase 5.7: Frontend - State Management

### 5.7.1 Create Note Store (`frontend/src/stores/noteStore.ts`)
- [ ] Create Zustand store for note state
  ```typescript
  interface NoteState {
    // Upload state
    uploadProgress: number;
    isUploading: boolean;
    uploadError: string | null;

    // Current note being viewed
    currentNote: NoteResponse | null;

    // Filter state
    selectedSubjectId: string | null;
    searchQuery: string;

    // Actions
    setUploadProgress: (progress: number) => void;
    setCurrentNote: (note: NoteResponse | null) => void;
    setFilter: (subjectId: string | null, query: string) => void;
    reset: () => void;
  }
  ```

### 5.7.2 Create Note API Functions (`frontend/src/lib/api/notes.ts`)
- [ ] `getUploadUrl(request: UploadUrlRequest)` - get presigned URL
- [ ] `uploadFile(url: string, fields: object, file: File)` - upload to S3
- [ ] `createNote(request: NoteCreateRequest)` - create note record
- [ ] `getNotes(params: NoteListParams)` - list notes
- [ ] `getNote(noteId: string)` - get note details
- [ ] `updateNote(noteId: string, request: NoteUpdateRequest)` - update
- [ ] `deleteNote(noteId: string)` - delete
- [ ] `triggerOcr(noteId: string)` - start OCR
- [ ] `getOcrStatus(noteId: string)` - check OCR status
- [ ] `alignCurriculum(noteId: string)` - get AI suggestions
- [ ] `updateOutcomes(noteId: string, outcomeIds: string[])` - set outcomes
- [ ] `searchNotes(query: string, studentId: string)` - search

### 5.7.3 Create Note Hooks (`frontend/src/hooks/useNotes.ts`)
- [ ] `useNotes(studentId, params)` - paginated note list
- [ ] `useNote(noteId)` - single note details
- [ ] `useNoteSearch(query, studentId)` - search results
- [ ] `useUploadNote()` - upload mutation with progress
- [ ] `useCreateNote()` - create note mutation
- [ ] `useUpdateNote()` - update mutation
- [ ] `useDeleteNote()` - delete mutation
- [ ] `useTriggerOcr()` - trigger OCR mutation
- [ ] `useAlignCurriculum()` - AI alignment mutation
- [ ] `useUpdateOutcomes()` - update outcomes mutation

---

## Phase 5.8: Frontend - Components

### 5.8.1 Note Upload Component (`frontend/src/features/notes/NoteUpload.tsx`)
- [ ] File picker with drag & drop
- [ ] File type validation
- [ ] File size validation (10MB max)
- [ ] Image preview before upload
- [ ] Upload progress indicator
- [ ] Error display
- [ ] Title input field
- [ ] Subject selector (optional)
- [ ] Tags input (optional)
- [ ] Submit button

### 5.8.2 Note List Component (`frontend/src/features/notes/NoteList.tsx`)
- [ ] Grid layout of NoteCards
- [ ] Loading skeleton
- [ ] Empty state
- [ ] Pagination / infinite scroll
- [ ] Filter by subject
- [ ] Sort by date

### 5.8.3 Note Card Component (`frontend/src/features/notes/NoteCard.tsx`)
- [ ] Thumbnail image
- [ ] Title display
- [ ] Subject badge
- [ ] OCR status indicator
- [ ] Date created
- [ ] Click to view

### 5.8.4 Note Viewer Component (`frontend/src/features/notes/NoteViewer.tsx`)
- [ ] Full-size image display with zoom
- [ ] OCR text panel (collapsible)
- [ ] Curriculum tags display
- [ ] Edit button
- [ ] Delete button
- [ ] AI alignment button

### 5.8.5 Note Search Component (`frontend/src/features/notes/NoteSearch.tsx`)
- [ ] Search input with debounce
- [ ] Search results list
- [ ] Highlight matching text
- [ ] Clear search button

### 5.8.6 Curriculum Tagger Component (`frontend/src/features/notes/CurriculumTagger.tsx`)
- [ ] AI-suggested outcomes (selectable)
- [ ] Manual outcome search
- [ ] Selected outcomes display
- [ ] Save button

### 5.8.7 OCR Status Component (`frontend/src/features/notes/OCRStatus.tsx`)
- [ ] Status badge (pending, processing, completed, failed)
- [ ] Retry button for failed
- [ ] Processing animation

### 5.8.8 Index Export (`frontend/src/features/notes/index.ts`)
- [ ] Export all components

---

## Phase 5.9: Frontend - Pages & Routes

### 5.9.1 Notes Page (`frontend/src/pages/NotesPage.tsx`)
- [ ] Subject filter tabs
- [ ] Search bar
- [ ] Upload button
- [ ] Note grid
- [ ] Upload modal
- [ ] View modal

### 5.9.2 Update App Router
- [ ] Add `/notes` route to `App.tsx`
- [ ] Add `/notes/:noteId` route for direct note view
- [ ] Add navigation link

---

## Phase 5.10: Testing

### 5.10.1 Backend Tests
- [ ] `test_storage_service.py`
  - Mock boto3 client
  - Test presigned URL generation
  - Test upload/download
  - Test file deletion
- [ ] `test_ocr_service.py`
  - Mock Vision API
  - Test text extraction
  - Test error handling
  - Test confidence calculation
- [ ] `test_image_processor.py`
  - Test image validation
  - Test resizing
  - Test thumbnail generation
- [ ] `test_note_service.py`
  - Test CRUD operations
  - Test ownership verification
  - Test search functionality
  - Test OCR integration
- [ ] `test_notes_endpoints.py`
  - Test all API endpoints
  - Test authorization
  - Test validation

### 5.10.2 Frontend Tests
- [ ] `NoteUpload.test.tsx`
- [ ] `NoteList.test.tsx`
- [ ] `NoteCard.test.tsx`
- [ ] `NoteViewer.test.tsx`
- [ ] `useNotes.test.ts`
- [ ] `noteStore.test.ts`

### 5.10.3 E2E Tests (Playwright)
- [ ] Upload note flow
- [ ] View note flow
- [ ] Search notes flow
- [ ] Delete note flow

---

## Phase 5.11: Quality Assurance

### 5.11.1 Security Checklist
- [ ] File type whitelist enforced
- [ ] File size limits enforced
- [ ] Signed URLs expire
- [ ] Student ownership verified on all operations
- [ ] Parent access limited to their children
- [ ] No PII in storage keys or URLs
- [ ] Rate limiting on upload endpoint

### 5.11.2 Performance Checklist
- [ ] Thumbnail generation optimized
- [ ] Pagination working
- [ ] Search using database indexes
- [ ] Image loading with lazy loading

### 5.11.3 Run QA Review
- [ ] Run `subject-config-checker` skill
- [ ] Manual security audit
- [ ] Test with real images

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| OCR accuracy issues | Medium | Medium | Show confidence, allow corrections |
| Large file uploads fail | Medium | Low | Chunked uploads, retry logic |
| Storage costs exceed budget | Low | Low | File size limits, cleanup old files |
| Vision API rate limits | Medium | Low | Retry with backoff, queue processing |

---

## Files to Create

### Backend (New Files)
```
backend/app/services/storage_service.py
backend/app/services/ocr_service.py
backend/app/services/image_processor.py
backend/app/services/note_service.py
backend/app/schemas/note.py
backend/app/api/v1/endpoints/notes.py
backend/tests/services/test_storage_service.py
backend/tests/services/test_ocr_service.py
backend/tests/services/test_image_processor.py
backend/tests/services/test_note_service.py
backend/tests/api/test_notes.py
```

### Frontend (New Files)
```
frontend/src/features/notes/NoteUpload.tsx
frontend/src/features/notes/NoteList.tsx
frontend/src/features/notes/NoteCard.tsx
frontend/src/features/notes/NoteViewer.tsx
frontend/src/features/notes/NoteSearch.tsx
frontend/src/features/notes/CurriculumTagger.tsx
frontend/src/features/notes/OCRStatus.tsx
frontend/src/features/notes/index.ts
frontend/src/stores/noteStore.ts
frontend/src/hooks/useNotes.ts
frontend/src/lib/api/notes.ts
frontend/src/pages/NotesPage.tsx
```

### Modified Files
```
backend/requirements.txt
backend/app/core/config.py
backend/app/schemas/__init__.py
backend/app/api/v1/router.py
frontend/src/App.tsx
frontend/src/lib/api/index.ts
frontend/src/hooks/index.ts
```

---

## Success Criteria

Phase 5 is complete when:

1. ✅ Students can upload images of notes
2. ✅ Files stored securely on Digital Ocean Spaces
3. ✅ OCR extracts text from uploaded images
4. ✅ Notes are searchable by title and OCR text
5. ✅ Notes can be tagged with curriculum outcomes
6. ✅ AI suggests relevant curriculum tags
7. ✅ Parents can view their children's notes
8. ✅ 80%+ test coverage on new code
9. ✅ Zero TypeScript/Python type errors
10. ✅ Security audit passes
