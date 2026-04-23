# Vercel Deployment

## Services
- `Vercel` hosts the Next.js app and route handlers.
- `Firebase Firestore` stores race state, runners, finishers, and shared video state.
- `LiveKit Cloud` carries the low-latency operator video feed to the public display.

## Environment Variables
Copy values into Vercel project settings and local `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

`FIREBASE_PRIVATE_KEY` should be stored with escaped newlines in Vercel, for example `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`.

## Vercel Project Setup
1. Create a new Vercel project and import this repository.
2. Let Vercel auto-detect the framework as `Next.js`.
3. Add the environment variables below in `Project Settings -> Environment Variables` for the environments you use:
   - `Development`
   - `Preview`
   - `Production`
4. Redeploy after saving environment variables. Vercel only applies new environment variable values to new deployments.
5. Link the repo locally and pull the development variables when you want local parity:
   - `vercel link`
   - `vercel env pull .env.local`

## Firebase Setup
1. Create a Firebase project in the Firebase console.
2. Enable `Cloud Firestore` in Native mode.
3. Apply the rules from [firebase/firestore.rules](firebase/firestore.rules).
4. Create a web app in Firebase and copy the public config values into the `NEXT_PUBLIC_FIREBASE_*` variables.
5. Create a service account from `Project settings -> Service accounts`, then copy:
   - project ID
   - client email
   - private key
6. Put those values into `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.

## LiveKit Setup
1. Create a LiveKit Cloud project.
2. Copy the server URL, API key, and API secret into the environment variables above.
3. Use the operator dashboard to publish a mapped camera slot.

## Local Verification
1. Install dependencies with `npm install`.
2. Add local `.env.local` values or run `vercel env pull .env.local` after the project is linked.
3. Run `npm run dev`.
4. Open `/` on the operator laptop and `/public-display` on a second browser or laptop.
5. Import a masterlist, start the race, publish `test-camera`, and verify the public display updates.
