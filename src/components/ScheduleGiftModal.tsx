
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Package, Heart } from 'lucide-react';
import { useShopifyProductTypes } from '@/hooks/useShopifyProductTypes';

interface ScheduleGiftModalProps {
  recipient: any;
  isOpen: boolean;
  onClose: () => void;
}

const ScheduleGiftModal: React.FC<ScheduleGiftModalProps> = ({ recipient, isOpen, onClose }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: productTypesData, isLoading: isLoadingProductTypes } = useShopifyProductTypes();
  
  const [formData, setFormData] = useState({
    occasion: '',
    occasion_date: '',
    gift_type: '',
    price_range: '',
    gift_description: '',
    delivery_date: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const getDefaultOccasionDate = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    if (recipient.birthday) {
      const birthday = new Date(recipient.birthday);
      const thisYearBirthday = new Date(currentYear, birthday.getMonth(), birthday.getDate());
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(currentYear + 1);
      }
      return {
        occasion: 'Birthday',
        date: thisYearBirthday.toISOString().split('T')[0]
      };
    }
    
    if (recipient.anniversary) {
      const anniversary = new Date(recipient.anniversary);
      const thisYearAnniversary = new Date(currentYear, anniversary.getMonth(), anniversary.getDate());
      if (thisYearAnniversary < today) {
        thisYearAnniversary.setFullYear(currentYear + 1);
      }
      return {
        occasion: 'Anniversary',
        date: thisYearAnniversary.toISOString().split('T')[0]
      };
    }
    
    return { occasion: '', date: '' };
  };

  React.useEffect(() => {
    if (isOpen) {
      // Check if this is a holiday preset
      if (recipient._holidayPreset) {
        setFormData(recipient._holidayPreset);
      } else {
        const defaultOccasion = getDefaultOccasionDate();
        setFormData(prev => ({
          ...prev,
          occasion: defaultOccasion.occasion,
          occasion_date: defaultOccasion.date
        }));
      }
    }
  }, [isOpen, recipient]);

  const getPriceRangeAmount = (range: string) => {
    switch (range) {
      case '$0-$25': return 2500;
      case '$25-$50': return 5000;
      case '$50-$100': return 10000;
      case '$100-$250': return 25000;
      case '$250-$500': return 50000;
      case '$500+': return 75000;
      default: return 5000;
    }
  };

  const formatPriceRange = (range: string) => {
    return range;
  };

  // Gift preview helper functions
  const getGiftImage = (giftType: string) => {
    const imageMap = {
      'wine': 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=300&fit=crop',
      'tea': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400&h=300&fit=crop',
      'coffee': 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=300&fit=crop',
      'sweet treats': 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop',
      'self care': 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=300&fit=crop'
    };
    return imageMap[giftType.toLowerCase()] || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop';
  };

  const getGiftDescription = (giftType: string, recipientName: string) => {
    return `We'll curate premium ${giftType.toLowerCase()} perfect for ${recipientName}'s interests`;
  };

  const getSenderName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Someone special';
  };

  const sendGiftNotificationEmail = async (giftDetails: any) => {
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'gift_scheduled',
          userEmail: user?.email,
          userName: user?.user_metadata?.full_name || user?.email?.split('@')[0],
          recipientName: recipient.name,
          giftDetails: {
            occasion: giftDetails.occasion,
            occasionDate: giftDetails.occasion_date,
            giftType: giftDetails.gift_type,
            priceRange: giftDetails.price_range
          }
        }
      });
      console.log('Gift notification email sent');
    } catch (error) {
      console.error('Failed to send gift notification email:', error);
      // Don't throw error - email failure shouldn't block gift scheduling
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const deliveryDate = formData.delivery_date || 
        new Date(new Date(formData.occasion_date).getTime() - 3 * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0];

      // First create the scheduled gift
      const { data: giftData, error: giftError } = await supabase
        .from('scheduled_gifts')
        .insert({
          user_id: user?.id,
          recipient_id: recipient.id,
          occasion: formData.occasion,
          occasion_date: formData.occasion_date,
          gift_type: formData.gift_type,
          price_range: formData.price_range,
          gift_description: formData.gift_description,
          delivery_date: deliveryDate,
          status: 'scheduled',
          payment_status: 'unpaid'
        })
        .select()
        .single();

      if (giftError) throw giftError;

      // Now process payment
      const amount = getPriceRangeAmount(formData.price_range);

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-gift-payment', {
        body: {
          scheduledGiftId: giftData.id,
          amount,
          giftDetails: {
            recipientName: recipient.name,
            occasion: formData.occasion,
            giftType: formData.gift_type,
            priceRange: formData.price_range
          }
        }
      });

      if (paymentError) throw paymentError;

      if (paymentData?.url) {
        // Send notification email
        await sendGiftNotificationEmail(formData);

        // Open Stripe checkout in a new tab
        window.open(paymentData.url, '_blank');
        
        toast({
          title: "Payment Required",
          description: "Please complete payment in the new tab to finalize your gift scheduling. You'll receive an email confirmation.",
        });

        // Refresh queries
        queryClient.invalidateQueries({ queryKey: ['upcoming-gifts'] });
        queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
        
        onClose();
        setFormData({
          occasion: '',
          occasion_date: '',
          gift_type: '',
          price_range: '',
          gift_description: '',
          delivery_date: ''
        });
      }
    } catch (error) {
      console.error('Error scheduling gift:', error);
      toast({
        title: "Error",
        description: "There was a problem scheduling your gift. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get product types from Shopify or use fallback
  const productTypes = productTypesData?.productTypes || [];

  // Show gift preview if both gift type and price range are selected
  const showGiftPreview = formData.gift_type && formData.price_range;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white border-brand-cream text-brand-charcoal max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-charcoal">Schedule Gift for {recipient.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="occasion" className="text-brand-charcoal">Occasion *</Label>
            <Select 
              value={formData.occasion} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, occasion: value }))}
            >
              <SelectTrigger className="text-brand-charcoal border-brand-cream">
                <SelectValue placeholder="Select occasion" />
              </SelectTrigger>
              <SelectContent className="bg-white text-brand-charcoal border-brand-cream">
                <SelectItem value="Birthday">Birthday</SelectItem>
                <SelectItem value="Anniversary">Anniversary</SelectItem>
                <SelectItem value="Christmas">Christmas</SelectItem>
                <SelectItem value="Valentine's Day">Valentine's Day</SelectItem>
                <SelectItem value="Mother's Day">Mother's Day</SelectItem>
                <SelectItem value="Father's Day">Father's Day</SelectItem>
                <SelectItem value="Graduation">Graduation</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occasion_date" className="text-brand-charcoal">Occasion Date *</Label>
            <Input
              id="occasion_date"
              type="date"
              value={formData.occasion_date}
              onChange={(e) => setFormData(prev => ({ ...prev, occasion_date: e.target.value }))}
              required
              className="text-brand-charcoal border-brand-cream"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gift_type" className="text-brand-charcoal">Gift Type</Label>
            <Select 
              value={formData.gift_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, gift_type: value }))}
              disabled={isLoadingProductTypes}
            >
              <SelectTrigger className="text-brand-charcoal border-brand-cream">
                <SelectValue placeholder={isLoadingProductTypes ? "Loading gift types..." : "Select gift type"} />
              </SelectTrigger>
              <SelectContent className="bg-white text-brand-charcoal border-brand-cream">
                {productTypes.map((type: string) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
                {productTypes.length === 0 && !isLoadingProductTypes && (
                  <SelectItem value="no-types-available" disabled>No gift types available</SelectItem>
                )}
              </SelectContent>
            </Select>
            {productTypesData?.success === false && (
              <p className="text-xs text-brand-charcoal/60">
                Using fallback options - Shopify connection unavailable
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price_range" className="text-brand-charcoal">Price Range *</Label>
            <Select 
              value={formData.price_range} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, price_range: value }))}
            >
              <SelectTrigger className="text-brand-charcoal border-brand-cream">
                <SelectValue placeholder="Select price range" />
              </SelectTrigger>
              <SelectContent className="bg-white text-brand-charcoal border-brand-cream">
                <SelectItem value="$0-$25">$0 - $25</SelectItem>
                <SelectItem value="$25-$50">$25 - $50</SelectItem>
                <SelectItem value="$50-$100">$50 - $100</SelectItem>
                <SelectItem value="$100-$250">$100 - $250</SelectItem>
                <SelectItem value="$250-$500">$250 - $500</SelectItem>
                <SelectItem value="$500+">$500+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gift Preview Section */}
          {showGiftPreview && (
            <Card className="bg-brand-cream/30 border-brand-cream">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Package className="h-4 w-4 text-brand-charcoal" />
                  <span className="font-medium text-sm text-brand-charcoal">Gift Preview</span>
                </div>
                <div className="flex space-x-3">
                  <img
                    src={getGiftImage(formData.gift_type)}
                    alt={`${formData.gift_type} gift`}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-brand-charcoal font-medium mb-1">
                      {formData.gift_type}
                    </p>
                    <p className="text-xs text-brand-charcoal/70">
                      {getGiftDescription(formData.gift_type, recipient.name)}
                    </p>
                    <p className="text-xs text-brand-gold font-medium mt-1">
                      Price Range: {formData.price_range}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Note Preview Section */}
          {formData.gift_type && (
            <Card className="bg-gradient-to-br from-brand-cream/20 to-brand-cream/40 border-brand-cream">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Heart className="h-4 w-4 text-brand-charcoal" />
                  <span className="font-medium text-sm text-brand-charcoal">Note Preview</span>
                </div>
                <div className="bg-white p-3 rounded border border-brand-cream/50 shadow-sm">
                  <p className="text-sm text-brand-charcoal mb-3 leading-relaxed">
                    {getSenderName()} was thinking about you on your special day and decided to send you some {formData.gift_type.toLowerCase()}. We hope you enjoy!
                  </p>
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs text-brand-charcoal/60 italic">
                      This gift was curated and sent through Unwrapt - Making thoughtfulness effortless ✨ unwrapt.io
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="gift_description" className="text-brand-charcoal">Gift Description</Label>
            <Textarea
              id="gift_description"
              value={formData.gift_description}
              onChange={(e) => setFormData(prev => ({ ...prev, gift_description: e.target.value }))}
              placeholder="Describe the gift or any specific preferences..."
              rows={3}
              className="text-brand-charcoal border-brand-cream"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_date" className="text-brand-charcoal">Delivery Date (optional)</Label>
            <Input
              id="delivery_date"
              type="date"
              value={formData.delivery_date}
              onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
              className="text-brand-charcoal border-brand-cream"
            />
            <p className="text-xs text-brand-charcoal/70">
              Leave empty to auto-schedule 3 days before occasion
            </p>
          </div>

          {/* Payment Info */}
          {formData.price_range && (
            <div className="bg-brand-cream p-3 rounded-lg border border-brand-cream">
              <div className="flex items-center space-x-2 mb-1">
                <CreditCard className="h-4 w-4 text-brand-charcoal" />
                <span className="font-medium text-sm text-brand-charcoal">Payment Required</span>
              </div>
              <p className="text-xs text-brand-charcoal/70">
                You'll pay {formatPriceRange(formData.price_range)} to schedule this gift
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isLoading}
              className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
            >
              {isLoading ? 'Processing...' : 'Schedule & Pay for Gift'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleGiftModal;
