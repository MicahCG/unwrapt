
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Calendar, DollarSign, TestTube2, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import EditGiftModal from './EditGiftModal';
import GiftDetailsModal from './GiftDetailsModal';
import ShopifyTestModal from './ShopifyTestModal';
import ScheduleGiftModal from './ScheduleGiftModal';
import RecipientSelectionModal from './RecipientSelectionModal';

const UpcomingGiftsManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingGift, setEditingGift] = useState(null);
  const [viewingGift, setViewingGift] = useState(null);
  const [testingGift, setTestingGift] = useState(null);
  const [showRecipientSelection, setShowRecipientSelection] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);

  // Fetch upcoming gifts
  const { data: gifts } = useQuery({
    queryKey: ['upcoming-gifts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_gifts')
        .select(`
          *,
          recipients (name, email, interests)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'scheduled')
        .order('delivery_date', { ascending: true });
      
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

  const handleRecipientSelected = (recipient: any) => {
    setSelectedRecipient(recipient);
    setShowRecipientSelection(false);
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
      case 'paid': return 'bg-green-100 text-green-800';
      case 'ordered': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brand-charcoal">Upcoming Gifts</h2>
        <Button
          className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
          onClick={() => setShowRecipientSelection(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule More Gifts
        </Button>
      </div>

      {gifts && gifts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gifts.map((gift: any) => (
            <Card key={gift.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg text-brand-charcoal">
                      {gift.recipients?.name}
                    </CardTitle>
                    <Badge className={`mt-1 ${getStatusColor(gift.status)}`}>
                      {gift.status}
                    </Badge>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTestingGift(gift)}
                      title="Test Shopify Integration"
                    >
                      <TestTube2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingGift(gift)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
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
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="font-medium text-brand-charcoal">{gift.occasion}</p>
                  {gift.gift_type && (
                    <p className="text-sm text-brand-charcoal/70">{gift.gift_type}</p>
                  )}
                </div>

                {gift.recipients?.interests && gift.recipients.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {gift.recipients.interests.map((interest: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center text-sm text-brand-charcoal/70">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(gift.occasion_date)}
                  </div>
                  {gift.price_range && (
                    <div className="flex items-center text-sm text-brand-charcoal/70">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {gift.price_range}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  className="w-full bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                  onClick={() => setViewingGift(gift)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-brand-charcoal/50 mb-4">
              No upcoming gifts scheduled
            </div>
            <Button
              className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
              onClick={() => setShowRecipientSelection(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule Your First Gift
            </Button>
          </CardContent>
        </Card>
      )}

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

      {testingGift && (
        <ShopifyTestModal
          gift={testingGift}
          isOpen={!!testingGift}
          onClose={() => setTestingGift(null)}
        />
      )}

      {showRecipientSelection && (
        <RecipientSelectionModal
          isOpen={showRecipientSelection}
          onClose={() => setShowRecipientSelection(false)}
          onRecipientSelected={handleRecipientSelected}
        />
      )}

      {selectedRecipient && (
        <ScheduleGiftModal
          recipient={selectedRecipient}
          isOpen={!!selectedRecipient}
          onClose={() => setSelectedRecipient(null)}
        />
      )}
    </div>
  );
};

export default UpcomingGiftsManager;
