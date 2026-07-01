// supabase/functions/rotate-tokens/index.ts
//
// Rotates the QR token for every active session roughly every minute, so a
// screenshotted QR code goes stale fast. This function itself doesn't
// schedule itself — Supabase's pg_cron extension calls it on a timer (see
// README "Schedule token rotation" section for the SQL that wires this up).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, generateToken, isExpired } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    const { data: activeSessions, error } = await adminClient
      .from("sessions")
      .select("id, expires_at")
      .eq("status", "active");

    if (error) throw error;

    for (const session of activeSessions || []) {
      if (isExpired(session.expires_at)) {
        await adminClient.from("sessions").update({ status: "ended" }).eq("id", session.id);
      } else {
        await adminClient
          .from("sessions")
          .update({ token: generateToken(), token_issued_at: new Date().toISOString() })
          .eq("id", session.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, rotated: (activeSessions || []).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
