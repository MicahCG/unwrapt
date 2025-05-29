import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface EditRecipientModalProps {
  recipient: any;
  isOpen: boolean;
  onClose: () => void;
}

const EditRecipientModal: React.FC<EditRecipientModalProps> = ({ recipient, isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: recipient?.name || '',
    relationship: recipient?.relationship || '',
    email: recipient?.email || '',
    phone: recipient?.phone || '',
    birthday: recipient?.birthday || '',
    anniversary: recipient?.anniversary || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('recipients')
        .update({
          name: formData.name,
          relationship: formData.relationship,
          email: formData.email,
          phone: formData.phone,
          birthday: formData.birthday || null,
          anniversary: formData.anniversary || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipient.id);

      if (error) throw error;

      // Refresh the recipients list
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      onClose();
    } catch (error) {
      console.error('Error updating recipient:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Recipient</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship</Label>
            <Select 
              value={formData.relationship} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, relationship: value }))}
            >
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

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthday">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anniversary">Anniversary</Label>
              <Input
                id="anniversary"
                type="date"
                value={formData.anniversary}
                onChange={(e) => setFormData(prev => ({ ...prev, anniversary: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditRecipientModal;
