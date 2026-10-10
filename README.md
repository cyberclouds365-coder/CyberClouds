# CyberClouds

A React and Express knowledge library for AWS, cybersecurity/OS, networking/hardware, Keycloak and Linux notes. The React/Vite client runs on Netlify, and the Express API uses a Turso/libSQL database on Render.

## Local setup

Requirements: Node.js 20+ and npm.

1. Install dependencies with `npm install`, `npm install --prefix client`, and `npm install --prefix server`.
2. Copy `.env.example` to `.env` and enter your own admin email/password and a persistent random server secret. For persistent data, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from Turso; leave them blank only for an in-memory preview. Configure your real Brevo SMTP login, key, and verified sender if you want signup and payment emails locally.
3. Run `npm run dev`; Vite prints the client URL and the API runs on port 3000.

The server creates/updates the SQLite-compatible schema in Turso and imports the supplied library on startup. In-memory accounts disappear when the server restarts. Production startup requires a Turso URL and auth token, the persistent `JWT_SECRET` value (used to protect signup and password-reset verification codes), admin credentials, a public app URL, and complete SMTP settings.

Sign-in uses random, revocable server-side sessions stored as token hashes in Turso and sent in an HTTP-only cookie. Production cookies are Secure and host-only; the API only accepts write requests from the configured app origin. Sessions expire after eight hours, and logout or password changes revoke them. Forgot-password verifies the email against the database first: if the address is not registered, the page shows an unavailable message and no mail is sent. If the account exists and is active, a single-use Brevo code valid for ten minutes is sent and the user continues to the change-password form. Attempts are rate-limited, and a successful reset revokes all sessions. Readers can share referral codes: 10 verified registrations plus one confirmed course purchase unlock the full library free. Signup records acceptance of the Terms and Conditions and Privacy Policy.

## Deploy to Netlify and Render

### Render API

Create or update a Render Web Service for this repository with:

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`
- Runtime: Node.js 20 or newer

Set these environment variables in the Render service. Use the existing real values from your private `.env` where applicable, and never paste them into Git or chat:

- `NODE_ENV=production`
- `TURSO_DATABASE_URL`: the `libsql://...` URL for your Turso database
- `TURSO_AUTH_TOKEN`: an auth token for that Turso database
- `JWT_SECRET`: a persistent random server secret of at least 64 characters (generate one with `openssl rand -hex 64`)
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: your real administrator credentials
- `APP_URL`: the public Netlify site origin, such as `https://your-site.netlify.app`
- `BREVO_SMTP_HOST`, `BREVO_SMTP_PORT`, `BREVO_SMTP_USER`, `BREVO_SMTP_PASS`, `MAIL_FROM`: your real Brevo SMTP settings and verified sender

Render supplies `PORT`; do not hard-code it for production. The health check returns an error if Turso is unavailable.

### Netlify client

Connect the same repository to Netlify. The checked-in `netlify.toml` sets the client directory, Vite build, publish directory, and SPA route fallback. In Netlify Site Configuration → Environment variables, set `VITE_API_URL` to the public HTTPS origin of your Render service (`https://cyberclouds-1.onrender.com`). This is a non-secret URL. Make it available to builds and redeploy. Netlify does not import `client/.env`, so add the variable in the Netlify UI.

The browser calls the Render API directly. Set `APP_URL` on Render to the public Netlify origin so CORS and account email links use the right client domain. The API URL is public configuration; database and SMTP credentials stay on the server.

## Secret cleanup

The rejected GitHub push identified a Brevo SMTP key in `.env.example`. Keep `.env` private, use only placeholders in `.env.example`, and amend the local commit that contained the value before pushing again. The older pushed history also contains the server secret; it has been rotated in the local `.env`, so update Render's `JWT_SECRET` from that file before deploying. The auth implementation now uses database-backed sessions, so users will need to sign in again after the first deployment of this change. After deployment, change the existing administrator account password from the live Profile page, then update `ADMIN_PASSWORD` in `.env` and Render to match; changing that variable alone does not reset an already-created database account. If the Brevo key was ever accepted by any remote, revoke it in Brevo and set a new one in `.env` and Render.

## Public routes

- `/` CyberClouds public home
- `/login` sign in
- `/signup` reader registration
- `/forgot-password` email-code password reset
- `/terms` Terms and Conditions
- `/privacy` Privacy Policy

## API

Authentication/profile:

- `POST /api/auth/signup`
- `POST /api/auth/verify-signup`
- `POST /api/auth/resend-signup-code`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/profile`
- `PATCH /api/profile/password`

Reader content:

- `GET /api/content/sections` (signed in)
- `GET /api/content/:id` (signed in)

Admin accounts and status:

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `PATCH /api/admin/users/:id/role`
- `PATCH /api/admin/users/:id/active`
- `DELETE /api/admin/users/:id`

Admin modules/content:

- `GET /api/admin/content`
- `POST /api/admin/sections`
- `PATCH /api/admin/sections/:slug`
- `DELETE /api/admin/sections/:slug`
- `GET /api/admin/documents/:id`
- `POST /api/admin/sections/:slug/documents`
- `PATCH /api/admin/documents/:id`
- `DELETE /api/admin/documents/:id`

## Local credentials

Keep `.env` on this computer and out of Git. Do not share passwords, database URLs, or API keys in source files.
