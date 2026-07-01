import { supabase } from "../../supabaseConfig";

/** Live-listen to a single session row (used to render the rotating QR token). */
export function listenToSession(sessionId, callback) {
  // Fetch the current row first, then subscribe to changes.
  supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single()
    .then(({ data }) => callback(rowToSession(data)));

  const channel = supabase
    .channel(`session-${sessionId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
      (payload) => callback(rowToSession(payload.new))
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/** Live-listen to attendance records for a session (lecturer's real-time list). */
export function listenToAttendance(sessionId, callback) {
  const fetchAll = () => {
    supabase
      .from("attendance")
      .select("*")
      .eq("session_id", sessionId)
      .order("marked_at", { ascending: false })
      .then(({ data }) => callback((data || []).map(rowToAttendance)));
  };

  fetchAll();

  const channel = supabase
    .channel(`attendance-${sessionId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "attendance", filter: `session_id=eq.${sessionId}` },
      fetchAll
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

function rowToSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    token: row.token,
    courseCode: row.course_code,
    expiresAt: row.expires_at,
  };
}

function rowToAttendance(row) {
  return {
    id: row.id,
    studentName: row.student_name,
    regNo: row.reg_no,
    distanceMeters: row.distance_meters,
    verifiedBy: row.verified_by,
    markedAt: row.marked_at,
  };
}
