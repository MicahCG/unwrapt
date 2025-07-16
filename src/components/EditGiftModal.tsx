import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useShopifyProductTypes } from '@/hooks/useShopifyProductTypes';
import { Package, Calendar, DollarSign, Trash2 } from 'lucide-react';
import { cleanName } from '@/lib/utils';

interface EditGiftModalProps {
  gift: any;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (giftId: string) => void;
}

const EditGiftModal: React.FC<EditGiftModalProps> = ({ gift, isOpen, onClose, onDelete }) => {
  const queryClient = useQueryClient();
  const { data: productTypesData, isLoading: isLoadingProductTypes } = useShopifyProductTypes();
  const [formData, setFormData] = useState({
    occasion: gift?.occasion || '',
    occasion_date: gift?.occasion_date || '',
    gift_type: gift?.gift_type || '',
    price_range: gift?.price_range || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Gift preview helper functions
  const getGiftImage = (giftType: string) => {
    // First priority: use the stored gift image URL if available
    if (gift.gift_image_url) {
      return gift.gift_image_url;
    }
    
    // Fallback to type-based mapping
    const imageMap = {
      'lavender fields coffee': 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=300&fit=crop',
      'truffle chocolate': 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop',
      'ocean driftwood coconut candle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop&q=80',
      'wine': 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=300&fit=crop',
      'tea': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400&h=300&fit=crop',
      'coffee': 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=300&fit=crop',
      'sweet treats': 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop',
      'self care': 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=300&fit=crop',
      'candle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop&q=80'
    };
    return imageMap[giftType.toLowerCase()] || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop';
  };

  const getGiftDescription = (giftType: string, recipientName: string) => {
    return `We'll curate premium ${giftType.toLowerCase()} perfect for ${recipientName}'s interests`;
  };

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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(gift.id);
      onClose();
    } catch (error) {
      console.error('Error deleting gift:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get product types from Shopify or use fallback
  const productTypes = productTypesData?.productTypes || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white border-brand-cream text-brand-charcoal max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-charcoal text-xl">Edit Gift for {cleanName(gift.recipients?.name)}</DialogTitle>
        </DialogHeader>
        
        {/* Gift Preview Section - Made more prominent */}
        {formData.gift_type && (
          <Card className="bg-gradient-to-br from-brand-cream/20 to-brand-cream/40 border-brand-cream mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Package className="h-5 w-5 text-brand-charcoal" />
                <span className="font-semibold text-brand-charcoal">Your Scheduled Gift</span>
              </div>
              <div className="flex space-x-4">
                <img
                  src={getGiftImage(formData.gift_type)}
                  alt={`${formData.gift_type} gift`}
                  className="w-24 h-24 object-cover rounded-lg shadow-sm"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-brand-charcoal mb-2">
                    {formData.gift_type}
                  </h3>
                  <p className="text-sm text-brand-charcoal/70 mb-3">
                    {getGiftDescription(formData.gift_type, cleanName(gift.recipients?.name))}
                  </p>
                  
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center text-brand-charcoal/80">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(formData.occasion_date)}
                    </div>
                    {formData.price_range && (
                      <div className="flex items-center text-brand-gold font-medium">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {formData.price_range}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="occasion" className="text-brand-charcoal font-medium">Occasion</Label>
            <Select 
              value={formData.occasion} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, occasion: value }))}
            >
              <SelectTrigger className="text-brand-charcoal border-brand-cream h-11">
                <SelectValue placeholder="Select occasion" />
              </SelectTrigger>
              <SelectContent className="bg-white text-brand-charcoal border-brand-cream">
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
            <Label htmlFor="occasion_date" className="text-brand-charcoal font-medium">Occasion Date</Label>
            <Input
              id="occasion_date"
              type="date"
              value={formData.occasion_date}
              onChange={(e) => setFormData(prev => ({ ...prev, occasion_date: e.target.value }))}
              required
              className="text-brand-charcoal border-brand-cream h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gift_type" className="text-brand-charcoal font-medium">Gift Type</Label>
            <Select 
              value={formData.gift_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, gift_type: value }))}
              disabled={isLoadingProductTypes}
            >
              <SelectTrigger className="text-brand-charcoal border-brand-cream h-11">
                <SelectValue placeholder={isLoadingProductTypes ? "Loading gift types..." : "Select gift type"} />
              </SelectTrigger>
              <SelectContent className="bg-white text-brand-charcoal border-brand-cream">
                {productTypes.map((type: string) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
                {productTypes.length === 0 && !isLoadingProductTypes && (
                  <SelectItem value="no-types-available" disabled>No gift types available</SelectItem>
                )}
              </SelectContent>
            </Select>
            {productTypesData?.success === false && (
              <p className="text-xs text-brand-charcoal/60">
                Using fallback options - Shopify connection unavailable
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price_range" className="text-brand-charcoal font-medium">Price Range</Label>
            <Select 
              value={formData.price_range} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, price_range: value }))}
            >
              <SelectTrigger className="text-brand-charcoal border-brand-cream h-11">
                <SelectValue placeholder="Select price range" />
              </SelectTrigger>
              <SelectContent className="bg-white text-brand-charcoal border-brand-cream">
                <SelectItem value="$0-$25">$0 - $25</SelectItem>
                <SelectItem value="$25-$50">$25 - $50</SelectItem>
                <SelectItem value="$50-$100">$50 - $100</SelectItem>
                <SelectItem value="$100-$250">$100 - $250</SelectItem>
                <SelectItem value="$250-$500">$250 - $500</SelectItem>
                <SelectItem value="$500+">$500+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Info */}
          <div className="bg-brand-cream/50 p-4 rounded-lg border border-brand-cream">
            <p className="text-sm text-brand-charcoal/80">
              📦 Deliveries are sent 3 days before occasion
            </p>
          </div>

          <div className="flex justify-between items-center space-x-3 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleDelete}
              disabled={isDeleting || isLoading}
              className="border-red-500 text-red-600 hover:bg-red-50 px-4"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete Gift'}
            </Button>
            
            <div className="flex space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={isLoading || isDeleting}
                className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream px-6"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || isDeleting} 
                className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90 px-6"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditGiftModal;
