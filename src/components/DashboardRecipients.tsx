
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Calendar, Plus, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import ScheduleGiftModal from './ScheduleGiftModal';
import AddRecipientModal from './AddRecipientModal';

const DashboardRecipients = () => {
  const { user } = useAuth();
  const [schedulingGift, setSchedulingGift] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch recipients
  const { data: recipients } = useQuery({
    queryKey: ['recipients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipients')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(6); // Show only first 6 on dashboard
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

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
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-brand-charcoal" />
          <h2 className="text-xl font-semibold text-brand-charcoal">Your Recipients</h2>
        </div>
        <Button 
          variant="outline"
          size="sm"
          className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Manage
        </Button>
      </div>

      {recipients && recipients.length > 0 ? (
        <div className="space-y-4">
          {recipients.map((recipient: any) => {
            const nextOccasion = getNextOccasion(recipient);
            
            return (
              <Card key={recipient.id} className="bg-white border-brand-cream hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="font-medium text-brand-charcoal">{recipient.name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            {recipient.relationship && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs bg-brand-cream text-brand-charcoal border-brand-cream"
                              >
                                {recipient.relationship}
                              </Badge>
                            )}
                            {nextOccasion && (
                              <div className="flex items-center text-xs text-brand-charcoal/70">
                                <Calendar className="h-3 w-3 mr-1" />
                                <span className="font-medium">{nextOccasion.type}:</span>
                                <span className="ml-1">{formatDate(nextOccasion.date.toISOString())}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                      onClick={() => setSchedulingGift(recipient)}
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Schedule Gift
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white border-brand-cream">
          <CardContent className="py-8 text-center">
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

      {schedulingGift && (
        <ScheduleGiftModal
          recipient={schedulingGift}
          isOpen={!!schedulingGift}
          onClose={() => setSchedulingGift(null)}
        />
      )}

      <AddRecipientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};

export default DashboardRecipients;
