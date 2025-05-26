
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Edit, Trash2, ShoppingCart, Eye } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import GiftDetailsModal from './GiftDetailsModal';
import EditGiftModal from './EditGiftModal';

const UpcomingGiftsManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGift, setSelectedGift] = useState(null);
  const [editingGift, setEditingGift] = useState(null);

  // Fetch upcoming scheduled gifts
  const { data: upcomingGifts } = useQuery({
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
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brand-charcoal">Upcoming Gifts</h2>
      </div>

      {upcomingGifts && upcomingGifts.length > 0 ? (
        <div className="space-y-4">
          {upcomingGifts.map((gift: any) => {
            const daysUntil = getDaysUntil(gift.occasion_date);
            const isUrgent = daysUntil <= 7;
            
            return (
              <Card key={gift.id} className={`hover:shadow-lg transition-shadow ${isUrgent ? 'border-red-200' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-brand-charcoal">
                          {gift.recipients?.name}
                        </h3>
                        <Badge className={getStatusColor(gift.status)}>
                          {gift.status}
                        </Badge>
                        {isUrgent && (
                          <Badge variant="destructive" className="animate-pulse">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-brand-charcoal/70">
                        <div>
                          <span className="font-medium">Occasion:</span>
                          <p>{gift.occasion}</p>
                        </div>
                        <div>
                          <span className="font-medium">Date:</span>
                          <p>{formatDate(gift.occasion_date)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Days Until:</span>
                          <p className={isUrgent ? 'text-red-600 font-medium' : ''}>
                            {daysUntil} days
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Price Range:</span>
                          <p>{gift.price_range || 'Not specified'}</p>
                        </div>
                      </div>
                      
                      {gift.gift_type && (
                        <div className="mt-2">
                          <Badge variant="outline">{gift.gift_type}</Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedGift(gift)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingGift(gift)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {gift.status === 'scheduled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOrderGift(gift.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteGift(gift.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-brand-charcoal/30 mx-auto mb-4" />
            <p className="text-brand-charcoal/70 mb-4">No upcoming gifts scheduled</p>
            <Button className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90">
              Schedule Your First Gift
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedGift && (
        <GiftDetailsModal
          gift={selectedGift}
          isOpen={!!selectedGift}
          onClose={() => setSelectedGift(null)}
        />
      )}

      {editingGift && (
        <EditGiftModal
          gift={editingGift}
          isOpen={!!editingGift}
          onClose={() => setEditingGift(null)}
        />
      )}
    </div>
  );
};

export default UpcomingGiftsManager;
