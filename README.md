# Program Accounting

Single-program financial management for the Pierre Robin Sequence Symposium & Workshop.

## Local development

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

Copy `.env.example` to `.env.local` and provide the Firebase web app values. Never commit `.env.local`.

## Firebase configuration

1. Create a Firebase project and Web App.
2. Enable Authentication → Google provider.
3. Create Firestore in production mode.
4. Enable Firebase Storage.
5. Install the Firebase CLI: `npm install -g firebase-tools`.
6. Sign in and select the project: `firebase login` then `firebase use --add`.
7. Deploy security configuration:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

Add this to `firebase.json` if the Firebase CLI has not created it:

```json
{
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "storage": { "rules": "storage.rules" }
}
```

## First administrator

The rules intentionally prevent a user from making themselves an admin. Create the first member manually in Firebase Console after that user signs in with Google:

```text
programs/prs-symposium-2026/members/{firebaseAuthUid}
```

```json
{
  "email": "admin@example.com",
  "role": "admin",
  "active": true,
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp"
}
```

After bootstrap, only an existing admin can assign or change roles.

## Financial rules

- Monetary values are stored as integer sen.
- Cancelled and soft-deleted transactions are excluded.
- Pending expenses are committed spending, not actual spending.
- Approved and paid expenses are actual spending.
- A refund uses optional `relatedTransactionId` to reduce the related income or expense.
- Financial totals are calculated from transaction records and are never trusted client-written fields.

## Public event and registration routes

- `/` public black-and-gold event homepage
- `/register` participant registration and payment-proof upload
- `/registration-success/:referenceNumber` acknowledgement
- `/privacy` and `/terms` public legal pages
- `/admin/login` administrator sign-in
- `/admin/*` protected light-pink accounting and registration administration

Enable both **Google** and **Anonymous** providers in Firebase Authentication. Anonymous authentication assigns a temporary upload owner to a public submission; it does not grant administrator access.

In the protected Program Settings page, use **Event settings** to enter confirmed dates, venue, organiser, contacts, registration period and capacity. Empty optional fields stay hidden from the public homepage.

Deploy the expanded security configuration:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

For production, enable Firebase App Check and set `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`. Transactional email is optional; keep `EMAIL_PROVIDER_API_KEY` and `EMAIL_FROM_ADDRESS` in a trusted server environment only. Registration submission remains functional when email is not configured.
