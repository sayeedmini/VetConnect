1. Login and Registration
   - `server/src/controllers/authController.js`
   - `client/src/features/auth/pages/RegisterPage.jsx`
   - `client/src/features/auth/pages/LoginPage.jsx`

2. Encrypted user information during registration
   - `server/src/models/User.js`
   - `server/src/security/secureField.js`
   - RSA is used for `name`, `email`, and TOTP secret storage.

3. Decryption of user information on retrieval
   - `server/src/security/secureField.js`
   - `server/src/services/userSecurityService.js`

4. Password hashing and salting before storage
   - `server/src/security/passwordHasher.js`
   - `server/src/security/sha256.js`
   - `server/src/security/hmac.js`
   - `server/src/controllers/authController.js`
   - `server/src/scripts/seedAdmin.js`

5. Two-step authentication before granting access
   - `server/src/controllers/authController.js`
   - `server/src/services/totpService.js`
   - `client/src/features/auth/pages/LoginPage.jsx`

6. Key Management Module
   - `server/src/security/keyManagementService.js`
   - `server/src/controllers/keyManagementController.js`
   - `server/src/controllers/adminController.js`
   - `server/src/routes/keyManagementRoutes.js`
   - `server/src/routes/adminRoutes.js`

7. Post/profile create, view, and edit
   - `server/src/controllers/postController.js`
   - `server/src/controllers/profileController.js`
   - `client/src/features/posts/pages/PostsPage.jsx`
   - `client/src/features/profile/pages/ProfilePage.jsx`

8. Encrypted storage for all critical data
   - `server/src/models/User.js`
   - `server/src/models/Post.js`
   - `server/src/models/Appointment.js`
   - `server/src/models/Message.js`
   - `server/src/models/Review.js`
   - `server/src/models/Prescription.js`
   - `server/src/models/VetClinic.js`

9. MAC/HMAC integrity verification
   - `server/src/security/hmac.js`
   - `server/src/security/secureField.js`
   - `server/src/scripts/tamperTest.js`
   - Tampering causes `Encrypted field integrity verification failed` instead of silent fallback.

10. Exclusively asymmetric encryption for encryption operations
   - RSA protects user identity fields and secret-setup identity data.
   - ECC ElGamal protects posts, profile/contact fields, appointments, messages, reviews, prescriptions, and vet-clinic sensitive fields.

11. At least two different asymmetric algorithms
   - `server/src/security/rsa.js`
   - `server/src/security/ecc.js`

12. RSA from scratch
   - `server/src/security/rsa.js`

13. ECC from scratch
   - `server/src/security/ecc.js`
   - Uses a valid secp256k1-style curve and valid base point with true ECC ElGamal.

14. RBAC for admin and regular users
   - `server/src/middleware/auth.js`
   - `server/src/routes/adminRoutes.js`
   - `client/src/features/auth/components/ProtectedRoute.jsx`

15. Secure session management
   - `server/src/models/Session.js`
   - `server/src/services/sessionSecurityService.js`
   - `server/src/middleware/auth.js`
   - `server/src/socket/index.js`
   - `client/src/features/auth/context/AuthSessionContext.jsx`
   - The cookie stores the raw session token, but MongoDB stores only `sessionTokenHash`.

16. No built-in encryption/hash/MAC/password/JWT crypto functions for the required crypto algorithms
   - Custom SHA-256: `server/src/security/sha256.js`
   - Custom HMAC: `server/src/security/hmac.js`
   - Custom password hashing: `server/src/security/passwordHasher.js`
   - HTTP-only cookie sessions replace JWT and Bearer-token auth.

## Required Files

- `server/src/security/passwordHasher.js`
- `server/src/security/ecc.js`
- `server/src/scripts/seedAdmin.js`
- `server/src/scripts/tamperTest.js`
- `server/src/routes/adminRoutes.js`
- `server/src/controllers/adminController.js`
- `client/src/features/admin/pages/AdminDashboard.jsx`
- `CSE447_COMPLIANCE_CHECKLIST.md`

## Required APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify-2fa`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/profile/me`
- `PUT /api/profile/me`
- `POST /api/posts`
- `GET /api/posts`
- `GET /api/posts/:id`
- `PUT /api/posts/:id`
- `GET /api/admin/users`
- `GET /api/admin/posts`
- `GET /api/admin/keys`
- `POST /api/admin/keys/rotate/:algorithm`

## Session Token Design

- `authController.js` creates a random session token after 2FA success.
- `Session.sessionTokenHash` stores only the custom SHA-256 hash of that token.
- The raw session token is sent in an HTTP-only cookie.
- `auth.js` and `socket/index.js` hash the cookie token and compare the hash with MongoDB.
- Logout revokes the server-side session and clears the cookie.

## MAC / Tamper Test

- `tamperTest.js` connects to MongoDB and initializes key management.
- It creates or reuses an encrypted post.
- It reads the raw encrypted field directly from MongoDB.
- It modifies the encrypted ECC payload in the database.
- It attempts normal retrieval and expects `Encrypted field integrity verification failed`.
- Passing output is `PASS: MAC detected database tampering`.

## Submission Cleanup

- Keep `server/storage/.gitkeep`
- Keep `server/storage/.gitignore`
- Exclude:
  - `.git/`
  - all `node_modules/`
  - `client/.env`
  - `server/.env`
  - `server/storage/bootstrap-keypair.json`
  - `server/storage/crypto-bootstrap.json`
  - `server/storage/crypto-keyring.json`

## Verification Commands

Git Bash / Unix-style:

```bash
grep -R "bcrypt\|jsonwebtoken\|jwt.sign\|jwt.verify" server/src server/package.json server/package-lock.json
grep -R "createHash\|createHmac\|publicEncrypt\|privateDecrypt" server/src
grep -R "localStorage\|Authorization\|Bearer " client/src
```

PowerShell / ripgrep:

```powershell
rg -n "bcrypt|jsonwebtoken|jwt\.sign|jwt\.verify" server/src server/package.json server/package-lock.json
rg -n "createHash|createHmac|publicEncrypt|privateDecrypt" server/src
rg -n "localStorage|Authorization|Bearer " client/src
```

Expected result: no matches for the forbidden usage checks above.
