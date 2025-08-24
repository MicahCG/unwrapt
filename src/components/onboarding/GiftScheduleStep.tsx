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
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import ProductSelector from '@/components/ProductSelector';
import { ShopifyProduct } from '@/hooks/useShopifyCollection';

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
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Helper function to format occasion text
  const formatOccasion = (occasion: string) => {
    const formatMap: { [key: string]: string } = {
      'birthday': 'birthday',
      'anniversary': 'anniversary',
      'valentine': 'Valentine\'s Day',
      'christmas': 'Christmas',
      'mothers-day': 'Mother\'s Day',
      'fathers-day': 'Father\'s Day',
      'graduation': 'graduation',
      'just-because': 'special day',
      'other': 'special occasion'
    };
    return formatMap[occasion.toLowerCase()] || occasion;
  };

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

  // Check form validity
  useEffect(() => {
    const formValid = occasion && occasionDate && selectedProduct;
    setIsValid(!!formValid);
  }, [occasion, occasionDate, selectedProduct]);

  const getGiftDescription = (product: ShopifyProduct, recipientName: string) => {
    return `${product.title} - perfect for ${recipientName}'s interests`;
  };

  const getSenderName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Someone special';
  };

  // Function to create a recipient record if we don't have one
  const createOrGetRecipient = async () => {
    if (!recipientName || !user?.id) {
      throw new Error('Missing recipient name or user');
    }

    // Check if recipient already exists for this user
    const { data: existingRecipients, error: searchError } = await supabase
      .from('recipients')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', recipientName)
      .limit(1);

    if (searchError) {
      console.error('Error searching for existing recipient:', searchError);
    }

    // If recipient exists, use it
    if (existingRecipients && existingRecipients.length > 0) {
      console.log('Using existing recipient:', existingRecipients[0].id);
      return existingRecipients[0].id;
    }

    // Create new recipient
    const recipientData: any = {
      user_id: user.id,
      name: recipientName,
      interests: interests || [],
    };

    // Add address if available from selectedPersonForGift
    if (selectedPersonForGift?.address) {
      recipientData.street = selectedPersonForGift.address.street;
      recipientData.city = selectedPersonForGift.address.city;
      recipientData.state = selectedPersonForGift.address.state;
      recipientData.zip_code = selectedPersonForGift.address.zip;
      recipientData.country = selectedPersonForGift.address.country || 'United States';
    }

    // Add birthday if available
    if (selectedPersonForGift?.birthday) {
      recipientData.birthday = selectedPersonForGift.birthday;
    }

    const { data: newRecipient, error: createError } = await supabase
      .from('recipients')
      .insert(recipientData)
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating recipient:', createError);
      throw new Error('Failed to create recipient');
    }

    console.log('Created new recipient:', newRecipient.id);
    return newRecipient.id;
  };

  const handleScheduleWithPayment = async () => {
    if (!isValid || !selectedProduct) return;
    
    setIsProcessingPayment(true);
    
    try {
      console.log('🎁 Starting onboarding gift creation process...');

      // Get or create recipient
      const recipientId = await createOrGetRecipient();

      // Create the actual scheduled gift in the database
      const deliveryDate = new Date(new Date(occasionDate!).getTime() - 4 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      const { data: giftData, error: giftError } = await supabase
        .from('scheduled_gifts')
        .insert({
          user_id: user?.id,
          recipient_id: recipientId,
          occasion,
          occasion_date: occasionDate?.toISOString().split('T')[0],
          gift_type: selectedProduct.title,
          price_range: `$${selectedProduct.price.toFixed(2)}`,
          delivery_date: deliveryDate,
          status: 'scheduled',
          payment_status: 'unpaid'
        })
        .select()
        .single();

      if (giftError) {
        console.error('Error creating scheduled gift:', giftError);
        throw new Error('Failed to create scheduled gift');
      }

      console.log('✅ Created scheduled gift with ID:', giftData.id);

      // Prepare shipping address if available
      let shippingAddress = undefined;
      if (selectedPersonForGift?.address) {
        shippingAddress = {
          first_name: recipientName?.split(' ')[0] || 'Gift',
          last_name: recipientName?.split(' ').slice(1).join(' ') || 'Recipient',
          address1: selectedPersonForGift.address.street,
          city: selectedPersonForGift.address.city,
          province: selectedPersonForGift.address.state,
          country: selectedPersonForGift.address.country || 'United States',
          zip: selectedPersonForGift.address.zip,
        };
      }

      // Create payment session with the REAL gift ID (not temp ID)
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-gift-payment', {
        body: {
          scheduledGiftId: giftData.id, // 🔥 REAL ID instead of 'onboarding-temp-id'
          productPrice: selectedProduct.price,
          productImage: selectedProduct.featuredImage || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop',
          giftDetails: {
            recipientName: recipientName || 'your recipient',
            occasion,
            giftType: selectedProduct.title
          },
          variantId: selectedProduct.variantId,
          shippingAddress
        }
      });

      if (paymentError) {
        console.error('Error creating payment:', paymentError);
        throw new Error('Failed to create payment session');
      }

      if (paymentData?.url) {
        console.log('✅ Payment session created, redirecting to Stripe...');

        // Store the gift data for after payment
        const pendingGiftData = {
          firstGift: {
            id: giftData.id, // Store the real ID
            occasion,
            occasionDate: occasionDate?.toISOString().split('T')[0],
            giftType: selectedProduct.title,
            price: selectedProduct.price,
            recipientId,
            recipientName
          }
        };
        localStorage.setItem('pendingGiftData', JSON.stringify(pendingGiftData));
        
        // Store a flag to indicate this is from onboarding flow
        localStorage.setItem('onboardingPaymentFlow', 'true');
        
        // Redirect in the same tab for onboarding flow
        window.location.href = paymentData.url;
      }
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      toast({
        title: "Payment Error",
        description: "There was a problem processing your payment. Please try again.",
        variant: "destructive"
      });

      // Clean up the gift if payment creation failed
      // This prevents orphaned unpaid gifts
      // Note: We could add cleanup logic here if needed
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

          {/* Gift Selection */}
          <div className="space-y-3">
            <Label className="text-brand-charcoal">Choose a gift *</Label>
            {interests.length > 0 && (
              <p className="text-xs text-brand-charcoal/60">
                {selectedProduct ? `Perfect choice! This matches their interests.` : `We'll show products based on their interests: ${interests.slice(0, 3).join(', ')}${interests.length > 3 ? '...' : ''}`}
              </p>
            )}
            <ProductSelector
              interests={interests}
              onProductSelect={setSelectedProduct}
              selectedProduct={selectedProduct}
              className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-brand-cream/50"
            />
          </div>

           {/* Gift Preview Section */}
           {selectedProduct && (
             <div className="bg-gradient-to-br from-brand-gold/5 to-brand-cream/20 rounded-xl p-6 border border-brand-gold/20">
               <div className="flex items-start space-x-4">
                 <div className="flex-shrink-0">
                   <img
                     src={selectedProduct.featuredImage || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop'}
                     alt={selectedProduct.title}
                     className="w-20 h-20 object-cover rounded-lg shadow-sm"
                   />
                 </div>
                 
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center space-x-2 mb-2">
                     <h4 className="text-lg font-semibold text-brand-charcoal">
                       {selectedProduct.title}
                     </h4>
                     <Heart className="h-4 w-4 text-red-500 fill-current" />
                   </div>
                   
                   <p className="text-sm text-brand-charcoal/80 mb-3">
                     {getGiftDescription(selectedProduct, recipientName || 'your recipient')}
                   </p>
                   
                   <div className="flex items-center justify-between">
                     <div className="text-lg font-bold text-brand-charcoal">
                       ${selectedProduct.price.toFixed(2)}
                     </div>
                     <div className="text-xs text-brand-charcoal/60">
                       From {getSenderName()}
                     </div>
                   </div>
                 </div>
               </div>
               
               <div className="mt-4 p-3 bg-white/70 rounded-lg">
                 <div className="flex items-center space-x-2 text-sm text-brand-charcoal/80">
                   <Package className="h-4 w-4" />
                   <span>We'll handle the purchase and delivery 3-5 days before the {formatOccasion(occasion)}</span>
                 </div>
               </div>
             </div>
           )}
 
           {/* Note Preview Section */}
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
        </div>

        {/* Delivery Info */}
        <div className="bg-brand-cream/50 p-3 rounded-lg border border-brand-cream">
          <p className="text-sm text-brand-charcoal/80">
            📦 Deliveries are sent 3-5 days before occasion
          </p>
        </div>

        {/* Payment Info with dynamic pricing */}
        {isValid && selectedProduct && (
          <div className="bg-brand-cream p-4 rounded-lg border border-brand-cream">
            <div className="flex items-center space-x-2 mb-2">
              <CreditCard className="h-4 w-4 text-brand-charcoal" />
              <span className="font-medium text-brand-charcoal">Payment Required</span>
            </div>
            <p className="text-sm text-brand-charcoal/70">
              You'll pay ${selectedProduct.price.toFixed(2)} to schedule this gift
            </p>
          </div>
        )}

        {/* Enhanced Gift Summary */}
        {selectedPersonForGift && isValid && selectedProduct && (
          <div className="bg-brand-gold/10 p-4 rounded-lg border border-brand-gold/20">
            <h4 className="font-medium text-brand-charcoal mb-3">🎁 Gift Summary</h4>
            <div className="text-sm text-brand-charcoal/80 leading-relaxed">
              <p className="mb-2">
                You're gifting <span className="font-medium text-brand-charcoal">{recipientName}</span> on their <span className="font-medium text-brand-charcoal">{formatOccasion(occasion)}</span> 
                {occasionDate && <span> ({format(occasionDate, "MMM d, yyyy")})</span>} with <span className="font-medium text-brand-charcoal">{selectedProduct.title}</span> for <span className="font-medium text-brand-charcoal">${selectedProduct.price.toFixed(2)}</span> because you want to show you care.
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
          disabled={!isValid || isProcessingPayment || !selectedProduct}
        >
          {isProcessingPayment ? (
            "Processing..."
          ) : selectedProduct ? (
            <>
              Schedule & Pay ${selectedProduct.price.toFixed(2)} for This Gift
              <ArrowDown className="h-4 w-4 ml-2" />
            </>
          ) : (
            "Select a gift to continue"
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