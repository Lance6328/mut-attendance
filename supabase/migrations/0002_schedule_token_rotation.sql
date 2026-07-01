-- ============================================================================
-- Schedules the rotate-tokens Edge Function to run every minute using
-- pg_cron + pg_net (both available as free extensions on Supabase).
--
-- Run this AFTER you've deployed the rotate-tokens function and have its
-- project URL + service role key. Paste into the Supabase SQL editor.
-- Replace the two placeholders below before running.
-- ============================================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'rotate-attendance-tokens',   -- job name
  '* * * * *',                   -- every minute
  $$
  select net.http_post(
    url := 'https://rwgjexiaingofboptuci.supabase.co/functions/v1/rotate-tokens',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To check it's running:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 5;

-- To remove it later:
--   select cron.unschedule('rotate-attendance-tokens');
