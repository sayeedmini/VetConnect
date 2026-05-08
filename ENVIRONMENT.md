# Environment Setup

VetConnect uses:

- `client/.env` for frontend values exposed to the browser
- `server/.env` for backend-only values and secrets

## Client Variables

Only `VITE_` variables are available in the Vite bundle.

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_ENABLE_SOCKET_IO=true
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
```

## Server Variables

```env
PORT=5000
MONGO_URI=mongodb+srv://your_db_user:your_db_password@your-cluster.mongodb.net/vetconnect?retryWrites=true&w=majority&appName=Cluster0
SESSION_SECRET=replace_with_a_long_random_session_secret
MAC_SECRET=replace_with_a_long_random_mac_secret
SESSION_COOKIE_NAME=vetconnect_session
KEYSTORE_DIR=
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

## Server Variable Notes

- `SESSION_SECRET`: Protects session fingerprinting and session-token hashing support logic.
- `MAC_SECRET`: Protects encrypted field integrity checks.
- `SESSION_COOKIE_NAME`: Names the HTTP-only session cookie.
- `KEYSTORE_DIR`: Optional override for server-local bootstrap key storage. If unset, VetConnect uses `~/.vetconnect-secure-store`.
- `CLIENT_URL`: Allowed frontend origin for CORS and Socket.IO.
- `PASSWORD_RESET_BASE_URL`: Frontend origin used to build password reset links.
- `ADMIN_*`: Used by `npm run seed:admin --prefix server`.

## Password Storage

User credentials are stored with:

- `passwordHash`
- `passwordSalt`
- `passwordIterations`

The server no longer uses `User.password` for active password verification. Legacy records are migrated into the new field layout during backend startup.

## Session Expiry

- `SESSION_TTL_SECONDS` is used for cookie `Max-Age`.
- `SESSION_TTL_MS` is used when writing `Session.expiresAt` to MongoDB.
- The cookie remains HTTP-only.
- MongoDB stores `sessionTokenHash`, not the raw token.

## Local Key Storage

- Bootstrap/private key bootstrap material is stored on the server machine, outside the project folder by default.
- `server/storage` is reserved for `.gitkeep` and `.gitignore`.
- The keystore directory is created automatically on first run.

## Audit Commands

```bash
npm run test:tamper --prefix server
npm run test:security-audit
```
