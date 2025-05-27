
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, ArrowRight, Shield } from 'lucide-react';

interface PaymentStepProps {
  onNext: (data: any) => void;
}

const PaymentStep: React.FC<PaymentStepProps> = ({ onNext }) => {
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    nameOnCard: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    }
  });

  const [isValid, setIsValid] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    const updatedData = { ...paymentData, [field]: value };
    setPaymentData(updatedData);
    validateForm(updatedData);
  };

  const handleAddressChange = (field: string, value: string) => {
    const updatedData = {
      ...paymentData,
      billingAddress: { ...paymentData.billingAddress, [field]: value }
    };
    setPaymentData(updatedData);
    validateForm(updatedData);
  };

  const validateForm = (data: any) => {
    const isFormValid = data.cardNumber && 
                       data.expiryMonth && 
                       data.expiryYear && 
                       data.cvv && 
                       data.nameOnCard &&
                       data.billingAddress.street &&
                       data.billingAddress.city &&
                       data.billingAddress.state &&
                       data.billingAddress.zipCode;
    setIsValid(!!isFormValid);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    handleInputChange('cardNumber', formatted);
  };

  const handleContinue = () => {
    onNext({ paymentInfo: paymentData });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear + i);
  const months = [
    { value: '01', label: '01 - January' },
    { value: '02', label: '02 - February' },
    { value: '03', label: '03 - March' },
    { value: '04', label: '04 - April' },
    { value: '05', label: '05 - May' },
    { value: '06', label: '06 - June' },
    { value: '07', label: '07 - July' },
    { value: '08', label: '08 - August' },
    { value: '09', label: '09 - September' },
    { value: '10', label: '10 - October' },
    { value: '11', label: '11 - November' },
    { value: '12', label: '12 - December' }
  ];

  return (
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-accent/20 p-4 rounded-full">
            <CreditCard className="h-12 w-12 text-accent" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2">Payment Information</CardTitle>
        <p className="text-muted-foreground">
          Secure your subscription to get personalized gift recommendations
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Security Notice */}
        <div className="flex items-center space-x-2 bg-blue-50 p-3 rounded-lg">
          <Shield className="h-5 w-5 text-blue-600" />
          <p className="text-sm text-blue-700">Your payment information is encrypted and secure</p>
        </div>

        {/* Card Information */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">Card Information</h4>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="cardNumber">Card Number *</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={paymentData.cardNumber}
                onChange={handleCardNumberChange}
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="expiryMonth">Expiry Month *</Label>
                <Select onValueChange={(value) => handleInputChange('expiryMonth', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expiryYear">Expiry Year *</Label>
                <Select onValueChange={(value) => handleInputChange('expiryYear', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cvv">CVV *</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={paymentData.cvv}
                  onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="nameOnCard">Name on Card *</Label>
              <Input
                id="nameOnCard"
                placeholder="John Doe"
                value={paymentData.nameOnCard}
                onChange={(e) => handleInputChange('nameOnCard', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">Billing Address</h4>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="billingStreet">Street Address *</Label>
              <Input
                id="billingStreet"
                placeholder="123 Main Street"
                value={paymentData.billingAddress.street}
                onChange={(e) => handleAddressChange('street', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="billingCity">City *</Label>
                <Input
                  id="billingCity"
                  placeholder="City"
                  value={paymentData.billingAddress.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="billingState">State *</Label>
                <Input
                  id="billingState"
                  placeholder="State"
                  value={paymentData.billingAddress.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="billingZip">ZIP Code *</Label>
                <Input
                  id="billingZip"
                  placeholder="12345"
                  value={paymentData.billingAddress.zipCode}
                  onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="billingCountry">Country</Label>
                <Input
                  id="billingCountry"
                  value={paymentData.billingAddress.country}
                  disabled
                />
              </div>
            </div>
          </div>
        </div>

        {/* Plan Summary */}
        <div className="bg-brand-cream-light p-4 rounded-lg">
          <h5 className="font-semibold mb-2">Plan Summary</h5>
          <div className="flex justify-between items-center">
            <span>Unwrapt Premium Monthly</span>
            <span className="font-semibold">$29.99/month</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Cancel anytime • 7-day free trial
          </p>
        </div>

        {/* Continue Button */}
        <Button 
          size="lg" 
          className="w-full text-lg py-6"
          onClick={handleContinue}
          disabled={!isValid}
        >
          Start Free Trial
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          * Required fields
        </p>
      </CardContent>
    </Card>
  );
};

export default PaymentStep;
