# KWIZZ Radio - Production Deployment Guide

This guide details production deployment for KWIZZ Radio on Linux (Ubuntu 22.04 / 24.04 LTS), with Nginx reverse proxy, PM2 process management or Docker Compose, SSL certificates, and automated PostgreSQL backups.

---

## 1. Architecture Overview

```
                      [ Internet / Cloudflare CDN ]
                                   │
                           HTTPS Port 443
                                   ▼
                    [ Nginx Reverse Proxy & SSL ]
                     ├── Static Assets (Cached)
                     ├── Live Stream Pass-through
                     └── SSE Event Stream (Unbuffered)
                                   │
                           HTTP Port 3000
                                   ▼
                    [ Node.js (Express + PM2) ]
                      ├── Live365 SSE Poller
                      ├── EJS Views Engine
                      └── Argon2 Authentication
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   [ PostgreSQL 16 DB ]                          [ Redis 7 Cache ]
```

---

## 2. Nginx Reverse Proxy Configuration

Install Nginx:
```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/kwizzradio.ca`:
```nginx
server {
    listen 80;
    server_name kwizzradio.ca www.kwizzradio.ca;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kwizzradio.ca www.kwizzradio.ca;

    # SSL Certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/kwizzradio.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kwizzradio.ca/privkey.pem;

    # High-Security SSL Parameters
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Static Assets Caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        root /var/www/kwizz-radio/public;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }

    # Server-Sent Events (SSE) Stream Endpoint - Disables Buffering
    location /api/now-playing/stream {
        proxy_pass http://127.0.0.1:3000/api/now-playing/stream;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 24h;
        chunked_transfer_encoding off;
    }

    # Application Proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and obtain SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/kwizzradio.ca /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d kwizzradio.ca -d www.kwizzradio.ca
```

---

## 3. Deployment with PM2 (Bare Metal / VPS)

Install PM2 globally:
```bash
sudo npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'kwizz-radio',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

Start the application:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 4. Deployment with Docker Compose

To deploy using Docker on a production server:
```bash
# Set production environment variables in .env
# Launch containers
docker-compose up -d --build

# Run database migrations
docker-compose exec app npx prisma migrate deploy

# Seed initial data (first launch only)
docker-compose exec app npx prisma db seed
```

---

## 5. Automated Daily PostgreSQL Backups (30-Day Retention)

Create backup script `/usr/local/bin/backup-kwizz-db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/kwizz_radio"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATABASE_NAME="kwizz_radio"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Perform pg_dump
pg_dump -U postgres -F c "$DATABASE_NAME" > "$BACKUP_DIR/kwizz_db_$TIMESTAMP.dump"

# Delete backups older than 30 days
find "$BACKUP_DIR" -type f -name "kwizz_db_*.dump" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup completed: $BACKUP_DIR/kwizz_db_$TIMESTAMP.dump"
```

Make executable and add to crontab:
```bash
sudo chmod +x /usr/local/bin/backup-kwizz-db.sh

# Run daily at 02:00 AM
sudo crontab -e
# Add line:
0 2 * * * /usr/local/bin/backup-kwizz-db.sh >> /var/log/kwizz_backup.log 2>&1
```

### Restore Procedure:
```bash
pg_restore -U postgres -d kwizz_radio -c /var/backups/kwizz_radio/kwizz_db_TIMESTAMP.dump
```

