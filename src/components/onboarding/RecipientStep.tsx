
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, Calendar } from 'lucide-react';

interface RecipientStepProps {
  onNext: (data: any) => void;
  interests?: string[];
  selectedPersonForGift?: any;
  isManualEntry?: boolean; // New prop to indicate manual entry mode
}

const RecipientStep: React.FC<RecipientStepProps> = ({ 
  onNext, 
  interests, 
  selectedPersonForGift,
  isManualEntry = false 
}) => {
  const [recipientData, setRecipientData] = useState({
    fullName: '',
    relationship: '',
    email: '',
    phone: '',
    birthday: '',
    anniversary: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    }
  });

  const [isValid, setIsValid] = useState(false);

  // Pre-populate form if we have calendar data
  useEffect(() => {
    if (selectedPersonForGift) {
      const updatedData = {
        ...recipientData,
        fullName: selectedPersonForGift.personName || '',
        birthday: selectedPersonForGift.type === 'birthday' ? selectedPersonForGift.date : '',
        anniversary: selectedPersonForGift.type === 'anniversary' ? selectedPersonForGift.date : ''
      };
      setRecipientData(updatedData);
    }
  }, [selectedPersonForGift]);

  const handleInputChange = (field: string, value: string) => {
    const updatedData = { ...recipientData, [field]: value };
    setRecipientData(updatedData);
    
    // For manual entry mode, only require name and relationship
    const isFormValid = isManualEntry 
      ? updatedData.fullName && updatedData.relationship
      : updatedData.fullName && 
        updatedData.relationship && 
        updatedData.email && 
        updatedData.address.street &&
        updatedData.address.city &&
        updatedData.address.state &&
        updatedData.address.zipCode;
    setIsValid(!!isFormValid);
  };

  const handleAddressChange = (field: string, value: string) => {
    const updatedData = {
      ...recipientData,
      address: { ...recipientData.address, [field]: value }
    };
    setRecipientData(updatedData);
    
    // For manual entry mode, only require name and relationship
    const isFormValid = isManualEntry 
      ? updatedData.fullName && updatedData.relationship
      : updatedData.fullName && 
        updatedData.relationship && 
        updatedData.email && 
        updatedData.address.street &&
        updatedData.address.city &&
        updatedData.address.state &&
        updatedData.address.zipCode;
    setIsValid(!!isFormValid);
  };

  const handleContinue = () => {
    onNext({ 
      firstRecipient: recipientData,
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
      return `Let's get ${selectedPersonForGift.personName}'s details`;
    }
    if (isManualEntry) {
      return "Who would you like to schedule a gift for?";
    }
    return "Who's the most important person in your life?";
  };

  const getSubHeaderText = () => {
    if (selectedPersonForGift) {
      return `We'll need their shipping address to send the perfect gift`;
    }
    if (isManualEntry) {
      return "Tell us about the person you'd like to send a gift to";
    }
    return "We'll help you make them feel special with thoughtful, perfectly timed gifts";
  };

  return (
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-charcoal/10 p-4 rounded-full">
            <Gift className="h-12 w-12 text-brand-charcoal" />
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
        <div className="grid gap-4">
          {/* Full Name */}
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

          {/* Relationship */}
          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship *</Label>
            <Select onValueChange={(value) => handleInputChange('relationship', value)}>
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

          {/* Show additional fields only if not in manual entry mode */}
          {!isManualEntry && (
            <>
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter their email"
                  value={recipientData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter their phone number"
                  value={recipientData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>

              {/* Birthday */}
              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={recipientData.birthday}
                  onChange={(e) => handleInputChange('birthday', e.target.value)}
                />
              </div>

              {/* Anniversary */}
              <div className="space-y-2">
                <Label htmlFor="anniversary">Anniversary</Label>
                <Input
                  id="anniversary"
                  type="date"
                  value={recipientData.anniversary}
                  onChange={(e) => handleInputChange('anniversary', e.target.value)}
                />
              </div>

              {/* Address Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium text-brand-charcoal">Shipping Address</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    placeholder="Enter street address"
                    value={recipientData.address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="Enter city"
                      value={recipientData.address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      placeholder="Enter state"
                      value={recipientData.address.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code *</Label>
                    <Input
                      id="zipCode"
                      placeholder="Enter ZIP code"
                      value={recipientData.address.zipCode}
                      onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select onValueChange={(value) => handleAddressChange('country', value)} defaultValue="United States">
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
            </>
          )}

          {/* Manual entry mode note */}
          {isManualEntry && (
            <div className="bg-brand-cream/30 p-4 rounded-lg">
              <p className="text-sm text-brand-charcoal/70">
                You can add more details like contact info and address later in your dashboard.
              </p>
            </div>
          )}
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
  );
};

export default RecipientStep;
