-- Fix RLS policies on profiles table to explicitly require authenticated role
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Fix RLS policies on recipients table to explicitly require authenticated role
DROP POLICY IF EXISTS "Authenticated users can view their own recipients" ON public.recipients;

CREATE POLICY "Authenticated users can view their own recipients" 
ON public.recipients 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Ensure RLS is enabled and forced on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipients FORCE ROW LEVEL SECURITY;