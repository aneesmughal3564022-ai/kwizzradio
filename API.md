# KWIZZ Radio - REST API & Streaming Specification

All responses use JSON format unless specified otherwise.

---

## 1. Public Audio & Now Playing Endpoints

### GET `/api/now-playing`
Returns metadata of the current playing track, station status, and audio stream URL.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "title": "Could You Be Loved",
    "artist": "Bob Marley & The Wailers",
    "album": "Uprising",
    "artwork": "https://images.unsplash.com/...",
    "duration": 237,
    "timestamp": "2026-10-30T12:00:00.000Z",
    "streamUrl": "https://streaming.live365.com/b72076_128k.mp3",
    "station": "KWIZZ Radio"
  },
  "streamUrl": "https://streaming.live365.com/b72076_128k.mp3",
  "station": "KWIZZ Radio"
}
```

---

### GET `/api/recent`
Returns an array of the last 10 tracks played on air.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "title": "Toast",
      "artist": "Koffee",
      "album": "Rapture",
      "artwork": "https://images.unsplash.com/...",
      "playedAt": "2026-10-30T11:56:00.000Z"
    }
  ]
}
```

---

### GET `/api/now-playing/stream` (Server-Sent Events)
Live real-time track updates pushed to client browsers over persistent HTTP stream.

- **Headers:** `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- **Initial Connection Comment:** `: connected\n\n`
- **Heartbeat (every 15s):** `: keepalive\n\n`
- **Track Change Event:**
```
event: now_playing
data: {"title":"Who Knows","artist":"Protoje","artwork":"..."}
```

---

## 2. Public Form Submissions

### POST `/api/requests`
Submits a song request to the station DJ inbox. Rate limited to 10 requests per 15 minutes per IP.

**Request Body:**
```json
{
  "artist": "Chronixx",
  "songTitle": "Here Comes Trouble",
  "requestedBy": "Ras Dave",
  "dedication": "Big up Ottawa west crew!",
  "email": "dave@example.com",
  "rendered_at": 1793373500000
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Big up! Your song request has been sent to our live DJs.",
  "data": { "id": "req-1793373500000", "status": "NEW" }
}
```

---

### POST `/api/contact`
Submits a general inquiry to station management. Rate limited to 10 requests per 15 minutes per IP.

**Request Body:**
```json
{
  "name": "Sarah Listener",
  "email": "sarah@example.ca",
  "subject": "Community Festival Partnership",
  "message": "Hello KWIZZ team, we would love to have your DJs broadcast at our event.",
  "caslConsent": true,
  "rendered_at": 1793373500000
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Thank you for reaching out! Station management will get back to you shortly."
}
```

---

## 3. Web Push Notifications

### GET `/api/push/public-key`
Returns the VAPID public key needed to subscribe the browser to Web Push.

**Response (200 OK):**
```json
{
  "publicKey": "BExampleVAPIDPublicKey..."
}
```

---

### POST `/api/push/subscribe`
Registers an opt-in web push subscription endpoint.

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Successfully subscribed to KWIZZ Radio notifications"
}
```

---

## 4. Sponsors & Tracking

### GET `/api/sponsors/:id/click?target=https%3A%2F%2Fpartner.com`
Records a click event in `SponsorStat` and redirects (302) to the partner's target URL.

### POST `/api/sponsors/:id/impression`
Records an impression event in `SponsorStat` without disrupting client audio. Returns `204 No Content`.

