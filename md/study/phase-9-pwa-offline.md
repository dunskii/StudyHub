# Study: Phase 9 - PWA & Offline Support

## Summary

Phase 9 transforms StudyHub into a Progressive Web App (PWA) with full offline support, enabling students to continue studying without internet connectivity. The project already has Vite PWA Plugin (v0.19.2) and Workbox installed, providing a solid foundation. Main work involves asset generation, IndexedDB implementation, background sync, and push notifications.

**Current Status**: NOT STARTED (0%)
**Previous Phase**: Phase 8 - Gamification (100% complete)
**Estimated Duration**: 2 weeks

---

## Key Requirements

### From TASKLIST.md

#### 9.1 PWA Setup
- [ ] Service worker configuration
- [ ] Web manifest
- [ ] App icons (all sizes)
- [ ] Splash screens

#### 9.2 Offline Support
- [ ] IndexedDB setup (idb library)
- [ ] Offline curriculum cache
- [ ] Background sync for AI interactions
- [ ] Offline indicator

#### 9.3 Push Notifications
- [ ] Push notification setup
- [ ] Study reminders
- [ ] Achievement notifications

#### 9.4 Launch Preparation
- [ ] Comprehensive testing (all flows)
- [ ] Security audit (OWASP Top 10)
- [ ] Privacy compliance review (Australian Privacy Act)
- [ ] Performance audit (Lighthouse 90+)
- [ ] Documentation review
- [ ] Beta deployment
- [ ] Beta testing with real users
- [ ] Bug fixes from beta
- [ ] Production deployment
- [ ] Monitoring setup (Sentry, uptime)

---

## Existing Patterns & Setup

### Already in Place

| Component | Version | Status |
|-----------|---------|--------|
| vite-plugin-pwa | 0.19.2 | Installed |
| Workbox | 7.0 (via plugin) | Installed |
| Manifest config | Basic | In vite.config.ts |
| Service Worker | Auto-generated | registerType: 'autoUpdate' |

### vite.config.ts Current Configuration

```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
  manifest: {
    name: 'StudyHub',
    short_name: 'StudyHub',
    description: 'AI-powered study assistant',
    theme_color: '#3b82f6',
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
})
```

### Missing Implementation

1. **Public Assets** - No icon files exist in `frontend/public/`
2. **HTML Meta Tags** - Missing PWA meta tags in index.html
3. **IndexedDB** - No offline storage implementation
4. **Offline UI** - No offline indicator or fallback pages
5. **Push Notifications** - No push subscription handling
6. **Custom Caching** - No API response caching strategy

---

## Technical Considerations

### IndexedDB Schema

```typescript
// Proposed offline storage structure
{
  frameworks: {
    keyPath: 'id',
    indexes: ['code', 'is_active']
  },
  subjects: {
    keyPath: 'id',
    indexes: ['framework_id', 'code']
  },
  outcomes: {
    keyPath: 'id',
    indexes: ['framework_id', 'subject_id', 'stage', 'code']
  },
  flashcards: {
    keyPath: 'id',
    indexes: ['student_id', 'subject_id', 'due_date']
  },
  pending_sync: {
    keyPath: 'id',
    indexes: ['type', 'created_at', 'synced']
  },
  metadata: {
    keyPath: 'key'  // For cache timestamps
  }
}
```

### Caching Strategy

| Resource Type | Strategy | Max Age |
|---------------|----------|---------|
| Static assets (JS, CSS) | Cache-first | Long-term |
| Curriculum data | Network-first with cache fallback | 30 days |
| API responses | Network-first, queue if offline | 24 hours |
| Images/thumbnails | Cache-first | 7 days |

### Service Worker Workbox Configuration

```typescript
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.studyhub\..*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 86400
        }
      }
    }
  ]
}
```

### Background Sync Queue

```typescript
interface PendingOperation {
  id: string
  type: 'answer_flashcard' | 'create_session' | 'update_goal'
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH'
  payload: any
  created_at: Date
  synced: boolean
  retry_count: number
}
```

---

## Security/Privacy Considerations

### Data to Cache (Safe)
- Curriculum outcomes (public data)
- Subject information
- Flashcard prompts and answers (student's own)
- Achievement definitions
- Session metadata (not transcripts)

### Data NEVER to Cache
- AI conversation transcripts
- User PII (email, phone)
- Parent personal data
- Student personal notes content
- Auth tokens

### Critical Requirements
1. IndexedDB is NOT encrypted - only cache non-sensitive data
2. Service workers require HTTPS (except localhost)
3. All curriculum cache must be keyed by framework_id
4. Push notifications must not leak student identity
5. Verify student ownership before accessing cached data

---

## Dependencies

### Already Installed
```json
{
  "vite-plugin-pwa": "^0.19.2",
  "@tanstack/react-query": "^5.17.19",
  "zustand": "^4.5.1"
}
```

### Need to Install
```json
{
  "idb": "^8.0.0"  // Lightweight IndexedDB wrapper
}
```

### Browser API Support
| API | Support | Fallback |
|-----|---------|----------|
| Service Workers | 95%+ | Graceful degradation |
| IndexedDB | 98%+ | Online-only mode |
| Web App Manifest | 94%+ | Standard web app |
| Background Sync | 79% | Manual sync queue |
| Web Push | 85% | In-app notifications |

---

## Implementation Priorities

### Week 1: Foundation

**Days 1-2: PWA Setup**
- Generate icon assets (192x192, 512x512, maskable variants)
- Add HTML meta tags to index.html
- Complete manifest.json configuration
- Add splash screen configurations
- Verify PWA installation works

**Days 3-4: IndexedDB Infrastructure**
- Install `idb` library
- Create offline database module with schema
- Create data synchronization service
- Add useOnlineStatus hook

**Days 5-7: Offline Curriculum Caching**
- Implement curriculum sync to IndexedDB on app load
- Create offline curriculum service
- Add offline indicator component
- Framework-filtered caching

### Week 2: Advanced Features

**Days 8-10: Background Sync**
- Implement pending operation queue
- Add background sync for flashcard answers
- Create offline form handling
- Add sync status indicator

**Days 11-12: Push Notifications**
- Implement push subscription endpoint (backend)
- Create notification permission request UI
- Implement study reminder notifications
- Add achievement notification handler

**Days 13-14: Testing & Hardening**
- E2E tests for offline functionality
- Security audit for cached data
- Performance testing
- Privacy compliance check
- Lighthouse audit (target: 90+)

---

## Integration Points

### Existing Systems to Extend

| System | Location | Extension Needed |
|--------|----------|------------------|
| API Client | `lib/api/client.ts` | Offline queue, retry |
| Auth Store | `stores/authStore.ts` | Offline state |
| Notification Service | `backend/.../notification_service.py` | Web Push |
| React Query | Hooks | Offline-first strategy |
| Error Boundary | `components/ui/ErrorBoundary.tsx` | Offline errors |

### Phase 7 Notification Integration
- `NotificationService` already exists
- `NotificationPreference` model for per-user settings
- Parent notification endpoints available

---

## Required Assets

### Icon Generation List
| File | Size | Purpose |
|------|------|---------|
| favicon.ico | 32x32 | Browser tab |
| apple-touch-icon.png | 180x180 | iOS home screen |
| pwa-192x192.png | 192x192 | Android standard |
| pwa-512x512.png | 512x512 | Android splash |
| pwa-maskable-192x192.png | 192x192 | Android adaptive |
| pwa-maskable-512x512.png | 512x512 | Android adaptive |
| mask-icon.svg | Scalable | Safari pinned tab |

### HTML Meta Tags Needed
```html
<meta name="theme-color" content="#3b82f6">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="StudyHub">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

---

## Open Questions

1. **Push Notification Backend**: Web Push API or simpler SSE approach?
2. **Offline Scope**: All curriculum frameworks or NSW only initially?
3. **IndexedDB Size Limit**: What's acceptable? (~50MB available per origin)
4. **Sync Strategy**: Auto-sync vs manual sync for pending operations?
5. **Testing Approach**: Chrome DevTools simulation or real device testing?
6. **Performance Targets**: Max cache size? Acceptable SW load time?

---

## Security Audit Checklist (Phase 9 QA)

- [ ] No PII cached in IndexedDB or Service Worker cache
- [ ] All curriculum cache keyed by framework_id
- [ ] Service worker only serves over HTTPS + localhost
- [ ] Pending sync queue contains IDs only, not sensitive data
- [ ] Push notifications don't leak student identity
- [ ] Offline fallback page is accessible
- [ ] Cache expiry/versioning prevents stale data
- [ ] No XSS vulnerabilities in offline pages
- [ ] Service worker doesn't cache auth tokens

---

## Sources Referenced

- `TASKLIST.md` - Phase 9 requirements
- `PROGRESS.md` - Current project status
- `CLAUDE.md` - Technology stack (Vite PWA Plugin, Workbox 7.0)
- `frontend/vite.config.ts` - Existing PWA configuration
- `frontend/package.json` - Installed dependencies
- `frontend/index.html` - Current HTML structure
- `frontend/public/` - Empty, needs assets
- `backend/app/services/notification_service.py` - Existing notification system
- `Complete_Development_Plan.md` - Technical specifications

---

## Next Steps

1. **Immediate**: Generate PWA icon assets
2. **Setup**: Add HTML meta tags, complete manifest
3. **Core**: Install idb, create offline database module
4. **Build**: Implement offline curriculum caching
5. **Enhance**: Add background sync and push notifications
6. **Validate**: Security audit, Lighthouse testing
