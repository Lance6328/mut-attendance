# MUT Attendance

A mobile attendance tracking app with two roles (Lecturer, Student), built with:
- **Frontend:** React Native (Expo)
- **Backend:** Supabase (Postgres, Auth, Edge Functions, Realtime)

This package contains the full project skeleton, the SQL schema, the
Edge Functions that do the secure server-side attendance check, and the
React Native screens/services needed to wire everything together.

> This project originally used Firebase, but was switched to Supabase
> because Supabase's free tier doesn't require a card on file — useful if
> you've hit Google Cloud billing verification issues (a known problem
> for some cards, including M-Pesa virtual Visa cards).

---

## 1. Folder structure

```
MUT Attendance/
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql                 # tables + RLS policies
│   │   └── 0002_schedule_token_rotation.sql
│   └── functions/                         # Edge Functions (Deno)
│       ├── _shared/helpers.ts             # Haversine + token generation
│       ├── start-session/index.ts
│       ├── mark-attendance/index.ts       # the core secure check
│       ├── end-session/index.ts
│       └── rotate-tokens/index.ts
├── mobile/                                 # Expo React Native app
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   ├── supabaseConfig.js
│   └── src/
│       ├── context/AuthContext.js
│       ├── screens/
│       │   ├── LoginScreen.js
│       │   ├── LecturerHomeScreen.js
│       │   ├── SessionScreen.js        (QR + rotating token, lecturer side)
│       │   ├── StudentHomeScreen.js
│       │   ├── ScanScreen.js           (camera scan, student side)
│       │   └── AttendanceLiveScreen.js (real-time list for lecturer)
│       ├── services/
│       │   ├── db.js                    (Realtime listeners)
│       │   ├── edgeFunctions.js         (calls Edge Functions)
│       │   └── deviceId.js
│       └── utils/permissions.js
├── scripts/
│   ├── package.json
│   └── seed.js                          # creates demo accounts
└── README.md
```

---

## 2. Prerequisites

- Node.js 18+
- npm or yarn
- A free Supabase account: https://supabase.com (no card required)
- Supabase CLI: `npm install -g supabase`
- Expo CLI (no global install needed, we use `npx expo`)
- A physical Android/iOS phone with Expo Go installed, OR an emulator
  (GPS/camera testing is much easier on a real phone)

---

## 3. Backend setup (Supabase)

### 3.1 Create the project
1. Go to https://supabase.com/dashboard → "New project"
2. Pick an org, name it `mut-attendance`, set a strong database password
   (save it somewhere — you'll only see it once)
3. Pick a region close to Kenya — at the time of writing Supabase doesn't
   have an African region; pick the closest available (e.g. an EU region)
4. Wait ~2 minutes for provisioning

### 3.2 Run the database schema
Easiest path — paste-and-run in the dashboard:
1. Dashboard → SQL Editor → New query
2. Paste the contents of `supabase/migrations/0001_init.sql` → Run

(Or, if you prefer the CLI: `supabase login`, `supabase link --project-ref YOUR_REF`,
then `supabase db push`.)

### 3.3 Get your API keys
Dashboard → Project Settings → API. You'll need:
- **Project URL** (e.g. `https://abcxyz.supabase.co`)
- **anon public key** — goes in the mobile app (`mobile/supabaseConfig.js`)
- **service_role secret key** — goes in Edge Function secrets and the seed
  script. **Never put this one in the mobile app** — it bypasses all
  security rules.

### 3.4 Deploy the Edge Functions
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

supabase functions deploy start-session
supabase functions deploy mark-attendance
supabase functions deploy end-session
supabase functions deploy rotate-tokens
```

### 3.5 Schedule token rotation (optional but recommended)
This makes the lecturer's QR code rotate roughly every minute, so an old
screenshot stops working quickly.
1. Dashboard → SQL Editor
2. Open `supabase/migrations/0002_schedule_token_rotation.sql`, replace
   `YOUR_PROJECT_REF` and `YOUR_SERVICE_ROLE_KEY` with your real values
3. Run it

If you skip this, sessions still work — the token just won't auto-rotate
in the background; it only changes if you manually re-trigger it.

---

## 4. Frontend setup (Expo)

```bash
cd mobile
npm install
```

Open `mobile/supabaseConfig.js` and paste in your **Project URL** and
**anon public key** from step 3.3.

```bash
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS) to run
it on your phone. Press `a` for Android emulator or `i` for iOS simulator
in the terminal if you prefer.

---

## 4.5 Seed demo accounts (lecturers + students)

There's no sign-up screen in the app — accounts (and their `role`) are
meant to be created by an admin. Instead of clicking through the Supabase
dashboard one user at a time, use the included seed script:

```bash
cd scripts
npm install
```

Open `scripts/seed.js` and paste in your **Project URL** and
**service_role secret key** (same ones from step 3.3), or set them as
environment variables instead:

```bash
export SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
npm run seed
```

This creates 2 demo lecturers and 4 demo students, both in Supabase Auth
and as matching `users` table rows, with course codes already assigned so
they line up for demo purposes (e.g. lecturer Jane Wanjiru teaches
`SCS302`, and students John Mwangi & Mary Atieno are enrolled in it —
start a session as Jane, mark attendance as John or Mary).

All demo accounts share the password **`Passw0rd!`**. Example login:
`janewanjiru@mut.ac.ke` / `Passw0rd!`

You can edit the `lecturers` and `students` arrays at the top of
`scripts/seed.js` to add your own real classes/students later — running
the script again is safe, it reuses existing accounts instead of erroring.

> ⚠️ The service_role key gives full admin access to your Supabase
> project. Keep it on your own computer only — never put it inside the
> `mobile/` folder or commit it anywhere public.

---

## 5. How the workflow runs end to end

1. **Lecturer** logs in → picks a course/unit → taps "Start Session".
   - App grabs a high-accuracy GPS fix.
   - App calls the `start-session` Edge Function, which creates a
     `sessions` row with `expires_at` and an initial rotating `token`.
   - App shows a QR code that re-renders whenever the session row's
     `token` field changes (via Supabase Realtime), driven server-side by
     the scheduled `rotate-tokens` function (~every minute).
2. **Student** logs in → taps "Scan Attendance" → scans the QR (or types
   the phrase shown as fallback).
   - App parses `sessionId` + `token` from the QR payload.
   - App requests a high-accuracy GPS fix (only while scanning — see
     `src/utils/permissions.js`).
   - App reads a stable `deviceId` (via `expo-application`).
   - App calls the `mark-attendance` Edge Function with
     `{ sessionId, token, lat, lng, deviceId }`.
3. **Edge Function `mark-attendance`** (all server-side, can't be spoofed
   from the client):
   - Confirms caller is an authenticated student.
   - Loads the session, checks it's `active` and not expired.
   - Checks the submitted `token` matches the session's current token.
   - Runs the Haversine formula between student and lecturer coordinates;
     rejects if outside 20 m (configurable).
   - Checks `deviceId` hasn't already been used for this session by a
     *different* student (anti multi-account-per-device cheating).
   - Writes `attendance` row with composite ID (`sessionId_studentId`) —
     this makes a second submission a harmless no-op instead of a
     duplicate row, enforced additionally by the table's primary key.
4. **Lecturer's screen** subscribes to the `attendance` table via
   Supabase Realtime for that `sessionId` → list updates live as students
   check in.

---

## 6. Anti-cheating / accuracy notes

- **Token rotation** stops students from sharing a screenshot of an old
  QR code after the lecturer has moved on.
- **20 m Haversine radius** stops off-site marking. Combine with a
  generous-but-not-huge radius because phone GPS in lecture halls can
  drift 20–50 m due to concrete/steel reflections.
- **Indoor GPS drift mitigation**: `mark-attendance` accepts an optional
  `wifiBSSID` field. If present and the lecturer's session was started
  with a known classroom BSSID, a BSSID match instantly satisfies the
  location check, bypassing the noisy GPS comparison. Reading the BSSID
  itself needs a small native module in a bare/EAS-built app, since
  Expo's managed `expo-location` APIs don't expose it directly — this is
  "secondary verification readiness," wired into the schema and function
  now.
- **One device ID per session** stops a student from scanning in for
  classmates with their own phone.
- **Composite document ID** (table primary key) stops duplicate
  submissions at the database level, not just the application level.
- **Row Level Security (RLS)**: the `attendance` table has no INSERT
  policy for regular users at all — only the service-role key used
  inside `mark-attendance` can write there. This mirrors how the
  Firebase Admin SDK worked: the only way data gets into that table is
  through verified server-side code.

---

## 7. Where to go from here

- Add push notifications (Expo Notifications) so students get reminded
  when a session opens.
- Add an admin/HOD dashboard for attendance reports, built on the same
  Postgres data — Supabase pairs nicely with tools like Retool or a
  simple Next.js app for this.
- Swap the "fallback phrase" for a short link if camera permission is
  denied.
- Free-tier note: Supabase projects pause after 1 week of inactivity.
  One click in the dashboard un-pauses them — worth knowing if you come
  back to this after a break before a demo.
