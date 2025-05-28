import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Gift, ArrowDown, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShopifyProductTypes } from '@/hooks/useShopifyProductTypes';

interface GiftScheduleStepProps {
  onNext: (data: any) => void;
  recipientName?: string;
}

const GiftScheduleStep: React.FC<GiftScheduleStepProps> = ({ onNext, recipientName }) => {
  const [occasion, setOccasion] = useState('');
  const [occasionDate, setOccasionDate] = useState<Date>();
  const [giftType, setGiftType] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { toast } = useToast();
  const { data: productTypesData, isLoading: isLoadingProductTypes } = useShopifyProductTypes();

  React.useEffect(() => {
    const formValid = occasion && occasionDate && giftType && priceRange;
    setIsValid(!!formValid);
  }, [occasion, occasionDate, giftType, priceRange]);

  const getPriceRangeAmount = (range: string) => {
    switch (range) {
      case 'under-25': return 2500; // $25 in cents
      case '25-50': return 5000;    // $50 in cents
      case '50-100': return 10000;  // $100 in cents
      case '100-200': return 20000; // $200 in cents
      case '200-500': return 50000; // $500 in cents
      case 'over-500': return 75000; // $750 in cents (example for over $500)
      default: return 5000;
    }
  };

  const handleScheduleWithPayment = async () => {
    if (!isValid) return;
    
    setIsProcessingPayment(true);
    
    try {
      // First save the gift data to continue with onboarding
      const giftData = {
        firstGift: {
          occasion,
          occasionDate: occasionDate?.toISOString().split('T')[0],
          giftType,
          priceRange
        }
      };

      // Get payment amount based on price range
      const amount = getPriceRangeAmount(priceRange);

      // Create payment session
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-gift-payment', {
        body: {
          amount,
          giftDetails: {
            recipientName: recipientName || 'your recipient',
            occasion,
            giftType,
            priceRange
          },
          // We'll use a temporary ID for onboarding, will be replaced when gift is actually saved
          scheduledGiftId: 'onboarding-temp-id'
        }
      });

      if (paymentError) throw paymentError;

      if (paymentData?.url) {
        // Store the gift data for after payment
        localStorage.setItem('pendingGiftData', JSON.stringify(giftData));
        
        // Open Stripe checkout in a new tab
        window.open(paymentData.url, '_blank');
        
        toast({
          title: "Payment Required",
          description: "Please complete payment in the new tab to continue with your gift scheduling.",
        });
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment Error",
        description: "There was a problem processing your payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSkip = () => {
    onNext({ firstGift: null });
  };

  const formatPriceRange = (range: string) => {
    switch (range) {
      case 'under-25': return 'Under $25';
      case '25-50': return '$25 - $50';
      case '50-100': return '$50 - $100';
      case '100-200': return '$100 - $200';
      case '200-500': return '$200 - $500';
      case 'over-500': return 'Over $500';
      default: return range;
    }
  };

  // Get product types from Shopify or use fallback
  const productTypes = productTypesData?.productTypes || [];

  return (
    <Card className="animate-fadeInUp border-brand-cream shadow-lg">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-gold/20 p-4 rounded-full">
            <Gift className="h-12 w-12 text-brand-gold" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2 text-brand-charcoal">
          Let's schedule {recipientName ? `${recipientName}'s` : 'your'} first gift
        </CardTitle>
        <p className="text-brand-charcoal/70">
          We'll help you pick the perfect gift and deliver it at just the right time
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Occasion */}
          <div className="space-y-2">
            <Label htmlFor="occasion">What's the occasion? *</Label>
            <Select onValueChange={setOccasion}>
              <SelectTrigger>
                <SelectValue placeholder="Select an occasion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="birthday">Birthday</SelectItem>
                <SelectItem value="anniversary">Anniversary</SelectItem>
                <SelectItem value="holiday">Holiday</SelectItem>
                <SelectItem value="just-because">Just Because</SelectItem>
                <SelectItem value="congratulations">Congratulations</SelectItem>
                <SelectItem value="sympathy">Sympathy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>When is this occasion? *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !occasionDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {occasionDate ? format(occasionDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={occasionDate}
                  onSelect={setOccasionDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Gift Type */}
          <div className="space-y-2">
            <Label htmlFor="giftType">What type of gift? *</Label>
            <Select onValueChange={setGiftType} disabled={isLoadingProductTypes}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingProductTypes ? "Loading gift types..." : "Select gift type"} />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map((type: string) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
                {productTypes.length === 0 && !isLoadingProductTypes && (
                  <SelectItem value="" disabled>No gift types available</SelectItem>
                )}
              </SelectContent>
            </Select>
            {productTypesData?.success === false && (
              <p className="text-xs text-amber-600">
                Using fallback options - Shopify connection unavailable
              </p>
            )}
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <Label htmlFor="priceRange">What's your budget? *</Label>
            <Select onValueChange={setPriceRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select price range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="under-25">Under $25</SelectItem>
                <SelectItem value="25-50">$25 - $50</SelectItem>
                <SelectItem value="50-100">$50 - $100</SelectItem>
                <SelectItem value="100-200">$100 - $200</SelectItem>
                <SelectItem value="200-500">$200 - $500</SelectItem>
                <SelectItem value="over-500">Over $500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Payment Info */}
        {isValid && (
          <div className="bg-brand-gold/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CreditCard className="h-4 w-4 text-brand-charcoal" />
              <span className="font-medium text-brand-charcoal">Payment Required</span>
            </div>
            <p className="text-sm text-brand-charcoal/70">
              You'll pay {formatPriceRange(priceRange)} to schedule this gift
            </p>
          </div>
        )}

        {/* Emotional Copy */}
        <div className="bg-brand-gold/10 p-4 rounded-lg text-center">
          <p className="text-sm text-brand-charcoal">
            🎁 We'll curate the perfect gift and handle everything from selection to delivery
          </p>
        </div>

        {/* Schedule & Pay Button */}
        <Button 
          size="lg" 
          className="w-full text-lg py-6 bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
          onClick={handleScheduleWithPayment}
          disabled={!isValid || isProcessingPayment}
        >
          {isProcessingPayment ? (
            "Processing..."
          ) : (
            <>
              Schedule & Pay for This Gift
              <ArrowDown className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>

        <div className="text-center">
          <Button variant="ghost" onClick={handleSkip} className="text-brand-charcoal hover:bg-brand-cream-light">
            I'll schedule gifts later
          </Button>
        </div>

        <p className="text-center text-xs text-brand-charcoal/60">
          * Required fields
        </p>
      </CardContent>
    </Card>
  );
};

export default GiftScheduleStep;
