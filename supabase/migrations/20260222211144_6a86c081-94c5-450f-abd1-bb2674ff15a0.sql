INSERT INTO public.user_roles (user_id, role)
VALUES ('7d95d16a-db28-420b-adab-5bdf16bd9714', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;