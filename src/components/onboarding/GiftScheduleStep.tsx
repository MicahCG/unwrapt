import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Gift, ArrowDown, CreditCard, Package, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShopifyProductTypes } from '@/hooks/useShopifyProductTypes';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';

interface GiftScheduleStepProps {
  onNext: (data: any) => void;
  recipientName?: string;
  interests?: string[];
  selectedPersonForGift?: any;
}

const GiftScheduleStep: React.FC<GiftScheduleStepProps> = ({ 
  onNext, 
  recipientName, 
  interests = [], 
  selectedPersonForGift 
}) => {
  const [occasion, setOccasion] = useState('');
  const [occasionDate, setOccasionDate] = useState<Date>();
  const [giftType, setGiftType] = useState('');
  const [priceRange, setPriceRange] = useState('under-25'); // Pre-set to lowest budget
  const [isValid, setIsValid] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { toast } = useToast();
  const { data: productTypesData, isLoading: isLoadingProductTypes } = useShopifyProductTypes();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Pre-populate form based on calendar data
  useEffect(() => {
    if (selectedPersonForGift) {
      // Auto-set occasion based on calendar event type
      if (selectedPersonForGift.type === 'birthday') {
        setOccasion('birthday');
      } else if (selectedPersonForGift.type === 'anniversary') {
        setOccasion('anniversary');
      }

      // Auto-set occasion date from calendar
      if (selectedPersonForGift.date) {
        setOccasionDate(new Date(selectedPersonForGift.date));
      }
    }
  }, [selectedPersonForGift]);

  // Function to auto-select gift type based on interests
  const getGiftTypeFromInterests = (interests: string[], productTypes: string[]) => {
    if (!interests || interests.length === 0 || !productTypes || productTypes.length === 0) return '';
    
    // Create interest-to-gift-type mapping
    const interestMappings: { [key: string]: string[] } = {
      'coffee': ['coffee', 'beverages', 'food'],
      'tea': ['tea', 'beverages', 'food'],
      'wine': ['wine', 'beverages', 'alcohol'],
      'craft beer': ['beer', 'beverages', 'alcohol'],
      'cooking': ['kitchen', 'cooking', 'food', 'home'],
      'baking': ['kitchen', 'baking', 'food', 'home'],
      'fitness': ['sports', 'fitness', 'health', 'wellness'],
      'yoga': ['sports', 'fitness', 'health', 'wellness'],
      'reading': ['books', 'literature', 'education'],
      'gaming': ['electronics', 'games', 'technology'],
      'music': ['electronics', 'music', 'entertainment'],
      'art': ['art', 'crafts', 'creative'],
      'photography': ['electronics', 'photography', 'technology'],
      'travel': ['travel', 'accessories', 'luggage'],
      'gardening': ['garden', 'home', 'plants', 'outdoor'],
      'technology': ['electronics', 'gadgets', 'technology'],
      'fashion': ['clothing', 'fashion', 'apparel'],
      'skincare': ['beauty', 'health', 'skincare', 'cosmetics'],
      'jewelry': ['jewelry', 'accessories', 'fashion'],
      'home decor': ['home', 'decor', 'furniture'],
      'outdoor activities': ['outdoor', 'sports', 'recreation'],
      'sports': ['sports', 'fitness', 'athletic']
    };

    // Find the best matching product type
    for (const interest of interests) {
      const interestLower = interest.toLowerCase();
      const mappings = interestMappings[interestLower] || [interestLower];
      
      for (const mapping of mappings) {
        const matchingType = productTypes.find(type => 
          type.toLowerCase().includes(mapping) || mapping.includes(type.toLowerCase())
        );
        if (matchingType) {
          return matchingType;
        }
      }
    }
    
    return '';
  };

  // Auto-select gift type when product types load and we have interests
  useEffect(() => {
    if (productTypesData?.productTypes && interests && interests.length > 0 && !giftType) {
      const suggestedType = getGiftTypeFromInterests(interests, productTypesData.productTypes);
      if (suggestedType) {
        setGiftType(suggestedType);
      }
    }
  }, [productTypesData, interests, giftType]);

  // Check form validity
  useEffect(() => {
    const formValid = occasion && occasionDate && giftType && priceRange;
    setIsValid(!!formValid);
  }, [occasion, occasionDate, giftType, priceRange]);

  // Gift preview helper functions
  const getGiftImage = (giftType: string) => {
    const imageMap = {
      'lavender fields coffee': 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=300&fit=crop',
      'truffle chocolate': 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop',
      'ocean driftwood coconut candle': 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=300&fit=crop'
    };
    return imageMap[giftType.toLowerCase()] || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop';
  };

  const getGiftDescription = (giftType: string, recipientName: string) => {
    return `We'll curate premium ${giftType.toLowerCase()} perfect for ${recipientName}'s interests`;
  };

  const getSenderName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Someone special';
  };

  const getPriceRangeAmount = (range: string) => {
    switch (range) {
      case 'under-25': return 2500; // $25 in cents
      case '25-50': return 5000;    // $50 in cents
      case '50-100': return 10000;  // $100 in cents
      case '100-200': return 20000; // $200 in cents
      case '200-500': return 50000; // $500 in cents
      case 'over-500': return 75000; // $750 in cents (example for over $500)
      default: return 2500;
    }
  };

  const formatPriceRange = (range: string) => {
    switch (range) {
      case 'under-25': return 'under $25';
      case '25-50': return '$25-$50';
      case '50-100': return '$50-$100';
      case '100-200': return '$100-$200';
      case '200-500': return '$200-$500';
      case 'over-500': return 'over $500';
      default: return range;
    }
  };

  const formatOccasion = (occasion: string) => {
    switch (occasion) {
      case 'birthday': return 'Birthday';
      case 'anniversary': return 'Anniversary';
      case 'valentine': return "Valentine's Day";
      case 'christmas': return 'Christmas';
      case 'mothers-day': return "Mother's Day";
      case 'fathers-day': return "Father's Day";
      case 'graduation': return 'Graduation';
      case 'just-because': return 'Just Because';
      case 'other': return 'Other';
      default: return occasion;
    }
  };

  const handleScheduleWithPayment = async () => {
    if (!isValid) return;
    
    setIsProcessingPayment(true);
    
    try {
      // Save the gift data to continue with onboarding
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
        
        // Store a flag to indicate this is from onboarding flow
        localStorage.setItem('onboardingPaymentFlow', 'true');
        
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-charcoal/10 p-4 rounded-full">
            <Gift className="h-12 w-12 text-brand-charcoal" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2 text-brand-charcoal">
          {recipientName ? `Let's schedule ${recipientName}'s gift` : "Let's schedule your first gift"}
        </CardTitle>
        <p className="text-brand-charcoal/70">
          {selectedPersonForGift 
            ? `Perfect! We've pre-filled the details based on your calendar and their interests.`
            : "We'll handle the selection, purchase, and delivery - you just approve!"
          }
        </p>
        {selectedPersonForGift && (
          <div className="bg-brand-gold/10 p-3 rounded-lg mt-4">
            <div className="flex items-center justify-center text-sm text-brand-charcoal">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {selectedPersonForGift.type} on {formatDate(new Date(selectedPersonForGift.date))}
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {/* Occasion */}
          <div className="space-y-2">
            <Label htmlFor="occasion" className="text-brand-charcoal">What's the occasion? *</Label>
            <Select value={occasion} onValueChange={setOccasion}>
              <SelectTrigger className="text-brand-charcoal border-brand-cream">
                <SelectValue placeholder="Select occasion" />
              </SelectTrigger>
              <SelectContent className="bg-white text-brand-charcoal border-brand-cream">
                <SelectItem value="birthday">Birthday</SelectItem>
                <SelectItem value="anniversary">Anniversary</SelectItem>
                <SelectItem value="valentine">Valentine's Day</SelectItem>
                <SelectItem value="christmas">Christmas</SelectItem>
                <SelectItem value="mothers-day">Mother's Day</SelectItem>
                <SelectItem value="fathers-day">Father's Day</SelectItem>
                <SelectItem value="graduation">Graduation</SelectItem>
                <SelectItem value="just-because">Just Because</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Occasion Date */}
          <div className="space-y-2">
            <Label className="text-brand-charcoal">When is the occasion? *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal border-brand-cream",
                    !occasionDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {occasionDate ? format(occasionDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border-brand-cream">
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
            <Label htmlFor="giftType" className="text-brand-charcoal">What type of gift? *</Label>
            <Select value={giftType} onValueChange={setGiftType}>
              <SelectTrigger className="text-brand-charcoal border-brand-cream">
                <SelectValue placeholder="Select gift type" />
              </SelectTrigger>
              <SelectContent className="bg-white text-brand-charcoal border-brand-cream">
                {isLoadingProductTypes ? (
                  <SelectItem value="loading" disabled>Loading gift types...</SelectItem>
                ) : (
                  productTypesData?.productTypes?.map((type: string) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  )) || <SelectItem value="none" disabled>No gift types available</SelectItem>
                )}
              </SelectContent>
            </Select>
            {interests.length > 0 && (
              <p className="text-xs text-brand-charcoal/60">
                {giftType ? `Great choice! This matches their interest in ${interests.slice(0, 2).join(', ')}${interests.length > 2 ? '...' : ''}` : `We'll suggest based on their interests: ${interests.slice(0, 3).join(', ')}${interests.length > 3 ? '...' : ''}`}
              </p>
            )}
          </div>

          {/* Gift Preview Section - Moved right after gift type */}
          {giftType && (
            <Card className="bg-brand-cream/30 border-brand-cream">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Package className="h-4 w-4 text-brand-charcoal" />
                  <span className="font-medium text-sm text-brand-charcoal">Gift Preview</span>
                </div>
                <div className="flex space-x-3">
                  <img
                    src={getGiftImage(giftType)}
                    alt={`${giftType} gift`}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-brand-charcoal font-medium mb-1">
                      {giftType}
                    </p>
                    <p className="text-xs text-brand-charcoal/70">
                      {getGiftDescription(giftType, recipientName || 'your recipient')}
                    </p>
                    <p className="text-xs text-brand-gold font-medium mt-1">
                      Price Range: {formatPriceRange(priceRange)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Note Preview Section - Moved right after gift preview */}
          {giftType && (
            <Card className="bg-gradient-to-br from-brand-cream/20 to-brand-cream/40 border-brand-cream">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Heart className="h-4 w-4 text-brand-charcoal" />
                  <span className="font-medium text-sm text-brand-charcoal">Note Preview</span>
                </div>
                <div className="bg-white p-3 rounded border border-brand-cream/50 shadow-sm">
                  <p className="text-sm text-brand-charcoal mb-3 leading-relaxed">
                    {getSenderName()} was thinking about you on your special day and decided to send you some {giftType.toLowerCase()}. We hope you enjoy!
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

          {/* Price Range */}
          <div className="space-y-2">
            <Label htmlFor="priceRange" className="text-brand-charcoal">What's your budget? *</Label>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="text-brand-charcoal border-brand-cream">
                <SelectValue placeholder="Select price range" />
              </SelectTrigger>
              <SelectContent className="bg-white text-brand-charcoal border-brand-cream">
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

        {/* Delivery Info */}
        <div className="bg-brand-cream/50 p-3 rounded-lg border border-brand-cream">
          <p className="text-sm text-brand-charcoal/80">
            📦 Deliveries are sent 3 days before occasion
          </p>
        </div>

        {/* Payment Info */}
        {isValid && (
          <div className="bg-brand-cream p-4 rounded-lg border border-brand-cream">
            <div className="flex items-center space-x-2 mb-2">
              <CreditCard className="h-4 w-4 text-brand-charcoal" />
              <span className="font-medium text-brand-charcoal">Payment Required</span>
            </div>
            <p className="text-sm text-brand-charcoal/70">
              You'll pay {formatPriceRange(priceRange)} to schedule this gift
            </p>
          </div>
        )}

        {/* Enhanced Gift Summary */}
        {selectedPersonForGift && isValid && (
          <div className="bg-brand-gold/10 p-4 rounded-lg border border-brand-gold/20">
            <h4 className="font-medium text-brand-charcoal mb-3">🎁 Gift Summary</h4>
            <div className="text-sm text-brand-charcoal/80 leading-relaxed">
              <p className="mb-2">
                You're gifting <span className="font-medium text-brand-charcoal">{recipientName}</span> on their <span className="font-medium text-brand-charcoal">{formatOccasion(occasion)}</span> 
                {occasionDate && <span> ({format(occasionDate, "MMM d, yyyy")})</span>} with <span className="font-medium text-brand-charcoal">{giftType}</span> for <span className="font-medium text-brand-charcoal">{formatPriceRange(priceRange)}</span> because you want to show you care.
              </p>
              {interests.length > 0 && (
                <p className="text-xs text-brand-charcoal/60 mt-2">
                  Based on their interests: {interests.slice(0, 3).join(', ')}{interests.length > 3 ? '...' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Emotional Copy */}
        <div className="bg-brand-cream p-4 rounded-lg border border-brand-cream text-center">
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
          <Button 
            variant="ghost" 
            onClick={handleSkip} 
            className="text-brand-charcoal hover:bg-brand-cream"
          >
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
