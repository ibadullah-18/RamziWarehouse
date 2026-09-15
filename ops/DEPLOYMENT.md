# GrandWall production deployment

## Required server software

- Linux server
- Docker Engine with Docker Compose
- Git
- Nginx
- Certbot

## Environment

Copy `.env.production.example` to `.env.production` and provide strong
production-only values. Never commit `.env.production`.

Required JWT identity values:

```dotenv
JWT_ISSUER=GrandWall.Api
JWT_AUDIENCE=GrandWall.Mobile
```

## First deployment

```bash
git clone YOUR_REPOSITORY_URL GrandWall
cd GrandWall
cp .env.production.example .env.production
nano .env.production
chmod 600 .env.production
chmod 750 ops/*.sh
./ops/deploy-production.sh
```

The API binds only to `127.0.0.1:8080`. Internet traffic must pass through
the HTTPS reverse proxy.

## Nginx

Copy `ops/nginx-grandwall-api.conf.example` to the Nginx sites directory,
replace every `YOUR_API_DOMAIN`, enable the site, obtain a certificate with
Certbot, and reload Nginx.

## Database safety

The deploy script creates a verified backup before replacing a running API.
The database is backed up nightly by `ops/install-backup-timer.sh`.
The restore operation requires an explicit `RESTORE GrandWall` confirmation.
