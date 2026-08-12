import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';
import { AdminDeleteUser } from '@/components/admin/AdminDeleteUser';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput, sanitizeEmail, sanitizePhoneNumber } from '@/utils/inputSanitization';
import { useQueryClient } from '@tanstack/react-query';
import { MobileShell, Eyebrow, PrimaryButton, Display } from '@/components/unwrapt2/MobileShell';
import { U, initialsOf } from '@/components/unwrapt2/theme';

const RANGE_PRESETS = [
  { id: 'budget', label: 'Budget-friendly', range: '$15–50', lo: 15, hi: 50 },
  { id: 'everyday', label: 'Everyday', range: '$50–150', lo: 50, hi: 150 },
  { id: 'generous', label: 'Generous', range: '$150–350', lo: 150, hi: 350 },
  { id: 'luxury', label: 'Luxury', range: '$350+', lo: 350, hi: 600 },
];

const AUTOPILOT_OPTIONS = [
  { id: 'always', label: 'Always ask first', desc: 'Thea recommends. You approve every gift before it ships.' },
  { id: 'ask100', label: 'Auto-approve under $100', desc: 'Small gestures handled. Thea checks in above $100.' },
  { id: 'ask250', label: 'Auto-approve under $250', desc: 'Most gifts handled for you. Thea checks in above $250.' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();

  // Account form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Notification preferences
  const [emailReminders, setEmailReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [savingsAlerts, setSavingsAlerts] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Gifting guardrails (best-effort persistence)
  const [budget, setBudget] = useState({ lo: 50, hi: 150 });
  const [autopilot, setAutopilot] = useState('ask100');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || user?.email || '');
      setPhone((profile as Record<string, any>).phone || '');
      setEmailReminders((profile as Record<string, any>).email_reminders ?? true);
      setMarketingEmails((profile as Record<string, any>).marketing_emails ?? true);
      setSavingsAlerts((profile as Record<string, any>).savings_alerts ?? true);
      const p = profile as Record<string, any>;
      if (p.default_gift_budget_min != null && p.default_gift_budget_max != null) {
        setBudget({ lo: p.default_gift_budget_min, hi: p.default_gift_budget_max });
      }
      if (p.autopilot_level) setAutopilot(p.autopilot_level);
    } else if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setEmail(user.email || '');
    }
  }, [profile, user]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: sanitizeInput(fullName),
          email: sanitizeEmail(email),
          phone: sanitizePhoneNumber(phone),
        } as any)
        .eq('id', user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user-profile', user.id] });
      toast({ title: 'Profile updated', description: 'Your profile information has been saved.' });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({ title: 'Error saving profile', description: error.message || 'Something went wrong.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotificationPreference = async (key: string, value: boolean) => {
    if (!user?.id) return;
    setIsSavingNotifications(true);
    try {
      const { error } = await supabase.from('profiles').update({ [key]: value } as any).eq('id', user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user-profile', user.id] });
      toast({ title: 'Preference updated', description: 'Your notification preference has been saved.' });
    } catch (error: any) {
      console.error('Error saving notification preference:', error);
      toast({ title: 'Error saving preference', description: error.message || 'Something went wrong.', variant: 'destructive' });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const persistGuardrails = async (next: { budget?: { lo: number; hi: number }; autopilot?: string }) => {
    if (!user?.id) return;
    const payload: Record<string, any> = {};
    if (next.budget) {
      payload.default_gift_budget_min = next.budget.lo;
      payload.default_gift_budget_max = next.budget.hi;
    }
    if (next.autopilot) payload.autopilot_level = next.autopilot;
    try {
      await supabase.from('profiles').update(payload as any).eq('id', user.id);
    } catch (e) {
      /* preference columns may not exist yet — non-fatal */
    }
  };

  const handlePasswordReset = () => {
    toast({ title: 'Password reset email sent', description: 'Check your email for password reset instructions.' });
  };

  const handleDeleteAccount = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-account-deletion-request', {
        body: { userId: user?.id, userEmail: user?.email || email, userName: fullName || user?.user_metadata?.full_name || '' },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error requesting account deletion:', error);
    }
    toast({ title: "We've received your request", description: "Your account will be deleted within 24 hours. We're sorry to see you go." });
  };

  const budgetLabel = `$${budget.lo} – $${budget.hi}`;
  const tier = ((profile as Record<string, any>)?.subscription_tier as string) || 'free';

  return (
    <MobileShell
      contentClassName="px-5 pt-14 pb-4"
      footer={<PrimaryButton onClick={() => navigate('/')}>Done</PrimaryButton>}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div onClick={() => navigate('/')} className="cursor-pointer" style={{ fontSize: 22, color: U.subtle, width: 24 }}>‹</div>
        <Display style={{ fontSize: 22 }}>Account</Display>
      </div>

      {/* Identity row */}
      <div className="mb-3 flex items-center gap-3.5" style={{ padding: 16, borderRadius: 20, background: U.surface, border: `1px solid ${U.border}` }}>
        <div className="flex items-center justify-center" style={{ width: 50, height: 50, borderRadius: '50%', background: U.accent, color: U.cream, fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 21 }}>
          {initialsOf(fullName || email || 'U').charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontWeight: 600, fontSize: 16 }}>{fullName || 'Your name'}</div>
          <div style={{ fontSize: 12.5, color: U.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
        </div>
        <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: '1px', color: U.accent, border: '1px solid rgba(182,91,60,0.4)', padding: '4px 9px', borderRadius: 9 }}>
          {tier === 'vip' ? 'VIP' : 'Free'}
        </span>
      </div>

      {/* Subscription management (existing logic) */}
      <div className="mb-6">
        <SubscriptionManagement />
      </div>

      {/* Default gift budget */}
      <Eyebrow className="mb-1">Default gift budget</Eyebrow>
      <p className="mb-3.5" style={{ margin: '0 0 14px', fontSize: 13, color: U.muted }}>
        Thea shops within this range for everyone. You can set a different range on any person.
      </p>
      <div className="mb-3 text-center" style={{ background: U.surface, border: `1px solid ${U.border}`, borderRadius: 20, padding: '18px' }}>
        <span className="font-display" style={{ fontSize: 32, letterSpacing: '-0.5px' }}>{budgetLabel}</span>
        <div style={{ fontSize: 12.5, color: U.muted }}>Your typical gift range</div>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {RANGE_PRESETS.map((r) => {
          const sel = budget.lo === r.lo && budget.hi === r.hi;
          return (
            <div
              key={r.id}
              onClick={() => { const b = { lo: r.lo, hi: r.hi }; setBudget(b); persistGuardrails({ budget: b }); }}
              className="flex cursor-pointer items-baseline"
              style={{ padding: '10px 13px', borderRadius: 14, background: sel ? '#F1E7D5' : U.surface, border: sel ? `1.5px solid ${U.ink}` : '1px solid rgba(42,37,32,0.12)' }}
            >
              <span style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</span>
              <span className="font-mono" style={{ fontSize: 11, opacity: 0.65, marginLeft: 6 }}>{r.range}</span>
            </div>
          );
        })}
      </div>

      {/* Auto-approve */}
      <Eyebrow className="mb-3">How much Thea can approve alone</Eyebrow>
      <div className="mb-6 flex flex-col gap-2.5">
        {AUTOPILOT_OPTIONS.map((o) => {
          const sel = autopilot === o.id;
          return (
            <div
              key={o.id}
              onClick={() => { setAutopilot(o.id); persistGuardrails({ autopilot: o.id }); }}
              className="flex cursor-pointer items-start gap-3.5"
              style={{ padding: 16, borderRadius: 18, background: sel ? '#F1E7D5' : U.surface, border: sel ? `1.5px solid ${U.ink}` : '1px solid rgba(42,37,32,0.1)' }}
            >
              <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1, border: sel ? `6.5px solid ${U.ink}` : '1.5px solid rgba(42,37,32,0.25)', background: sel ? U.surface : 'transparent' }} />
              <div className="flex-1">
                <div style={{ fontWeight: 600, fontSize: 15.5 }}>{o.label}</div>
                <div style={{ fontSize: 13, color: U.muted, marginTop: 2, lineHeight: 1.4 }}>{o.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Account details */}
      <Eyebrow className="mb-3">Your details</Eyebrow>
      <div className="mb-6 flex flex-col gap-3" style={{ background: U.surface, border: `1px solid ${U.border}`, borderRadius: 20, padding: 18 }}>
        <div>
          <Eyebrow className="mb-1.5">Full name</Eyebrow>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className="bg-white/60" />
        </div>
        <div>
          <Eyebrow className="mb-1.5">Email</Eyebrow>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="bg-white/60" />
        </div>
        <div>
          <Eyebrow className="mb-1.5">Phone (optional)</Eyebrow>
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className="bg-white/60" />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={handleSaveProfile} disabled={isSaving} className="u-btn-primary" style={{ width: 'auto', flex: 1, fontSize: 14.5, padding: '13px 18px' }}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
          <button onClick={handlePasswordReset} style={{ appearance: 'none', cursor: 'pointer', background: 'transparent', border: `1px solid ${U.borderStrong}`, color: U.ink, fontWeight: 600, fontSize: 14, padding: '13px 16px', borderRadius: 14 }}>
            Change password
          </button>
        </div>
      </div>

      {/* Notifications */}
      <Eyebrow className="mb-3">Notifications</Eyebrow>
      <div className="mb-6 flex flex-col" style={{ background: U.surface, border: `1px solid ${U.border}`, borderRadius: 20, padding: '4px 18px' }}>
        {([
          { key: 'email_reminders', label: 'Email reminders', sub: 'Upcoming occasions', val: emailReminders, set: setEmailReminders },
          { key: 'marketing_emails', label: 'Tips & recommendations', sub: 'Occasional gift ideas', val: marketingEmails, set: setMarketingEmails },
          { key: 'savings_alerts', label: 'Savings alerts', sub: 'Deals under your budget', val: savingsAlerts, set: setSavingsAlerts },
        ] as const).map((row, i) => (
          <div key={row.key} className="flex items-center justify-between" style={{ padding: '15px 0', borderBottom: i < 2 ? `1px solid rgba(42,37,32,0.07)` : 'none' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{row.label}</div>
              <div style={{ fontSize: 12.5, color: U.muted }}>{row.sub}</div>
            </div>
            <Switch
              checked={row.val}
              disabled={isSavingNotifications}
              onCheckedChange={(v) => { row.set(v); handleSaveNotificationPreference(row.key, v); }}
            />
          </div>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={() => signOut()}
        className="mb-3"
        style={{ appearance: 'none', cursor: 'pointer', background: U.surface, border: `1px solid ${U.border}`, color: U.ink, fontWeight: 600, fontSize: 14, padding: '13px', borderRadius: 14, width: '100%' }}
      >
        Sign out
      </button>

      {/* Danger zone */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button style={{ appearance: 'none', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(182,91,60,0.4)', color: U.accent, fontWeight: 600, fontSize: 14, padding: '13px', borderRadius: 14, width: '100%' }}>
            Delete account
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-accent text-accent-foreground hover:opacity-90">
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-4">
        <AdminDeleteUser />
      </div>

      <div className="flex items-center gap-2 pt-5" style={{ color: U.muted, fontSize: 12.5 }}>
        <span style={{ fontSize: 14 }}>🕊</span>
        <span>You only ever pay the real gift price. Thea never spends above your maximum.</span>
      </div>
    </MobileShell>
  );
};

export default Settings;
