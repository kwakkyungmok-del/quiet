import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CharacterBadge } from "@/components/chat/CharacterBadge";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "밤의 로비 — 익명 캐릭터 채팅" },
      { name: "description", content: "접속하면 색깔과 사물로 된 익명 캐릭터가 부여됩니다. 주제별 방, 캐릭터 간 귓속말." },
    ],
  }),
});

const sample = [
  { name: "푸른 등대", color: "푸른" },
  { name: "붉은 모래", color: "붉은" },
  { name: "황혼 고래", color: "황혼" },
  { name: "심해 피아노", color: "심해" },
  { name: "분홍 안개", color: "분홍" },
  { name: "은빛 깃털", color: "은빛" },
];

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/lobby" });
  }, [user, loading, navigate]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">anonymous · 1.0</p>
      <h1 className="font-display text-5xl sm:text-7xl text-balance mb-6 leading-[1.05]">
        오늘 밤,<br />
        당신의 이름은 <span className="bg-gradient-aurora bg-clip-text text-transparent">잠시</span>.
      </h1>
      <p className="max-w-lg text-muted-foreground text-balance mb-10">
        가입하면 색깔과 사물로 된 익명의 캐릭터가 부여됩니다.
        주제별 방에서 모르는 사람과 이야기하고, 마음에 닿는 캐릭터에게는 조용히 귓속말을.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 mb-12 max-w-xl">
        {sample.map((s) => (
          <CharacterBadge key={s.name} name={s.name} color={s.color} size="sm" />
        ))}
      </div>

      <div className="flex gap-3">
        <Link to="/auth">
          <Button size="lg" className="bg-gradient-aurora text-primary-foreground border-0 shadow-glow hover:opacity-95">
            캐릭터 받고 들어가기
          </Button>
        </Link>
      </div>

      <footer className="mt-24 text-xs text-muted-foreground">
        조용한 곳입니다. 서로에게 다정하기로 해요.
      </footer>
    </main>
  );
}
