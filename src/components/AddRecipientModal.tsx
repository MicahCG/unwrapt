
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { MapPin } from 'lucide-react';

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
    email: '',
    phone: '',
    birthday: '',
    anniversary: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return formData.name && 
           formData.relationship && 
           formData.email && 
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
      const { error } = await supabase
        .from('recipients')
        .insert({
          user_id: user?.id,
          name: formData.name,
          relationship: formData.relationship,
          email: formData.email,
          phone: formData.phone || null,
          birthday: formData.birthday || null,
          anniversary: formData.anniversary || null,
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          country: formData.country
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recipient added successfully!",
      });

      // Reset form
      setFormData({
        name: '',
        relationship: '',
        email: '',
        phone: '',
        birthday: '',
        anniversary: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States'
      });

      // Refresh recipients list
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      
      onClose();
    } catch (error) {
      console.error('Error adding recipient:', error);
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
      email: '',
      phone: '',
      birthday: '',
      anniversary: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white border-brand-cream text-brand-charcoal max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-charcoal">Add New Recipient</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-brand-charcoal">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter their full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                className="text-brand-charcoal border-brand-cream"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship" className="text-brand-charcoal">Relationship *</Label>
              <Select value={formData.relationship} onValueChange={(value) => handleInputChange('relationship', value)}>
                <SelectTrigger className="text-brand-charcoal border-brand-cream">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent className="bg-white text-brand-charcoal border-brand-cream">
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
              <Label htmlFor="email" className="text-brand-charcoal">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter their email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                className="text-brand-charcoal border-brand-cream"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-brand-charcoal">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter their phone number"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="text-brand-charcoal border-brand-cream"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthday" className="text-brand-charcoal">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => handleInputChange('birthday', e.target.value)}
                  className="text-brand-charcoal border-brand-cream"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="anniversary" className="text-brand-charcoal">Anniversary</Label>
                <Input
                  id="anniversary"
                  type="date"
                  value={formData.anniversary}
                  onChange={(e) => handleInputChange('anniversary', e.target.value)}
                  className="text-brand-charcoal border-brand-cream"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium text-brand-charcoal flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Shipping Address *
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="street" className="text-brand-charcoal">Street Address *</Label>
              <Input
                id="street"
                placeholder="Enter street address"
                value={formData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                required
                className="text-brand-charcoal border-brand-cream"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-brand-charcoal">City *</Label>
                <Input
                  id="city"
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  required
                  className="text-brand-charcoal border-brand-cream"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="text-brand-charcoal">State *</Label>
                <Input
                  id="state"
                  placeholder="Enter state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  required
                  className="text-brand-charcoal border-brand-cream"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-brand-charcoal">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  placeholder="Enter ZIP code"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  required
                  className="text-brand-charcoal border-brand-cream"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country" className="text-brand-charcoal">Country</Label>
                <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                  <SelectTrigger className="text-brand-charcoal border-brand-cream">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-brand-charcoal border-brand-cream">
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
              className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !isFormValid()} 
              className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
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
