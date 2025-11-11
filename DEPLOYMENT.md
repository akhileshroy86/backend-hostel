# Deploying velin-backend to Firebase Functions

This document explains how to prepare and deploy the `velin-backend` folder as Firebase Functions.

Important notes before deploy
- Do NOT commit `.env` (credentials) to git. `.gitignore` already includes `.env`.
- For production on Firebase Functions, prefer using Application Default Credentials or Firebase project-level config / Secret Manager instead of storing service account keys in `.env`.

Recommended environment setup
1. Move sensitive credentials into Firebase environment config or Secret Manager.
   - Firebase functions config (not suitable for very large secrets like private keys):
     ```
     firebase functions:config:set razorpay.key_id="<id>" razorpay.key_secret="<secret>"
     firebase functions:config:set payment.mode="razorpay"
     ```
   - For service account private keys, use Google Secret Manager and grant access to the function's service account.

2. If you must use a service account key locally, keep it in `.env` with keys that don't start with `FIREBASE_` or `PORT`.
   - This repo uses `FB_PROJECT_ID`, `FB_CLIENT_EMAIL`, `FB_PRIVATE_KEY`, `FB_PRIVATE_KEY_ID`.
   - `src/server.ts` already converts `\\n` to real newlines when initializing `firebase-admin`.

Makefile / build
- This project uses `index.js` (root) as the Firebase Function entrypoint. The `package.json` main has been set to `index.js`.
- Before deploying from CI, ensure `npm ci` has been run and any build step (if you change source files to TypeScript usage) is executed.

Deploying
1. Login to Firebase and select project:
   ```powershell
   firebase login
   firebase use --add
   ```
2. Deploy functions (from `velin-backend` folder):
   ```powershell
   cd velin-backend
   npm ci
   firebase deploy --only functions
   ```

Post-deploy verification
- Check function logs:
  ```powershell
  firebase functions:log --project <PROJECT_ID>
  ```
- Ensure environment variables required by the app are present via `functions.config()` or Secret Manager.

Cleaning up (optional)
- This repo keeps development artifacts in the workspace. The `firebase.json` ignore list has been expanded to avoid deploying `src`, `tests`, `uploads`, `temp`, and `.env*` files.
- If you want to permanently remove local test artifacts (`tests/`, `temp/`, `uploads/`), back them up and delete locally, but do NOT delete `public/uploads` if you rely on persisted uploads.

Security
- Do not store private keys in git.
- Prefer using Google Secret Manager or granting the Cloud Function the right IAM roles to access other Google services without embedded keys.

If you'd like, I can:
- Move the service-account JSON into Secret Manager and update `src/server.ts` to fetch it at runtime.
- Remove local dev folders (`tests/`, `temp/`, `uploads/`) after your confirmation.
