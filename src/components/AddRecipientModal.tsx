
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import DebugColors from '@/components/ui/debug-colors';

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
    interests: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsLoading(true);

    try {
      const interestsArray = formData.interests
        .split(',')
        .map(interest => interest.trim())
        .filter(interest => interest.length > 0);

      const { error } = await supabase
        .from('recipients')
        .insert({
          user_id: user.id,
          name: formData.name,
          relationship: formData.relationship || null,
          email: formData.email || null,
          phone: formData.phone || null,
          birthday: formData.birthday || null,
          interests: interestsArray.length > 0 ? interestsArray : null,
          notes: formData.notes || null
        });

      if (error) throw error;

      // Refresh the recipients list
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
      
      toast({
        title: "Success",
        description: "Recipient added successfully!",
      });

      // Reset form and close modal
      setFormData({
        name: '',
        relationship: '',
        email: '',
        phone: '',
        birthday: '',
        interests: '',
        notes: ''
      });
      onClose();
    } catch (error) {
      console.error('Error adding recipient:', error);
      toast({
        title: "Error",
        description: "Failed to add recipient. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DebugColors />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="!text-brand-charcoal">Add New Recipient</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="!text-brand-charcoal">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                className="!text-brand-charcoal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship" className="!text-brand-charcoal">Relationship</Label>
              <Select 
                value={formData.relationship} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, relationship: value }))}
              >
                <SelectTrigger className="!text-brand-charcoal">
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

            <div className="space-y-2">
              <Label htmlFor="email" className="!text-brand-charcoal">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="!text-brand-charcoal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="!text-brand-charcoal">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="!text-brand-charcoal"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthday" className="!text-brand-charcoal">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                  className="!text-brand-charcoal"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interests" className="!text-brand-charcoal">Interests</Label>
              <Input
                id="interests"
                placeholder="Enter interests separated by commas"
                value={formData.interests}
                onChange={(e) => setFormData(prev => ({ ...prev, interests: e.target.value }))}
                className="!text-brand-charcoal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="!text-brand-charcoal">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this recipient"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="!text-brand-charcoal"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="border-brand-charcoal text-brand-charcoal hover:bg-brand-charcoal hover:text-brand-cream">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90">
                {isLoading ? 'Adding...' : 'Add Recipient'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddRecipientModal;
