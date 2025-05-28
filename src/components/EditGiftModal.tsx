
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useShopifyProductTypes } from '@/hooks/useShopifyProductTypes';

interface EditGiftModalProps {
  gift: any;
  isOpen: boolean;
  onClose: () => void;
}

const EditGiftModal: React.FC<EditGiftModalProps> = ({ gift, isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { data: productTypesData, isLoading: isLoadingProductTypes } = useShopifyProductTypes();
  const [formData, setFormData] = useState({
    occasion: gift?.occasion || '',
    occasion_date: gift?.occasion_date || '',
    gift_type: gift?.gift_type || '',
    price_range: gift?.price_range || '',
    gift_description: gift?.gift_description || '',
    delivery_date: gift?.delivery_date || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('scheduled_gifts')
        .update({
          occasion: formData.occasion,
          occasion_date: formData.occasion_date,
          gift_type: formData.gift_type,
          price_range: formData.price_range,
          gift_description: formData.gift_description,
          delivery_date: formData.delivery_date || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', gift.id);

      if (error) throw error;

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['upcoming-gifts'] });
      onClose();
    } catch (error) {
      console.error('Error updating gift:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get product types from Shopify or use fallback
  const productTypes = productTypesData?.productTypes || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Gift for {gift.recipients?.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="occasion">Occasion *</Label>
            <Select 
              value={formData.occasion} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, occasion: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select occasion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Birthday">Birthday</SelectItem>
                <SelectItem value="Anniversary">Anniversary</SelectItem>
                <SelectItem value="Christmas">Christmas</SelectItem>
                <SelectItem value="Valentine's Day">Valentine's Day</SelectItem>
                <SelectItem value="Mother's Day">Mother's Day</SelectItem>
                <SelectItem value="Father's Day">Father's Day</SelectItem>
                <SelectItem value="Graduation">Graduation</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occasion_date">Occasion Date *</Label>
            <Input
              id="occasion_date"
              type="date"
              value={formData.occasion_date}
              onChange={(e) => setFormData(prev => ({ ...prev, occasion_date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gift_type">Gift Type</Label>
            <Select 
              value={formData.gift_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, gift_type: value }))}
              disabled={isLoadingProductTypes}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingProductTypes ? "Loading gift types..." : "Select gift type"} />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map((type: string) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
                {productTypes.length === 0 && !isLoadingProductTypes && (
                  <SelectItem value="" disabled>No gift types available</SelectItem>
                )}
              </SelectContent>
            </Select>
            {productTypesData?.success === false && (
              <p className="text-xs text-amber-600">
                Using fallback options - Shopify connection unavailable
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price_range">Price Range</Label>
            <Select 
              value={formData.price_range} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, price_range: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select price range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="$0-$25">$0 - $25</SelectItem>
                <SelectItem value="$25-$50">$25 - $50</SelectItem>
                <SelectItem value="$50-$100">$50 - $100</SelectItem>
                <SelectItem value="$100-$250">$100 - $250</SelectItem>
                <SelectItem value="$250-$500">$250 - $500</SelectItem>
                <SelectItem value="$500+">$500+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gift_description">Gift Description</Label>
            <Textarea
              id="gift_description"
              value={formData.gift_description}
              onChange={(e) => setFormData(prev => ({ ...prev, gift_description: e.target.value }))}
              placeholder="Describe the gift or any specific preferences..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_date">Delivery Date</Label>
            <Input
              id="delivery_date"
              type="date"
              value={formData.delivery_date}
              onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
            />
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

export default EditGiftModal;
