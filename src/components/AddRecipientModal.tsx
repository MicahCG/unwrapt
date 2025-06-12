
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

interface AddRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipientAdded?: () => void;
}

const AddRecipientModal: React.FC<AddRecipientModalProps> = ({ isOpen, onClose, onRecipientAdded }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    birthday: '',
    interests: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const sendNotificationEmail = async (recipientName: string) => {
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'recipient_added',
          userEmail: user?.email,
          userName: user?.user_metadata?.full_name || user?.email?.split('@')[0],
          recipientName: recipientName
        }
      });
      console.log('Notification email sent for new recipient');
    } catch (error) {
      console.error('Failed to send notification email:', error);
      // Don't throw error - email failure shouldn't block recipient creation
    }
  };

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
          email: null,
          phone: null,
          birthday: formData.birthday || null,
          interests: interestsArray.length > 0 ? interestsArray : null,
          notes: null
        });

      if (error) throw error;

      // Send notification email
      await sendNotificationEmail(formData.name);

      // Refresh the recipients list
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
      
      toast({
        title: "Success",
        description: "Recipient added successfully! You'll receive an email confirmation.",
      });

      // Reset form and close modal
      setFormData({
        name: '',
        relationship: '',
        birthday: '',
        interests: ''
      });
      onClose();

      // Call the onRecipientAdded callback if provided
      if (onRecipientAdded) {
        onRecipientAdded();
      }
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto text-brand-charcoal bg-white border-brand-cream">
        <DialogHeader>
          <DialogTitle className="text-brand-charcoal">
            Add New Recipient
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-brand-charcoal">
              Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="text-brand-charcoal border-brand-cream"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship" className="text-brand-charcoal">
              Relationship
            </Label>
            <Select 
              value={formData.relationship} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, relationship: value }))}
            >
              <SelectTrigger className="text-brand-charcoal border-brand-cream">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent className="bg-white text-brand-charcoal border-brand-cream">
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
            <Label htmlFor="birthday" className="text-brand-charcoal">
              Birthday
            </Label>
            <Input
              id="birthday"
              type="date"
              value={formData.birthday}
              onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
              className="text-brand-charcoal border-brand-cream"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interests" className="text-brand-charcoal">
              Interests
            </Label>
            <Input
              id="interests"
              placeholder="Enter interests separated by commas"
              value={formData.interests}
              onChange={(e) => setFormData(prev => ({ ...prev, interests: e.target.value }))}
              className="text-brand-charcoal border-brand-cream"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isLoading} 
              className="border-brand-charcoal text-brand-charcoal hover:bg-brand-charcoal hover:text-brand-cream"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading} 
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
