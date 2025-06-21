
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Heart } from 'lucide-react';

interface AddRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddRecipientModal: React.FC<AddRecipientModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    birthday: '',
    anniversary: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Same interests as in onboarding
  const predefinedInterests = [
    'Coffee', 'Tea', 'Wine', 'Sweet Treats', 'Self Care'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const isFormValid = () => {
    return formData.name && 
           formData.relationship && 
           formData.street && 
           formData.city && 
           formData.state && 
           formData.zipCode;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    
    setIsLoading(true);

    try {
      console.log('🔧 AddRecipientModal: Submitting recipient data:', formData);
      
      const { error } = await supabase
        .from('recipients')
        .insert({
          user_id: user?.id,
          name: formData.name,
          relationship: formData.relationship,
          birthday: formData.birthday || null,
          anniversary: formData.anniversary || null,
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          country: formData.country,
          interests: selectedInterests.length > 0 ? selectedInterests : null
        });

      if (error) {
        console.error('🔧 AddRecipientModal: Database error:', error);
        throw error;
      }

      console.log('🔧 AddRecipientModal: Recipient added successfully');

      toast({
        title: "Success",
        description: "Recipient added successfully!",
      });

      // Reset form
      setFormData({
        name: '',
        relationship: '',
        birthday: '',
        anniversary: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States'
      });
      setSelectedInterests([]);

      // Refresh recipients list
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      
      onClose();
    } catch (error) {
      console.error('🔧 AddRecipientModal: Error adding recipient:', error);
      toast({
        title: "Error",
        description: "There was a problem adding the recipient. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      relationship: '',
      birthday: '',
      anniversary: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    });
    setSelectedInterests([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Recipient</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter their full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship *</Label>
              <Select value={formData.relationship} onValueChange={(value) => handleInputChange('relationship', value)}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => handleInputChange('birthday', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="anniversary">Anniversary</Label>
                <Input
                  id="anniversary"
                  type="date"
                  value={formData.anniversary}
                  onChange={(e) => handleInputChange('anniversary', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Interests Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium flex items-center">
              <Heart className="h-5 w-5 mr-2" />
              Interests
            </h3>
            
            <div>
              <h4 className="font-medium mb-3 text-brand-charcoal">Select interests:</h4>
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
            </div>

            {selectedInterests.length > 0 && (
              <div className="bg-brand-cream-light p-4 rounded-lg">
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
            <h3 className="text-lg font-medium flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Shipping Address *
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                placeholder="Enter street address"
                value={formData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="Enter state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
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
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !isFormValid()} 
            >
              {isLoading ? 'Adding...' : 'Add Recipient'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecipientModal;
