
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Calendar } from 'lucide-react';

interface RecipientSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipientSelected: (recipient: any) => void;
}

const RecipientSelectionModal: React.FC<RecipientSelectionModalProps> = ({
  isOpen,
  onClose,
  onRecipientSelected
}) => {
  const { user } = useAuth();

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
    enabled: !!user && isOpen
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white text-brand-charcoal">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-brand-charcoal">
            <Users className="h-5 w-5" />
            <span>Select a Recipient</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {recipients && recipients.length > 0 ? (
            recipients.map((recipient: any) => {
              const nextOccasion = getNextOccasion(recipient);
              
              return (
                <Card 
                  key={recipient.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onRecipientSelected(recipient)}
                >
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
                                  className="text-xs bg-brand-cream text-brand-charcoal"
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
                        variant="outline"
                        className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRecipientSelected(recipient);
                        }}
                      >
                        Select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-8 text-brand-charcoal/50">
              No recipients found. Add recipients first to schedule gifts.
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecipientSelectionModal;
