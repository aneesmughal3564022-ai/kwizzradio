# KWIZZ Radio - Firebase Backend Setup Guide

KWIZZ Radio supports **Google Firebase (Cloud Firestore & Firebase Auth)** as its backend database and service layer.

---

## 1. Create a Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or create a new project named `kwizz-radio-ottawa`).
3. Follow the prompts to finish project creation.

---

## 2. Enable Cloud Firestore
1. In the left navigation menu, go to **Build** > **Firestore Database**.
2. Click **Create database**.
3. Choose your preferred location (e.g. `nam5 (us-central)` or closest to Ottawa / Canada).
4. Select **Start in test mode** for development, then click **Create**.

---

## 3. Generate Service Account Key (JSON)
1. In the Firebase Console, click the **Gear Icon** (⚙️) next to *Project Overview* and select **Project settings**.
2. Go to the **Service accounts** tab.
3. Ensure **Node.js** is selected.
4. Click **Generate new private key**, then click **Generate key** in the confirmation dialog.
5. A JSON file will be downloaded to your computer.
6. Rename this file to:
   ```
   firebase-service-account.json
   ```
7. Place it directly in the root directory of this project:
   ```
   c:\Users\Dell\Desktop\design\firebase-service-account.json
   ```

*(Note: `firebase-service-account.json` is already included in `.gitignore` to protect your secrets from being committed to Git).*

---

## 4. Seed Sample Station Data to Firestore
Once your service account JSON is placed in the project root, populate all Ottawa DJs, shows, weekly schedule, events, announcements, and settings into your live Firestore database:

```powershell
npm run firebase:seed
```

You will see:
```
INFO: Starting Firebase Firestore seed for project: kwizz-radio-ottawa...
INFO: Seeding records into Firestore collection 'djs'...
INFO: Seeding records into Firestore collection 'shows'...
INFO: Seeding records into Firestore collection 'scheduleSlots'...
✓ Successfully seeded all collections.
🎉 Firebase Firestore seed completed successfully!
```

---

## 5. Start the Web Server

```powershell
npm run dev
```

The server will automatically connect to Firebase Cloud Firestore:
```
INFO: Active Database Backend: Firebase Firestore (Project: kwizz-radio-ottawa)
INFO: KWIZZ Radio server running in development mode on port 3000
```

---

## 6. Firestore Collections Overview

The following collections are automatically maintained by the application:

| Collection | Purpose |
| :--- | :--- |
| `djs` | Station selectors, presenter profiles, photos, bios, social links |
| `shows` | Radio show programming, descriptions, and musical genres |
| `scheduleSlots` | 7-day weekly schedule slots with broadcast times |
| `songRequests` | Live song requests submitted by listeners from `/request` |
| `contactMessages` | Listener and advertiser messages submitted from `/contact` |
| `announcements` | Urgent station broadcast banner alerts |
| `events` | Ottawa Caribbean festival appearances and community broadcasts |
| `sponsors` | Sponsor directories and impression/click analytics |
| `settings` | Dynamic station configuration (Stream URL, live tags, app badges) |
| `auditLogs` | Admin action and login logs for security auditing |
| `users` | Staff, DJ, and Admin credentials |

