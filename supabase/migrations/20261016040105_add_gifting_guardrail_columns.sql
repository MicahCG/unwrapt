-- Settings page "Default gift budget" and "How much Thea can approve alone"
-- write to these columns but they never existed, so every save silently
-- failed and the UI always reverted to its hardcoded defaults.
ALTER TABLE public.profiles
  ADD COLUMN default_gift_budget_min numeric(10,2) DEFAULT 50.00 CHECK (default_gift_budget_min >= 0),
  ADD COLUMN default_gift_budget_max numeric(10,2) DEFAULT 150.00 CHECK (default_gift_budget_max >= default_gift_budget_min),
  ADD COLUMN autopilot_level text DEFAULT 'ask100' CHECK (autopilot_level IN ('always', 'ask100', 'ask250'));
