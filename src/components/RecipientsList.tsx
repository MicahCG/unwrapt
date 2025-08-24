
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Gift, Phone, MapPin, Mail, Star, Eye, Trash2, Pencil, Plus, Clock, Edit, Check } from 'lucide-react';
import { cleanName } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import EditRecipientModal from './EditRecipientModal';
import ScheduleGiftModal from './ScheduleGiftModal';
import AddRecipientModal from './AddRecipientModal';
import GiftDetailsModal from './GiftDetailsModal';

const RecipientsList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingRecipient, setEditingRecipient] = useState(null);
  const [schedulingGift, setSchedulingGift] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingGift, setViewingGift] = useState(null);

  // Fetch recipients with scheduled gifts
  const { data: recipients } = useQuery({
    queryKey: ['recipients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipients')
        .select(`
          *,
          scheduled_gifts:scheduled_gifts(
            id,
            occasion,
            occasion_date,
            gift_type,
            gift_description,
            price_range,
            status,
            payment_status,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Sort recipients: those without scheduled gifts first, then those with gifts, alphabetically within each group
      return data.sort((a, b) => {
        const aHasGifts = a.scheduled_gifts && a.scheduled_gifts.length > 0;
        const bHasGifts = b.scheduled_gifts && b.scheduled_gifts.length > 0;
        
        // Primary sort: no gifts first
        if (!aHasGifts && bHasGifts) return -1;
        if (aHasGifts && !bHasGifts) return 1;
        
        // Secondary sort: alphabetical within groups
        return a.name.localeCompare(b.name);
      });
    },
    enabled: !!user
  });

  const handleDeleteRecipient = async (recipientId: string) => {
    try {
      const { error } = await supabase
        .from('recipients')
        .delete()
        .eq('id', recipientId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
    } catch (error) {
      console.error('Error deleting recipient:', error);
    }
  };

  const handleDeleteGift = async (giftId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_gifts')
        .delete()
        .eq('id', giftId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
    } catch (error) {
      console.error('Error deleting gift:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getNextOccasion = (recipient: any) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    const occasions = [];
    
    if (recipient.birthday) {
      // Parse date as local date to avoid timezone issues
      const birthdayParts = recipient.birthday.split('-');
      const birthday = new Date(parseInt(birthdayParts[0]), parseInt(birthdayParts[1]) - 1, parseInt(birthdayParts[2]));
      const thisYearBirthday = new Date(currentYear, birthday.getMonth(), birthday.getDate());
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(currentYear + 1);
      }
      occasions.push({ type: 'Birthday', date: thisYearBirthday });
    }
    
    if (recipient.anniversary) {
      // Parse date as local date to avoid timezone issues
      const anniversaryParts = recipient.anniversary.split('-');
      const anniversary = new Date(parseInt(anniversaryParts[0]), parseInt(anniversaryParts[1]) - 1, parseInt(anniversaryParts[2]));
      const thisYearAnniversary = new Date(currentYear, anniversary.getMonth(), anniversary.getDate());
      if (thisYearAnniversary < today) {
        thisYearAnniversary.setFullYear(currentYear + 1);
      }
      occasions.push({ type: 'Anniversary', date: thisYearAnniversary });
    }
    
    occasions.sort((a, b) => a.date.getTime() - b.date.getTime());
    return occasions[0];
  };

  const getNextScheduledGift = (scheduledGifts: any[]) => {
    if (!scheduledGifts || scheduledGifts.length === 0) return null;
    
    const today = new Date();
    const upcomingGifts = scheduledGifts
      .filter(gift => new Date(gift.occasion_date) >= today)
      .sort((a, b) => new Date(a.occasion_date).getTime() - new Date(b.occasion_date).getTime());
    
    return upcomingGifts[0] || null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brand-charcoal">Recipients</h2>
        <Button 
          className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Recipient
        </Button>
      </div>

      {recipients && recipients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipients.map((recipient: any) => {
            const nextOccasion = getNextOccasion(recipient);
            const hasScheduledGifts = recipient.scheduled_gifts && recipient.scheduled_gifts.length > 0;
            const nextScheduledGift = getNextScheduledGift(recipient.scheduled_gifts);
            
            return (
              <Card 
                key={recipient.id} 
                className={`hover:shadow-lg transition-shadow border-brand-cream ${
                  hasScheduledGifts ? 'bg-gray-50' : 'bg-white'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg text-brand-charcoal">{cleanName(recipient.name)}</CardTitle>
                        {hasScheduledGifts && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Scheduled
                          </Badge>
                        )}
                      </div>
                      {recipient.relationship && (
                        <Badge 
                          variant="secondary" 
                          className="mt-1 bg-brand-cream text-brand-charcoal border-brand-cream"
                        >
                          {recipient.relationship}
                        </Badge>
                      )}
                      {nextScheduledGift && (
                        <p className="text-sm text-gray-500 mt-2">
                          Next gift: {formatDate(nextScheduledGift.occasion_date)}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRecipient(recipient)}
                        className="text-brand-charcoal hover:bg-brand-cream hover:text-brand-charcoal"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRecipient(recipient.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {recipient.email && (
                    <p className="text-sm text-brand-charcoal/70">{recipient.email}</p>
                  )}
                  
                  {nextOccasion && !hasScheduledGifts && (
                    <div className="flex items-center justify-between p-2 bg-brand-cream-light rounded">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-brand-gold mr-2" />
                        <span className="text-sm font-medium text-brand-charcoal">
                          {nextOccasion.type}
                        </span>
                      </div>
                      <span className="text-sm text-brand-charcoal/70">
                        {formatDate(nextOccasion.date.toISOString())}
                      </span>
                    </div>
                  )}
                  
                  {recipient.interests && recipient.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipient.interests.slice(0, 3).map((interest: string, index: number) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs bg-white text-brand-charcoal border-brand-charcoal hover:bg-brand-cream"
                        >
                          {interest}
                        </Badge>
                      ))}
                      {recipient.interests.length > 3 && (
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-white text-brand-charcoal border-brand-charcoal hover:bg-brand-cream"
                        >
                          +{recipient.interests.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {hasScheduledGifts && nextScheduledGift ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-brand-charcoal text-brand-charcoal hover:bg-brand-cream"
                      onClick={() => setViewingGift(nextScheduledGift)}
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      View Gift
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                      onClick={() => setSchedulingGift(recipient)}
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Schedule Gift
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white border-brand-cream">
          <CardContent className="py-12 text-center">
            <div className="text-brand-charcoal/50 mb-4">
              No recipients added yet
            </div>
            <Button 
              className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
              onClick={() => setShowAddModal(true)}
            >
              Add Your First Recipient
            </Button>
          </CardContent>
        </Card>
      )}

      {editingRecipient && (
        <EditRecipientModal
          recipient={editingRecipient}
          isOpen={!!editingRecipient}
          onClose={() => setEditingRecipient(null)}
        />
      )}

      {schedulingGift && (
        <ScheduleGiftModal
          recipient={schedulingGift}
          isOpen={!!schedulingGift}
          onClose={() => setSchedulingGift(null)}
        />
      )}

      {viewingGift && (
        <GiftDetailsModal
          gift={viewingGift}
          isOpen={!!viewingGift}
          onClose={() => setViewingGift(null)}
          onDelete={handleDeleteGift}
        />
      )}

      <AddRecipientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onRecipientAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['recipients'] });
          queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
        }}
      />
    </div>
  );
};

export default RecipientsList;
