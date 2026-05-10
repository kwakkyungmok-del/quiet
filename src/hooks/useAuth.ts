import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  character_name: string;
  color: string;
  noun: string;
  hobbies?: string | null;
  personality?: string | null;
  bio?: string | null;
  favorites?: string | null;
  vibe?: string | null;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [banned, setBanned] = useState<{ expires_at: string; reason: string | null } | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setProfile(null);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    (async () => {
      const [{ data: prof }, { data: ban }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, character_name, color, noun, hobbies, personality, bio, favorites, vibe")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("bans")
          .select("expires_at, reason")
          .eq("user_id", user.id)
          .gt("expires_at", new Date().toISOString())
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!active) return;
      setProfile(prof as Profile | null);
      setBanned((ban as { expires_at: string; reason: string | null } | null) ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  return { session, user, profile, loading, banned };
}
