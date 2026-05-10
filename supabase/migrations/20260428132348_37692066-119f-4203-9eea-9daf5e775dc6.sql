CREATE TABLE public.bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bans_user_active ON public.bans (user_id, expires_at);

ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_banned(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bans
    WHERE user_id = _uid
      AND starts_at <= now()
      AND expires_at > now()
  );
$$;

-- bans RLS: 제작자만 관리
CREATE POLICY "Creator can view bans" ON public.bans
  FOR SELECT TO authenticated
  USING (public.is_creator(auth.uid()));

CREATE POLICY "Creator can insert bans" ON public.bans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_creator(auth.uid()) AND banned_by = auth.uid());

CREATE POLICY "Creator can delete bans" ON public.bans
  FOR DELETE TO authenticated
  USING (public.is_creator(auth.uid()));

-- 메시지/귓속말 INSERT 시 차단된 사용자 막기
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "Users can send whispers" ON public.whispers;
CREATE POLICY "Users can send whispers" ON public.whispers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND NOT public.is_banned(auth.uid()));
