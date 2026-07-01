import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../supabaseConfig";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // Supabase auth session
  const [profile, setProfile] = useState(null); // users row, includes role
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      loadProfile(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      loadProfile(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(session) {
    if (!session?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("users").select("*").eq("id", session.user.id).single();
    setProfile(data || null);
    setLoading(false);
  }

  return (
    <AuthContext.Provider value={{ user: session?.user || null, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
