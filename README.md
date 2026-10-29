<p align="center">
  <img src="public/logo.png" alt="EnvShare logo" width="120" />
</p>

<h1 align="center">EnvShare</h1>

<p align="center">
  Modern .env sharing for modern devs.<br />
  A secure portal where teams store, share, and track environment variables.
</p>

<p align="center">
  <a href="https://envshare-sigma-one.vercel.app/"><strong>Live site: https://envshare-sigma-one.vercel.app/</strong></a>
</p>

---

## Features

- **Projects and environments.** Group variables by project, then split them into environments such as Development, Staging and Production.
- **Sensitive values.** Mark any variable as sensitive and its value is encrypted before it is saved. Reveal or copy it on demand.
- **Team collaboration.** Project owners invite teammates by email. Members can view and edit variables, and can leave a project at any time.
- **Audit history.** Every create, update, delete, sensitivity change and import is logged with who did it and when. Sensitive values are masked in the log.
- **Bulk import.** Bring in existing `.env` content in one go.
- **Authentication.** Email and password, or Google sign-in (popup, with an automatic redirect fallback if the popup is blocked).
- **Account deletion.** Deleting your account removes your owned projects, removes you from shared projects, and deletes your profile and directory entry.
- **Legal pages.** Built-in Terms of Service and Privacy Policy.

## Tech stack

| Area | Tools |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 4, lucide-react, motion |
| Backend services | Firebase Authentication, Cloud Firestore |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2) |
| Hosting | Vercel (live site), Firebase Hosting config included |

## Getting started

### Prerequisites

- Node.js 20 or newer
- A Firebase project with **Authentication** (Email/Password and Google) and **Cloud Firestore** enabled

### Install and run

```bash
git clone <your-repo-url>
cd envshare
npm install
npm run dev
```

The dev server runs on [http://localhost:3000](http://localhost:3000).

### Configure Firebase

Public Firebase settings live in `firebase-applet-config.json` at the project root:

```json
{
  "projectId": "...",
  "appId": "...",
  "apiKey": "...",
  "authDomain": "...",
  "firestoreDatabaseId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "oAuthClientId": "..."
}
```

These values identify your Firebase app and are safe to ship to the browser. Access is controlled by Firestore security rules and by restricting the browser API key, not by hiding this file. Never put an OAuth **client secret** in the frontend.

For Google sign-in, authorized domains and API key restrictions, follow [`GOOGLE_OAUTH_SETUP.md`](GOOGLE_OAUTH_SETUP.md). Remember to add your deployed domain, for example `envshare-sigma-one.vercel.app`, under **Authentication > Settings > Authorized domains**, or Google sign-in will fail there.

### Deploy Firestore rules

```bash
npm install -g firebase-tools
firebase login
firebase use <project-id>
firebase deploy --only firestore:rules
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Type-check with `tsc --noEmit` |
| `npm run clean` | Remove `dist` and `server.js` |

## Data model (Firestore)

Environment variables, including API keys, are stored in Firestore under their project and environment:

```
users/{userId}                         profile (uid, email, displayName, createdAt)
userLookup/{emailKey}                  email -> uid directory used for team invites
projects/{projectId}                   name, description, ownerId, memberUids[], memberEmails[]
 └─ environments/{environmentId}       name, projectId, memberUids[]
     ├─ variables/{variableId}         key, value, isSensitive, updatedBy, timestamps
     └─ history/{historyId}            key, action, oldValue, newValue, userEmail, timestamp
```

- Each document carries `memberUids` so Firestore rules can check membership without extra reads.
- A variable's `value` holds plain text when `isSensitive` is `false`.
- When `isSensitive` is `true`, `value` holds a Base64 string made of `salt (16 bytes) + IV (12 bytes) + ciphertext`.
- History entries replace sensitive values with `••••••••`.
- The full schema is in [`firebase-blueprint.json`](firebase-blueprint.json) and the rules are in [`firestore.rules`](firestore.rules).

## Security model

Sensitive values are encrypted in the browser by `src/crypto.ts` before they are written to Firestore.

- **Cipher:** AES-256-GCM with a fresh random salt and IV for every value.
- **Key derivation:** PBKDF2 with SHA-256 and 310,000 iterations.
- **Default key:** derived from the project ID, so every member of a project can decrypt its values without extra setup.
- **Custom project key:** you can save your own key for a project. It is stored only as ciphertext in the browser's IndexedDB, wrapped with a non-extractable key. It is never written to Firestore or to plain `localStorage`.
- **Access control:** Firestore security rules restrict reads and writes to project members, and only owners can manage collaborators.

Things to be aware of:

- The default key is derived from the project ID, which is not a secret. Encryption at rest therefore protects mainly against casual exposure of the raw database, not against someone who can read the project documents and knows the scheme. Use a custom project key for stronger protection, and share it with teammates through a separate channel.
- This is not a replacement for a dedicated secrets manager for high-risk production credentials.

## Project structure

```
envshare/
├── public/                    logo, favicons, apple-touch-icon
├── src/
│   ├── App.tsx                routing and top-level state
│   ├── main.tsx               entry point
│   ├── firebase.ts            Firebase init, auth and Firestore helpers
│   ├── crypto.ts              client-side encryption and key store
│   ├── types.ts               shared TypeScript types
│   ├── index.css              Tailwind import and animations
│   └── components/
│       ├── LandingPage.tsx
│       ├── AuthView.tsx
│       ├── Navbar.tsx
│       ├── Dashboard.tsx
│       ├── ProjectDetail.tsx
│       ├── AccountSettings.tsx
│       ├── TermsOfService.tsx
│       ├── PrivacyPolicy.tsx
│       └── NotFound.tsx
├── firebase-applet-config.json
├── firebase-blueprint.json
├── firestore.rules
├── firebase.json
├── vercel.json                SPA rewrite for Vercel
├── vite.config.ts
└── GOOGLE_OAUTH_SETUP.md
```

## Routes

| Path | Screen |
| --- | --- |
| `/` | Landing page |
| `/login`, `/signup` | Sign in and create account |
| `/projects` | Dashboard (signed in) |
| `/projects/:id/variables` | Project variables |
| `/projects/:id/members` | Project members |
| `/projects/:id/history` | Change history |
| `/settings` | Account settings |
| `/privacy`, `/tos` | Legal pages |

## Deployment

**Vercel (current):** the live site at https://envshare-sigma-one.vercel.app/ deploys from this repository. `vercel.json` rewrites all paths to `index.html` so client-side routes work on refresh.

**Firebase Hosting (optional):**

```bash
npm run build
firebase deploy --only hosting
```

## License

Add your license here.
