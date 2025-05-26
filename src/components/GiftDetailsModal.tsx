
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Gift, DollarSign, User, Clock } from 'lucide-react';

interface GiftDetailsModalProps {
  gift: any;
  isOpen: boolean;
  onClose: () => void;
}

const GiftDetailsModal: React.FC<GiftDetailsModalProps> = ({ gift, isOpen, onClose }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ordered': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Gift className="h-5 w-5 text-brand-gold" />
            <span>Gift Details</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-brand-charcoal">
              {gift.occasion} for {gift.recipients?.name}
            </h3>
            <Badge className={getStatusColor(gift.status)}>
              {gift.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-brand-charcoal/60" />
                <div>
                  <p className="text-sm font-medium text-brand-charcoal">Recipient</p>
                  <p className="text-sm text-brand-charcoal/70">{gift.recipients?.name}</p>
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

          {gift.gift_type && (
            <div>
              <p className="text-sm font-medium text-brand-charcoal mb-2">Gift Type</p>
              <Badge variant="outline">{gift.gift_type}</Badge>
            </div>
          )}

          {gift.gift_description && (
            <div>
              <p className="text-sm font-medium text-brand-charcoal mb-2">Description</p>
              <p className="text-sm text-brand-charcoal/70 bg-brand-cream-light p-3 rounded">
                {gift.gift_description}
              </p>
            </div>
          )}

          <div className="text-xs text-brand-charcoal/50 pt-4 border-t">
            Created: {new Date(gift.created_at).toLocaleDateString()}
            {gift.updated_at !== gift.created_at && (
              <span> • Updated: {new Date(gift.updated_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GiftDetailsModal;
