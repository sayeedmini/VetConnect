# VetConnect

VetConnect is a MERN veterinary care platform for managing veterinary services, appointments, communication, and security-sensitive data within a production-style full-stack application.

## Security Highlights

- RSA from scratch protects user identity fields and TOTP secret storage.
- ECC ElGamal from scratch protects posts, contact data, appointments, messages, reviews, prescriptions, and vet-clinic sensitive fields.
- Password storage now uses `passwordHash`, `passwordSalt`, and `passwordIterations` in `server/src/models/User.js`.
- Session cookies stay HTTP-only and carry only the raw session token. MongoDB stores only `sessionTokenHash`.
- Session expiry is now explicit:
  - `SESSION_TTL_SECONDS` is used for cookie `Max-Age`
  - `SESSION_TTL_MS` is used for MongoDB `expiresAt`
- Admin key metadata endpoints return only sanitized metadata:
  - `algorithm`
  - `keyId`
  - `version`
  - `status`
  - `createdAt`
  - `rotatedAt`
  - `publicKey`

## External Keystore

- Bootstrap key material is no longer stored in `server/storage` by default.
- The server now resolves the keystore directory in this order:
  - `process.env.KEYSTORE_DIR`
  - `path.join(os.homedir(), ".vetconnect-secure-store")`
- The directory is created automatically on first run.
- `server/storage` should now contain only `.gitkeep` and `.gitignore`.

## Setup

1. Install dependencies

```bash
npm install
npm install --prefix client
npm install --prefix server
```

2. Create local env files

```txt
client/.env
server/.env
```

3. Review environment details

- [ENVIRONMENT.md](https://github.com/sayeedmini/VetConnect/blob/main/ENVIRONMENT.md)

4. Seed or update the admin account

```bash
npm run seed:admin --prefix server
```

5. Start the project

```bash
npm run dev
```

## Verification Commands

```bash
npm run test:tamper --prefix server
npm run test:security-audit
```

You can also run the audit directly inside the server package:

```bash
npm run test:security-audit --prefix server
```

## Important Files

- `server/src/security/keyManagementService.js`
- `server/src/security/passwordHasher.js`
- `server/src/services/sessionSecurityService.js`
- `server/src/controllers/authController.js`
- `server/src/controllers/adminController.js`
- `server/src/controllers/keyManagementController.js`
- `server/src/scripts/securityAudit.js`
- `server/src/scripts/tamperTest.js`
- `CHECKLIST.md`
