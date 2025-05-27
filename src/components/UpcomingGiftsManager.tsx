import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Calendar, User, DollarSign, Package, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EditGiftModal from './EditGiftModal';
import GiftDetailsModal from './GiftDetailsModal';
import ShopifyOrderStatus from './ShopifyOrderStatus';

const UpcomingGiftsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingGift, setEditingGift] = useState<any>(null);
  const [viewingGift, setViewingGift] = useState<any>(null);

  // Fetch upcoming scheduled gifts
  const { data: upcomingGifts, isLoading } = useQuery({
    queryKey: ['upcoming-gifts', user?.id],
    queryFn: async () => {
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());
      
      const { data, error } = await supabase
        .from('scheduled_gifts')
        .select(`
          *,
          recipients (name, relationship)
        `)
        .eq('user_id', user?.id)
        .gte('occasion_date', today.toISOString().split('T')[0])
        .lte('occasion_date', nextMonth.toISOString().split('T')[0])
        .order('occasion_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const handleDeleteGift = async (giftId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_gifts')
        .delete()
        .eq('id', giftId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['upcoming-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
    } catch (error) {
      console.error('Error deleting gift:', error);
    }
  };

  const handleOrderGift = async (giftId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_gifts')
        .update({ status: 'ordered' })
        .eq('id', giftId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['upcoming-gifts'] });
    } catch (error) {
      console.error('Error updating gift status:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  const getDaysUntil = (dateString: string) => {
    const targetDate = new Date(dateString);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand-charcoal">Upcoming Gifts</h2>
          <p className="text-brand-charcoal/70">
            Manage your scheduled gifts and track their delivery status
          </p>
        </div>
      </div>

      {upcomingGifts && upcomingGifts.length > 0 ? (
        <div className="grid gap-4">
          {upcomingGifts.map((gift: any) => {
            const daysUntil = getDaysUntil(gift.occasion_date);
            
            return (
              <Card key={gift.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-brand-gold/20 p-2 rounded-lg">
                        <Gift className="h-5 w-5 text-brand-gold" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-brand-charcoal text-lg">
                          {gift.recipients?.name}
                        </h3>
                        <p className="text-brand-charcoal/70 text-sm">
                          {gift.recipients?.relationship}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(gift.status)}>
                        {gift.status === 'ordered' ? 'Processing' : gift.status}
                      </Badge>
                      {gift.payment_status === 'paid' && (
                        <Badge className="bg-green-100 text-green-800">
                          Paid
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-brand-charcoal/50" />
                      <div>
                        <p className="text-xs text-brand-charcoal/70">Occasion</p>
                        <p className="text-sm font-medium text-brand-charcoal">
                          {gift.occasion}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-brand-charcoal/50" />
                      <div>
                        <p className="text-xs text-brand-charcoal/70">Date</p>
                        <p className="text-sm font-medium text-brand-charcoal">
                          {formatDate(gift.occasion_date)}
                          {daysUntil >= 0 && (
                            <span className="text-xs text-brand-charcoal/60 ml-1">
                              ({daysUntil === 0 ? 'Today' : `${daysUntil} days`})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-brand-charcoal/50" />
                      <div>
                        <p className="text-xs text-brand-charcoal/70">Gift Type</p>
                        <p className="text-sm font-medium text-brand-charcoal">
                          {gift.gift_type || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-brand-charcoal/50" />
                      <div>
                        <p className="text-xs text-brand-charcoal/70">Budget</p>
                        <p className="text-sm font-medium text-brand-charcoal">
                          {gift.price_range || 'Not set'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Show Shopify order status if gift is ordered */}
                  {gift.status === 'ordered' && (
                    <div className="mb-4">
                      <ShopifyOrderStatus gift={gift} />
                    </div>
                  )}

                  {gift.gift_description && (
                    <div className="mb-4 p-3 bg-brand-cream-light rounded-lg">
                      <p className="text-sm text-brand-charcoal">
                        <strong>Description:</strong> {gift.gift_description.split('|')[0].trim()}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-brand-cream-light">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingGift(gift)}
                        className="text-brand-charcoal border-brand-charcoal hover:bg-brand-cream-light"
                      >
                        View Details
                      </Button>
                      {gift.status === 'scheduled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingGift(gift)}
                          className="text-brand-charcoal border-brand-charcoal hover:bg-brand-cream-light"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {gift.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteGift(gift.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-8">
          <CardContent>
            <Gift className="h-12 w-12 text-brand-charcoal/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-brand-charcoal mb-2">
              No upcoming gifts scheduled
            </h3>
            <p className="text-brand-charcoal/70 mb-4">
              Start by adding recipients and scheduling gifts for their special occasions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {editingGift && (
        <EditGiftModal
          gift={editingGift}
          isOpen={!!editingGift}
          onClose={() => setEditingGift(null)}
        />
      )}

      {viewingGift && (
        <GiftDetailsModal
          gift={viewingGift}
          isOpen={!!viewingGift}
          onClose={() => setViewingGift(null)}
        />
      )}
    </div>
  );
};

export default UpcomingGiftsManager;
