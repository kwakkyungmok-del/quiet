import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { CharacterBadge } from "@/components/chat/CharacterBadge";
import { WhisperDialog } from "@/components/chat/WhisperDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/room/$slug")({
  component: RoomPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} 방 — 밤의 로비` },
      { name: "description", content: "주제별 익명 채팅방" },
    ],
  }),
});

type Room = { id: string; slug: string; name: string; description: string | null };
type Message = { id: string; room_id: string; sender_id: string; content: string; created_at: string };

function RoomPage() {
  const { slug } = Route.useParams();
  const { user, profile, loading, banned } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [whisperTo, setWhisperTo] = useState<Profile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  // 방 정보
  useEffect(() => {
    supabase.from("rooms").select("*").eq("slug", slug).maybeSingle().then(({ data }) => {
      if (data) setRoom(data as Room);
    });
  }, [slug]);

  // 메시지 + 실시간
  useEffect(() => {
    if (!room) return;
    let active = true;
    supabase
      .from("messages")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (active && data) setMessages(data as Message[]);
      });

    const ch = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${room.id}` },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as Message;
            return prev.find((x) => x.id === m.id) ? prev : [...prev, m];
          });
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [room?.id]);

  // 프로필 캐시 채우기
  useEffect(() => {
    const missing = Array.from(new Set(messages.map((m) => m.sender_id))).filter((id) => !profiles[id]);
    if (missing.length === 0) return;
    supabase
      .from("profiles")
      .select("id, character_name, color, noun")
      .in("id", missing)
      .then(({ data }) => {
        if (!data) return;
        setProfiles((prev) => {
          const next = { ...prev };
          (data as Profile[]).forEach((p) => (next[p.id] = p));
          return next;
        });
      });
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!room || !profile) return;
    const content = text.trim();
    if (!content || content.length > 1000) return;
    setBusy(true);
    const { error } = await supabase
      .from("messages")
      .insert({ room_id: room.id, sender_id: profile.id, content });
    setBusy(false);
    if (error) toast.error("메시지를 보내지 못했어요");
    else setText("");
  }

  if (loading || !profile || !room) {
    return <main className="min-h-screen flex items-center justify-center text-muted-foreground">불러오는 중…</main>;
  }

  return (
    <main className="min-h-screen flex flex-col max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <header className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <Link to="/lobby" className="text-xs text-muted-foreground hover:text-foreground transition">← 로비</Link>
          <h1 className="font-display text-2xl mt-1">{room.name}</h1>
          {room.description && <p className="text-sm text-muted-foreground">{room.description}</p>}
        </div>
        <CharacterBadge name={profile.character_name} color={profile.color} size="sm" />
      </header>

      <div ref={scrollRef} className="flex-1 glass rounded-2xl p-4 overflow-y-auto space-y-3 min-h-[50vh]">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">
            첫 마디를 남겨보세요.
          </p>
        )}
        {messages.map((m) => {
          const p = profiles[m.sender_id];
          const mine = m.sender_id === profile.id;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {p && (
                <CharacterBadge
                  name={p.character_name}
                  color={p.color}
                  size="sm"
                  onClick={mine ? undefined : () => setWhisperTo(p)}
                  title={mine ? undefined : "귓속말 보내기"}
                  className="mb-1"
                />
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                  mine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="flex gap-2 mt-4">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={banned ? "차단된 상태에서는 채팅을 보낼 수 없어요" : `${room.name} 방에 한마디…`}
          maxLength={1000}
          disabled={!!banned}
        />
        <Button type="submit" disabled={busy || !text.trim() || !!banned} className="bg-gradient-aurora text-primary-foreground border-0">
          보내기
        </Button>
      </form>
      <p className={`mt-2 text-xs ${banned ? "text-destructive" : "text-muted-foreground"}`}>
        {banned
          ? `차단됨 — ${new Date(banned.expires_at).toLocaleString()}까지 채팅이 제한됩니다${banned.reason ? ` (${banned.reason})` : ""}.`
          : "부적절한 발언을 할 시 밴당할 수 있습니다."}
      </p>

      <WhisperDialog me={profile} other={whisperTo} onClose={() => setWhisperTo(null)} />
    </main>
  );
}
