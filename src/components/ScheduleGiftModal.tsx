import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Heart, MapPin, Sparkles, Wallet as WalletIcon, Calendar, CreditCard, Package, Truck } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { cleanName } from '@/lib/utils';
import { GIFT_VIBE_OPTIONS, type GiftVibe, type Product, getAllProducts } from '@/lib/giftVibes';

interface ScheduleGiftModalProps {
  recipient: any;
  isOpen: boolean;
  onClose: () => void;
  payingForGiftId?: string | null;
}

const ScheduleGiftModal: React.FC<ScheduleGiftModalProps> = ({ recipient, isOpen, onClose, payingForGiftId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedVibe, setSelectedVibe] = useState<GiftVibe | null>('CALM_COMFORT');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    occasion_date: '',
    street: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States'
  });

  const [isLoading, setIsLoading] = useState(false);

  // Fetch user wallet balance
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('gift_wallet_balance, subscription_tier')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch all products from Supabase products table
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => getAllProducts(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch existing scheduled gift for this recipient
  const { data: existingGift } = useQuery({
    queryKey: ['scheduled-gift', recipient?.id],
    queryFn: async () => {
      if (!recipient?.id || !user?.id) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('scheduled_gifts')
        .select('*')
        .eq('recipient_id', recipient.id)
        .eq('user_id', user.id)
        .gte('occasion_date', today)
        .order('occasion_date', { ascending: true })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching existing gift:', error);
        return null;
      }
      return data;
    },
    enabled: isOpen && !!recipient?.id && !!user?.id,
  });

  // Filter products by selected vibe
  const filteredProducts = selectedVibe
    ? allProducts.filter(p => p.gift_vibe === selectedVibe)
    : allProducts;

  // Debug logging for products
  useEffect(() => {
    if (isOpen) {
      console.log('🎁 Products loaded:', {
        totalProducts: allProducts.length,
        selectedVibe,
        filteredCount: filteredProducts.length,
        productsLoading,
        allProductsPreview: allProducts.slice(0, 3).map(p => ({
          title: p.title,
          vibe: p.gift_vibe,
          active: p.active,
          available: p.available_for_sale
        }))
      });

      if (allProducts.length === 0 && !productsLoading) {
        console.error('⚠️ NO PRODUCTS FOUND - Check production database!');
      }
    }
  }, [allProducts, selectedVibe, filteredProducts, isOpen, productsLoading]);

  // Debug logging for recipient prop
  useEffect(() => {
    console.log('🔍 ScheduleGiftModal recipient prop changed:', {
      recipient,
      isOpen,
      recipientId: recipient?.id,
      recipientType: typeof recipient,
      recipientKeys: recipient ? Object.keys(recipient) : 'N/A'
    });
  }, [recipient, isOpen]);

  // Early return if recipient is invalid
  if (isOpen && (!recipient || !recipient.id)) {
    console.error('❌ ScheduleGiftModal: Invalid recipient data', { recipient, isOpen });

    useEffect(() => {
      if (isOpen && (!recipient || !recipient.id)) {
        toast({
          title: "Error",
          description: "Recipient information is missing. Please try again.",
          variant: "destructive"
        });
        onClose();
      }
    }, [isOpen, recipient, onClose, toast]);

    return null;
  }

  const getDefaultOccasionDate = () => {
    const today = new Date();
    const currentYear = today.getFullYear();

    if (recipient.birthday) {
      const birthdayParts = recipient.birthday.split('-');
      const birthday = new Date(parseInt(birthdayParts[0]), parseInt(birthdayParts[1]) - 1, parseInt(birthdayParts[2]));
      const thisYearBirthday = new Date(currentYear, birthday.getMonth(), birthday.getDate());
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(currentYear + 1);
      }
      return {
        occasion: 'Birthday',
        date: thisYearBirthday.toISOString().split('T')[0]
      };
    }

    return { occasion: '', date: '' };
  };

  useEffect(() => {
    if (isOpen) {
      // Initialize with recipient's preferred vibe if available, otherwise default to CALM_COMFORT
      if (recipient.preferred_gift_vibe) {
        setSelectedVibe(recipient.preferred_gift_vibe);
      } else {
        setSelectedVibe('CALM_COMFORT');
      }

      // Check if this is a holiday preset
      if (recipient._holidayPreset) {
        setFormData(prev => ({
          ...prev,
          ...recipient._holidayPreset
        }));
      } else {
        const defaultOccasion = getDefaultOccasionDate();
        setFormData(prev => ({
          ...prev,
          occasion_date: defaultOccasion.date
        }));
      }

      // Auto-populate address if recipient has one
      if (recipient.street || recipient.city || recipient.state || recipient.zip_code) {
        setFormData(prev => ({
          ...prev,
          street: recipient.street || '',
          city: recipient.city || '',
          state: recipient.state || '',
          zip_code: recipient.zip_code || '',
          country: recipient.country || 'United States'
        }));
      }
    }
  }, [isOpen, recipient]);

  const getSenderName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Someone special';
  };

  const sendGiftNotificationEmail = async (giftDetails: any) => {
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'gift_scheduled',
          recipientEmail: user?.email,
          userName: user?.user_metadata?.full_name || user?.email?.split('@')[0],
          data: {
            recipientName: cleanName(recipient.name),
            occasion: 'Birthday',
            occasionDate: giftDetails.occasion_date,
            giftType: giftDetails.gift_type,
            priceRange: giftDetails.price
          }
        }
      });
      console.log('Gift notification email sent');
    } catch (error) {
      console.error('Failed to send gift notification email:', error);
    }
  };

  const isFormValid = () => {
    return formData.occasion_date &&
           selectedProduct &&
           formData.street &&
           formData.city &&
           formData.state &&
           formData.zip_code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid() || !selectedProduct) return;

    setIsLoading(true);

    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !currentUser?.id) {
        console.error('Authentication error:', authError);
        toast({
          title: "Authentication Error",
          description: "Please refresh the page and try again.",
          variant: "destructive"
        });
        return;
      }

      if (!recipient?.id) {
        console.error('Recipient ID is missing or undefined');
        toast({
          title: "Error",
          description: "Recipient information is incomplete. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const totalCost = selectedProduct.price;
      const isVIP = userProfile?.subscription_tier === 'vip';
      const hasEnoughBalance = walletBalance >= totalCost;

      // Update recipient with address
      const { error: recipientUpdateError } = await supabase
        .from('recipients')
        .update({
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          country: formData.country,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipient.id)
        .eq('user_id', currentUser.id);

      if (recipientUpdateError) {
        console.error('Error updating recipient:', recipientUpdateError);
        throw recipientUpdateError;
      }

      if (payingForGiftId) {
        toast({
          title: "Address Updated",
          description: "Now proceeding to payment...",
        });

        onClose();

        window.dispatchEvent(new CustomEvent('proceedWithPayment', {
          detail: { giftId: payingForGiftId, recipientId: recipient.id }
        }));

        return;
      }

      // Create scheduled gift
      const deliveryDate = new Date(new Date(formData.occasion_date).getTime() - 4 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      console.log('Creating scheduled gift with recipient_id:', recipient.id);

      const { data: giftData, error: giftError } = await supabase
        .from('scheduled_gifts')
        .insert({
          user_id: currentUser.id,
          recipient_id: recipient.id,
          occasion: 'Birthday',
          occasion_date: formData.occasion_date,
          occasion_type: 'birthday',
          gift_type: selectedProduct.title,
          gift_variant_id: selectedProduct.shopify_variant_id,
          estimated_cost: totalCost,
          price_range: `$${selectedProduct.price.toFixed(2)}`,
          delivery_date: deliveryDate,
          status: 'scheduled',
          payment_status: isVIP && hasEnoughBalance ? 'pending' : 'unpaid'
        })
        .select()
        .single();

      if (giftError) throw giftError;

      // VIP users with sufficient balance: deduct from wallet
      if (isVIP && hasEnoughBalance) {
        // Create wallet transaction
        const { error: transactionError } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: currentUser.id,
            amount: -totalCost,
            balance_after: walletBalance - totalCost,
            transaction_type: 'charge',
            scheduled_gift_id: giftData.id,
            status: 'completed'
          });

        if (transactionError) throw transactionError;

        // Update wallet balance
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({
            gift_wallet_balance: walletBalance - totalCost
          })
          .eq('id', currentUser.id);

        if (balanceError) throw balanceError;

        // Update gift payment status and image
        await supabase
          .from('scheduled_gifts')
          .update({ 
            payment_status: 'paid', 
            payment_amount: totalCost,
            gift_image_url: selectedProduct.featured_image_url
          })
          .eq('id', giftData.id);

        // Call process-gift-fulfillment to place the Shopify order
        console.log('🎁 Calling process-gift-fulfillment for wallet payment...');
        const { data: fulfillmentData, error: fulfillmentError } = await supabase.functions.invoke('process-gift-fulfillment', {
          body: { scheduledGiftId: giftData.id }
        });

        if (fulfillmentError) {
          console.error('🎁 Gift fulfillment error:', fulfillmentError);
          toast({
            title: "Payment Processed",
            description: "Gift scheduled but order placement pending. We'll process it shortly.",
            variant: "default"
          });
        } else if (fulfillmentData?.success) {
          console.log('🎁 Gift fulfillment successful:', fulfillmentData);
          toast({
            title: "Gift Ordered!",
            description: `$${totalCost.toFixed(2)} deducted. Order placed successfully!`,
          });
        } else {
          console.log('🎁 Gift fulfillment response:', fulfillmentData);
          toast({
            title: "Gift Scheduled!",
            description: `$${totalCost.toFixed(2)} deducted from your wallet.`,
          });
        }

        await sendGiftNotificationEmail({
          ...formData,
          gift_type: selectedProduct.title,
          price: selectedProduct.price
        });

        sessionStorage.setItem('giftScheduledSuccess', JSON.stringify({
          recipientId: recipient.id,
          timestamp: Date.now()
        }));

        queryClient.invalidateQueries({ queryKey: ['upcoming-gifts'] });
        queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['recipients'] });
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });

        onClose();
        setFormData({
          occasion_date: '',
          street: '',
          city: '',
          state: '',
          zip_code: '',
          country: 'United States'
        });
        setSelectedProduct(null);
        window.location.reload();
      } else {
        // Non-VIP or insufficient balance: redirect to Stripe
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-gift-payment', {
          body: {
            scheduledGiftId: giftData.id,
            productPrice: selectedProduct.price,
            productImage: selectedProduct.featured_image_url,
            giftDetails: {
              recipientName: cleanName(recipient.name),
              occasion: 'Birthday',
              giftType: selectedProduct.title
            },
            shippingAddress: {
              first_name: cleanName(recipient.name).split(' ')[0] || cleanName(recipient.name),
              last_name: cleanName(recipient.name).split(' ').slice(1).join(' ') || '',
              address1: formData.street,
              city: formData.city,
              province: formData.state,
              country: formData.country,
              zip: formData.zip_code
            },
            variantId: selectedProduct.shopify_variant_id
          }
        });

        if (paymentError) throw paymentError;

        if (paymentData?.url) {
          await sendGiftNotificationEmail({
            ...formData,
            gift_type: selectedProduct.title,
            price: selectedProduct.price
          });

          sessionStorage.setItem('giftScheduledSuccess', JSON.stringify({
            recipientId: recipient.id,
            timestamp: Date.now()
          }));

          window.location.href = paymentData.url;

          queryClient.invalidateQueries({ queryKey: ['upcoming-gifts'] });
          queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['recipients'] });

          onClose();
          setFormData({
            occasion_date: '',
            street: '',
            city: '',
            state: '',
            zip_code: '',
            country: 'United States'
          });
          setSelectedProduct(null);
        }
      }
    } catch (error: any) {
      console.error('❌ Error scheduling gift:', error);
      toast({
        title: "Error",
        description: error?.message || "There was a problem scheduling your gift. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const walletBalance = userProfile?.gift_wallet_balance || 0;

  // Vibe button mappings (user-friendly labels → enum values)
  const vibeButtons = [
    {
      label: 'Home & Atmosphere',
      vibe: 'CALM_COMFORT' as GiftVibe,
      description: 'Soft lighting, soothing scents, cozy rituals',
      icon: '🕯️'
    },
    {
      label: 'Personal & Mindful',
      vibe: 'ARTFUL_UNIQUE' as GiftVibe,
      description: 'Handmade pieces, objects with a story',
      icon: '🎨'
    },
    {
      label: 'Luxe & Elegant',
      vibe: 'REFINED_STYLISH' as GiftVibe,
      description: 'Elegant glassware, statement pieces',
      icon: '✨'
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:w-[840px] sm:max-w-[90vw] p-0 bg-[#FAF8F3] border-l-2 border-[#E4DCD2] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-8 pt-8 pb-6 border-b border-[#E4DCD2] bg-white/50 backdrop-blur-sm">
          <SheetTitle className="font-display text-2xl text-[#1A1A1A]">
            Schedule Gift for {cleanName(recipient.name)}
          </SheetTitle>
          <p className="text-sm text-[#1A1A1A]/60 mt-1">
            Choose a gift vibe and perfect item for their birthday
          </p>
        </SheetHeader>

        {/* Automation Timeline - Only show when occasion date is set */}
        {formData.occasion_date && (() => {
          const occasionDate = parseISO(formData.occasion_date);
          const today = new Date();
          
          // Determine states based on existing gift data
          const fundsReserved = existingGift?.wallet_reserved || existingGift?.payment_status === 'paid';
          const orderPlaced = !!existingGift?.shopify_order_id || existingGift?.status === 'ordered';
          const delivered = existingGift?.status === 'delivered';
          
          // Calculate dates
          const fundsReserveDate = subDays(occasionDate, 14);
          const orderDate = subDays(occasionDate, 10);
          const deliveryDate = subDays(occasionDate, 3);
          
          // Past dates that haven't happened yet
          const fundsPastDue = fundsReserveDate < today && !fundsReserved;
          const orderPastDue = orderDate < today && !orderPlaced;
          
          return (
            <div className="px-8 py-4 border-b border-[#E4DCD2] bg-white/40">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-[#C4A36F]" />
                <span className="text-sm font-medium text-[#1A1A1A]">Gift Delivery Timeline</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                {/* Funds Reserved */}
                <div className="flex-1 text-center">
                  <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
                    fundsReserved 
                      ? 'bg-emerald-100' 
                      : fundsPastDue 
                        ? 'bg-amber-100' 
                        : 'bg-[#C4A36F]/10'
                  }`}>
                    <CreditCard className={`w-4 h-4 ${
                      fundsReserved 
                        ? 'text-emerald-600' 
                        : fundsPastDue 
                          ? 'text-amber-600' 
                          : 'text-[#C4A36F]'
                    }`} />
                  </div>
                  <p className={`text-xs font-medium ${
                    fundsReserved 
                      ? 'text-emerald-700' 
                      : fundsPastDue 
                        ? 'text-amber-700' 
                        : 'text-[#1A1A1A]'
                  }`}>
                    {fundsReserved ? 'Funds Reserved ✓' : fundsPastDue ? 'Funds Pending' : 'Reserve Funds'}
                  </p>
                  <p className="text-xs text-[#1A1A1A]/60">
                    {fundsReserved ? 'Completed' : format(fundsReserveDate, 'MMM d')}
                  </p>
                </div>
                
                <div className={`w-8 h-px ${fundsReserved ? 'bg-emerald-300' : 'bg-[#C4A36F]/30'}`} />
                
                {/* Order Placed */}
                <div className="flex-1 text-center">
                  <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
                    orderPlaced 
                      ? 'bg-emerald-100' 
                      : orderPastDue 
                        ? 'bg-amber-100' 
                        : 'bg-[#C4A36F]/10'
                  }`}>
                    <Package className={`w-4 h-4 ${
                      orderPlaced 
                        ? 'text-emerald-600' 
                        : orderPastDue 
                          ? 'text-amber-600' 
                          : 'text-[#C4A36F]'
                    }`} />
                  </div>
                  <p className={`text-xs font-medium ${
                    orderPlaced 
                      ? 'text-emerald-700' 
                      : orderPastDue 
                        ? 'text-amber-700' 
                        : 'text-[#1A1A1A]'
                  }`}>
                    {orderPlaced ? 'Order Placed ✓' : orderPastDue ? 'Order Pending' : 'Place Order'}
                  </p>
                  <p className="text-xs text-[#1A1A1A]/60">
                    {orderPlaced ? 'Completed' : format(orderDate, 'MMM d')}
                  </p>
                </div>
                
                <div className={`w-8 h-px ${orderPlaced ? 'bg-emerald-300' : 'bg-[#C4A36F]/30'}`} />
                
                {/* Arrives By */}
                <div className="flex-1 text-center">
                  <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
                    delivered 
                      ? 'bg-emerald-100' 
                      : 'bg-[#C4A36F]/10'
                  }`}>
                    <Truck className={`w-4 h-4 ${
                      delivered 
                        ? 'text-emerald-600' 
                        : 'text-[#C4A36F]'
                    }`} />
                  </div>
                  <p className={`text-xs font-medium ${
                    delivered 
                      ? 'text-emerald-700' 
                      : 'text-[#1A1A1A]'
                  }`}>
                    {delivered ? 'Delivered ✓' : 'Arrives By'}
                  </p>
                  <p className="text-xs text-[#1A1A1A]/60">
                    {delivered ? 'Completed' : format(deliveryDate, 'MMM d')}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Cancellation Disclaimer */}
        {formData.occasion_date && !(existingGift && (!!existingGift.shopify_order_id || existingGift.status === 'ordered')) && (
          <div className="mx-8 mt-4 mb-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800 mb-1">
              Need to Cancel?
            </p>
            <p className="text-xs text-amber-700">
              If you'd like to cancel this gift, please contact{' '}
              <a href="mailto:team@unwrapt.io" className="underline font-medium hover:text-amber-900">
                team@unwrapt.io
              </a>
              {' '}before the order is placed and we'll respond within 24 hours.
            </p>
          </div>
        )}

        {/* Order Already Placed Notice */}
        {existingGift && (!!existingGift.shopify_order_id || existingGift.status === 'ordered') && (
          <div className="mx-8 mt-4 mb-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800 mb-1">
              Order Already Placed
            </p>
            <p className="text-xs text-amber-700">
              This gift has already been ordered. If you'd like to make changes, please contact{' '}
              <a href="mailto:team@unwrapt.io" className="underline font-medium hover:text-amber-900">
                team@unwrapt.io
              </a>
              {' '}and we'll respond within 24 hours.
            </p>
          </div>
        )}

        {/* Two-Column Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Form Fields */}
          <div className="lg:w-[280px] flex-shrink-0 px-8 py-6 space-y-6 lg:overflow-y-auto bg-white/30">
            {/* Birthday Date */}
            <div className="space-y-2">
              <Label htmlFor="occasion_date" className="text-sm font-medium text-[#1A1A1A]">
                Birthday Date *
              </Label>
              <Input
                id="occasion_date"
                type="date"
                value={formData.occasion_date}
                onChange={(e) => setFormData(prev => ({ ...prev, occasion_date: e.target.value }))}
                required
                className="bg-white border-[#E4DCD2] text-[#1A1A1A]"
              />
            </div>

            {/* Gift Vibe Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-[#1A1A1A]">
                Gift Vibe *
              </Label>
              <div className="space-y-2">
                {vibeButtons.map((vibe) => (
                  <button
                    key={vibe.vibe}
                    type="button"
                    onClick={() => setSelectedVibe(vibe.vibe)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedVibe === vibe.vibe
                        ? 'border-[#D2B887] bg-[#D2B887]/10'
                        : 'border-[#E4DCD2] bg-white hover:border-[#D2B887]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{vibe.icon}</span>
                      <span className="font-medium text-sm text-[#1A1A1A]">{vibe.label}</span>
                    </div>
                    <p className="text-xs text-[#1A1A1A]/60 ml-7">{vibe.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4 pt-4 border-t border-[#E4DCD2]">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1A1A1A]/60" />
                <Label className="text-sm font-medium text-[#1A1A1A]">Shipping Address</Label>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Street Address *"
                  value={formData.street}
                  onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                  className="bg-white border-[#E4DCD2] text-[#1A1A1A] text-sm"
                />

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="City *"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="bg-white border-[#E4DCD2] text-[#1A1A1A] text-sm"
                  />
                  <Input
                    placeholder="State *"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    className="bg-white border-[#E4DCD2] text-[#1A1A1A] text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="ZIP Code *"
                    value={formData.zip_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                    className="bg-white border-[#E4DCD2] text-[#1A1A1A] text-sm"
                  />
                  <Select
                    value={formData.country}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                  >
                    <SelectTrigger className="bg-white border-[#E4DCD2] text-[#1A1A1A] text-sm">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E4DCD2]">
                      <SelectItem value="United States">USA</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="United Kingdom">UK</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Gift Gallery */}
          <div className="flex-1 px-8 py-6 lg:overflow-y-auto bg-gradient-to-br from-[#FAF8F3] to-[#EFE7DD]/30">
            <div className="mb-4">
              <h3 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#D2B887]" />
                Choose the Perfect Gift
              </h3>
              <p className="text-xs text-[#1A1A1A]/60 mt-1">
                {selectedVibe ? `Showing ${vibeButtons.find(v => v.vibe === selectedVibe)?.label} gifts` : 'Select a gift vibe to browse'}
              </p>
            </div>

            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D2B887]"></div>
              </div>
            ) : !selectedVibe ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-[#1A1A1A]/50">Select a gift vibe to browse products</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <p className="text-sm text-[#1A1A1A]/50">No products found for this vibe</p>
                <p className="text-xs text-[#1A1A1A]/40">Total products available: {allProducts.length}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className={`group relative bg-white rounded-xl overflow-hidden border-2 transition-all shadow-sm hover:shadow-md ${
                      selectedProduct?.id === product.id
                        ? 'border-[#D2B887] ring-2 ring-[#D2B887]/20'
                        : 'border-[#E4DCD2] hover:border-[#D2B887]/50'
                    }`}
                  >
                    {/* Product Image */}
                    <div className="aspect-square overflow-hidden bg-[#FAF8F3]">
                      <img
                        src={product.featured_image_url || ''}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="p-4 text-left">
                      <h4 className="font-medium text-sm text-[#1A1A1A] line-clamp-2 mb-2">
                        {product.title}
                      </h4>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-[#1A1A1A]">
                          ${product.price.toFixed(2)}
                        </p>
                        <Badge variant="secondary" className="text-xs bg-[#D2B887]/10 text-[#D2B887] border-[#D2B887]/20">
                          {GIFT_VIBE_OPTIONS.find(v => v.vibe === product.gift_vibe)?.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Selected Indicator */}
                    {selectedProduct?.id === product.id && (
                      <div className="absolute top-3 right-3 bg-[#D2B887] text-white rounded-full p-1.5">
                        <Heart className="w-3 h-3 fill-current" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Summary Bar */}
        <div className="border-t-2 border-[#E4DCD2] bg-white px-8 py-4 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Selected Gift Summary */}
            <div className="flex items-center gap-4 flex-1">
              {selectedProduct ? (
                <>
                  <img
                    src={selectedProduct.featured_image_url || ''}
                    alt={selectedProduct.title}
                    className="w-12 h-12 rounded-lg object-cover border border-[#E4DCD2]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">
                      {selectedProduct.title}
                    </p>
                    <p className="text-xs text-[#1A1A1A]/60">
                      ${selectedProduct.price.toFixed(2)}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-[#1A1A1A]/50">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm">No gift selected</span>
                </div>
              )}
            </div>

            {/* Middle: Wallet Balance */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#EFE7DD] rounded-lg">
              <WalletIcon className="w-4 h-4 text-[#1A1A1A]/60" />
              <span className="text-sm font-medium text-[#1A1A1A]">
                ${walletBalance.toFixed(2)}
              </span>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="border-[#E4DCD2] text-[#1A1A1A] hover:bg-[#EFE7DD]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !isFormValid()}
                className="bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A] font-medium"
              >
                {isLoading ? (
                  'Processing...'
                ) : selectedProduct ? (
                  userProfile?.subscription_tier === 'vip' && walletBalance >= selectedProduct.price ? (
                    `Schedule Gift • $${selectedProduct.price.toFixed(2)}`
                  ) : (
                    `Schedule & Pay $${selectedProduct.price.toFixed(2)}`
                  )
                ) : (
                  'Schedule Gift'
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ScheduleGiftModal;
