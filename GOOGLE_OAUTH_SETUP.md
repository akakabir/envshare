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
4. Click **Save**.

---

## 4. Restrict Browser API Key by HTTP Referrer

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

## 5. Deploy Updated Firestore Security Rules

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

## 6. Architecture & Security Notes

- **Popup & Redirect Fallback**: EnvShare attempts `signInWithPopup` with prompt set to `select_account`. If the browser blocks the popup window (`auth/popup-blocked`), it automatically falls back to `signInWithRedirect`, and resumes the session on mount via `getRedirectResult`.
- **Account Deletion Safeguards**: For users signed in via Google OAuth, account deletion triggers `reauthenticateWithPopup(user, googleProvider)` to comply with Firebase's sensitive operation re-authentication requirements.
- **Client-Side Encryption**: Secrets are encrypted client-side using AES-256-GCM via PBKDF2 with no hardcoded master secrets in the client bundle.
