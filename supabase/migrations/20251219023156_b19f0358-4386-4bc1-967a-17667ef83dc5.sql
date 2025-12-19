-- Force RLS on calendar_integrations to ensure even table owner respects policies
ALTER TABLE public.calendar_integrations FORCE ROW LEVEL SECURITY;