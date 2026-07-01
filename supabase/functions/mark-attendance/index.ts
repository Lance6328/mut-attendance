// supabase/functions/mark-attendance/index.ts
//
// The core secure verification function (student side). Runs entirely on
// Supabase's servers, so a student's phone can't fake the result — same
// idea as the original Firebase Cloud Function, just on Supabase Edge
// Functions (Deno) + Postgres instead.
//
// Deploy: supabase functions deploy mark-attendance
// Set secrets first (one-time):
//   supabase secrets set SERVICE_ROLE_KEY=your-service-role-key

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, haversineMeters, isExpired } from "../_shared/helpers.ts";

const DEFAULT_RADIUS_METERS = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // anonClient: used only to identify which user is calling (respects RLS).
    const authHeader = req.headers.get("Authorization")!;
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await anonClient.auth.getUser();
    if (!user) return jsonError("Please sign in first.", 401);

    const body = await req.json();
    const { sessionId, token, lat, lng, accuracy, deviceId, wifiBSSID } = body;

    if (!sessionId || !token || !deviceId) {
      return jsonError("sessionId, token and deviceId are required.", 400);
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      return jsonError("Student GPS coordinates are required.", 400);
    }

    // adminClient: service-role key, bypasses RLS. This is the ONLY place
    // in the whole app allowed to write to the attendance table — exactly
    // mirroring how the Firebase version used the Admin SDK.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await adminClient
      .from("users")
      .select("role, full_name, reg_no")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "student") {
      return jsonError("Only students can mark attendance.", 403);
    }

    const { data: session } = await adminClient
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!session) return jsonError("Session not found.", 404);

    if (session.status !== "active") {
      return jsonError("This session has ended.", 409);
    }
    if (isExpired(session.expires_at)) {
      return jsonError("This session has expired.", 409);
    }
    if (session.token !== token) {
      return jsonError("Invalid or outdated code — please rescan the latest QR code.", 403);
    }

    const attendanceId = `${sessionId}_${user.id}`;

    const { data: existing } = await adminClient
      .from("attendance")
      .select("id")
      .eq("id", attendanceId)
      .maybeSingle();

    if (existing) {
      // Idempotent: same student re-submitting (e.g. flaky retry) is fine.
      return jsonOk({ ok: true, alreadyMarked: true });
    }

    if ((session.device_ids_used || []).includes(deviceId)) {
      return jsonError(
        "This device has already been used to mark attendance for this session.",
        403
      );
    }

    let verifiedBy: "gps" | "wifi" = "gps";
    const distanceMeters = haversineMeters(session.lat, session.lng, lat, lng);
    const radius = session.radius_meters || DEFAULT_RADIUS_METERS;

    // Secondary verification: classroom Wi-Fi BSSID match bypasses noisy
    // GPS. Indoor GPS can drift 20-50m off due to concrete/steel
    // reflection. Reading the BSSID on-device needs a small native module
    // in a bare/EAS-built app, since Expo's managed APIs don't expose it
    // directly — this field is wired and ready for that.
    if (wifiBSSID && session.wifi_bssid && wifiBSSID === session.wifi_bssid) {
      verifiedBy = "wifi";
    } else if (distanceMeters > radius) {
      return jsonError(
        `You appear to be ${Math.round(distanceMeters)}m from the lecture hall. ` +
          `You must be within ${radius}m to mark attendance.`,
        403
      );
    }

    const { error: insertError } = await adminClient.from("attendance").insert({
      id: attendanceId,
      session_id: sessionId,
      student_id: user.id,
      student_name: profile.full_name,
      reg_no: profile.reg_no,
      course_code: session.course_code,
      device_id: deviceId,
      student_lat: lat,
      student_lng: lng,
      student_accuracy: accuracy ?? null,
      distance_meters: Math.round(distanceMeters * 10) / 10,
      verified_by: verifiedBy,
    });

    if (insertError) return jsonError(insertError.message, 500);

    const { error: updateError } = await adminClient
      .from("sessions")
      .update({ device_ids_used: [...(session.device_ids_used || []), deviceId] })
      .eq("id", sessionId);

    if (updateError) return jsonError(updateError.message, 500);

    return jsonOk({ ok: true, alreadyMarked: false, distanceMeters: Math.round(distanceMeters) });
  } catch (err) {
    return jsonError(String(err), 500);
  }
});

function jsonOk(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
