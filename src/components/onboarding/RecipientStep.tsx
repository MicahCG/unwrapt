import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Gift, Calendar, MapPin, Heart } from 'lucide-react';

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
    birthday: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Pre-populate form if we have calendar data
  useEffect(() => {
    if (selectedPersonForGift) {
      const updatedData = {
        ...recipientData,
        fullName: selectedPersonForGift.personName || '',
        birthday: selectedPersonForGift.type === 'birthday' ? selectedPersonForGift.date : ''
      };
      setRecipientData(updatedData);
    }
  }, [selectedPersonForGift]);

  // Same interests as in AddRecipientModal - updated with new product names
  const predefinedInterests = [
    'Lavender Fields Coffee', 'Ocean Driftwood Coconut Candle', 'Truffle Chocolate'
  ];

  const handleInputChange = (field: string, value: string) => {
    const updatedData = { ...recipientData, [field]: value };
    setRecipientData(updatedData);
    validateForm(updatedData);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const validateForm = (data: typeof recipientData) => {
    // Require name, relationship, and complete address
    const hasBasicInfo = Boolean(data.fullName && data.relationship);
    const hasAddress = Boolean(data.street && data.city && data.state && data.zipCode);
    setIsValid(hasBasicInfo && hasAddress);
  };

  const handleContinue = () => {
    onNext({ 
      firstRecipient: {
        ...recipientData,
        interests: selectedInterests
      },
      selectedPersonForGift 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });
  };

  const getHeaderText = () => {
    if (selectedPersonForGift) {
      return `What are ${selectedPersonForGift.personName}'s interests?`;
    }
    if (isManualEntry) {
      return "Who would you like to schedule a gift for?";
    }
    return "What are their interests?";
  };

  const getSubHeaderText = () => {
    return "Select interests that will help us find the perfect gifts";
  };

  return (
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-charcoal/10 p-4 rounded-full">
            <Heart className="h-12 w-12 text-brand-charcoal" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2">
          {getHeaderText()}
        </CardTitle>
        <p className="text-muted-foreground">
          {getSubHeaderText()}
        </p>
        {selectedPersonForGift && (
          <div className="bg-brand-gold/10 p-3 rounded-lg mt-4">
            <div className="flex items-center justify-center text-sm text-brand-charcoal">
              <Calendar className="h-4 w-4 mr-2" />
              {selectedPersonForGift.type} on {formatDate(selectedPersonForGift.date)}
            </div>
          </div>
        )}
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
            <Label htmlFor="birthday">Birthday</Label>
            <Input
              id="birthday"
              type="date"
              value={recipientData.birthday}
              onChange={(e) => handleInputChange('birthday', e.target.value)}
            />
          </div>
        </div>

        {/* Interests Section */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium flex items-center">
            <Gift className="h-5 w-5 mr-2" />
            Select interests:
          </h3>
          
          <div className="flex flex-wrap gap-2">
            {predefinedInterests.map((interest) => (
              <Badge
                key={interest}
                variant={selectedInterests.includes(interest) ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  selectedInterests.includes(interest)
                    ? 'bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90'
                    : 'border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light'
                }`}
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </Badge>
            ))}
          </div>

          {selectedInterests.length > 0 && (
            <div className="bg-brand-cream/30 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-brand-charcoal">Selected interests:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedInterests.map((interest) => (
                  <Badge
                    key={interest}
                    className="bg-brand-charcoal text-brand-cream"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
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
            Continue with {selectedInterests.length} interests
          </Button>
        </div>

        <p className="text-center text-xs text-brand-charcoal/60">
          * Required fields
        </p>
      </CardContent>
    </Card>
  );
};

export default RecipientStep;
