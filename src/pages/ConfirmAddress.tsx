import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MobileShell, Eyebrow, PrimaryButton, Display } from '@/components/unwrapt2/MobileShell';
import { TheaAvatar } from '@/components/unwrapt2/TheaAvatar';
import { U } from '@/components/unwrapt2/theme';
import LoginPage from '@/components/auth/LoginPage';

const ConfirmAddress = () => {
  const { giftId } = useParams<{ giftId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gift, setGift] = useState<any>(null);
  const [recipient, setRecipient] = useState<any>(null);
  const [form, setForm] = useState({
    street: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
  });

  useEffect(() => {
    if (!user || !giftId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: giftRow, error: giftError } = await supabase
          .from('scheduled_gifts')
          .select('*, recipients(*)')
          .eq('id', giftId)
          .eq('user_id', user.id)
          .single();

        if (giftError || !giftRow) {
          toast({
            title: 'Gift not found',
            description: 'This confirmation link may have expired or already been used.',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        if (cancelled) return;
        const r = giftRow.recipients;
        setGift(giftRow);
        setRecipient(r);
        setForm({
          street: r?.street || '',
          city: r?.city || '',
          state: r?.state || '',
          zip_code: r?.zip_code || '',
          country: r?.country || 'United States',
        });
      } catch (e) {
        console.error(e);
        toast({ title: 'Something went wrong', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, giftId, navigate, toast]);

  const canSave = form.street.trim() && form.city.trim() && form.state.trim() && form.zip_code.trim();

  const handleSave = async () => {
    if (!user || !gift || !recipient || !canSave) return;
    setSaving(true);
    try {
      const { error: recipError } = await supabase
        .from('recipients')
        .update({
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zip_code: form.zip_code.trim(),
          country: form.country.trim() || 'United States',
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipient.id)
        .eq('user_id', user.id);

      if (recipError) throw recipError;

      const { error: giftError } = await supabase
        .from('scheduled_gifts')
        .update({
          address_confirmed_at: new Date().toISOString(),
          shipping_address: {
            street: form.street.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            zip_code: form.zip_code.trim(),
            country: form.country.trim() || 'United States',
          },
        })
        .eq('id', gift.id)
        .eq('user_id', user.id);

      if (giftError) throw giftError;

      toast({
        title: 'Address confirmed',
        description: `Thea can ship ${recipient.name}'s gift when the time comes.`,
      });
      navigate('/');
    } catch (e) {
      console.error(e);
      toast({
        title: 'Couldn’t save address',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <MobileShell glow animate={false}>
        <div className="flex h-full items-center justify-center">
          <TheaAvatar size={48} pulse />
        </div>
      </MobileShell>
    );
  }

  if (!user) return <LoginPage />;

  if (loading) {
    return (
      <MobileShell glow animate={false}>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <TheaAvatar size={48} pulse />
          <p className="mt-4" style={{ color: U.subtle }}>Loading gift details…</p>
        </div>
      </MobileShell>
    );
  }

  const alreadyConfirmed = !!gift?.address_confirmed_at;

  return (
    <MobileShell
      contentClassName="px-6 pt-14 pb-4"
      footer={
        <>
          <PrimaryButton onClick={handleSave} disabled={!canSave || saving || alreadyConfirmed}>
            {alreadyConfirmed ? 'Address already confirmed' : saving ? 'Saving…' : 'Confirm address'}
          </PrimaryButton>
          <p
            onClick={() => navigate('/')}
            className="mt-3.5 cursor-pointer text-center"
            style={{ fontSize: 13.5, color: U.subtle }}
          >
            Back to inbox
          </p>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-2.5">
        <TheaAvatar size={30} />
        <Eyebrow>Shipping</Eyebrow>
      </div>
      <Display style={{ fontSize: 30, lineHeight: 1.1 }}>
        Confirm where to send {recipient?.name?.split(' ')[0] || 'their'} gift
      </Display>
      <p className="mb-5 mt-2.5" style={{ fontSize: 15, lineHeight: 1.5, color: U.textSecondary }}>
        {gift?.occasion ? `${gift.occasion} · ` : ''}
        {gift?.gift_description || 'Curated gift'}
      </p>

      {(['street', 'city', 'state', 'zip_code'] as const).map((field) => (
        <div key={field} className="mb-3">
          <Eyebrow className="mb-1.5">
            {field === 'zip_code' ? 'ZIP' : field.charAt(0).toUpperCase() + field.slice(1)}
          </Eyebrow>
          <input
            value={form[field]}
            onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
            placeholder={
              field === 'street'
                ? 'Street address'
                : field === 'zip_code'
                  ? '12345'
                  : field === 'state'
                    ? 'CA'
                    : 'City'
            }
            className="w-full"
            style={{
              background: U.surface,
              border: '1px solid rgba(42,37,32,0.12)',
              borderRadius: 14,
              padding: '14px 16px',
              fontSize: 16,
              color: U.ink,
            }}
          />
        </div>
      ))}
    </MobileShell>
  );
};

export default ConfirmAddress;
