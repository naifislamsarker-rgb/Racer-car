# Security Specification (Phase 0: TDD)

## 1. Data Invariants
- Public user profile documents (`/users/{userId}`) can only be created by the user with matching `request.auth.uid`. Field `uid` must match user ID.
- Private user PII data (`/users/{userId}/private/info`) is strictly owner-read/write. Email must match isEmail format and the user owns the path.
- Public score listings (`/scores/{scoreId}`) are writable by authenticated users. One can only post high score entries under their own `uid` and matching `displayName`.
- Admins (`naifislamsarker2005@gmail.com`) can override or modify administrative parameters globally.

## 2. The "Dirty Dozen" Vulnerability Sandbox Payloads
1. **PII Leakage Attack:** Read private PII of another user profile.
2. **Identity Hijack Attack:** Create a general user profile (`/users/userabc`) where `uid` does not match `request.auth.uid`.
3. **Ghost Field Mutation:** Inject `isAdmin` or `role` or any shadow field into the public `UserProfile` document upon profile creation.
4. **Leaderboard Spoofing Attack:** Post a `/scores/{scoreId}` entry with someone else's `uid` or matching another displayName.
5. **Score Injection Attack:** Inject a 1MB string or high score value payload containing malicious types (e.g., boolean or arbitrary list) into `score`.
6. **Immutable Bypassing:** Attempt to update original profile `createdAt` date.
7. **Time Spoofing Attack:** Save arbitrary client-side timestamps instead of verified Server Time.
8. **PII Query Scrape:** List query `/users` or `/users/*/private` without restricting constraints.
9. **Double-Claim Role:** Self-assigning admin role.
10. **State Step Overriding:** Update terminal completed game attributes.
11. **Orphaned Entries:** Post a score referencing a user profile that does not exist.
12. **Id Exhaustion / Wallet Denial:** Enforce ID validation with invalid long ID names.

## 3. Mock Test Scenarios
All attacks above must return an absolute `PERMISSION_DENIED` behavior when evaluated under firestore rules.
