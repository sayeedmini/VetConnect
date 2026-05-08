# Environment Setup

VetConnect uses two separate environment files:

- `client/.env` for frontend config exposed to the browser
- `server/.env` for backend-only config and secrets

## Client Variables

Only variables prefixed with `VITE_` are available in the Vite frontend bundle.

### `client/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_ENABLE_SOCKET_IO=true
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
```

### What each client variable does

- `VITE_API_BASE_URL`: Base URL for REST API requests
- `VITE_SOCKET_URL`: Base URL for Socket.IO client connections
- `VITE_ENABLE_SOCKET_IO`: Enables realtime messaging in non-dev environments
- `VITE_GOOGLE_MAPS_API_KEY`: Loads the Google Maps JavaScript API in the browser
- `VITE_GOOGLE_MAPS_MAP_ID`: Optional custom Google Maps map style ID. `DEMO_MAP_ID` works as a fallback-safe placeholder in this project.

## Server Variables

These values are read only by the backend and should stay out of the frontend bundle.

### `server/.env`

```env
PORT=5000
MONGO_URI=mongodb+srv://your_db_user:your_db_password@your-cluster.mongodb.net/vetconnect?retryWrites=true&w=majority&appName=Cluster0
SESSION_SECRET=replace_with_a_long_random_session_secret
MAC_SECRET=replace_with_a_long_random_mac_secret
SESSION_COOKIE_NAME=vetconnect_session
CLIENT_URL=http://localhost:5173
PASSWORD_RESET_BASE_URL=http://localhost:5173
ENABLE_SOCKET_IO=true
TOTP_ISSUER=VetConnect
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=123456
ADMIN_NAME=VetConnect Admin
ADMIN_CONTACT=admin-support@vetconnect.local
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM=VetConnect <no-reply@example.com>
```

### What each server variable does

- `PORT`: Express server port
- `MONGO_URI`: MongoDB connection string
- `SESSION_SECRET`: Protects session fingerprints and signed HTTP-only session cookies
- `MAC_SECRET`: Protects secure field integrity checks
- `SESSION_COOKIE_NAME`: Cookie name for the server-side authenticated session
- `CLIENT_URL`: Allowed frontend origin for CORS and Socket.IO
- `PASSWORD_RESET_BASE_URL`: Frontend origin used to build password reset links
- `ENABLE_SOCKET_IO`: Enables the Socket.IO server
- `TOTP_ISSUER`: Label used for authenticator app setup
- `ADMIN_EMAIL`: Default seeded admin email for `seed:admin`
- `ADMIN_PASSWORD`: Default seeded admin password for `seed:admin`
- `ADMIN_NAME`: Default seeded admin display name
- `ADMIN_CONTACT`: Default seeded admin contact field
- `SMTP_HOST`: SMTP server host for password reset email delivery
- `SMTP_PORT`: SMTP server port
- `SMTP_SECURE`: Use `true` for implicit TLS SMTP connections such as port 465
- `SMTP_USER`: SMTP account username
- `SMTP_PASS`: SMTP account password
- `SMTP_FROM`: Sender address shown on password reset emails

## Rule of Thumb

- Put it in `client/.env` if the browser must read it.
- Put it in `server/.env` if it is a secret or only the backend should read it.

## Current Repo Usage

### Client-side env usage

- `client/src/lib/runtimeConfig.js`
- `client/src/lib/loadGoogleMaps.js`

### Server-side env usage

- `server/server.js`
- `server/src/config/db.js`
- `server/src/controllers/authController.js`
- `server/src/middleware/auth.js`
- `server/src/security/secureField.js`
- `server/src/services/sessionSecurityService.js`
- `server/src/socket/index.js`

## Local Development Notes

- After changing `client/.env`, restart the Vite dev server.
- After changing `server/.env`, restart the backend server.
- For deployment, copy these values into your hosting provider's environment settings instead of relying on local `.env` files.
