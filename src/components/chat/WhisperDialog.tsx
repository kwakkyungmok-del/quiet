import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CharacterBadge } from "./CharacterBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Profile } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/useAuth";

type Whisper = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
};

type Props = {
  me: Profile;
  other: Profile | null;
  onClose: () => void;
};

export function WhisperDialog({ me, other, onClose }: Props) {
  const { banned } = useAuth();
  const [items, setItems] = useState<Whisper[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!other) return;
    let active = true;
    supabase
      .from("whispers")
      .select("*")
      .or(
        `and(sender_id.eq.${me.id},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${me.id})`,
      )
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (active && data) setItems(data as Whisper[]);
      });

    const ch = supabase
      .channel(`whisper-${me.id}-${other.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whispers" },
        (payload) => {
          const w = payload.new as Whisper;
          if (
            (w.sender_id === me.id && w.recipient_id === other.id) ||
            (w.sender_id === other.id && w.recipient_id === me.id)
          ) {
            setItems((prev) => (prev.find((x) => x.id === w.id) ? prev : [...prev, w]));
          }
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [me.id, other?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!other) return;
    const content = text.trim();
    if (!content || content.length > 1000) return;
    setBusy(true);
    const { error } = await supabase.from("whispers").insert({
      sender_id: me.id,
      recipient_id: other.id,
      content,
    });
    setBusy(false);
    if (error) {
      toast.error("귓속말을 보내지 못했어요");
    } else {
      setText("");
    }
  }

  return (
    <Dialog open={!!other} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <span className="text-whisper">귓속말</span>
            {other && <CharacterBadge name={other.character_name} color={other.color} size="sm" />}
          </DialogTitle>
        </DialogHeader>
        <div ref={scrollRef} className="h-80 overflow-y-auto pr-1 space-y-2 py-2">
          {items.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">
              아직 주고받은 말이 없어요. 조용히 먼저 건네보세요.
            </p>
          )}
          {items.map((w) => {
            const mine = w.sender_id === me.id;
            return (
              <div key={w.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    mine
                      ? "bg-whisper/90 text-whisper-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {w.content}
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={send} className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={banned ? "차단된 상태에서는 보낼 수 없어요" : "조용히 속삭이기…"}
            maxLength={1000}
            disabled={!!banned}
          />
          <Button type="submit" disabled={busy || !text.trim() || !!banned} className="bg-whisper text-whisper-foreground hover:opacity-90">
            보내기
          </Button>
        </form>
        <p className={`text-xs ${banned ? "text-destructive" : "text-muted-foreground"}`}>
          {banned
            ? `차단됨 — ${new Date(banned.expires_at).toLocaleString()}까지 제한됩니다.`
            : "부적절한 발언을 할 시 밴당할 수 있습니다."}
        </p>
      </DialogContent>
    </Dialog>
  );
}
