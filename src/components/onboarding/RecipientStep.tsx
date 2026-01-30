import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Heart, MapPin, CalendarIcon, UserPlus, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { type GiftVibe, type Product, getAllProducts } from '@/lib/giftVibes';
import GiftCatalogPreview from './GiftCatalogPreview';

interface RecipientStepProps {
  onNext: (data: any) => void;
  interests?: string[];
  selectedPersonForGift?: any;
  isManualEntry?: boolean;
  requireShippingAddress?: boolean;
}

const RecipientStep: React.FC<RecipientStepProps> = ({
  onNext,
  interests,
  selectedPersonForGift,
  isManualEntry = false,
  requireShippingAddress = false
}) => {
  const [recipientData, setRecipientData] = useState({
    fullName: '',
    relationship: '',
    birthday: undefined as Date | undefined,
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });

  const [selectedVibe, setSelectedVibe] = useState<GiftVibe | null>(null);
  const [isValid, setIsValid] = useState(false);

  // Fetch products just for displaying inspirational images
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => getAllProducts(),
    staleTime: 5 * 60 * 1000,
  });

  // Get sample images for each vibe (just for inspiration)
  const getVibeImages = (vibe: GiftVibe) => {
    return allProducts
      .filter(p => p.gift_vibe === vibe)
      .slice(0, 3)
      .map(p => p.featured_image_url);
  };

  // Pre-populate form if we have calendar data
  useEffect(() => {
    if (selectedPersonForGift) {
      const updatedData = {
        ...recipientData,
        fullName: selectedPersonForGift.personName || '',
        birthday: selectedPersonForGift.type === 'birthday' && selectedPersonForGift.date
          ? new Date(selectedPersonForGift.date)
          : undefined
      };
      setRecipientData(updatedData);
    }
  }, [selectedPersonForGift]);

  // Vibe button mappings (user-friendly labels)
  const vibeButtons = [
    {
      label: 'Home & Atmosphere',
      vibe: 'CALM_COMFORT' as GiftVibe,
      description: 'Candles, aromatherapy, and cozy home essentials',
      icon: '🕯️'
    },
    {
      label: 'Personal & Mindful',
      vibe: 'ARTFUL_UNIQUE' as GiftVibe,
      description: 'Handcrafted pottery, artisan goods, and unique finds',
      icon: '🎨'
    },
    {
      label: 'Luxe & Elegant',
      vibe: 'REFINED_STYLISH' as GiftVibe,
      description: 'Premium glassware, statement decor, and refined pieces',
      icon: '✨'
    }
  ];

  const handleInputChange = (field: string, value: string | Date | undefined) => {
    const updatedData = { ...recipientData, [field]: value };
    setRecipientData(updatedData);
    validateForm(updatedData, selectedVibe);
  };

  const validateForm = (data: typeof recipientData, vibe: GiftVibe | null) => {
    // Require name, relationship, address, and vibe
    const hasBasicInfo = Boolean(data.fullName && data.relationship);
    const hasAddress = Boolean(data.street && data.city && data.state && data.zipCode);
    const hasVibe = Boolean(vibe);
    setIsValid(hasBasicInfo && hasAddress && hasVibe);
  };

  const handleVibeSelect = (vibe: GiftVibe) => {
    setSelectedVibe(vibe);
    validateForm(recipientData, vibe);
  };

  const handleContinue = () => {
    onNext({
      firstRecipient: {
        fullName: recipientData.fullName,
        relationship: recipientData.relationship,
        birthday: recipientData.birthday ? format(recipientData.birthday, 'yyyy-MM-dd') : null,
        street: recipientData.street,
        city: recipientData.city,
        state: recipientData.state,
        zipCode: recipientData.zipCode,
        country: recipientData.country,
        preferredGiftVibe: selectedVibe
      },
      selectedPersonForGift
    });
  };

  const getHeaderText = () => {
    if (selectedPersonForGift) {
      return `Add details for ${selectedPersonForGift.personName}`;
    }
    if (isManualEntry) {
      return "Add Your First Recipient";
    }
    return "Add Recipient Details";
  };

  const getSubHeaderText = () => {
    return "Enter their details and choose a gift style";
  };

  return (
    <div className="space-y-6">
      {/* Gift Catalog Preview - Shows first to build trust */}
      {isManualEntry && (
        <GiftCatalogPreview maxProducts={4} />
      )}

      <Card className="animate-fadeInUp">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-brand-charcoal/10 p-4 rounded-full">
              <UserPlus className="h-12 w-12 text-brand-charcoal" />
            </div>
          </div>
          <CardTitle className="text-3xl mb-2">
            {getHeaderText()}
          </CardTitle>
          <p className="text-muted-foreground">
            {getSubHeaderText()}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              placeholder="Enter their full name"
              value={recipientData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship *</Label>
            <Select value={recipientData.relationship} onValueChange={(value) => handleInputChange('relationship', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mom">Mom</SelectItem>
                <SelectItem value="dad">Dad</SelectItem>
                <SelectItem value="partner">Partner/Spouse</SelectItem>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="sibling">Sibling</SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="colleague">Colleague</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Birthday</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !recipientData.birthday && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {recipientData.birthday ? format(recipientData.birthday, "MMMM d, yyyy") : "Select birthday"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={recipientData.birthday}
                  onSelect={(date) => handleInputChange('birthday', date)}
                  initialFocus
                  defaultMonth={recipientData.birthday || new Date(1990, 0)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Gift Vibe Selection - Inspirational */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="h-5 w-5 text-brand-charcoal" />
            <h3 className="text-lg font-medium text-brand-charcoal">Gift Style *</h3>
          </div>
          <p className="text-sm text-brand-charcoal/60 mb-4">
            What type of gifts would they love?
          </p>

          <div className="space-y-3">
            {vibeButtons.map((vibe) => {
              const vibeImages = getVibeImages(vibe.vibe);
              const isSelected = selectedVibe === vibe.vibe;

              return (
                <button
                  key={vibe.vibe}
                  type="button"
                  onClick={() => handleVibeSelect(vibe.vibe)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-brand-charcoal bg-brand-charcoal/5'
                      : 'border-brand-cream-light bg-white hover:border-brand-charcoal/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{vibe.icon}</span>
                    <span className="font-medium text-brand-charcoal">{vibe.label}</span>
                  </div>
                  <p className="text-sm text-brand-charcoal/60 mb-3 ml-8">{vibe.description}</p>

                  {/* Inspirational product images */}
                  {vibeImages.length > 0 && (
                    <div className="flex gap-2 ml-8">
                      {vibeImages.map((imageUrl, idx) => (
                        imageUrl && (
                          <div
                            key={idx}
                            className="w-16 h-16 rounded-lg overflow-hidden bg-brand-cream/30"
                          >
                            <img
                              src={imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shipping Address Section */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center space-x-2 mb-3">
            <MapPin className="h-5 w-5 text-brand-charcoal" />
            <h3 className="text-lg font-medium text-brand-charcoal">Delivery Address *</h3>
          </div>
          <p className="text-sm text-brand-charcoal/60 mb-4">
            This address will be used for gift delivery
          </p>

          {/* Street Address */}
          <div className="space-y-2">
            <Label htmlFor="street">Street Address *</Label>
            <Input
              id="street"
              placeholder="123 Main Street"
              value={recipientData.street}
              onChange={(e) => handleInputChange('street', e.target.value)}
              required
            />
          </div>

          {/* City and State */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                placeholder="City"
                value={recipientData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                placeholder="State"
                value={recipientData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                required
              />
            </div>
          </div>

          {/* ZIP Code and Country */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                placeholder="12345"
                value={recipientData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select value={recipientData.country} onValueChange={(value) => handleInputChange('country', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <Button
            onClick={handleContinue}
            disabled={!isValid}
            className="w-full bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
          >
            Continue
          </Button>
        </div>

        <p className="text-center text-xs text-brand-charcoal/60">
          * Required fields
        </p>
      </CardContent>
      </Card>
    </div>
  );
};

export default RecipientStep;
