# MUT Attendance

A mobile attendance tracking app for Murang'a University of Technology built with React Native (Expo) and Supabase.

## Roles

- **Lecturer** — starts an attendance session for a unit, which generates a rotating QR code anchored to their GPS location
- **Student** — scans the QR code to mark attendance, verified server-side against their GPS coordinates

## Stack

| Layer | Technology |
|---|---|
| Mobile | React Native (Expo SDK 54) |
| Database | Supabase Postgres |
| Auth | Supabase Auth (email/password) |
| Backend | Supabase Edge Functions (Deno) |
| Realtime | Supabase Realtime |

## Project Structure

```
MUT Attendance/
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   └── 0002_schedule_token_rotation.sql
│   └── functions/
│       ├── _shared/helpers.ts
│       ├── start-session/
│       ├── mark-attendance/
│       ├── end-session/
│       └── rotate-tokens/
├── mobile/
│   ├── src/
│   │   ├── context/AuthContext.js
│   │   ├── screens/
│   │   │   ├── LoginScreen.js
│   │   │   ├── LecturerHomeScreen.js
│   │   │   ├── SessionScreen.js
│   │   │   ├── StudentHomeScreen.js
│   │   │   └── ScanScreen.js
│   │   ├── services/
│   │   │   ├── db.js
│   │   │   ├── edgeFunctions.js
│   │   │   └── deviceId.js
│   │   └── utils/permissions.js
│   ├── supabaseConfig.js
│   ├── App.js
│   └── app.json
└── scripts/
    └── seed.js
```

## Running the Project

### 1. Supabase setup
- Create a free project at [supabase.com](https://supabase.com)
- Run `supabase/migrations/0001_init.sql` in the Supabase SQL Editor
- Copy your Project URL and publishable key into `mobile/supabaseConfig.js`

### 2. Deploy Edge Functions
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set SERVICE_ROLE_KEY=your_secret_key
npx supabase functions deploy start-session
npx supabase functions deploy mark-attendance
npx supabase functions deploy end-session
npx supabase functions deploy rotate-tokens
```

### 3. Seed demo accounts
```bash
cd scripts
npm install
npm run seed
```

### 4. Run the mobile app
```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone. Demo accounts use the password `Passw0rd!`

## How It Works

1. Lecturer taps a unit → app captures GPS coordinates → `start-session` Edge Function creates a session with a token and expiry timestamp
2. App displays the token as a QR code that rotates every minute via `rotate-tokens`
3. Student scans the QR code → app captures GPS coordinates and device ID → calls `mark-attendance` Edge Function
4. Edge Function verifies the token, runs Haversine distance check (20m radius), checks device ID, then writes to the attendance table
5. Lecturer's screen updates in real time via Supabase Realtime

## Security

- All attendance verification runs server-side — students cannot spoof results from the client
- Haversine formula enforces a 20m radius from the lecturer's GPS position
- QR tokens rotate every minute — screenshots go stale quickly
- One device ID allowed per session — prevents one phone checking in multiple students
- RLS policies block all direct client writes to the `attendance` table