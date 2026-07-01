// supabase/functions/end-session/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Please sign in first.", 401);

    const { sessionId } = await req.json();

    const { data: session } = await supabase
      .from("sessions")
      .select("lecturer_id")
      .eq("id", sessionId)
      .single();

    if (!session) return jsonError("Session does not exist.", 404);
    if (session.lecturer_id !== user.id) return jsonError("Not your session.", 403);

    const { error } = await supabase
      .from("sessions")
      .update({ status: "ended" })
      .eq("id", sessionId);

    if (error) return jsonError(error.message, 500);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
