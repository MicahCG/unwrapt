
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, ArrowDown } from 'lucide-react';

interface RecipientStepProps {
  onNext: (data: any) => void;
}

const RecipientStep: React.FC<RecipientStepProps> = ({ onNext }) => {
  const [recipientData, setRecipientData] = useState({
    fullName: '',
    relationship: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    }
  });

  const [isValid, setIsValid] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    const updatedData = { ...recipientData, [field]: value };
    setRecipientData(updatedData);
    
    // Check if required fields are filled
    const isFormValid = updatedData.fullName && 
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
    
    // Check if required fields are filled
    const isFormValid = updatedData.fullName && 
                       updatedData.relationship && 
                       updatedData.email && 
                       updatedData.address.street &&
                       updatedData.address.city &&
                       updatedData.address.state &&
                       updatedData.address.zipCode;
    setIsValid(!!isFormValid);
  };

  const handleContinue = () => {
    onNext({ firstRecipient: recipientData });
  };

  return (
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-charcoal/10 p-4 rounded-full">
            <Gift className="h-12 w-12 text-brand-charcoal" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2">Who's the most important person in your life?</CardTitle>
        <p className="text-muted-foreground">
          We'll help you make them feel special with thoughtful, perfectly timed gifts
        </p>
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
                <SelectItem value="sibling">Sibling</SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="grandparent">Grandparent</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="their.email@example.com"
              value={recipientData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </div>

          {/* Phone (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={recipientData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </div>
        </div>

        {/* Shipping Address */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">Shipping Address *</h4>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                placeholder="123 Main Street"
                value={recipientData.address.street}
                onChange={(e) => handleAddressChange('street', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={recipientData.address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={recipientData.address.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  placeholder="12345"
                  value={recipientData.address.zipCode}
                  onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={recipientData.address.country}
                  disabled
                />
              </div>
            </div>
          </div>
        </div>

        {/* Emotional Copy */}
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            💝 We'll help you make {recipientData.fullName || 'them'} feel special with perfectly chosen gifts
          </p>
        </div>

        {/* Continue Button */}
        <Button 
          size="lg" 
          className="w-full text-lg py-6 bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
          onClick={handleContinue}
          disabled={!isValid}
        >
          Continue to Interests & Preferences
          <ArrowDown className="h-4 w-4 ml-2" />
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          * Required fields
        </p>
      </CardContent>
    </Card>
  );
};

export default RecipientStep;
