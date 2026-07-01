// supabase/functions/start-session/index.ts
//
// Called by a lecturer's app to open attendance for a class.
// Deploy: supabase functions deploy start-session
// Invoke from client: supabase.functions.invoke('start-session', { body: {...} })

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, generateToken } from "../_shared/helpers.ts";

const DEFAULT_RADIUS_METERS = 20;
const DEFAULT_SESSION_MINUTES = 45;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Client passes their own auth token; we use it to identify who's calling.
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return jsonError("Please sign in first.", 401);
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "lecturer") {
      return jsonError("Only lecturers can start a session.", 403);
    }

    const body = await req.json();
    const { courseCode, courseName, lat, lng, accuracy, wifiBSSID, durationMinutes } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return jsonError("Lecturer GPS coordinates are required.", 400);
    }

    const startedAt = new Date();
    const expiresAt = new Date(
      startedAt.getTime() + (durationMinutes || DEFAULT_SESSION_MINUTES) * 60 * 1000
    );
    const token = generateToken();

    // Use the service-role client for the actual insert, so RLS's
    // "lecturer_id = auth.uid()" check still applies via the anon client's
    // identity, but we avoid any edge-case RLS friction on insert.
    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        course_code: courseCode,
        course_name: courseName,
        lecturer_id: user.id,
        lecturer_name: profile.full_name,
        status: "active",
        lat,
        lng,
        accuracy: accuracy ?? null,
        wifi_bssid: wifiBSSID ?? null,
        radius_meters: DEFAULT_RADIUS_METERS,
        token,
        token_issued_at: startedAt.toISOString(),
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        device_ids_used: [],
      })
      .select()
      .single();

    if (error) return jsonError(error.message, 500);

    return new Response(
      JSON.stringify({ sessionId: session.id, token: session.token, expiresAt: session.expires_at }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return jsonError(String(err), 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
