import { supabase } from "../../supabaseConfig";

/**
 * Thin wrapper around supabase.functions.invoke, so screens don't repeat
 * the error-unwrapping boilerplate. Throws a plain Error with the
 * function's own message on failure, so screens can just catch(err) and
 * show err.message (same pattern as before with Firebase HttpsError).
 */
async function callEdgeFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // Supabase wraps the function's JSON error response; try to surface
    // the real message it sent back.
    let message = error.message;
    try {
      const context = await error.context?.json?.();
      if (context?.error) message = context.error;
    } catch {
      // fall back to error.message
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const startSessionFn = (body) => callEdgeFunction("start-session", body);
export const endSessionFn = (body) => callEdgeFunction("end-session", body);
export const markAttendanceFn = (body) => callEdgeFunction("mark-attendance", body);
