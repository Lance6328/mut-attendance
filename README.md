Got it — a clean project README, not a tutorial. Here's the rewrite:

Open `README.md` and replace everything with:

```markdown
# MUT Attendance

A mobile attendance tracking app for Murang'a University of Technology built with React Native (Expo) and Supabase.

## Roles
- **Lecturer** — starts an attendance session for a unit, which generates a rotating QR code anchored to their GPS location
- **Student** — scans the QR code to mark attendance, verified server-side against their GPS coordinates

## Stack
- React Native (Expo SDK 54)
- Supabase (Postgres, Auth, Edge Functions, Realtime)

## Project Structure
```
MUT Attendance/
├── supabase/
│   ├── migrations/        # SQL schema and pg_cron scheduling
│   └── functions/         # Edge Functions (Deno)
│       ├── _shared/       # Haversine distance + token helpers
│       ├── start-session/
│       ├── mark-attendance/
│       ├── end-session/
│       └── rotate-tokens/
├── mobile/                # Expo React Native app
│   ├── src/
│   │   ├── context/       # Auth state
│   │   ├── screens/       # Login, Lecturer, Student, Scan screens
│   │   ├── services/      # Supabase queries and Edge Function calls
│   │   └── utils/         # GPS permissions, device ID
│   └── supabaseConfig.js
└── scripts/
    └── seed.js            # Creates demo accounts
```

## Security
- Attendance verification runs entirely server-side via Edge Functions
- Haversine formula enforces a 20m radius from the lecturer's GPS position
- Rotating QR tokens expire every minute
- One device ID allowed per session to prevent proxy check-ins
- RLS policies block direct client writes to the attendance table
```