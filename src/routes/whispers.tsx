import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { CharacterBadge } from "@/components/chat/CharacterBadge";
import { WhisperDialog } from "@/components/chat/WhisperDialog";

export const Route = createFileRoute("/whispers")({
  component: WhispersPage,
  head: () => ({
    meta: [
      { title: "귓속말함 — 밤의 로비" },
      { name: "description", content: "캐릭터끼리 주고받은 귓속말 모음" },
    ],
  }),
});

type Whisper = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string };

function WhispersPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<{ other: Profile; last: Whisper }[]>([]);
  const [open, setOpen] = useState<Profile | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from("whispers")
        .select("*")
        .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!data) return;
      const map = new Map<string, Whisper>();
      for (const w of data as Whisper[]) {
        const otherId = w.sender_id === profile.id ? w.recipient_id : w.sender_id;
        if (!map.has(otherId)) map.set(otherId, w);
      }
      const ids = Array.from(map.keys());
      if (ids.length === 0) {
        setThreads([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, character_name, color, noun")
        .in("id", ids);
      const byId = new Map((profs ?? []).map((p) => [p.id, p as Profile]));
      setThreads(
        ids
          .map((id) => ({ other: byId.get(id)!, last: map.get(id)! }))
          .filter((t) => t.other),
      );
    })();
  }, [profile?.id, open]);

  if (loading || !profile) {
    return <main className="min-h-screen flex items-center justify-center text-muted-foreground">불러오는 중…</main>;
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      <Link to="/lobby" className="text-xs text-muted-foreground hover:text-foreground transition">← 로비</Link>
      <h1 className="font-display text-3xl mt-2 mb-8">귓속말함</h1>

      {threads.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">
          아직 주고받은 귓속말이 없어요.
        </p>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.other.id}>
              <button
                onClick={() => setOpen(t.other)}
                className="w-full text-left glass rounded-xl px-4 py-3 hover:shadow-glow transition flex items-center gap-3"
              >
                <CharacterBadge name={t.other.character_name} color={t.other.color} size="sm" />
                <span className="text-sm text-muted-foreground truncate flex-1">{t.last.content}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <WhisperDialog me={profile} other={open} onClose={() => setOpen(null)} />
    </main>
  );
}
