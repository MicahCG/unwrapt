import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Gift, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { selectGiftChoice, viewGiftChoice, type FulfillmentOption } from '@/lib/fulfillment';
import { trackProductEvent } from '@/lib/productAnalytics';

type ChoiceGift = Awaited<ReturnType<typeof viewGiftChoice>>['gift'];

const currency = (amount?: number | null, code = 'USD') =>
  amount == null ? null : new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const GiftChoice = () => {
  const { token = '' } = useParams();
  const [gift, setGift] = useState<ChoiceGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState('');

  useEffect(() => {
    let active = true;
    viewGiftChoice(token)
      .then(({ gift: result }) => {
        if (!active) return;
        setGift(result);
        const selected = result.options.find((option) => option.is_selected);
        if (selected) setSelectedTitle(selected.title);
        void trackProductEvent('fulfillment_choice_viewed', { option_count: result.options.length });
      })
      .catch((reason: unknown) => active && setError(errorMessage(reason, 'This gift link is unavailable.')))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token]);

  const choose = async (option: FulfillmentOption) => {
    setSelecting(option.id);
    setError('');
    try {
      await selectGiftChoice(token, option.id);
      setSelectedTitle(option.title);
      setGift((current) => current ? {
        ...current,
        status: 'recipient_selected',
        options: current.options.map((item) => ({ ...item, is_selected: item.id === option.id })),
      } : current);
      void trackProductEvent('fulfillment_choice_selected', { option_rank: option.rank });
    } catch (reason: unknown) {
      setError(errorMessage(reason, 'We could not save that choice. Please try again.'));
    } finally {
      setSelecting(null);
    }
  };

  if (loading) return (
    <main className="min-h-screen grid place-items-center bg-[#f8f3e8] text-brand-charcoal">
      <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading gift choices" />
    </main>
  );

  if (error && !gift) return (
    <main className="min-h-screen grid place-items-center bg-[#f8f3e8] p-6">
      <Card className="w-full max-w-md border-0 shadow-xl"><CardContent className="p-8 text-center">
        <Gift className="mx-auto mb-4 h-10 w-10 text-brand-gold" />
        <h1 className="font-display text-2xl text-brand-charcoal">This gift link needs attention</h1>
        <p className="mt-3 text-brand-charcoal/70">{error}</p>
      </CardContent></Card>
    </main>
  );

  if (!gift) return null;
  const complete = gift.status === 'recipient_selected' || Boolean(selectedTitle);

  return (
    <main className="min-h-screen bg-[#f8f3e8] px-4 py-10 text-brand-charcoal sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mx-auto mb-9 max-w-2xl text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-brand-gold/20">
            {complete ? <Check className="h-7 w-7 text-emerald-700" /> : <Gift className="h-7 w-7 text-brand-charcoal" />}
          </div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.22em] text-brand-charcoal/55">A gift from someone who knows you</p>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            {complete ? `Great choice, ${gift.recipientFirstName}.` : `${gift.recipientFirstName}, choose what feels most like you.`}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-charcoal/70">
            {complete
              ? `${selectedTitle} is saved. The sender will take it from here.`
              : `These were thoughtfully picked for your ${gift.occasion}. Choose one. Your address and delivery details will be handled securely during partner checkout.`}
          </p>
        </header>

        {!complete && (
          <div className="grid gap-5 md:grid-cols-3">
            {gift.options.map((option) => (
              <Card key={option.id} className="overflow-hidden border-brand-charcoal/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="aspect-[4/3] bg-brand-cream-light">
                  {option.image_url ? <img src={option.image_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Gift className="h-10 w-10 text-brand-charcoal/25" /></div>}
                </div>
                <CardContent className="flex min-h-56 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-xl leading-tight">{option.title}</h2>
                    {currency(option.price, option.currency || 'USD') && <span className="font-mono text-sm">{currency(option.price, option.currency || 'USD')}</span>}
                  </div>
                  {option.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-brand-charcoal/65">{option.description}</p>}
                  <Button className="mt-auto w-full bg-brand-charcoal text-white hover:bg-brand-charcoal/90" onClick={() => choose(option)} disabled={Boolean(selecting)}>
                    {selecting === option.id ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Choose this gift'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && <p className="mt-5 text-center text-sm text-red-700" role="alert">{error}</p>}
        <footer className="mt-10 flex items-center justify-center gap-2 text-xs text-brand-charcoal/55">
          <ShieldCheck className="h-4 w-4" /> Unwrapt never exposes your private contact or address details on this page.
        </footer>
      </div>
    </main>
  );
};

export default GiftChoice;
