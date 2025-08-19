
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { sanitizeInput, sanitizeEmail, sanitizePhoneNumber, sanitizeTextArea, sanitizeAddress } from '@/utils/inputSanitization';
import { ErrorHandler } from '@/utils/errorHandler';
import { rateLimiter, RATE_LIMITS } from '@/utils/rateLimiter';

interface AddRecipientModalProps {
  onRecipientAdded?: () => void;
  children?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export const AddRecipientModal: React.FC<AddRecipientModalProps> = ({ 
  onRecipientAdded, 
  children,
  isOpen,
  onClose
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use external state if provided, otherwise use internal state
  const modalIsOpen = isOpen !== undefined ? isOpen : internalIsOpen;
  const handleOpenChange = (open: boolean) => {
    if (onClose && isOpen !== undefined) {
      if (!open) onClose();
    } else {
      setInternalIsOpen(open);
    }
  };
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: '',
    birthday: '',
    anniversary: '',
    street: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
    notes: '',
    interests: [] as string[]
  });
  
  const [newInterest, setNewInterest] = useState('');

  const handleInputChange = (field: string, value: string) => {
    let sanitizedValue = value;
    
    // Apply appropriate sanitization based on field type
    switch (field) {
      case 'email':
        sanitizedValue = sanitizeEmail(value);
        break;
      case 'phone':
        sanitizedValue = sanitizePhoneNumber(value);
        break;
      case 'notes':
        sanitizedValue = sanitizeTextArea(value);
        break;
      case 'street':
      case 'city':
      case 'state':
      case 'country':
        sanitizedValue = sanitizeAddress(value);
        break;
      default:
        sanitizedValue = sanitizeInput(value);
        break;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
  };

  const addInterest = () => {
    if (newInterest.trim()) {
      const sanitizedInterest = sanitizeInput(newInterest.trim());
      if (sanitizedInterest && !formData.interests.includes(sanitizedInterest)) {
        setFormData(prev => ({
          ...prev,
          interests: [...prev.interests, sanitizedInterest]
        }));
        setNewInterest('');
      }
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return ErrorHandler.handleValidationError('name', formData.name);
    }
    
    if (formData.email && !formData.email.includes('@')) {
      return ErrorHandler.handleValidationError('email', formData.email);
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add recipients",
        variant: "destructive",
      });
      return;
    }

    // Rate limiting check
    const rateLimitKey = `add-recipient-${user.id}`;
    if (!rateLimiter.isAllowed(rateLimitKey, RATE_LIMITS.FORM_SUBMISSIONS)) {
      toast({
        title: "Too Many Requests",
        description: "Please wait a moment before adding another recipient",
        variant: "destructive",
      });
      return;
    }

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('recipients')
        .insert([
          {
            user_id: user.id,
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            relationship: formData.relationship || null,
            birthday: formData.birthday || null,
            anniversary: formData.anniversary || null,
            street: formData.street || null,
            city: formData.city || null,
            state: formData.state || null,
            zip_code: formData.zip_code || null,
            country: formData.country,
            notes: formData.notes || null,
            interests: formData.interests.length > 0 ? formData.interests : null,
          }
        ]);

      if (error) {
        throw error;
      }

      toast({
        title: "Success!",
        description: "Recipient added successfully",
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        relationship: '',
        birthday: '',
        anniversary: '',
        street: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'United States',
        notes: '',
        interests: []
      });
      
      handleOpenChange(false);
      if (onRecipientAdded) {
        onRecipientAdded();
      }
    } catch (error: any) {
      console.error('Error adding recipient:', error);
      const friendlyMessage = ErrorHandler.handleApiError(error, 'add-recipient', user.id);
      toast({
        title: "Error",
        description: friendlyMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={modalIsOpen} onOpenChange={handleOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Recipient</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
                required
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="relationship">Relationship</Label>
              <Input
                id="relationship"
                value={formData.relationship}
                onChange={(e) => handleInputChange('relationship', e.target.value)}
                placeholder="e.g., Friend, Family, Colleague"
                maxLength={50}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
                maxLength={20}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birthday">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => handleInputChange('birthday', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="anniversary">Anniversary</Label>
              <Input
                id="anniversary"
                type="date"
                value={formData.anniversary}
                onChange={(e) => handleInputChange('anniversary', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Address</h3>
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                placeholder="Enter street address"
                maxLength={200}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Enter city"
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="Enter state"
                  maxLength={50}
                />
              </div>
              <div>
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  placeholder="Enter ZIP code"
                  maxLength={20}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Enter country"
                maxLength={100}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="interests">Interests</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Add an interest"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                maxLength={50}
              />
              <Button type="button" onClick={addInterest} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.interests.map((interest, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {interest}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeInterest(interest)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes about this recipient"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Recipient'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecipientModal;
