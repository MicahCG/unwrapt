-- Two requests arriving together (e.g. history load + first send, or desktop + mobile) each saw
-- "no conversation yet" and created their own, splitting one user's chat in two and making the
-- history jump between logins. Merge existing duplicates into the oldest conversation (messages
-- keep their own timestamps, so order is preserved) and enforce one conversation per (user, mode).

WITH ranked AS (
  SELECT id,
         first_value(id) OVER (PARTITION BY user_id, mode ORDER BY created_at, id) AS keeper_id
  FROM public.conversations
)
UPDATE public.conversation_messages m
SET conversation_id = r.keeper_id
FROM ranked r
WHERE m.conversation_id = r.id AND r.id <> r.keeper_id;

WITH ranked AS (
  SELECT id,
         first_value(id) OVER (PARTITION BY user_id, mode ORDER BY created_at, id) AS keeper_id
  FROM public.conversations
)
DELETE FROM public.conversations c
USING ranked r
WHERE c.id = r.id AND r.id <> r.keeper_id;

UPDATE public.conversations c
SET updated_at = COALESCE(
  (SELECT max(m.created_at) FROM public.conversation_messages m WHERE m.conversation_id = c.id),
  c.updated_at
);

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_user_mode_key UNIQUE (user_id, mode);
