import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CharacterBadge } from "@/components/chat/CharacterBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "프로필 — 밤의 로비" },
      { name: "description", content: "취미·성격 등 캐릭터의 자기소개를 적어두세요." },
    ],
  }),
});

const schema = z.object({
  bio: z.string().trim().max(200, "한 줄 소개는 200자 이내").optional(),
  hobbies: z.string().trim().max(200, "취미는 200자 이내").optional(),
  personality: z.string().trim().max(200, "성격은 200자 이내").optional(),
  favorites: z.string().trim().max(200, "좋아하는 것은 200자 이내").optional(),
  vibe: z.string().trim().max(80, "분위기는 80자 이내").optional(),
});

function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [personality, setPersonality] = useState("");
  const [favorites, setFavorites] = useState("");
  const [vibe, setVibe] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? "");
    setHobbies(profile.hobbies ?? "");
    setPersonality(profile.personality ?? "");
    setFavorites(profile.favorites ?? "");
    setVibe(profile.vibe ?? "");
  }, [profile?.id]);

  if (loading || !profile) {
    return <main className="min-h-screen flex items-center justify-center text-muted-foreground">불러오는 중…</main>;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ bio, hobbies, personality, favorites, vibe });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        bio: bio.trim() || null,
        hobbies: hobbies.trim() || null,
        personality: personality.trim() || null,
        favorites: favorites.trim() || null,
        vibe: vibe.trim() || null,
      })
      .eq("id", profile!.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("프로필을 저장했어요.");
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      <Link to="/lobby" className="text-xs text-muted-foreground hover:text-foreground transition">← 로비</Link>
      <header className="mt-2 mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl mb-2">프로필</h1>
          <CharacterBadge name={profile.character_name} color={profile.color} />
        </div>
      </header>

      <p className="text-sm text-muted-foreground mb-6">
        익명을 유지한 채, 다른 캐릭터에게 보여주고 싶은 모습을 적어두세요.
        비워두어도 괜찮아요.
      </p>

      <form onSubmit={save} className="space-y-5 glass rounded-2xl p-6">
        <div className="space-y-1.5">
          <Label htmlFor="bio">한 줄 소개</Label>
          <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="예: 새벽 세 시에 자주 깨어 있는 사람" maxLength={200} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vibe">지금의 분위기</Label>
          <Input id="vibe" value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="예: 잔잔함 · 들뜸 · 쓸쓸함" maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hobbies">취미</Label>
          <Textarea id="hobbies" value={hobbies} onChange={(e) => setHobbies(e.target.value)} placeholder="좋아하는 활동들" maxLength={200} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="personality">성격</Label>
          <Textarea id="personality" value={personality} onChange={(e) => setPersonality(e.target.value)} placeholder="스스로 본 나의 모습" maxLength={200} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="favorites">좋아하는 것</Label>
          <Textarea id="favorites" value={favorites} onChange={(e) => setFavorites(e.target.value)} placeholder="요즘 마음에 두는 것들" maxLength={200} rows={2} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={saving} className="bg-gradient-aurora text-primary-foreground border-0 shadow-glow hover:opacity-95">
            {saving ? "저장 중…" : "저장하기"}
          </Button>
          <Button asChild variant="ghost" type="button">
            <Link to="/lobby">취소</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
