
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Gift, Calendar, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import EditRecipientModal from './EditRecipientModal';
import ScheduleGiftModal from './ScheduleGiftModal';

const RecipientsList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingRecipient, setEditingRecipient] = useState(null);
  const [schedulingGift, setSchedulingGift] = useState(null);

  // Fetch recipients
  const { data: recipients } = useQuery({
    queryKey: ['recipients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipients')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
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
      const birthday = new Date(recipient.birthday);
      const thisYearBirthday = new Date(currentYear, birthday.getMonth(), birthday.getDate());
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(currentYear + 1);
      }
      occasions.push({ type: 'Birthday', date: thisYearBirthday });
    }
    
    if (recipient.anniversary) {
      const anniversary = new Date(recipient.anniversary);
      const thisYearAnniversary = new Date(currentYear, anniversary.getMonth(), anniversary.getDate());
      if (thisYearAnniversary < today) {
        thisYearAnniversary.setFullYear(currentYear + 1);
      }
      occasions.push({ type: 'Anniversary', date: thisYearAnniversary });
    }
    
    occasions.sort((a, b) => a.date.getTime() - b.date.getTime());
    return occasions[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brand-charcoal">Recipients</h2>
        <Button 
          className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Recipient
        </Button>
      </div>

      {recipients && recipients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipients.map((recipient: any) => {
            const nextOccasion = getNextOccasion(recipient);
            
            return (
              <Card key={recipient.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-brand-charcoal">{recipient.name}</CardTitle>
                      {recipient.relationship && (
                        <Badge variant="secondary" className="mt-1">
                          {recipient.relationship}
                        </Badge>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRecipient(recipient)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRecipient(recipient.id)}
                        className="text-red-600 hover:text-red-700"
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
                  
                  {nextOccasion && (
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
                        <Badge key={index} variant="outline" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                      {recipient.interests.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{recipient.interests.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <Button
                    size="sm"
                    className="w-full bg-brand-gold text-white hover:bg-brand-gold/90"
                    onClick={() => setSchedulingGift(recipient)}
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Schedule Gift
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-brand-charcoal/50 mb-4">
              No recipients added yet
            </div>
            <Button className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90">
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
    </div>
  );
};

export default RecipientsList;
