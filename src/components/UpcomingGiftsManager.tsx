import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, DollarSign, Plus, Sparkles } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import GiftDetailsModal from './GiftDetailsModal';
import RecipientSelectionModal from './RecipientSelectionModal';
import ScheduleGiftModal from './ScheduleGiftModal';
import { cleanName } from '@/lib/utils';

const UpcomingGiftsManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewingGift, setViewingGift] = useState(null);
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
        .in('status', ['scheduled', 'ordered', 'paid'])
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

  const getGiftImage = (gift: any) => {
    // First priority: use the actual gift image URL if available
    if (gift.gift_image_url) {
      return gift.gift_image_url;
    }
    
    // Fallback to type-based mapping for older gifts
    const imageMap = {
      'wine': 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=300&fit=crop',
      'tea': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400&h=300&fit=crop',
      'coffee': 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=300&fit=crop',
      'sweet treats': 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop',
      'self care': 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=300&fit=crop',
      'candle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop&q=80',
      'ocean driftwood coconut candle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop&q=80'
    };
    return imageMap[gift.gift_type?.toLowerCase()] || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop';
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-brand-gold" />
          <h2 className="text-lg sm:text-xl font-semibold text-brand-charcoal">Upcoming Gifts</h2>
        </div>
        {gifts && gifts.length > 0 && (
          <Button
            className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90 w-full sm:w-auto"
            onClick={() => setShowRecipientSelection(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="sm:hidden">Schedule Gifts</span>
            <span className="hidden sm:inline">Schedule More Gifts</span>
          </Button>
        )}
      </div>

      {gifts && gifts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4 sm:gap-6">
          {gifts.map((gift: any) => (
            <Card 
              key={gift.id} 
              className="hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 bg-gradient-to-br from-white to-brand-cream/20 border-brand-cream w-full"
              onClick={() => setViewingGift(gift)}
            >
              <CardHeader className="pb-3 px-4 sm:px-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-brand-gold" />
                      <CardTitle className="text-base sm:text-lg text-brand-charcoal truncate">
                        {cleanName(gift.recipients?.name)}
                      </CardTitle>
                    </div>
                    <Badge className={`text-xs ${getStatusColor(gift.status)}`}>
                      {gift.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 px-4 sm:px-6">
                {/* Gift Image & Details */}
                <div className="flex items-center space-x-4">
                  {gift.gift_type && (
                    <img
                      src={getGiftImage(gift)}
                      alt={`${gift.gift_type} gift`}
                      className="w-16 h-16 object-cover rounded-lg shadow-sm"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-brand-charcoal text-sm sm:text-base">{gift.occasion}</p>
                    {gift.gift_type && (
                      <p className="text-xs sm:text-sm text-brand-charcoal/70 font-medium">{gift.gift_type}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center text-xs sm:text-sm text-brand-charcoal/70">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {formatDate(gift.occasion_date)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="w-full min-h-[400px] bg-gradient-to-br from-white via-brand-cream/10 to-brand-cream/20 border-brand-cream/30 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center h-full py-12 px-4 sm:px-6 text-center space-y-6">
            {/* Animated Gift Icon */}
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-brand-gold/20 to-brand-gold/10 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="h-10 w-10 text-brand-gold animate-bounce" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-brand-gold/20 rounded-full animate-ping"></div>
            </div>
            
            {/* Main Message */}
            <div className="space-y-3 max-w-sm">
              <h3 className="text-xl font-semibold text-brand-charcoal">
                Ready to spread some joy?
              </h3>
              <p className="text-brand-charcoal/70 leading-relaxed">
                Start your thoughtful gifting journey by scheduling your first gift. We'll handle the rest!
              </p>
            </div>
            
            {/* CTA Button */}
            <Button
              size="lg"
              className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
              onClick={() => setShowRecipientSelection(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Schedule Your First Gift
            </Button>
            
            {/* Supporting Text */}
            <p className="text-xs text-brand-charcoal/50 max-w-xs">
              Choose from curated gifts and we'll deliver at the perfect time
            </p>
          </CardContent>
        </Card>
      )}

      {viewingGift && (
        <GiftDetailsModal
          gift={viewingGift}
          isOpen={!!viewingGift}
          onClose={() => setViewingGift(null)}
          onDelete={handleDeleteGift}
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
