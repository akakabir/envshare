# Security Specification: EnvShare Firestore Rules

## 1. Data Invariants

1. **User Invariant**: A user document at `/users/{userId}` can only be created, read, updated, or deleted by the authenticated user whose `request.auth.uid == userId`.
2. **User Lookup Invariant**: A document in `/userLookup/{email}` can only be written by the authenticated user if `request.auth.uid == incoming().uid` and the incoming email matches the user's authentic token email. Any authenticated user can read an entry to verify if an email exists for project sharing.
3. **Project Invariant**:
   - `ownerId` must equal `request.auth.uid` upon creation and is immutable upon update.
   - `memberUids` must include `ownerId` upon creation.
   - Only the project creator (`ownerId == request.auth.uid`) can update project details or manage member lists (`memberUids`, `memberEmails`).
   - Read access (get & list) is restricted to users who are members of the project (`request.auth.uid in resource.data.memberUids`).
   - Delete access is restricted strictly to the project creator (`ownerId == request.auth.uid`).

## 2. Dirty Dozen Payloads

1. **Unauthenticated Read on Projects**: Querying projects without being signed in -> Expected: PERMISSION_DENIED.
2. **Impersonate User Profile Creation**: Creating `/users/victim_uid` with `request.auth.uid = attacker_uid` -> Expected: PERMISSION_DENIED.
3. **Foreign Profile Read**: User A reading `/users/user_b` -> Expected: PERMISSION_DENIED.
4. **Create Project with Spoofed Owner**: Creating project with `ownerId = "someone_else"` -> Expected: PERMISSION_DENIED.
5. **Project Creation Without Self as Member**: Creating project without `request.auth.uid` in `memberUids` -> Expected: PERMISSION_DENIED.
6. **Non-Member Project Read**: User C attempting to read a project where `user_c` is not in `memberUids` -> Expected: PERMISSION_DENIED.
7. **Non-Owner Project Update**: Member attempting to change project name or add members -> Expected: PERMISSION_DENIED.
8. **Ownership Transfer Attack**: Attempting to update `ownerId` from creator to attacker -> Expected: PERMISSION_DENIED.
9. **Non-Owner Project Deletion**: Member attempting to delete project owned by creator -> Expected: PERMISSION_DENIED.
10. **Malicious Lookup Hijack**: Attacker setting `/userLookup/victim@example.com` with attacker UID -> Expected: PERMISSION_DENIED.
11. **Huge String Injection**: Injecting a 500KB string into project name -> Expected: PERMISSION_DENIED.
12. **Blanket List Scraping**: Attempting an open `collection("projects")` list without filtering by member -> Expected: PERMISSION_DENIED.

## 3. Test Runner Definitions
Tests verify all dirty dozen operations fail with PERMISSION_DENIED and only legitimate owner/member actions succeed.
