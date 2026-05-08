# VetConnect

VetConnect is a MERN veterinary care platform patched to satisfy the CSE447 Cryptography and Cryptanalysis Lab Project requirements without rebuilding the app from scratch.

## Security Design

- RSA from scratch in `server/src/security/rsa.js` protects identity-oriented user fields such as `name`, `email`, and the stored TOTP secret.
- ECC ElGamal from scratch in `server/src/security/ecc.js` protects posts, profile contact data, appointments, messages, reviews, prescriptions, and vet-clinic sensitive fields.
- ECC now uses a mathematically valid curve with a valid base point and a true ElGamal construction:
  - `C1 = kG`
  - `C2 = M + kPublicKey`
  - `M = C2 - privateKey * C1`
- ECC plaintext is mapped with an educational byte-to-point lookup table derived from valid multiples of the base point. No XOR stream or HMAC-derived keystream is used for encryption.
- Password hashing uses the custom iterative construction in `server/src/security/passwordHasher.js`, built on the project’s custom SHA-256 and HMAC implementations.
- Integrity protection uses the custom HMAC in `server/src/security/hmac.js`. `server/src/security/secureField.js` rejects tampered ciphertext with `Encrypted field integrity verification failed`.
- Sessions use HTTP-only cookies that carry only a random raw session token. MongoDB stores only `sessionTokenHash`, never the raw token.
- Two-step authentication uses TOTP plus one-time backup recovery codes.
- Key management supports RSA and ECC rotation through admin-only routes. Bootstrap and managed key artifacts are regenerated locally and are excluded from the submission bundle.

## Core Files

- `server/src/security/rsa.js`
- `server/src/security/ecc.js`
- `server/src/security/passwordHasher.js`
- `server/src/security/secureField.js`
- `server/src/security/keyManagementService.js`
- `server/src/services/sessionSecurityService.js`
- `server/src/middleware/auth.js`
- `server/src/scripts/seedAdmin.js`
- `server/src/scripts/tamperTest.js`
- `server/src/routes/adminRoutes.js`
- `server/src/controllers/adminController.js`
- `client/src/features/admin/pages/AdminDashboard.jsx`
- `CSE447_COMPLIANCE_CHECKLIST.md`

## Setup

1. Install dependencies

```bash
npm install
npm install --prefix client
npm install --prefix server
```

2. Create local env files from the examples

```txt
client/.env
server/.env
```

3. Review the environment guide

- [ENVIRONMENT.md](C:/Users/Sayeed/Documents/GitHub/VetConnect/ENVIRONMENT.md)

4. Seed or update the admin account

```bash
npm run seed:admin --prefix server
```

5. Start the app

```bash
npm run dev
```

## Useful Commands

```bash
npm run build --prefix client
npm run seed:admin --prefix server
npm run test:tamper --prefix server
```

## Database Tamper Test

`server/src/scripts/tamperTest.js` now performs a real database integrity test:

1. Connects to MongoDB
2. Initializes key management
3. Creates or reuses an encrypted `Post`
4. Reads the raw encrypted field directly from MongoDB with getters bypassed
5. Modifies the encrypted ECC payload in the database
6. Attempts normal retrieval/decryption
7. Confirms `secureField` throws `Encrypted field integrity verification failed`
8. Prints `PASS: MAC detected database tampering`

## Session Design

- After password + 2FA success, the server creates a random raw session token.
- The raw token is sent only in an HTTP-only cookie.
- MongoDB stores only `sessionTokenHash` in `server/src/models/Session.js`.
- Middleware hashes the cookie token with the project’s custom SHA-256 and compares the hash against MongoDB.
- Logout revokes the stored session and clears the cookie.

## Key Rotation And Storage Cleanup

- Admin users can inspect managed RSA/ECC keys and rotate either algorithm from the admin dashboard.
- `server/storage/.gitignore` keeps generated key artifacts out of version control:

```gitignore
*
!.gitkeep
```

- Submission bundles must exclude:
  - `.git/`
  - any `node_modules/`
  - `client/.env`
  - `server/.env`
  - `server/storage/bootstrap-keypair.json`
  - `server/storage/crypto-bootstrap.json`
  - `server/storage/crypto-keyring.json`

## Compliance Reference

- CHECKLIST.md
