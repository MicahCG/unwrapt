
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Calendar, DollarSign, TestTube2, Plus } from 'lucide-react';
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
          recipients (name, email, interests, street, city, state, zip_code, country, phone)
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
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-brand-charcoal">Upcoming Gifts</h2>
        <Button
          className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90 w-full sm:w-auto"
          onClick={() => setShowRecipientSelection(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="sm:hidden">Schedule Gifts</span>
          <span className="hidden sm:inline">Schedule More Gifts</span>
        </Button>
      </div>

      {gifts && gifts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4 sm:gap-6">
          {gifts.map((gift: any) => (
            <Card key={gift.id} className="hover:shadow-lg transition-shadow w-full">
              <CardHeader className="pb-3 px-4 sm:px-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg text-brand-charcoal truncate">
                      {gift.recipients?.name}
                    </CardTitle>
                    <Badge className={`mt-1 text-xs ${getStatusColor(gift.status)}`}>
                      {gift.status}
                    </Badge>
                  </div>
                  <div className="flex space-x-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTestingGift(gift)}
                      title="Test Shopify Integration"
                      className="h-8 w-8 p-0"
                    >
                      <TestTube2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingGift(gift)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3 px-4 sm:px-6">
                <div className="space-y-2">
                  <p className="font-medium text-brand-charcoal text-sm sm:text-base">{gift.occasion}</p>
                  {gift.gift_type && (
                    <p className="text-xs sm:text-sm text-brand-charcoal/70">{gift.gift_type}</p>
                  )}
                </div>

                {gift.recipients?.interests && gift.recipients.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {gift.recipients.interests.slice(0, 3).map((interest: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                    {gift.recipients.interests.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{gift.recipients.interests.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2">
                  <div className="flex items-center text-xs sm:text-sm text-brand-charcoal/70">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {formatDate(gift.occasion_date)}
                  </div>
                  {gift.price_range && (
                    <div className="flex items-center text-xs sm:text-sm text-brand-charcoal/70">
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      {gift.price_range}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  className="w-full bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90 text-xs sm:text-sm"
                  onClick={() => setViewingGift(gift)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="w-full">
          <CardContent className="py-8 sm:py-12 text-center px-4 sm:px-6">
            <div className="text-brand-charcoal/50 mb-4 text-sm sm:text-base">
              No upcoming gifts scheduled
            </div>
            <Button
              className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90 w-full sm:w-auto"
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
          onDelete={handleDeleteGift}
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
