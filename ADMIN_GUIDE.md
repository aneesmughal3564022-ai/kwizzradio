# KWIZZ Radio - Staff & Station Management Guide

Welcome to the KWIZZ Radio administrative management manual. This portal allows station directors, content editors, and on-air DJs to control station programming, interact with listeners, and manage broadcast content.

---

## 1. Accessing the Portal

- **URL:** `https://kwizzradio.ca/admin/login` (or `http://localhost:3000/admin/login` in development)
- **Security:** Hashed with Argon2id, secured with HTTP-only session cookies and CSRF tokens.

### User Roles & Permissions:
| Role | Capabilities |
|---|---|
| **ADMIN** | Full control: site settings, stream URL, delete DJs/shows, view audit logs, send web push, manage schedule, review song requests and contact messages. |
| **EDITOR** | Content management: create/edit schedule slots, shows, DJs, announcements, events, sponsors, web push, review requests. |
| **DJ** | View schedule slots, view song requests inbox, and update request playback status (`PLAYED` / `REJECTED`). |

---

## 2. Managing the Weekly Broadcast Schedule

Navigate to **Schedule** (`/admin/schedule`):
1. **Add a Slot:**
   - Select the day of the week (Monday through Sunday).
   - Enter Start Time and End Time in 24-hour format (e.g. `07:00` to `11:00`).
   - Select the Show title from the dropdown.
   - Assign the resident DJ or selector.
   - Click **Create Schedule Slot**.
2. **Visitor Timezones:** The website automatically translates these Ottawa Eastern Times (ET) into the listener's local timezone when viewed on the public schedule.

---

## 3. Managing DJs & Shows

- **DJs (`/admin/djs`):** Add resident selectors with their photo URL, detailed biography, and social links (Instagram and X/Twitter).
- **Shows (`/admin/shows`):** Create show titles, define the musical genre (e.g. *Conscious Roots*, *Dancehall Club Anthems*, *Dub Sessions*), and assign the host DJ.

---

## 4. Live Announcement Banners

Navigate to **Announcements** (`/admin/announcements`):
- Use this feature for breaking news, severe weather warnings, or live on-location broadcasts (e.g. Lebreton Flats Reggae Festival).
- Enter the headline, message, and call-to-action link button.
- Toggle **Activate Banner Immediately** to broadcast it to all site visitors.

---

## 5. Song Requests Inbox

Navigate to **Requests** (`/admin/requests`):
- All song requests submitted by visitors via `/request` appear in real time.
- Details include: Song title, artist, requester handle/name, personal dedication, and timestamp.
- **Actions:**
  - Click **Mark Played** once you have spun the record on air.
  - Click **Reject** if the track is inappropriate or unavailable.

---

## 6. Sending Web Push Notifications

Navigate to **Web Push** (`/admin/notifications`):
- Check the active subscriber count.
- Compose a Notification Title and Body (e.g. *"Empress Tanya is LIVE with Dancehall Fever!"*).
- Click **Send Notification to All Subscribers** to instantly ping opted-in listener devices on mobile and desktop.

---

## 7. Site Settings & Audio Stream URL

Navigate to **Settings** (`/admin/settings` - Admin role required):
- **Stream URL:** Change the primary Live365 audio stream URL without modifying code.
- **Station Name & Tagline:** Update station metadata and branding.
- **Mobile App Store Badges:** Toggle the Apple App Store and Google Play badges on or off in the site footer.

---

## 8. Audit Logs

Navigate to **Audit** (`/admin/audit` - Admin role required):
- Every administrative action (login, setting updates, show deletions, schedule edits, push notifications) is recorded with the user ID, timestamp, and IP address for compliance and security auditing.

