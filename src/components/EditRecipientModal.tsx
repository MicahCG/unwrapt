import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { RecipientRecord } from '@/lib/giftStatus';

interface EditRecipientModalProps {
  recipient: RecipientRecord;
  isOpen: boolean;
  onClose: () => void;
}

const blankForm = {
  name: '', relationship: '', email: '', phone: '', birthday: '', anniversary: '',
  street: '', city: '', state: '', zipCode: '', country: 'United States', interests: [] as string[],
};

const EditRecipientModal: React.FC<EditRecipientModalProps> = ({ recipient, isOpen, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(blankForm);
  const [newInterest, setNewInterest] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setFormData({
      name: recipient?.name || '', relationship: recipient?.relationship || '', email: recipient?.email || '', phone: recipient?.phone || '',
      birthday: recipient?.birthday || '', anniversary: recipient?.anniversary || '', street: recipient?.street || '', city: recipient?.city || '',
      state: recipient?.state || '', zipCode: recipient?.zip_code || '', country: recipient?.country || 'United States',
      interests: (recipient?.interests || []).slice(0, 3),
    });
    setNewInterest('');
  }, [recipient]);

  const addInterest = () => {
    const value = newInterest.trim();
    if (!value || formData.interests.length >= 3 || formData.interests.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    setFormData((previous) => ({ ...previous, interests: [...previous.interests, value] }));
    setNewInterest('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id) return;
    setIsLoading(true);
    const { error } = await supabase.from('recipients').update({
      name: formData.name, relationship: formData.relationship || null, email: formData.email || null, phone: formData.phone || null,
      birthday: formData.birthday || null, anniversary: formData.anniversary || null, street: formData.street || null,
      city: formData.city || null, state: formData.state || null, zip_code: formData.zipCode || null, country: formData.country,
      interests: formData.interests, updated_at: new Date().toISOString(),
    }).eq('id', recipient.id).eq('user_id', user.id);
    setIsLoading(false);

    if (error) {
      toast({ title: 'Could not save recipient', description: 'Please check the details and try again.', variant: 'destructive' });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['recipients'] });
    toast({ title: 'Recipient updated', description: `${formData.name}'s details are ready.` });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-[24px] p-5 sm:p-6">
        <DialogHeader><DialogTitle>Edit recipient</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="edit-name">Name *</Label><Input id="edit-name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Relationship</Label><Select value={formData.relationship} onValueChange={(value) => setFormData((p) => ({ ...p, relationship: value }))}><SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger><SelectContent>{['Mom','Dad','Partner','Sibling','Friend','Child','Grandparent','Other'].map((label) => <SelectItem key={label} value={label.toLowerCase()}>{label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="edit-birthday">Birthday</Label><Input id="edit-birthday" type="date" value={formData.birthday} onChange={(e) => setFormData((p) => ({ ...p, birthday: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="edit-anniversary">Anniversary</Label><Input id="edit-anniversary" type="date" value={formData.anniversary} onChange={(e) => setFormData((p) => ({ ...p, anniversary: e.target.value }))} /></div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between"><Label>Interests</Label><span className="text-xs text-muted-foreground">{formData.interests.length}/3</span></div>
            <div className="mb-2 flex flex-wrap gap-2">{formData.interests.map((interest) => <span key={interest} className="inline-flex items-center gap-1 rounded-full bg-[#EEE5D5] py-1.5 pl-3 pr-2 text-xs">{interest}<button type="button" aria-label={`Remove ${interest}`} onClick={() => setFormData((p) => ({ ...p, interests: p.interests.filter((item) => item !== interest) }))}><X className="h-3.5 w-3.5" /></button></span>)}</div>
            {formData.interests.length < 3 && <div className="flex gap-2"><Input value={newInterest} onChange={(e) => setNewInterest(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }} placeholder="Add an interest" maxLength={40} /><Button type="button" variant="outline" size="icon" onClick={addInterest} disabled={!newInterest.trim()}><Plus className="h-4 w-4" /></Button></div>}
          </div>

          <div className="rounded-2xl border border-[#E4DCD2] bg-[#FAF8F3] p-4">
            <h3 className="font-medium">Delivery details</h3><p className="mb-4 text-xs text-muted-foreground">Optional until a gift is ready to order.</p>
            <div className="space-y-3">
              <Input aria-label="Street address" placeholder="Street address" value={formData.street} onChange={(e) => setFormData((p) => ({ ...p, street: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2"><Input aria-label="City" placeholder="City" value={formData.city} onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))} /><Input aria-label="State" placeholder="State" value={formData.state} onChange={(e) => setFormData((p) => ({ ...p, state: e.target.value }))} /><Input aria-label="ZIP code" placeholder="ZIP code" value={formData.zipCode} onChange={(e) => setFormData((p) => ({ ...p, zipCode: e.target.value }))} /><Select value={formData.country} onValueChange={(value) => setFormData((p) => ({ ...p, country: value }))}><SelectTrigger aria-label="Country"><SelectValue /></SelectTrigger><SelectContent>{['United States','Canada','United Kingdom','Australia'].map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button><Button type="submit" disabled={isLoading || !formData.name.trim()} className="h-11 bg-[#2A2520] text-[#F4ECDD] hover:bg-[#2A2520]/90">{isLoading ? 'Saving...' : 'Save changes'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditRecipientModal;
