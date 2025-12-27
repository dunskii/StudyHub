# Study: Phase 5 - Notes & OCR

## Overview

Phase 5 implements the note management system with OCR capabilities. Students can upload photos of handwritten notes, textbook pages, or whiteboard content. The system uses Google Cloud Vision API to extract text, which can then be used for:
- Searchable note archives
- Automatic curriculum tagging via AI
- Flashcard generation (Phase 6)
- Context for AI tutoring sessions

## Existing Infrastructure

### Database (Already Complete)
The `notes` table already exists with the following schema:

```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id),
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL,  -- 'image', 'pdf', 'text'
    storage_url TEXT,                    -- DO Spaces URL
    ocr_text TEXT,                       -- Extracted text
    ocr_status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, completed, failed
    curriculum_outcomes UUID[],          -- Linked outcome IDs
    tags VARCHAR[],                      -- User-defined tags
    note_metadata JSONB DEFAULT '{}',    -- Confidence, language, etc.
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX ix_notes_student_id ON notes(student_id);
CREATE INDEX ix_notes_subject_id ON notes(subject_id);
CREATE INDEX ix_notes_ocr_status ON notes(ocr_status);
CREATE INDEX ix_notes_created_at ON notes(created_at);
```

### Model (Already Complete)
`backend/app/models/note.py` - SQLAlchemy model exists with proper relationships.

## Key Requirements

### 1. File Storage (Digital Ocean Spaces)
- S3-compatible storage for uploaded images/PDFs
- Secure URL generation with signed URLs
- Image resizing/optimization before upload
- Max file size: 10MB
- Supported formats: JPEG, PNG, PDF, HEIC

### 2. OCR Service (Google Cloud Vision)
- Document text detection (better for handwriting)
- Confidence scores per block
- Language detection
- Cost: ~$1.50 per 1000 images
- Async processing for large files

### 3. Curriculum Alignment (Claude AI)
- Use Haiku for cost efficiency
- Detect subject and outcomes from extracted text
- Suggest curriculum tags
- Optional: generate summary

### 4. Security Considerations
- Student can only access their own notes
- Parent can view their children's notes
- File validation (MIME type, size, malware scan)
- No PII in metadata/URLs
- Signed URLs expire after reasonable time (1 hour)

## API Endpoints Needed

### Note CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/notes` | Create note with file upload |
| GET | `/api/v1/notes` | List notes for student |
| GET | `/api/v1/notes/{id}` | Get note details |
| PUT | `/api/v1/notes/{id}` | Update note metadata |
| DELETE | `/api/v1/notes/{id}` | Delete note and file |

### OCR & Processing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/notes/{id}/ocr` | Trigger OCR processing |
| GET | `/api/v1/notes/{id}/ocr-status` | Check OCR status |
| POST | `/api/v1/notes/{id}/align-curriculum` | AI-assisted tagging |

### Bulk Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notes/search` | Full-text search in OCR text |
| GET | `/api/v1/notes/by-subject/{subject_id}` | Notes by subject |
| GET | `/api/v1/notes/by-outcome/{outcome_id}` | Notes by outcome |

## Frontend Components Needed

### Note Management
1. **NoteUpload** - Camera capture / file picker
   - Camera button for mobile
   - Drag & drop for desktop
   - Progress indicator during upload
   - Preview before submit

2. **NoteList** - Grid/list of notes
   - Thumbnail view
   - Subject filter
   - Date sort
   - Search by title/content
   - OCR status badges

3. **NoteViewer** - View single note
   - Image viewer with zoom/pan
   - OCR text display (side-by-side or overlay)
   - Curriculum tags display
   - Edit metadata

4. **NoteAnnotation** - Add highlights/corrections
   - Fix OCR errors
   - Add personal notes
   - Highlight key concepts
   - Confidence indicators

5. **CurriculumTagger** - Tag notes with outcomes
   - AI-suggested tags
   - Manual outcome selection
   - Subject assignment

## Technical Approach

### File Upload Flow
```
1. User selects/captures image
2. Frontend validates file (type, size)
3. Frontend requests presigned upload URL from backend
4. Frontend uploads directly to DO Spaces
5. Frontend notifies backend of successful upload
6. Backend creates Note record with pending OCR status
7. Backend triggers async OCR job
8. OCR completes, updates note with extracted text
9. Optional: AI alignment suggests curriculum tags
```

### OCR Processing Flow
```
1. Fetch image from DO Spaces
2. Send to Google Cloud Vision API
3. Parse response for text blocks
4. Calculate confidence scores
5. Detect language
6. Store in note.ocr_text
7. Store metadata (confidence, blocks, language)
8. Update status to 'completed' or 'failed'
```

### Curriculum Alignment Flow
```
1. Take OCR text
2. Send to Claude Haiku with subject context
3. Claude identifies relevant outcomes
4. Return suggested outcome codes
5. User confirms/modifies suggestions
6. Store linked outcomes in note
```

## Dependencies

### Python Packages
```
google-cloud-vision>=3.0.0  # OCR
boto3>=1.34.0               # S3-compatible storage
Pillow>=10.0.0              # Image processing
python-magic>=0.4.27        # MIME type detection
```

### Frontend Packages
```
react-dropzone              # Drag & drop upload
react-webcam               # Camera capture (optional)
@tanstack/react-query      # Already installed
```

## Cost Considerations

| Service | Cost | Monthly Estimate (100 users) |
|---------|------|------------------------------|
| Google Vision | $1.50/1000 images | ~$15 |
| DO Spaces | $5/250GB + $0.01/GB transfer | ~$7 |
| Claude Haiku (alignment) | $0.80/$4.00 per 1M tokens | ~$5 |
| **Total** | | **~$27/month** |

## Testing Strategy

### Backend Tests
- Unit tests for OCR service (mock Vision API)
- Unit tests for storage service (mock S3)
- Integration tests for upload flow
- API endpoint tests with auth

### Frontend Tests
- Component tests for upload UI
- Hook tests for upload state
- E2E test for complete upload flow

## Security Checklist

- [ ] File type validation (whitelist only)
- [ ] File size limits enforced
- [ ] Signed URLs with expiration
- [ ] Student ownership verification
- [ ] Parent access for their children only
- [ ] No sensitive data in URLs
- [ ] OCR text indexed but not exposed publicly
- [ ] Rate limiting on upload endpoint

## Open Questions

1. **Background Processing**: Use Celery/Redis for async OCR, or simple background tasks?
   - *Recommendation*: Start with FastAPI BackgroundTasks, migrate to Celery if needed

2. **Image Optimization**: Resize images before OCR?
   - *Recommendation*: Yes, max 2048px on longest side for OCR, thumbnail for display

3. **PDF Handling**: Process all pages or first page only?
   - *Recommendation*: Process all pages, concatenate text

4. **Offline Support**: Allow offline note capture?
   - *Recommendation*: Defer to Phase 9 (PWA)

5. **Camera Capture**: Use browser camera API or just file picker?
   - *Recommendation*: File picker first, camera as enhancement

## Files to Create

### Backend
```
backend/app/services/ocr_service.py
backend/app/services/storage_service.py
backend/app/services/note_service.py
backend/app/schemas/note.py
backend/app/api/v1/endpoints/notes.py
backend/tests/services/test_ocr_service.py
backend/tests/services/test_storage_service.py
backend/tests/services/test_note_service.py
backend/tests/api/test_notes.py
```

### Frontend
```
frontend/src/features/notes/NoteUpload.tsx
frontend/src/features/notes/NoteList.tsx
frontend/src/features/notes/NoteCard.tsx
frontend/src/features/notes/NoteViewer.tsx
frontend/src/features/notes/NoteSearch.tsx
frontend/src/features/notes/CurriculumTagger.tsx
frontend/src/features/notes/index.ts
frontend/src/stores/noteStore.ts
frontend/src/hooks/useNotes.ts
frontend/src/lib/api/notes.ts
frontend/src/pages/NotesPage.tsx
```

## Success Criteria

Phase 5 is complete when:
1. Students can upload images of notes
2. OCR extracts text from uploaded images
3. Notes are searchable by title and OCR text
4. Notes can be tagged with curriculum outcomes
5. AI suggests relevant curriculum tags
6. Parents can view their children's notes
7. All notes stored securely on DO Spaces
8. 80%+ test coverage on new code
9. Zero TypeScript/Python type errors
