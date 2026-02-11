
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Gift, DollarSign, User, Clock, Mail } from 'lucide-react';
import { cleanName } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GiftDetailsModalProps {
  gift: any;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (giftId: string) => void;
}

const GiftDetailsModal: React.FC<GiftDetailsModalProps> = ({ gift, isOpen, onClose, onDelete }) => {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if gift is paid but not yet ordered
  const isPaidButNotOrdered = gift?.payment_status === 'paid' && 
    gift?.status !== 'ordered' && 
    !gift?.shopify_order_id;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string, paymentStatus?: string, shopifyOrderId?: string) => {
    // If order has been placed (shopify_order_id exists or status is ordered)
    if (shopifyOrderId || status?.toLowerCase() === 'ordered') {
      return 'bg-blue-100 text-blue-800';
    }
    // If paid but not ordered
    if (paymentStatus === 'paid') {
      return 'bg-amber-100 text-amber-800';
    }
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'bg-slate-100 text-slate-800';
      case 'delivered': return 'status-success';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status: string, paymentStatus?: string, shopifyOrderId?: string) => {
    if (status?.toLowerCase() === 'delivered') {
      return 'Delivered';
    }
    if (shopifyOrderId || status?.toLowerCase() === 'ordered') {
      return 'Processing';
    }
    if (paymentStatus === 'paid') {
      return 'Paid - Ready to Order';
    }
    return status;
  };

  const handlePlaceOrderNow = async () => {
    if (!user || !gift?.id) return;

    setIsPlacingOrder(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      console.log('🎁 Manually placing order for gift:', gift.id);
      
      const { data, error } = await supabase.functions.invoke('process-gift-fulfillment', {
        body: { scheduledGiftId: gift.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Order Placed!",
          description: "Your gift order has been submitted to Shopify.",
        });
        onClose();
        // Trigger refresh
        window.location.reload();
      } else {
        throw new Error(data?.error || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Failed to Place Order",
        description: error instanceof Error ? error.message : "Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const getGiftImage = (gift: any) => {
    // First priority: use the stored gift image URL if available
    if (gift.gift_image_url) {
      return gift.gift_image_url;
    }
    
    // Fallback to type-based mapping
    const imageMap = {
      'wine': 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=300&fit=crop',
      'tea': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400&h=300&fit=crop',
      'coffee': 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=300&fit=crop',
      'sweet treats': 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop',
      'self care': 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=300&fit=crop',
      'candle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop&q=80',
      'ocean driftwood coconut candle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop&q=80',
      'lavender fields coffee': 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=300&fit=crop',
      'truffle chocolate': 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop'
    };
    return imageMap[gift.gift_type?.toLowerCase()] || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop';
  };

  const handleContactSupport = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to contact support.",
        variant: "destructive"
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      await supabase.functions.invoke('send-support-email', {
        body: {
          giftId: gift.id,
          recipientName: gift.recipients?.name || 'Unknown',
          occasionDate: gift.occasion_date,
          giftType: gift.gift_type || 'Unknown',
          userEmail: user.email,
          userName: user.user_metadata?.full_name || user.email
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      toast({
        title: "Support Request Sent",
        description: "Our team will contact you shortly about your order.",
      });
    } catch (error) {
      console.error('Error sending support email:', error);
      toast({
        title: "Failed to Send Request",
        description: "Please try again or contact team@unwrapt.io directly.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Gift className="h-5 w-5 text-brand-gold" />
              <span>Gift Details</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-brand-charcoal">
                {gift.occasion} for {cleanName(gift.recipients?.name)}
              </h3>
              <Badge className={getStatusColor(gift.status, gift.payment_status, gift.shopify_order_id)}>
                {getStatusLabel(gift.status, gift.payment_status, gift.shopify_order_id)}
              </Badge>
            </div>

            {/* Place Order Now - for paid but unordered gifts */}
            {isPaidButNotOrdered && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800">Ready to Ship</h4>
                    <p className="text-xs text-amber-700">Payment received. Click to place the order now.</p>
                  </div>
                  <Button
                    onClick={handlePlaceOrderNow}
                    disabled={isPlacingOrder}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {isPlacingOrder ? 'Placing Order...' : 'Place Order Now'}
                  </Button>
                </div>
              </div>
            )}

            {/* Gift Preview */}
            {gift.gift_type && (
              <div className="bg-gradient-to-br from-brand-cream/20 to-brand-cream/40 border border-brand-cream rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={getGiftImage(gift)}
                    alt={`${gift.gift_type} gift`}
                    className="w-20 h-20 object-cover rounded-lg shadow-sm"
                  />
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-brand-charcoal mb-1">
                      {gift.gift_type}
                    </h4>
                    <p className="text-sm text-brand-charcoal/70">
                      We'll curate premium {gift.gift_type.toLowerCase()} perfect for {cleanName(gift.recipients?.name)}'s interests
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-brand-charcoal/60" />
                  <div>
                    <p className="text-sm font-medium text-brand-charcoal">Recipient</p>
                    <p className="text-sm text-brand-charcoal/70">{cleanName(gift.recipients?.name)}</p>
                    {gift.recipients?.relationship && (
                      <p className="text-xs text-brand-charcoal/50">{gift.recipients.relationship}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-brand-charcoal/60" />
                  <div>
                    <p className="text-sm font-medium text-brand-charcoal">Occasion Date</p>
                    <p className="text-sm text-brand-charcoal/70">{formatDate(gift.occasion_date)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {gift.delivery_date && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-brand-charcoal/60" />
                    <div>
                      <p className="text-sm font-medium text-brand-charcoal">Delivery Date</p>
                      <p className="text-sm text-brand-charcoal/70">{formatDate(gift.delivery_date)}</p>
                    </div>
                  </div>
                )}

                {gift.price_range && (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-brand-charcoal/60" />
                    <div>
                      <p className="text-sm font-medium text-brand-charcoal">Price Range</p>
                      <p className="text-sm text-brand-charcoal/70">{gift.price_range}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {gift.recipients?.interests && gift.recipients.interests.length > 0 && (
              <div>
                <p className="text-sm font-medium text-brand-charcoal mb-2">Recipient Interests</p>
                <div className="flex flex-wrap gap-2">
                  {gift.recipients.interests.map((interest: string, index: number) => (
                    <Badge key={index} variant="outline" className="bg-brand-cream/50">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-brand-charcoal/50 pt-4 border-t">
              Created: {new Date(gift.created_at).toLocaleDateString()}
              {gift.updated_at !== gift.created_at && (
                <span> • Updated: {new Date(gift.updated_at).toLocaleDateString()}</span>
              )}
            </div>

            {/* Support Section */}
            <div className="pt-4 border-t space-y-4">
              <div>
                <h4 className="text-lg font-medium text-brand-charcoal mb-2">
                  Questions/Issues about this order?
                </h4>
                <p className="text-sm text-brand-charcoal/70 mb-4">
                  Contact our support team for any questions or concerns about your gift order.
                </p>
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={handleContactSupport}
                    disabled={isSendingEmail}
                    className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {isSendingEmail ? 'Sending...' : 'Contact Support'}
                  </Button>
                  <Button
                    onClick={onClose}
                    className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GiftDetailsModal;
