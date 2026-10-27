# Google OAuth & Security Setup Guide for EnvShare

This guide walks you through configuring Google OAuth authentication, securing API keys, and deploying the updated Firestore security rules for EnvShare.

---

## 1. Enable Google Sign-In in Firebase Console

1. Navigate to the [Firebase Console](https://console.firebase.google.com/) and select your project.
2. In the left navigation, select **Build** > **Authentication**.
3. Under the **Sign-in method** tab, click **Add new provider** (or select **Google** if already added).
4. Toggle **Enable** on.
5. Choose a project support email from the dropdown.
6. Click **Save**.

---

## 2. Configure Authorized Domains in Firebase

To allow users to sign in from both local development and production environments:

1. In **Authentication** > **Settings** > **Authorized domains**, ensure the following domains are listed:
   - `localhost`
   - `127.0.0.1`
   - Your deployed custom domain (e.g. `envshare.app` or your hosting domain)
   - Your Firebase Hosting domain (e.g. `<project-id>.web.app`, `<project-id>.firebaseapp.com`)
2. Click **Add domain** if any domain is missing.

---

## 3. Configure Google Cloud Console (OAuth Credentials & Consent Screen)

Firebase Authentication uses a Google Cloud OAuth 2.0 Client ID behind the scenes.

1. Open the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials) for your Firebase project.
2. Under **OAuth consent screen**:
   - Ensure User Type is set to **External** (or Internal for Google Workspace orgs).
   - Fill in the App Name (**EnvShare**), User Support Email, and Developer Contact Email.
   - Under **Scopes**, ensure `.../auth/userinfo.email` and `.../auth/userinfo.profile` are present.
   - Publish the app or add test users while in testing status.
3. Under **OAuth 2.0 Client IDs**:
   - Locate the **Web client (auto created by Google Service)** client ID.
   - Under **Authorized JavaScript origins**, add:
     - `http://localhost:3000`
     - `http://localhost:5173`
     - `https://<project-id>.firebaseapp.com`
     - `https://<project-id>.web.app`
     - `https://your-production-domain.com`
   - Under **Authorized redirect URIs**, verify or add the Firebase Auth handler URL:
     - `https://<project-id>.firebaseapp.com/__/auth/handler`
4. Copy the **Client ID** value and paste it into `firebase-applet-config.json` as `oAuthClientId`.

> ⚠️ **Never use the Client Secret on the frontend.** The OAuth Client Secret must only ever be used on a server (e.g., Cloud Functions, Cloud Run). It must never appear in source code, `.env` files committed to the repo, or any variable prefixed `VITE_` (Vite embeds those into the JS bundle).

---

## 4. Where OAuth Config Lives in This App

EnvShare stores the **public** OAuth Client ID in `firebase-applet-config.json` under `oAuthClientId`. This file is committed to source control because it only contains public, non-secret Firebase configuration — the same as Firebase's own `firebaseConfig` object.

```json
{
  "oAuthClientId": "183260515879-xxxx.apps.googleusercontent.com",
  ...
}
```

The app reads it directly at build time — no `VITE_` environment variables are involved. This means:

- ✅ **Client ID** — stored in `firebase-applet-config.json`, safe to be public
- ❌ **Client Secret** — belongs on a backend server only, never in frontend code
- ✅ **Redirect URI** — derived automatically from `authDomain` in `firebase-applet-config.json`

---

## 5. Restrict Browser API Key by HTTP Referrer

To prevent unauthorized quota consumption and misuse of your Firebase web API key:

1. In [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials), locate the **Browser key (auto created by Firebase)**.
2. Click **Edit API Key**.
3. Under **Set application restrictions**, choose **Websites** (HTTP referrers).
4. Add website restrictions:
   - `http://localhost:3000/*`
   - `http://localhost:5173/*`
   - `https://<project-id>.firebaseapp.com/*`
   - `https://<project-id>.web.app/*`
   - `https://your-production-domain.com/*`
5. Under **API restrictions**, select **Restrict key** and enable:
   - Identity Toolkit API
   - Token Service API
   - Cloud Firestore API
6. Click **Save**.

---

## 6. Deploy Updated Firestore Security Rules

EnvShare includes hardened Firestore security rules (`firestore.rules`) enforcing project membership isolation, owner-only collaborator management, and verified user directory lookup.

To deploy the rules to your live Firebase project, run:

```bash
firebase deploy --only firestore:rules
```

If you do not have the Firebase CLI installed or logged in:
```bash
npm install -g firebase-tools
firebase login
firebase use <project-id>
firebase deploy --only firestore:rules
```

---

## 7. Architecture & Security Notes

- **Popup & Redirect Fallback**: EnvShare attempts `signInWithPopup` with prompt set to `select_account`. If the browser blocks the popup window (`auth/popup-blocked`), it automatically falls back to `signInWithRedirect`, and resumes the session on mount via `getRedirectResult`.
- **Account Deletion Safeguards**: For users signed in via Google OAuth, account deletion triggers `reauthenticateWithPopup(user, googleProvider)` to comply with Firebase's sensitive operation re-authentication requirements.
- **Client-Side Encryption**: Secrets are encrypted client-side using AES-256-GCM via PBKDF2 with no hardcoded master secrets in the client bundle.
- **No Secrets in Frontend**: Anything prefixed `VITE_` is embedded verbatim into the compiled JavaScript bundle and is visible to every visitor. OAuth Client Secrets, database passwords, and server-side API keys must never use the `VITE_` prefix.
