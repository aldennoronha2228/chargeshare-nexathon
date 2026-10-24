# Admin access setup

The admin login is handled by the Node server. Credentials are read from the project `.env` at server startup and are not bundled into the browser app.

## Configure administrator accounts

Add one or more accounts to `.env` as a JSON array. Each account can sign in with its email and password; Google sign-in is also accepted for an email in this list.

```dotenv
ADMIN_USERS='[{"email":"admin@example.com","password":"use-a-long-unique-password"},{"email":"second@example.com","password":"use-another-long-unique-password"}]'
```

Use long, unique passwords. Do not prefix this variable with `VITE_`, commit `.env`, or send these credentials to the browser.

For production, also set `ADMIN_SESSION_SECRET` to a random value of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. Local development generates a temporary secret automatically; restarting the server signs out existing sessions.

## Configure backend access to Firestore

Admin identities stay in `ADMIN_USERS`; the server does not create or look up admin records in Firestore. After the server validates that allowlist and issues its HTTP-only session, it reads the app data with Firebase Admin. Firebase Admin runs only on the server and bypasses Firestore security rules for these reads. Do not make Firestore collections public to enable the dashboard.

This backend connection uses a Firebase service identity. It is separate from the list of people allowed to log in: it grants the server permission to access the project, rather than defining who is an admin. Locally, provide a service account with Firestore read access and Firebase Authentication user-list access. Use either option in `.env`:

```dotenv
GOOGLE_APPLICATION_CREDENTIALS="C:/secure/chargeshare-service-account.json"
```

Or put the downloaded service-account JSON on one line in `.env` as `FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'`. Replace the example with the complete JSON contents; do not include `...`. Never commit `.env` or share the private key. On Cloud Run, assign a service identity with Firebase Authentication Viewer and Firestore read permissions instead of downloading a key.

The Firebase web API key and `ADMIN_USERS` alone cannot provide privileged backend access. That is why a missing service-account credential stops the dashboard from loading Firebase records even when admin login succeeds.

## Geocode charger pins

Add `APILAYER_POSITIONSTACK_ACCESS_KEY` to `.env` to use APILayer Positionstack for address search and charger pin reverse geocoding. Keep the key server-only (no `VITE_` prefix). The provider form stores the confirmed latitude/longitude with the charger and uses reverse geocoding to fill its address, locality, and city. If the key is empty, reverse lookup falls back to OpenStreetMap Nominatim and area search uses its existing geocoder fallback. Positionstack authenticates with an `access_key` query parameter; the server keeps that key out of browser requests. See [Positionstack setup](https://docs.apilayer.com/positionstack/docs/getting-started).

## Provider application documents

Set `CLOUDINARY_URL` in `.env` using `cloudinary://<api_key>:<api_secret>@<cloud_name>`. Keep it server-only without a `VITE_` prefix. The Node backend verifies the Firebase sign-in token and signs Cloudinary uploads. Charger photos use normal public delivery; electricity bills and ownership documents use Cloudinary's authenticated delivery and are streamed to the admin review page only after an admin session is checked. Provider applications are saved with `under_review`; only the admin backend can accept or decline them.

## Run

```powershell
npm run dev
```

Open `http://localhost:3001/admin`. The same Node process serves the Vite app and the protected `/api/admin/*` endpoints. In production, run `npm run build` and then `npm start` in an environment that provides the server-only variables and Firebase Admin identity.

The server issues an HTTP-only, same-site session cookie, limits repeated password attempts, checks the admin allowlist on every request, and redacts fields named like credentials or tokens before returning records. The dashboard refreshes its data every minute. Payment sections show records if those collections are populated; booking amounts are never treated as completed payments. Keep the service account narrowly scoped and rotate it if it is exposed.
