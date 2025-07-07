
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Gift, DollarSign, User, Clock, TestTube2, X } from 'lucide-react';
import ShopifyTestModal from './ShopifyTestModal';
import { cleanName } from '@/lib/utils';

interface GiftDetailsModalProps {
  gift: any;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (giftId: string) => void;
}

const GiftDetailsModal: React.FC<GiftDetailsModalProps> = ({ gift, isOpen, onClose, onDelete }) => {
  const [testingGift, setTestingGift] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'bg-slate-100 text-slate-800';
      case 'ordered': return 'status-warning';
      case 'delivered': return 'status-success';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getGiftImage = (giftType: string) => {
    const imageMap = {
      'wine': 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=300&fit=crop',
      'tea': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400&h=300&fit=crop',
      'coffee': 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=300&fit=crop',
      'sweet treats': 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop',
      'self care': 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=300&fit=crop'
    };
    return imageMap[giftType?.toLowerCase()] || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop';
  };

  const handleCancelGift = async () => {
    setIsDeleting(true);
    try {
      await onDelete(gift.id);
      onClose();
    } catch (error) {
      console.error('Error canceling gift:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Gift className="h-5 w-5 text-brand-gold" />
              <span>Gift Details</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-brand-charcoal">
                {gift.occasion} for {cleanName(gift.recipients?.name)}
              </h3>
              <Badge className={getStatusColor(gift.status)}>
                {gift.status}
              </Badge>
            </div>

            {/* Gift Preview */}
            {gift.gift_type && (
              <div className="bg-gradient-to-br from-brand-cream/20 to-brand-cream/40 border border-brand-cream rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={getGiftImage(gift.gift_type)}
                    alt={`${gift.gift_type} gift`}
                    className="w-20 h-20 object-cover rounded-lg shadow-sm"
                  />
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-brand-charcoal mb-1">
                      {gift.gift_type}
                    </h4>
                    <p className="text-sm text-brand-charcoal/70">
                      We'll curate premium {gift.gift_type.toLowerCase()} perfect for {cleanName(gift.recipients?.name)}'s interests
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-brand-charcoal/60" />
                  <div>
                    <p className="text-sm font-medium text-brand-charcoal">Recipient</p>
                    <p className="text-sm text-brand-charcoal/70">{cleanName(gift.recipients?.name)}</p>
                    {gift.recipients?.relationship && (
                      <p className="text-xs text-brand-charcoal/50">{gift.recipients.relationship}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-brand-charcoal/60" />
                  <div>
                    <p className="text-sm font-medium text-brand-charcoal">Occasion Date</p>
                    <p className="text-sm text-brand-charcoal/70">{formatDate(gift.occasion_date)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {gift.delivery_date && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-brand-charcoal/60" />
                    <div>
                      <p className="text-sm font-medium text-brand-charcoal">Delivery Date</p>
                      <p className="text-sm text-brand-charcoal/70">{formatDate(gift.delivery_date)}</p>
                    </div>
                  </div>
                )}

                {gift.price_range && (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-brand-charcoal/60" />
                    <div>
                      <p className="text-sm font-medium text-brand-charcoal">Price Range</p>
                      <p className="text-sm text-brand-charcoal/70">{gift.price_range}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {gift.recipients?.interests && gift.recipients.interests.length > 0 && (
              <div>
                <p className="text-sm font-medium text-brand-charcoal mb-2">Recipient Interests</p>
                <div className="flex flex-wrap gap-2">
                  {gift.recipients.interests.map((interest: string, index: number) => (
                    <Badge key={index} variant="outline" className="bg-brand-cream/50">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-brand-charcoal/50 pt-4 border-t">
              Created: {new Date(gift.created_at).toLocaleDateString()}
              {gift.updated_at !== gift.created_at && (
                <span> • Updated: {new Date(gift.updated_at).toLocaleDateString()}</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleCancelGift}
                disabled={isDeleting}
                className="btn-danger"
              >
                <X className="h-4 w-4 mr-2" />
                {isDeleting ? 'Canceling...' : 'Cancel Gift'}
              </Button>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setTestingGift(gift)}
                  className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream"
                >
                  <TestTube2 className="h-4 w-4 mr-2" />
                  Test Shopify
                </Button>
                <Button
                  onClick={onClose}
                  className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {testingGift && (
        <ShopifyTestModal
          gift={testingGift}
          isOpen={!!testingGift}
          onClose={() => setTestingGift(null)}
        />
      )}
    </>
  );
};

export default GiftDetailsModal;
