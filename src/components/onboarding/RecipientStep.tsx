import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, ArrowDown, Calendar } from 'lucide-react';

interface RecipientStepProps {
  onNext: (data: any) => void;
  interests?: string[];
  selectedPersonForGift?: any;
}

const RecipientStep: React.FC<RecipientStepProps> = ({ onNext, interests, selectedPersonForGift }) => {
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

  return (
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-charcoal/10 p-4 rounded-full">
            <Gift className="h-12 w-12 text-brand-charcoal" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2">
          {selectedPersonForGift 
            ? `Let's get ${selectedPersonForGift.personName}'s details` 
            : "Who's the most important person in your life?"
          }
        </CardTitle>
        <p className="text-muted-foreground">
          {selectedPersonForGift 
            ? `We'll need their shipping address to send the perfect gift`
            : "We'll help you make them feel special with thoughtful, perfectly timed gifts"
          }
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