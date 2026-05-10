import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { CharacterBadge } from "@/components/chat/CharacterBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const CREATOR_EMAIL = "kwak.kyungmok@gmail.com";

export const Route = createFileRoute("/creator")({
  component: CreatorPage,
  head: () => ({
    meta: [
      { title: "제작자 — 밤의 로비" },
      { name: "description", content: "밤의 로비를 만든 사람을 위한 공간." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Msg = { id: string; sender_id: string; room_id: string; content: string; created_at: string };
type Whisper = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string };
type Room = { id: string; name: string; slug: string };
type Ban = { id: string; user_id: string; expires_at: string; reason: string | null };

const DURATIONS: { label: string; days: number }[] = [
  { label: "하루", days: 1 },
  { label: "일주일", days: 7 },
  { label: "한 달", days: 30 },
  { label: "3개월", days: 90 },
  { label: "1년", days: 365 },
];

function CreatorPage() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  const [users, setUsers] = useState<Profile[]>([]);
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [whispers, setWhispers] = useState<Whisper[]>([]);
  const [counts, setCounts] = useState<{ messages: number; whispers: number } | null>(null);
  const [bans, setBans] = useState<Record<string, Ban>>({});
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banBusy, setBanBusy] = useState(false);

  const isCreator = user?.email?.toLowerCase() === CREATOR_EMAIL;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!isCreator) navigate({ to: "/lobby" });
  }, [user, loading, isCreator, navigate]);

  useEffect(() => {
    if (!isCreator) return;
    (async () => {
      const [{ data: profs }, { data: rms }, { data: bs }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("rooms").select("id, name, slug"),
        supabase.from("bans").select("id, user_id, expires_at, reason").gt("expires_at", new Date().toISOString()),
      ]);
      if (profs) setUsers(profs as Profile[]);
      if (rms) {
        const map: Record<string, Room> = {};
        for (const r of rms as Room[]) map[r.id] = r;
        setRooms(map);
      }
      if (bs) {
        const m: Record<string, Ban> = {};
        for (const b of bs as Ban[]) m[b.user_id] = b;
        setBans(m);
      }
    })();
  }, [isCreator]);

  async function refreshBans() {
    const { data } = await supabase
      .from("bans")
      .select("id, user_id, expires_at, reason")
      .gt("expires_at", new Date().toISOString());
    const m: Record<string, Ban> = {};
    for (const b of (data ?? []) as Ban[]) m[b.user_id] = b;
    setBans(m);
  }

  async function applyBan(days: number) {
    if (!selected || !user) return;
    setBanBusy(true);
    const expires_at = new Date(Date.now() + days * 86400_000).toISOString();
    const { error } = await supabase.from("bans").insert({
      user_id: selected.id,
      banned_by: user.id,
      reason: banReason.trim() || null,
      expires_at,
    });
    setBanBusy(false);
    if (error) {
      toast.error("밴에 실패했어요: " + error.message);
      return;
    }
    toast.success(`${selected.character_name} 차단됨 (${days}일)`);
    setBanOpen(false);
    setBanReason("");
    await refreshBans();
  }

  async function unban() {
    if (!selected) return;
    const { error } = await supabase.from("bans").delete().eq("user_id", selected.id);
    if (error) toast.error("해제 실패: " + error.message);
    else {
      toast.success("차단 해제됨");
      await refreshBans();
    }
  }

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      setWhispers([]);
      setCounts(null);
      return;
    }
    (async () => {
      const [{ data: msgs, count: mc }, { data: wsps, count: wc }] = await Promise.all([
        supabase
          .from("messages")
          .select("*", { count: "exact" })
          .eq("sender_id", selected.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("whispers")
          .select("*", { count: "exact" })
          .or(`sender_id.eq.${selected.id},recipient_id.eq.${selected.id}`)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      setMessages((msgs ?? []) as Msg[]);
      setWhispers((wsps ?? []) as Whisper[]);
      setCounts({ messages: mc ?? 0, whispers: wc ?? 0 });
    })();
  }, [selected?.id]);

  if (loading || !user || !isCreator) {
    return <main className="min-h-screen flex items-center justify-center text-muted-foreground">확인 중…</main>;
  }

  const filtered = users.filter((u) =>
    !query.trim() ? true : u.character_name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <main className="min-h-screen px-6 py-10 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-display text-xl tracking-tight">밤의 로비</Link>
          <span className="px-2 py-0.5 rounded-full text-[10px] tracking-widest uppercase glass text-muted-foreground">
            Creator
          </span>
        </div>
        <div className="flex items-center gap-3">
          {profile && <CharacterBadge name={profile.character_name} color={profile.color} size="sm" />}
          <Button asChild variant="ghost" size="sm"><Link to="/lobby">로비</Link></Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
          >
            나가기
          </Button>
        </div>
      </header>

      <section className="mb-8">
        <h1 className="font-display text-3xl mb-1">사용자 모니터</h1>
        <p className="text-sm text-muted-foreground">
          전체 캐릭터 <span className="text-foreground">{users.length}</span>명. 이름을 누르면 대화와 세부 정보를 볼 수 있어요.
        </p>
      </section>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* 사용자 목록 */}
        <aside className="glass rounded-2xl p-4 max-h-[70vh] overflow-y-auto">
          <Input
            placeholder="캐릭터 이름 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-3"
          />
          <ul className="space-y-1.5">
            {filtered.map((u) => (
              <li key={u.id}>
                <button
                  onClick={() => setSelected(u)}
                  className={`w-full text-left rounded-lg px-2 py-1.5 transition flex items-center gap-2 ${
                    selected?.id === u.id ? "bg-primary/15" : "hover:bg-foreground/5"
                  }`}
                >
                  <CharacterBadge name={u.character_name} color={u.color} size="sm" />
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="text-sm text-muted-foreground text-center py-6">결과 없음</li>
            )}
          </ul>
        </aside>

        {/* 상세 */}
        <section className="space-y-4">
          {!selected ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
              왼쪽에서 캐릭터를 선택하세요.
            </div>
          ) : (
            <>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <CharacterBadge name={selected.character_name} color={selected.color} size="lg" />
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-xs text-muted-foreground">
                      공개 메시지 {counts?.messages ?? "—"} · 귓속말 {counts?.whispers ?? "—"}
                    </div>
                    {bans[selected.id] ? (
                      <Button size="sm" variant="outline" onClick={unban}>
                        차단 해제 ({new Date(bans[selected.id].expires_at).toLocaleDateString()}까지)
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" onClick={() => setBanOpen(true)}>
                        밴하기
                      </Button>
                    )}
                  </div>
                </div>
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <Field label="한 줄 소개" value={selected.bio} />
                  <Field label="분위기" value={selected.vibe} />
                  <Field label="취미" value={selected.hobbies} />
                  <Field label="성격" value={selected.personality} />
                  <Field label="좋아하는 것" value={selected.favorites} className="sm:col-span-2" />
                  <Field label="색상 코드" value={selected.color} />
                  <Field label="사용자 ID" value={selected.id} />
                </dl>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="glass rounded-2xl p-5">
                  <h3 className="font-display text-lg mb-3">최근 공개 메시지</h3>
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">없음</p>
                  ) : (
                    <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
                      {messages.map((m) => (
                        <li key={m.id} className="text-sm border-l-2 border-primary/40 pl-3">
                          <div className="text-[11px] text-muted-foreground">
                            {rooms[m.room_id]?.name ?? "방"} · {new Date(m.created_at).toLocaleString()}
                          </div>
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="glass rounded-2xl p-5">
                  <h3 className="font-display text-lg mb-3">최근 귓속말</h3>
                  {whispers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">없음</p>
                  ) : (
                    <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
                      {whispers.map((w) => {
                        const outgoing = w.sender_id === selected.id;
                        return (
                          <li key={w.id} className="text-sm border-l-2 border-accent/40 pl-3">
                            <div className="text-[11px] text-muted-foreground">
                              {outgoing ? "보냄 →" : "← 받음"} · {new Date(w.created_at).toLocaleString()}
                            </div>
                            <div className="whitespace-pre-wrap break-words">{w.content}</div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent className="glass border-border">
          <DialogHeader>
            <DialogTitle>{selected?.character_name} 차단</DialogTitle>
            <DialogDescription>
              차단 기간을 선택하세요. 이 사용자는 기간 동안 채팅과 귓속말을 보낼 수 없습니다 (방과 귓속말창 입장은 가능).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="사유 (선택)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              maxLength={200}
            />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DURATIONS.map((d) => (
                <Button
                  key={d.days}
                  size="sm"
                  variant="destructive"
                  disabled={banBusy}
                  onClick={() => applyBan(d.days)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanOpen(false)}>취소</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({ label, value, className = "" }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-foreground/90 break-words">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}
