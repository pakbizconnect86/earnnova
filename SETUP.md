# EarnNova — Phase 1 Setup

## Files in this phase
- `index.html` — landing page
- `login.html` — email/phone login
- `register.html` — registration
- `firebase-config.js` — shared config + collection helpers (used by every page)

## 1. Firebase setup
1. Go to Firebase Console → your project **taskyaar-a925b** → Project Settings → General → Your apps.
2. Copy the web app config values into `firebase-config.js` (apiKey, messagingSenderId, appId).
3. Enable **Authentication → Sign-in method → Email/Password**.
4. Enable **Firestore Database** (production mode).

## 2. Collections (all prefixed `earnnova_` so they never touch TaskYaar data)

| Collection | Purpose | Key fields |
|---|---|---|
| `earnnova_users` | Profile + role | userId, fullName, email, phone, role, status, referralCode, referredBy, createdAt |
| `earnnova_wallets` | One doc per user (docId = uid) | availableBalance, pendingEarnings, withdrawalPending, totalEarned, totalWithdrawn |
| `earnnova_transactions` | Ledger — never edit balance directly | userId, type, amount, previousBalance, newBalance, reference, status, createdAt, createdBy |
| `earnnova_tasks` | Task marketplace | title, description, category, reward, deadline, instructions, requirements, status |
| `earnnova_task_submissions` | Proof submissions | taskId, userId, proof, status, reviewedBy, reviewedAt |
| `earnnova_deposits` | Manual deposit requests | userId, amount, method, txnId, screenshotUrl, status |
| `earnnova_withdrawals` | Manual withdrawal requests | userId, amount, method, accountName, accountNumber, status, paymentRef |
| `earnnova_subscription_plans` | Starter/Pro/Premium | name, price, features, active |
| `earnnova_subscriptions` | User's active plan | userId, planId, status, startedAt, expiresAt |
| `earnnova_referrals` | Referral tracking | referrerUid, referredUid, status |
| `earnnova_notifications` | Per-user alerts | userId, title, message, read, createdAt |
| `earnnova_support_tickets` | Support tickets | userId, category, subject, message, status |
| `earnnova_admin_logs` | Audit trail | adminId, action, targetUserId, amount, reference, createdAt |
| `earnnova_settings` | Platform config (single doc) | currency, minWithdrawal, paymentDetails, maintenanceMode |

## 3. Critical security rule
**The browser must never write to `availableBalance` directly.** In Phase 1 this isn't enforced yet
(no deposits/withdrawals exist yet) — but before Phase 3 (deposits) ships, add Firestore Security
Rules so `earnnova_wallets` balance fields are only writable by a Cloud Function / admin, never by
a plain client `update()`. Example rule sketch for later:

```
match /earnnova_wallets/{uid} {
  allow read: if request.auth.uid == uid;
  allow write: if false; // only Cloud Functions with admin SDK may write
}
```

Since you're on the Cloudflare Workers + Firebase stack, the actual balance-changing logic
(approve deposit, mark withdrawal paid, approve task) should run in a Worker using the Firebase
Admin SDK — not from `login.html`/`dashboard.html` client code.

## 4. What's next (Phase 2)
`dashboard.html` + `wallet.html` + `transactions.html` — reading wallet balance and transaction
history for the logged-in user (read-only, so safe to build fully client-side).

Say "next phase" and I'll continue building.
