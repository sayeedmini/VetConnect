# Security Implementation Checklist

## Requirement Coverage

1. Login and registration
   - `server/src/controllers/authController.js`
   - `client/src/features/auth/pages/RegisterPage.jsx`
   - `client/src/features/auth/pages/LoginPage.jsx`

2. Encrypted user information during registration
   - `server/src/models/User.js`
   - `server/src/security/secureField.js`
   - RSA protects `name`, `email`, and the TOTP secret.

3. Decryption on retrieval
   - `server/src/security/secureField.js`
   - `server/src/services/userSecurityService.js`

4. Password hashing and salting before storage
   - `server/src/security/passwordHasher.js`
   - `server/src/controllers/authController.js`
   - `server/src/scripts/seedAdmin.js`
   - Stored fields are `passwordHash`, `passwordSalt`, and `passwordIterations`.

5. Two-step authentication before granting access
   - `server/src/controllers/authController.js`
   - `server/src/services/totpService.js`

6. Key management module
   - `server/src/security/keyManagementService.js`
   - `server/src/controllers/keyManagementController.js`
   - `server/src/controllers/adminController.js`
   - Admin key metadata is sanitized by `sanitizeKeyMetadata()`.

7. Post/profile create, view, and edit
   - `server/src/controllers/postController.js`
   - `server/src/controllers/profileController.js`

8. Encrypted storage for critical data
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

10. Exclusively asymmetric encryption for encryption operations
   - RSA protects user identity fields.
   - ECC ElGamal protects posts, contact data, appointments, messages, reviews, prescriptions, and vet-clinic sensitive fields.

11. At least two different asymmetric algorithms
   - `server/src/security/rsa.js`
   - `server/src/security/ecc.js`

12. RSA from scratch
   - `server/src/security/rsa.js`

13. ECC from scratch
   - `server/src/security/ecc.js`

14. RBAC for admin and regular users
   - `server/src/middleware/auth.js`
   - `server/src/routes/adminRoutes.js`

15. Secure session management
   - `server/src/models/Session.js`
   - `server/src/services/sessionSecurityService.js`
   - `server/src/middleware/auth.js`
   - `server/src/socket/index.js`
   - Cookie `Max-Age` uses `SESSION_TTL_SECONDS`.
   - MongoDB `expiresAt` uses `SESSION_TTL_MS`.
   - MongoDB stores only `sessionTokenHash`.

16. No built-in encryption/hash/MAC/password/JWT crypto functions for the required crypto algorithms
   - Custom SHA-256: `server/src/security/sha256.js`
   - Custom HMAC: `server/src/security/hmac.js`
   - Custom password hashing: `server/src/security/passwordHasher.js`

## Implemented Security Updates

- Bootstrap key storage defaults outside the project folder.
- `KEYSTORE_DIR` can override the external bootstrap keystore path.
- `server/storage` is left only for `.gitkeep` and `.gitignore`.
- Admin key endpoints now expose sanitized metadata only.
- Password storage uses `passwordHash`, `passwordSalt`, and `passwordIterations`.
- The project includes `server/src/scripts/securityAudit.js`.

## Verification Commands

```bash
npm run test:tamper --prefix server
npm run test:security-audit
```

## Security Audit Checks

`server/src/scripts/securityAudit.js` verifies:

- Raw `User` encryption fields remain encrypted in MongoDB
- Raw `Post` encryption fields remain encrypted in MongoDB
- `Session` stores only `sessionTokenHash`
- Key metadata responses stay sanitized
- Keyring metadata does not expose raw private-key fields

## Submission Notes

- Keep `server/storage/.gitkeep`
- Keep `server/storage/.gitignore`
- Do not commit `.env` files
- Do not commit `node_modules`
- Bootstrap key runtime files now belong in `KEYSTORE_DIR` or `~/.vetconnect-secure-store`
