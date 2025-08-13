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
import { CreditCard, Package, Heart, MapPin, ChevronLeft } from 'lucide-react';
import { useProductsForInterests } from '@/hooks/useShopifyCollection';
import InterestBasedProductSelector from './InterestBasedProductSelector';
import { cleanName } from '@/lib/utils';

interface ScheduleGiftModalProps {
  recipient: any;
  isOpen: boolean;
  onClose: () => void;
}

const ScheduleGiftModal: React.FC<ScheduleGiftModalProps> = ({ recipient, isOpen, onClose }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    occasion: '',
    occasion_date: '',
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
      // Parse date as local date to avoid timezone issues
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

  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
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
          occasion: defaultOccasion.occasion,
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
          recipientName: cleanName(recipient.name),
          giftDetails: {
            occasion: giftDetails.occasion,
            occasionDate: giftDetails.occasion_date,
            giftType: giftDetails.gift_type,
            price: giftDetails.price
          }
        }
      });
      console.log('Gift notification email sent');
    } catch (error) {
      console.error('Failed to send gift notification email:', error);
      // Don't throw error - email failure shouldn't block gift scheduling
    }
  };

  const isStep1Valid = () => {
    return formData.occasion && 
           formData.occasion_date && 
           selectedProduct; // Ensure we have selected product
  };

  const isStep2Valid = () => {
    return formData.street &&
           formData.city &&
           formData.state &&
           formData.zip_code;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && isStep1Valid()) {
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep1Valid() || !isStep2Valid() || !selectedProduct) return;
    
    setIsLoading(true);

    try {
      const deliveryDate = new Date(new Date(formData.occasion_date).getTime() - 3 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      // First, update the recipient with the complete address information
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
        .eq('id', recipient.id);

      if (recipientUpdateError) {
        console.error('Error updating recipient address:', recipientUpdateError);
        throw new Error('Failed to update recipient address');
      }

      console.log('Successfully updated recipient address for:', cleanName(recipient.name));

      // Then create the scheduled gift with Shopify price
      const { data: giftData, error: giftError } = await supabase
        .from('scheduled_gifts')
        .insert({
          user_id: user?.id,
          recipient_id: recipient.id,
          occasion: formData.occasion,
          occasion_date: formData.occasion_date,
          gift_type: selectedProduct.title,
          price_range: `$${selectedProduct.price.toFixed(2)}`, // Store actual price
          delivery_date: deliveryDate,
          status: 'scheduled',
          payment_status: 'unpaid'
        })
        .select()
        .single();

      if (giftError) throw giftError;

      // Now process payment with Shopify product data
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-gift-payment', {
        body: {
          scheduledGiftId: giftData.id,
          productPrice: selectedProduct.price,
          productImage: selectedProduct.featuredImage,
          giftDetails: {
            recipientName: cleanName(recipient.name),
            occasion: formData.occasion,
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
          variantId: selectedProduct.variantId
        }
      });

      if (paymentError) throw paymentError;

      if (paymentData?.url) {
        // Send notification email
        await sendGiftNotificationEmail({
          ...formData,
          gift_type: selectedProduct.title,
          price: selectedProduct.price
        });

        // Set success flag for animation when user returns
        sessionStorage.setItem('giftScheduledSuccess', JSON.stringify({
          recipientId: recipient.id,
          timestamp: Date.now()
        }));

        // Redirect in the same tab instead of opening new tab
        window.location.href = paymentData.url;
        
        // Refresh queries to update the UI
        queryClient.invalidateQueries({ queryKey: ['upcoming-gifts'] });
        queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['recipients'] });
        
        onClose();
        setFormData({
          occasion: '',
          occasion_date: '',
          street: '',
          city: '',
          state: '',
          zip_code: '',
          country: 'United States'
        });
        setSelectedProduct(null);
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

  const handleClose = () => {
    setCurrentStep(1);
    onClose();
  };

  const renderStep1 = () => (
    <div className="space-y-4">
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

      <div className="space-y-6">
        <Label className="text-lg font-semibold text-brand-charcoal">Choose Gift *</Label>
        <InterestBasedProductSelector
          recipientInterests={recipient.interests || []}
          onProductSelect={setSelectedProduct}
          selectedProduct={selectedProduct}
          className="min-h-[400px]"
        />
      </div>

      {selectedProduct && (
        <Card className="bg-gradient-to-br from-brand-cream/20 to-brand-cream/40 border-brand-cream">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Heart className="h-4 w-4 text-brand-charcoal" />
              <span className="font-medium text-sm text-brand-charcoal">Note Preview</span>
            </div>
            <div className="bg-white p-3 rounded border border-brand-cream/50 shadow-sm">
              <p className="text-sm text-brand-charcoal mb-3 leading-relaxed">
                {getSenderName()} was thinking about you on your special day and decided to send you some {selectedProduct.title.toLowerCase()}. We hope you enjoy!
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

      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleClose} 
          className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream"
        >
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={handleNextStep}
          disabled={!isStep1Valid()} 
          className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
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

      <div className="bg-brand-cream/50 p-3 rounded-lg border border-brand-cream">
        <p className="text-sm text-brand-charcoal/80">
          📦 Deliveries are sent 3 days before occasion
        </p>
      </div>

      {selectedProduct && (
        <div className="bg-brand-cream p-3 rounded-lg border border-brand-cream">
          <div className="flex items-center space-x-2 mb-1">
            <CreditCard className="h-4 w-4 text-brand-charcoal" />
            <span className="font-medium text-sm text-brand-charcoal">Payment Required</span>
          </div>
          <p className="text-xs text-brand-charcoal/70">
            You'll pay ${selectedProduct.price.toFixed(2)} to schedule this gift
          </p>
        </div>
      )}

      <div className="flex justify-between space-x-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handlePrevStep}
          className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="flex space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose} 
            disabled={isLoading}
            className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || !isStep2Valid()} 
            className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
          >
            {isLoading ? 'Processing...' : 
             selectedProduct ? `Schedule & Pay $${selectedProduct.price.toFixed(2)}` : 
             'Schedule & Pay for Gift'}
          </Button>
        </div>
      </div>
    </form>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white border-brand-cream text-brand-charcoal max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-charcoal">
            {currentStep === 1 ? `Schedule Gift for ${cleanName(recipient.name)}` : 'Shipping Address'}
          </DialogTitle>
          <div className="flex space-x-2 mt-2">
            <div className={`h-2 rounded-full flex-1 ${currentStep >= 1 ? 'bg-brand-charcoal' : 'bg-brand-cream'}`} />
            <div className={`h-2 rounded-full flex-1 ${currentStep >= 2 ? 'bg-brand-charcoal' : 'bg-brand-cream'}`} />
          </div>
        </DialogHeader>
        
        {currentStep === 1 ? renderStep1() : renderStep2()}
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleGiftModal;