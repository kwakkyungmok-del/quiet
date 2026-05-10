import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const CREATOR_EMAIL = "kwak.kyungmok@gmail.com";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "들어가기 — 밤의 로비" },
      { name: "description", content: "이메일로 가입하면 익명 캐릭터가 부여됩니다." },
    ],
  }),
});

const schema = z.object({
  email: z.string().trim().email("올바른 이메일을 입력하세요").max(255),
  password: z.string().min(6, "비밀번호는 6자 이상").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.email?.toLowerCase() === CREATOR_EMAIL) {
        navigate({ to: "/creator" });
      } else {
        navigate({ to: "/lobby" });
      }
    }
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin + "/lobby" },
        });
        if (error) {
          const msg = (error.message || "").toLowerCase();
          if (
            msg.includes("already") ||
            msg.includes("registered") ||
            msg.includes("exists") ||
            msg.includes("user already")
          ) {
            toast.error("이미 가입된 이메일이에요. 이미 캐릭터가 있어요.");
            setMode("signin");
            return;
          }
          throw error;
        }
        toast.success("환영합니다. 캐릭터가 부여되었어요.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("다시 만나서 반가워요.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center text-sm text-muted-foreground mb-8 hover:text-foreground transition">
          ← 처음으로
        </Link>
        <div className="glass rounded-2xl p-8 shadow-soft">
          <h1 className="font-display text-3xl mb-2 text-balance">
            {mode === "signup" ? "이름을 받으러 왔나요" : "다시 들어오세요"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signup"
              ? "가입하면 색깔과 사물로 된 익명 캐릭터가 부여됩니다."
              : "당신의 캐릭터가 기다리고 있어요."}
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-11"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  className="absolute inset-y-0 right-0 z-10 flex items-center px-3 text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-aurora text-primary-foreground border-0 shadow-glow hover:opacity-95">
              {busy ? "잠시만요…" : mode === "signup" ? "캐릭터 받기" : "들어가기"}
            </Button>
          </form>
          <button
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="w-full text-sm text-muted-foreground hover:text-foreground mt-6 transition"
          >
            {mode === "signup" ? "이미 캐릭터가 있다면 → 로그인" : "처음이라면 → 가입하기"}
          </button>
        </div>
      </div>
    </main>
  );
}
