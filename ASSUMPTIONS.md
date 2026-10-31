# KWIZZ Radio - Architectural Assumptions & Decisions

This document records the sensible assumptions and architectural decisions made for the KWIZZ Radio website implementation, in accordance with the Product Requirements Document (PRD).

---

### 1. Live365 Integration & Stream Configuration
- **Stream Audio**: The stream URL is stored server-side in the `Setting` table (and `.env` as default fallback `STREAM_URL`). The frontend receives the configured audio stream URL from the `/api/config` or `/api/now-playing` endpoint. No stream proxying, transcoding, or rewriting is performed.
- **Live365 Metadata API**: Live365 provides station status and track history via their public/partner JSON endpoints. We configure `LIVE365_STATION_ID` in `.env`. When running in development/test or if Live365 is unreachable, the backend provides realistic mock reggae/dancehall metadata to ensure the station UI remains fully functional and testable without live credentials.
- **Active Client Tracking**: Server-Sent Events (SSE) connections to `/api/now-playing/stream` track active listener count. Polling of Live365 runs every 10–15 seconds when active clients exist; polling pauses automatically when active clients reach 0 and tab visibility state is inactive.

### 2. Database & ORM (PostgreSQL + Prisma)
- **Production / Dev**: PostgreSQL is the primary database, defined in `prisma/schema.prisma` with `provider = "postgresql"`. `docker-compose.yml` provides a pre-configured PostgreSQL 16 container.
- **Resilient Database Layer**: For environments where PostgreSQL is not actively running (such as unit test runs or lightweight dev), a Prisma client wrapper / test mock ensures test suites run deterministically.
- **Prisma Schema Models**: Implements all 13 required models: `User`, `Show`, `DJ`, `ScheduleSlot`, `Event`, `Announcement`, `SongRequest`, `ContactMessage`, `PushSubscription`, `Sponsor`, `SponsorStat`, `Setting`, and `AuditLog`.

### 3. Redis Caching & Rate Limiting Fallback
- **Redis Connection**: Connects to `REDIS_URL` (default `redis://localhost:6379`).
- **Resilient In-Memory Fallback**: If Redis is temporarily unavailable or during quick test execution without a Redis daemon, the Redis service automatically falls back to an in-memory TTL cache with identical async methods (`get`, `set`, `del`, `incr`, `expire`). This prevents server crashes while honoring rate limits and caching policies.
- **Rate Limiting**: Applied via `express-rate-limit` (and Redis store when connected) with strict limits on song requests, contact submissions, and admin login attempts.

### 4. Audio Persistence & Seamless Navigation
- **Persistent Player**: Audio playback must never interrupt when users navigate between pages. We implement a lightweight, robust client-side PJAX / dynamic page navigation script (`/public/js/navigation.js`). It intercepts internal link clicks, updates browser history via `history.pushState`, swaps `#main-content`, updates meta tags and page titles, and re-executes page-specific scripts while the persistent bottom audio player (`#global-player`) and its `<audio>` element remain completely mounted and playing.

### 5. Timezone & Schedule
- **Station Base Time**: The station operates out of Ottawa, Canada. All schedule slots are stored in standard UTC/24h format and referenced against Ottawa Eastern Time (`America/Toronto`).
- **Visitor Timezone Display**: The client-side schedule script detects the visitor's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` and translates broadcast times into the visitor's local time, with a visible badge indicating both Ottawa ET and local time.

### 6. Spam Protection & Security
- **Spam Defense**: Contact and song request forms implement a multi-layered spam defense:
  1. Honeypot field (hidden from screen readers and real users, triggers instant rejection if filled).
  2. Timestamp verification (rejects automated submissions faster than 2 seconds).
  3. Configurable captcha token validation (supporting hCaptcha / reCAPTCHA keys in `.env`). In development mode without API keys configured, passes automatically if honeypot and timing checks pass.
- **Password Security**: Argon2id hashing for admin/DJ passwords.
- **Role-Based Access Control**: `ADMIN`, `EDITOR`, `DJ` roles. Admin has full CRUD; Editor has content CRUD; DJ can view/update their schedule slots and song requests.
- **Session & CSRF**: Secure, HttpOnly, SameSite cookies with CSRF token validation on state-modifying requests.

### 7. Email & Notifications
- **SMTP Service**: Configured via Nodemailer. Uses environment variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_EMAIL`. In development or when SMTP credentials are not supplied, emails are logged to the console using a mock transport.
- **Web Push**: Implemented via `web-push` standard using VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Auto-generates development keys if not explicitly defined.

### 8. Compliance & Legal
- **Cookie Consent**: Compliant banner with PIPEDA, CASL, and GDPR guidelines, allowing visitors to accept or customize non-essential analytics cookies, stored in localStorage.
- **CASL Consent**: Song requests and contact forms explicitly separate optional newsletter/marketing consent checkboxes from required message submission.

### 9. Color Palette & Visual Identity (WCAG 2.1 AA)
- **Base Surfaces**: True-black (`#050507`) void background with soft translucent glassmorphism cards (`--bg-card: #121217`, `--border-color: rgba(255,255,255,0.08)`), replacing harsh pure-black-to-neon jumps.
- **Caribbean Warmth**: Transitioned harsh neon yellows to warm sun-drenched Jamaican Amber Gold (`#F59E0B` / `#FBBF24`), providing high-contrast readable accents, gold gradient buttons (`.btn-primary-gold`), and focused accessibility rings that meet and exceed WCAG 2.1 AA 4.5:1 text and 3:1 graphical element ratios.
- **Reggae Harmony**: Lush emerald green (`#10B981` / `#34D399`) for live broadcasts and online stream cues, paired with deep crimson ruby (`#EF4444` / `#F87171`) for high-priority live indicators.
- **Persistent Player & Typography**: Elevated sticky bottom player with frosted glass backdrop blur, amber track info, smooth responsive equalizer, and consistent high-legibility typographic hierarchies.

