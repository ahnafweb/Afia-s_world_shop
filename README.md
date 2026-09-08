# Afia's World Shop

A full-stack e-commerce website using a vanilla HTML/CSS/JS frontend and an Express + SQLite backend.

## Project structure

- `frontend/` storefront and admin UI
- `backend/` Express API, authentication, orders, reviews and SQLite database
- `render.yaml` Render Blueprint configuration
- `.gitignore` protects secrets, dependencies and runtime database files

## Run locally

```bash
cd backend
npm install
copy .env.example .env
npm start
```

Open `http://localhost:3000/`.

For local development, the seed admin is:

- Email: `admin@afiasworld.local`
- Password: `ChangeMe123!`

Change it before using the site publicly. Production uses the `ADMIN_PASSWORD` environment variable instead of the development fallback.

## Deploy to GitHub + Render

### 1. GitHub

Upload the contents of this project folder to the root of a new GitHub repository.

**Do not upload `.env`, `node_modules`, or SQLite runtime files.** The included `.gitignore` already excludes them.

### 2. Render

Create a **Web Service** from the GitHub repository, or use the included `render.yaml` Blueprint.

If entering the settings manually:

- **Runtime:** Node
- **Build Command:** `cd backend && npm ci`
- **Start Command:** `cd backend && npm start`
- **Health Check Path:** `/api/health`

The included `render.yaml` also generates secure `JWT_SECRET` and `ADMIN_PASSWORD` values automatically.

### 3. Email verification

Customer registration sends a verification code by email. For that feature, add these Render environment variables:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `OTP_EXPIRES_MINUTES`

If SMTP is not configured, browsing, products, cart, checkout APIs and admin login still start normally, but new customer registration cannot send verification emails.

### 4. Important SQLite note

This project uses SQLite. Render's normal web-service filesystem is ephemeral, so database changes and uploaded files should **not** be treated as permanent production storage. For a real store with persistent orders/products/users, move the database to a persistent PostgreSQL service and uploads to object storage.

## Health check

After deployment, open:

`https://YOUR-RENDER-DOMAIN/api/health`

It should return JSON similar to:

```json
{"ok":true,"service":"Afia's World API"}
```
