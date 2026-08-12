import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, Clock3, Copy, ExternalLink, Gift, Home, Loader2, Package, Settings, Sparkles, Truck } from 'lucide-react';
import AppNavigation from '@/components/AppNavigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveActions, ResponsiveContainer, ResponsiveHeader, ResponsiveNavigation } from '@/components/ui/responsive-container';
import { useToast } from '@/hooks/use-toast';
import { listFulfillmentOrders, rotateChoiceLink, type FulfillmentOrder } from '@/lib/fulfillment';
import { trackProductEvent } from '@/lib/productAnalytics';
import { useThea } from '@/hooks/useThea';

const stateCopy: Record<string, { label: string; detail: string; icon: typeof Package; tone: string }> = {
  draft: { label: 'Draft', detail: 'The fulfillment route is being prepared.', icon: Clock3, tone: 'bg-slate-100 text-slate-700' },
  awaiting_sender: { label: 'Needs your approval', detail: 'Review the route before handing it to a partner.', icon: Clock3, tone: 'bg-amber-100 text-amber-800' },
  awaiting_recipient: { label: 'Waiting for their choice', detail: 'Share or refresh the private choice link.', icon: Gift, tone: 'bg-violet-100 text-violet-800' },
  recipient_selected: { label: 'Choice received', detail: 'Their selection is ready for partner checkout.', icon: Check, tone: 'bg-emerald-100 text-emerald-800' },
  ready_for_partner: { label: 'Ready for partner', detail: 'Approved and queued for a verified fulfillment handoff.', icon: Sparkles, tone: 'bg-blue-100 text-blue-800' },
  submitted_to_partner: { label: 'Ordered', detail: 'The fulfillment partner has accepted the order.', icon: Package, tone: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Shipped', detail: 'The carrier is moving the gift.', icon: Truck, tone: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Delivered', detail: 'The gift has arrived.', icon: Check, tone: 'bg-emerald-100 text-emerald-800' },
  exception: { label: 'Concierge review', detail: 'A person will review the sourcing or fulfillment details.', icon: AlertTriangle, tone: 'bg-orange-100 text-orange-800' },
  cancelled: { label: 'Cancelled', detail: 'This fulfillment route is closed.', icon: AlertTriangle, tone: 'bg-slate-100 text-slate-600' },
};

const routeCopy: Record<string, string> = {
  exact_gift: 'Exact gift', recipient_choice: 'Recipient choice', retailer_handoff: 'Retailer checkout', concierge: 'Unwrapt concierge',
};

const displayDate = (date?: string | null) => date
  ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
  : 'Date pending';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Please try again.';

const FulfillmentCard = ({ order }: { order: FulfillmentOrder }) => {
  const { toast } = useToast();
  const { openThea } = useThea();
  const queryClient = useQueryClient();
  const [sharing, setSharing] = useState(false);
  const state = stateCopy[order.status] || stateCopy.draft;
  const StateIcon = state.icon;
  const gift = order.scheduled_gifts;
  const recipient = order.recipients?.name || 'Recipient';
  const selected = order.fulfillment_options?.find((option) => option.is_selected);

  const refreshAndCopy = async () => {
    setSharing(true);
    try {
      const { choiceUrl } = await rotateChoiceLink(order.id);
      await navigator.clipboard.writeText(choiceUrl);
      void trackProductEvent('fulfillment_choice_link_copied', { route: order.route });
      toast({ title: 'Private link copied', description: 'It expires in 14 days and the previous link no longer works.' });
      await queryClient.invalidateQueries({ queryKey: ['fulfillment-orders'] });
    } catch (reason: unknown) {
      toast({ title: "Couldn't create a link", description: errorMessage(reason), variant: 'destructive' });
    } finally {
      setSharing(false);
    }
  };

  return (
    <Card className="overflow-hidden border-brand-charcoal/10">
      <CardContent className="p-0">
        <div className="grid sm:grid-cols-[150px_1fr]">
          <div className="min-h-36 bg-brand-cream-light">
            {gift?.gift_image_url ? <img src={gift.gift_image_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Gift className="h-10 w-10 text-brand-charcoal/25" /></div>}
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-charcoal/50">For {recipient} · {gift?.occasion || 'Special occasion'}</p>
                <h2 className="mt-1 font-display text-xl text-brand-charcoal">{selected?.title || gift?.gift_description || 'Thoughtful gift'}</h2>
                <p className="mt-1 text-sm text-brand-charcoal/60">{displayDate(gift?.occasion_date)} · {routeCopy[order.route] || order.route}</p>
              </div>
              <Badge className={`${state.tone} border-0 hover:${state.tone}`}><StateIcon className="mr-1.5 h-3.5 w-3.5" />{state.label}</Badge>
            </div>
            <div className="mt-4 rounded-xl bg-brand-cream-light/70 p-3 text-sm text-brand-charcoal/70">
              {order.exception_reason || state.detail}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => openThea({ surface: 'gift_status', recipientName: recipient })}><Sparkles className="mr-2 h-4 w-4" />Ask Thea</Button>
              {order.status === 'awaiting_recipient' && (
                <Button size="sm" onClick={refreshAndCopy} disabled={sharing} className="bg-brand-charcoal text-white hover:bg-brand-charcoal/90">
                  {sharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}Copy a fresh choice link
                </Button>
              )}
              {order.tracking_url && <Button asChild size="sm" variant="outline"><a href={order.tracking_url} target="_blank" rel="noreferrer">Track gift<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const GiftHistory = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['fulfillment-orders', user?.id],
    queryFn: listFulfillmentOrders,
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  return (
    <ResponsiveContainer>
      <ResponsiveHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <ResponsiveNavigation>
          <Button variant="outline" onClick={() => navigate('/')} className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light w-full sm:w-auto">
            <Home className="mr-2 h-4 w-4" />Dashboard
          </Button>
          <AppNavigation />
        </ResponsiveNavigation>
        <ResponsiveActions>
          <Button variant="outline" onClick={() => navigate('/settings')} className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light">
            <Settings className="mr-2 h-4 w-4" />Settings
          </Button>
        </ResponsiveActions>
      </ResponsiveHeader>

      <Card className="w-full border-0 bg-transparent shadow-none">
        <CardHeader className="px-0 pt-2">
          <CardTitle className="flex items-center font-display text-2xl text-brand-charcoal sm:text-3xl">
            <Package className="mr-3 h-6 w-6" />Gift fulfillment
          </CardTitle>
          <p className="max-w-2xl text-sm leading-relaxed text-brand-charcoal/65">See every handoff clearly—from approval and recipient choice through partner processing and delivery.</p>
        </CardHeader>
        <CardContent className="px-0">
          {(authLoading || isLoading) && <div className="grid min-h-56 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-brand-charcoal" /></div>}
          {!authLoading && !user && <div className="rounded-2xl border border-brand-charcoal/10 bg-white p-8 text-center text-brand-charcoal/70">Sign in to see your fulfillment activity.</div>}
          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">We couldn't load fulfillment activity. Please refresh and try again.</div>}
          {user && !isLoading && !error && data?.orders.length === 0 && (
            <div className="rounded-2xl border border-brand-charcoal/10 bg-white py-12 text-center">
              <Gift className="mx-auto mb-4 h-12 w-12 text-brand-charcoal/25" />
              <h2 className="font-display text-xl text-brand-charcoal">No fulfillment routes yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-brand-charcoal/65">When you approve an exact gift, offer recipient choice, or request concierge help, its status will appear here.</p>
            </div>
          )}
          <div className="grid gap-4">{data?.orders.map((order) => <FulfillmentCard key={order.id} order={order} />)}</div>
        </CardContent>
      </Card>
    </ResponsiveContainer>
  );
};

export default GiftHistory;
