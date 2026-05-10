import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CharacterBadge } from "@/components/chat/CharacterBadge";
import { Button } from "@/components/ui/button";

const CREATOR_EMAIL = "kwak.kyungmok@gmail.com";

export const Route = createFileRoute("/lobby")({
  component: Lobby,
  head: () => ({
    meta: [
      { title: "로비 — 밤의 로비" },
      { name: "description", content: "주제별 채팅방을 골라 들어가세요." },
    ],
  }),
});

type Room = { id: string; slug: string; name: string; description: string | null };

function Lobby() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const isCreator = user?.email?.toLowerCase() === CREATOR_EMAIL;

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    supabase.from("rooms").select("*").order("created_at").then(({ data }) => {
      if (data) setRooms(data as Room[]);
    });
  }, []);

  if (loading || !profile) {
    return <main className="min-h-screen flex items-center justify-center text-muted-foreground">불러오는 중…</main>;
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-12 flex-wrap gap-4">
        <Link to="/" className="font-display text-xl tracking-tight">밤의 로비</Link>
        <div className="flex items-center gap-3">
          <CharacterBadge name={profile.character_name} color={profile.color} />
          {isCreator && (
            <Button asChild variant="secondary" size="sm">
              <Link to="/creator">제작자 화면</Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
          >
            나가기
          </Button>
        </div>
      </header>

      <section className="mb-10">
        <h1 className="font-display text-4xl mb-3 text-balance">오늘 밤, 어디로 갈까요</h1>
        <p className="text-muted-foreground">
          당신은 <span className="text-foreground font-medium">{profile.character_name}</span>입니다.
          다른 캐릭터의 이름을 누르면 귓속말을 보낼 수 있어요.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link to="/profile">프로필 수정</Link>
          </Button>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-4">
        {rooms.map((r) => (
          <Link
            key={r.id}
            to="/room/$slug"
            params={{ slug: r.slug }}
            className="glass rounded-2xl p-6 hover:shadow-glow hover:-translate-y-0.5 transition group"
          >
            <div className="font-display text-2xl mb-1 group-hover:text-primary transition">{r.name}</div>
            <div className="text-sm text-muted-foreground">{r.description}</div>
          </Link>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link to="/whispers" className="text-sm text-muted-foreground hover:text-foreground transition underline-offset-4 hover:underline">
          내 귓속말함 →
        </Link>
      </div>
    </main>
  );
}
