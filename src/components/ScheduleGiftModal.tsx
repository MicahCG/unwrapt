import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Package, Heart, MapPin } from 'lucide-react';
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
    price_range: '$0-$25', // Auto-select the lowest price range by default
    // Address fields
    street: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States'
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
    
    return { occasion: '', date: '' };
  };

  React.useEffect(() => {
    if (isOpen) {
      // Check if this is a holiday preset
      if (recipient._holidayPreset) {
        setFormData(prev => ({
          ...prev,
          ...recipient._holidayPreset,
          price_range: prev.price_range || '$0-$25' // Ensure price range is set even with preset
        }));
      } else {
        const defaultOccasion = getDefaultOccasionDate();
        setFormData(prev => ({
          ...prev,
          occasion: defaultOccasion.occasion,
          occasion_date: defaultOccasion.date,
          price_range: '$0-$25' // Ensure price range is always set
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

  const isFormValid = () => {
    return formData.occasion && 
           formData.occasion_date && 
           formData.gift_type && 
           formData.price_range &&
           formData.street &&
           formData.city &&
           formData.state &&
           formData.zip_code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    
    setIsLoading(true);

    try {
      const deliveryDate = new Date(new Date(formData.occasion_date).getTime() - 3 * 24 * 60 * 60 * 1000)
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
          },
          shippingAddress: {
            first_name: recipient.name.split(' ')[0] || recipient.name,
            last_name: recipient.name.split(' ').slice(1).join(' ') || '',
            address1: formData.street,
            city: formData.city,
            province: formData.state,
            country: formData.country,
            zip: formData.zip_code
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
          street: '',
          city: '',
          state: '',
          zip_code: '',
          country: 'United States'
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
            <Label htmlFor="gift_type" className="text-brand-charcoal">Gift Type *</Label>
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

          {/* Gift Preview Section - Moved right after gift type */}
          {formData.gift_type && (
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
                    {formData.price_range && (
                      <p className="text-xs text-brand-gold font-medium mt-1">
                        Price Range: {formData.price_range}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Note Preview Section - Moved right after gift preview */}
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

          {/* Shipping Address Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center space-x-2 mb-3">
              <MapPin className="h-4 w-4 text-brand-charcoal" />
              <span className="font-medium text-sm text-brand-charcoal">Shipping Address *</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street" className="text-brand-charcoal">Street Address *</Label>
              <Input
                id="street"
                placeholder="123 Main Street"
                value={formData.street}
                onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                required
                className="text-brand-charcoal border-brand-cream"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-brand-charcoal">City *</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  required
                  className="text-brand-charcoal border-brand-cream"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-brand-charcoal">State *</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  required
                  className="text-brand-charcoal border-brand-cream"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip_code" className="text-brand-charcoal">ZIP Code *</Label>
                <Input
                  id="zip_code"
                  placeholder="12345"
                  value={formData.zip_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                  required
                  className="text-brand-charcoal border-brand-cream"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-brand-charcoal">Country *</Label>
                <Select 
                  value={formData.country} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                >
                  <SelectTrigger className="text-brand-charcoal border-brand-cream">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-brand-charcoal border-brand-cream">
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-brand-cream/50 p-3 rounded-lg border border-brand-cream">
            <p className="text-sm text-brand-charcoal/80">
              📦 Deliveries are sent 3 days before occasion
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
              disabled={isLoading || !isFormValid()} 
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
