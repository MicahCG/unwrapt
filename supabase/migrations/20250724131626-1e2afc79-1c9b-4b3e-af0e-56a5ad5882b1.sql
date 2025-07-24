-- Security Fix 1: Fix Critical RLS Policy Vulnerabilities on payments table
-- Remove overly permissive policies and replace with secure ones

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Insert payments" ON public.payments;
DROP POLICY IF EXISTS "Update payments" ON public.payments;

-- Create secure policies that properly restrict access by user_id
CREATE POLICY "Users can insert their own payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" 
ON public.payments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Security Fix 2: Database Security Hardening
-- Set secure search_path on all database functions to prevent function hijacking
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.calculate_user_metrics(uuid) SET search_path = '';

-- Security Fix 3: Enable leaked password protection
-- This prevents users from using passwords that have been compromised in data breaches
UPDATE auth.config SET leaked_password_protection = true WHERE id = 'auth';

-- Security Fix 4: Reduce OTP expiry time to recommended security threshold
-- Default is usually 24 hours, reducing to 1 hour for better security
UPDATE auth.config SET otp_exp = 3600 WHERE id = 'auth'; -- 1 hour in seconds