
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { CreditCard } from 'lucide-react';

interface ScheduleGiftModalProps {
  recipient: any;
  isOpen: boolean;
  onClose: () => void;
}

const ScheduleGiftModal: React.FC<ScheduleGiftModalProps> = ({ recipient, isOpen, onClose }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
      const defaultOccasion = getDefaultOccasionDate();
      setFormData(prev => ({
        ...prev,
        occasion: defaultOccasion.occasion,
        occasion_date: defaultOccasion.date
      }));
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
        // Open Stripe checkout in a new tab
        window.open(paymentData.url, '_blank');
        
        toast({
          title: "Payment Required",
          description: "Please complete payment in the new tab to finalize your gift scheduling.",
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Gift for {recipient.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="occasion">Occasion *</Label>
            <Select 
              value={formData.occasion} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, occasion: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select occasion" />
              </SelectTrigger>
              <SelectContent>
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
            <Label htmlFor="occasion_date">Occasion Date *</Label>
            <Input
              id="occasion_date"
              type="date"
              value={formData.occasion_date}
              onChange={(e) => setFormData(prev => ({ ...prev, occasion_date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gift_type">Gift Type</Label>
            <Select 
              value={formData.gift_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, gift_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gift type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Electronics">Electronics</SelectItem>
                <SelectItem value="Clothing">Clothing</SelectItem>
                <SelectItem value="Books">Books</SelectItem>
                <SelectItem value="Home & Garden">Home & Garden</SelectItem>
                <SelectItem value="Sports & Outdoors">Sports & Outdoors</SelectItem>
                <SelectItem value="Beauty & Personal Care">Beauty & Personal Care</SelectItem>
                <SelectItem value="Jewelry">Jewelry</SelectItem>
                <SelectItem value="Experience">Experience</SelectItem>
                <SelectItem value="Food & Beverages">Food & Beverages</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price_range">Price Range *</Label>
            <Select 
              value={formData.price_range} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, price_range: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select price range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="$0-$25">$0 - $25</SelectItem>
                <SelectItem value="$25-$50">$25 - $50</SelectItem>
                <SelectItem value="$50-$100">$50 - $100</SelectItem>
                <SelectItem value="$100-$250">$100 - $250</SelectItem>
                <SelectItem value="$250-$500">$250 - $500</SelectItem>
                <SelectItem value="$500+">$500+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gift_description">Gift Description</Label>
            <Textarea
              id="gift_description"
              value={formData.gift_description}
              onChange={(e) => setFormData(prev => ({ ...prev, gift_description: e.target.value }))}
              placeholder="Describe the gift or any specific preferences..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_date">Delivery Date (optional)</Label>
            <Input
              id="delivery_date"
              type="date"
              value={formData.delivery_date}
              onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
            />
            <p className="text-xs text-brand-charcoal/70">
              Leave empty to auto-schedule 3 days before occasion
            </p>
          </div>

          {/* Payment Info */}
          {formData.price_range && (
            <div className="bg-brand-gold/10 p-3 rounded-lg">
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
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90">
              {isLoading ? 'Processing...' : 'Schedule & Pay for Gift'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleGiftModal;
