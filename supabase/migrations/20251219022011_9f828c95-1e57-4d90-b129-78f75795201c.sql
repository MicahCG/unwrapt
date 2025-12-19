-- 1. Remove direct SELECT access to calendar_integrations (tokens should never be client-readable)
DROP POLICY IF EXISTS "Authenticated users can view their own calendar integrations" ON public.calendar_integrations;

-- 2. Create a secure function to check calendar connection status without exposing tokens
CREATE OR REPLACE FUNCTION public.get_my_calendar_integration()
RETURNS TABLE (
  id uuid,
  provider text,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  is_connected boolean,
  is_expired boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ci.id,
    ci.provider,
    ci.expires_at,
    ci.created_at,
    ci.updated_at,
    (ci.access_token IS NOT NULL) as is_connected,
    (ci.expires_at IS NOT NULL AND ci.expires_at < now()) as is_expired
  FROM public.calendar_integrations ci
  WHERE ci.user_id = auth.uid();
$$;

-- 3. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_calendar_integration() TO authenticated;