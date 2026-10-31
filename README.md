# KWIZZ Radio - Ottawa's Premier Reggae & Dancehall Online Station

> **Version:** 1.0.0  
> **Location:** Ottawa, Ontario, Canada  
> **Stream Format:** 128 kbps Stereo MP3 (Live365 licensed webcaster)  
> **License:** All rights reserved by KWIZZ Radio.

---

## 📻 Overview

KWIZZ Radio is a professional, high-performance web radio application dedicated to reggae, dancehall, roots culture, and Caribbean DJ programming in Canada's national capital region and worldwide.

Built on an uninterrupted persistent audio player architecture, listeners can freely navigate schedules, events, DJ profiles, and send song requests without ever interrupting the live audio stream.

---

## 🚀 Key Features

- **Persistent Live Player:** Uninterrupted client-side PJAX navigation ensures continuous audio playback across all pages.
- **Real-Time Now Playing:** Server-Sent Events (SSE) push track titles, artists, and album artwork from Live365 in near real time.
- **Smart Battery & Data Efficiency:** Pauses Live365 polling when no clients are listening and pauses UI rendering when browser tabs are hidden.
- **Auto-Reconnect with Exponential Backoff:** Automatically retries dropped network connections (1s, 2s, 5s, 10s) with clear status UI indicators.
- **Media Session API:** Native lock-screen, Bluetooth, and headphone playback controls with full album artwork.
- **Dynamic Weekly Schedule:** Interactive 7-day schedule with automatic translation to the listener's local timezone (defaulting to Ottawa ET).
- **Interactive DJ Roster & Events:** Biographies, hosted shows, and community event listings.
- **Spam-Protected Song Requests & Contact Forms:** Multi-layered spam defense (honeypot, timing validation, optional captcha) with instant email dispatch to studio staff.
- **Secure Staff Admin Portal (`/admin`):** Role-based access control (`ADMIN`, `EDITOR`, `DJ`), Argon2id password hashing, secure session cookies, CSRF protection, optional TOTP 2FA, and tamper-evident audit logs.
- **Non-Interrupting Sponsor Slots:** Community partner banners that never block or disrupt live audio.
- **Progressive Web App (PWA) & Web Push:** Installable home screen app, service worker for static caching (never caches live streams), and opt-in VAPID notifications.
- **Legal Compliance:** Strict adherence to Canadian PIPEDA, CASL, and international GDPR requirements.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (v20+ LTS) |
| **Backend Framework** | Express.js |
| **Templating & Styling** | EJS Templates, Tailwind CSS, Reggae Tricolor Theme |
| **Database & Cloud Storage** | Google Firebase (Cloud Firestore & Auth) or PostgreSQL with Prisma |
| **Caching & Rate Limiting**| Redis 7 (with automatic in-memory fallback) |
| **Real-Time Updates** | Server-Sent Events (SSE) |
| **Authentication & Security** | Argon2id, Session Cookies, CSRF, Helmet CSP, Pino Logger |
| **Containerization** | Docker, Docker Compose |
| **Testing** | Jest, Supertest (API), Playwright (E2E) |

---

## ⚙️ Quickstart & Local Setup

### 1. Prerequisites
- Node.js (v20 or v22 LTS)
- npm (v10+)
- Docker & Docker Compose (optional, for local PostgreSQL and Redis containers)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/kwizzradio/kwizz-radio.git
cd kwizz-radio

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Generate Prisma Client
npx prisma generate
```

### 3. Database Options (Firebase Firestore vs. Docker PostgreSQL)

#### Option A: Running with Firebase (Default & Serverless)
1. In `.env`, set:
   ```env
   DATABASE_DRIVER=firebase
   FIREBASE_PROJECT_ID=kwizz-radio-ottawa
   ```
2. Place your `firebase-service-account.json` in the root folder (see [FIREBASE_SETUP.md](file:///c:/Users/Dell/Desktop/design/FIREBASE_SETUP.md)).
3. Seed sample DJs, schedule, and shows into Firestore:
   ```bash
   npm run firebase:seed
   ```
4. Start the app:
   ```bash
   npm run dev
   ```

#### Option B: Running with Docker Compose (PostgreSQL & Redis)
```bash
# Start PostgreSQL, Redis, and KWIZZ Radio application
docker-compose up --build
```
The site will be live at `http://localhost:3000`.

### 4. Running Standalone in Development
```bash
# Start the development server with live reload
npm run dev

# Or start the server directly
npm start
```
*Note: If PostgreSQL or Redis are not running locally, the application automatically activates its resilient in-memory data and cache fallbacks.*

---

## 🧪 Testing

The test suite covers unit, integration, and end-to-end user flows:

```bash
# Run all unit and integration tests
npm test

# Run Playwright End-to-End tests
npx playwright test
```

---

## 🔐 Default Admin Credentials (Seed)

| Role | Email | Password |
|---|---|---|
| **Station Admin** | `admin@kwizzradio.ca` | `KwizzPass2026!` |
| **Content Editor** | `editor@kwizzradio.ca` | `KwizzPass2026!` |
| **Resident DJ** | `djroots@kwizzradio.ca` | `KwizzPass2026!` |

---

## 📁 Project Structure

```
kwizz-radio/
├── prisma/             # Schema definition & database seeds
├── public/             # CSS, JS engines, PWA manifest, service worker
│   ├── css/            # True-black reggae theme styles
│   ├── js/             # Player, navigation, SSE, and forms engines
│   └── sw.js           # Static service worker (never caches audio)
├── src/
│   ├── config/         # Environment, Prisma, and Redis configurations
│   ├── controllers/    # Public, API, and Admin route controllers
│   ├── middleware/     # Security (Helmet, CSP), CSRF, Auth, Rate Limiter
│   ├── routes/         # Express router aggregator
│   ├── services/       # Live365 poller, Web Push, and Nodemailer mailer
│   └── utils/          # Logger (Pino) and Timezone utilities
├── views/              # EJS templates (layouts, pages, partials, admin)
├── tests/              # Jest unit/integration & Playwright e2e suites
├── Dockerfile          # Multi-stage production container
└── docker-compose.yml  # Local stack orchestration
```

