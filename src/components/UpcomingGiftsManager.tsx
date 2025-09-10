import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, CreditCard, Gift, Trash2, Plus, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GiftDetailsModal from './GiftDetailsModal';
import RecipientSelectionModal from './RecipientSelectionModal';
import ScheduleGiftModal from './ScheduleGiftModal';

const UpcomingGiftsManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [viewingGift, setViewingGift] = useState(null);
  const [showRecipientSelection, setShowRecipientSelection] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [payingForGift, setPayingForGift] = useState<string | null>(null);

  // Fetch upcoming gifts - separate paid and unpaid
  const { data: paidGifts } = useQuery({
    queryKey: ['upcoming-gifts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_gifts')
        .select(`
          *,
          recipients (id, name, email, interests, street, city, state, zip_code, country, phone)
        `)
        .eq('user_id', user?.id)
        .in('status', ['scheduled', 'ordered', 'paid'])
        .eq('payment_status', 'paid')
        .order('delivery_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: unpaidGifts } = useQuery({
    queryKey: ['unpaid-gifts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_gifts')
        .select(`
          *,
          recipients (id, name, email, interests, street, city, state, zip_code, country, phone)
        `)
        .eq('user_id', user?.id)
        .eq('payment_status', 'unpaid')
        .order('delivery_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Listen for payment event after address collection
  React.useEffect(() => {
    const handleProceedWithPayment = async (event: CustomEvent) => {
      const { giftId } = event.detail;
      
      // Find the gift and proceed with payment
      const gift = unpaidGifts?.find(g => g.id === giftId);
      if (gift) {
        // Re-fetch the gift to get updated recipient address
        const { data: updatedGift } = await supabase
          .from('scheduled_gifts')
          .select(`
            *,
            recipients (id, name, email, interests, street, city, state, zip_code, country, phone)
          `)
          .eq('id', giftId)
          .single();
        
        if (updatedGift) {
          // Now proceed with payment using the updated gift data
          await processPayment(updatedGift);
        }
      }
    };

    window.addEventListener('proceedWithPayment', handleProceedWithPayment);
    return () => window.removeEventListener('proceedWithPayment', handleProceedWithPayment);
  }, [unpaidGifts]);

  const handleDeleteGift = async (giftId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_gifts')
        .delete()
        .eq('id', giftId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['upcoming-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
    } catch (error) {
      console.error('Error deleting gift:', error);
    }
  };

  // Extract payment logic into a separate function
  const processPayment = async (gift: any) => {
    const recipient = gift.recipients;
    
    setPayingForGift(gift.id);
    
    try {
      console.log('🎁 Starting payment process for gift:', gift.id);

      // Prepare shipping address
      const shippingAddress = {
        first_name: recipient.name?.split(' ')[0] || 'Gift',
        last_name: recipient.name?.split(' ').slice(1).join(' ') || 'Recipient',
        address1: recipient.street,
        city: recipient.city,
        province: recipient.state,
        country: recipient.country || 'United States',
        zip: recipient.zip_code,
      };

      // Extract price from price_range (e.g., "$10.00" -> 10.00)
      const priceMatch = gift.price_range?.match(/\$?(\d+\.?\d*)/);
      const productPrice = priceMatch ? parseFloat(priceMatch[1]) : 10.00;

      // Create payment session for the existing gift
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-gift-payment', {
        body: {
          scheduledGiftId: gift.id,
          productPrice: productPrice,
          productImage: getGiftImage(gift),
          giftDetails: {
            recipientName: gift.recipients?.name || 'your recipient',
            occasion: gift.occasion,
            giftType: gift.gift_type
          },
          shippingAddress
        }
      });

      if (paymentError) {
        console.error('Error creating payment:', paymentError);
        throw new Error('Failed to create payment session');
      }

      if (paymentData?.url) {
        console.log('✅ Payment session created, redirecting to Stripe...');
        // Open Stripe checkout in a new tab
        window.open(paymentData.url, '_blank');
        
        toast({
          title: "Redirected to Payment",
          description: "Complete your payment in the new tab to finalize your gift order.",
        });
      }
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      toast({
        title: "Payment Error",
        description: "There was a problem processing your payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPayingForGift(null);
    }
  };

  const handlePayForGift = async (gift: any) => {
    if (!gift) return;
    
    // Check if recipient has complete shipping address
    const recipient = gift.recipients;
    const hasCompleteAddress = recipient?.street && 
                              recipient?.city && 
                              recipient?.state && 
                              recipient?.zip_code;
    
    if (!hasCompleteAddress) {
      // Set state to indicate we're collecting address for this specific gift payment
      setSelectedRecipient(recipient);
      setPayingForGift(gift.id);
      return;
    }
    
    // If address is complete, proceed directly with payment
    await processPayment(gift);
  };

  const handleRecipientSelected = (recipient: any) => {
    setSelectedRecipient(recipient);
    setShowRecipientSelection(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ordered': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGiftImage = (gift: any) => {
    // Priority order: product image, gift image url, fallback
    if (gift.product_image_url) return gift.product_image_url;
    if (gift.gift_image_url) return gift.gift_image_url;
    
    // Fallback based on gift type
    const giftType = gift.gift_type?.toLowerCase();
    if (giftType?.includes('wine')) return 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=300&fit=crop';
    if (giftType?.includes('coffee')) return 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=300&fit=crop';
    if (giftType?.includes('tea')) return 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400&h=300&fit=crop';
    if (giftType?.includes('chocolate') || giftType?.includes('sweet')) return 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop';
    
    return 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop';
  };

  return (
    <div className="space-y-8">
      {/* Gifts Pending Payment Section */}
      {unpaidGifts && unpaidGifts.length > 0 && (
        <div>
          <CardHeader className="px-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5" />
              Gifts Pending Payment
            </CardTitle>
          </CardHeader>
          
          <div className="space-y-4">
            {unpaidGifts.map((gift) => (
              <Card key={gift.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Gift className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-medium text-lg">{gift.recipients?.name}</h3>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          Payment Required
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-4">
                        <img 
                          src={getGiftImage(gift)} 
                          alt={gift.gift_type} 
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{gift.occasion}</p>
                          <p className="font-medium">{gift.gift_type}</p>
                          <p className="text-sm font-semibold text-green-600">{gift.price_range}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(gift.occasion_date)}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button 
                        onClick={() => handlePayForGift(gift)}
                        disabled={!!payingForGift}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Now
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewingGift(gift)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Gifts Section */}
      <div>
        <CardHeader className="px-0 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Gift className="h-5 w-5" />
            Upcoming Gifts
          </CardTitle>
          <Button 
            onClick={() => setShowRecipientSelection(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule More Gifts
          </Button>
        </CardHeader>

        {paidGifts && paidGifts.length > 0 ? (
          <div className="space-y-4">
            {paidGifts.map((gift) => (
              <Card 
                key={gift.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setViewingGift(gift)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Gift className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-medium text-lg">{gift.recipients?.name}</h3>
                        <Badge className={getStatusColor(gift.status)}>
                          {gift.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-4">
                        <img 
                          src={getGiftImage(gift)} 
                          alt={gift.gift_type} 
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{gift.occasion}</p>
                          <p className="font-medium">{gift.gift_type}</p>
                          <p className="text-sm text-muted-foreground">
                            Delivering {gift.delivery_date ? formatDate(gift.delivery_date) : 'TBD'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(gift.occasion_date)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No upcoming gifts scheduled</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Start scheduling thoughtful gifts for your loved ones' special occasions
              </p>
              <Button onClick={() => setShowRecipientSelection(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Your First Gift
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Placeholder for no gifts at all */}
      {(!paidGifts || paidGifts.length === 0) && (!unpaidGifts || unpaidGifts.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted/50 p-4 rounded-full mb-6">
              <Gift className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-3">Ready to spread some joy?</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Schedule thoughtful gifts for birthdays, anniversaries, and special moments. We'll handle the rest!
            </p>
            <Button 
              onClick={() => setShowRecipientSelection(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule Your First Gift
            </Button>
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 max-w-xs">
                Choose from curated gifts and we'll deliver at the perfect time
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {viewingGift && (
        <GiftDetailsModal
          gift={viewingGift}
          isOpen={!!viewingGift}
          onClose={() => setViewingGift(null)}
          onDelete={handleDeleteGift}
        />
      )}

      {showRecipientSelection && (
        <RecipientSelectionModal
          isOpen={showRecipientSelection}
          onClose={() => setShowRecipientSelection(false)}
          onRecipientSelected={handleRecipientSelected}
        />
      )}

      {selectedRecipient && (
        <ScheduleGiftModal
          recipient={selectedRecipient}
          isOpen={!!selectedRecipient}
          onClose={() => {
            setSelectedRecipient(null);
            setPayingForGift(null);
          }}
          payingForGiftId={payingForGift}
        />
      )}
    </div>
  );
};

export default UpcomingGiftsManager;