import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { useState } from 'react';

export const AddTestRecipient = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Only show in development or localhost
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

  if (!isDev) return null;

  const addTestRecipient = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create a test recipient with a birthday 30 days from now
      const birthdayDate = new Date();
      birthdayDate.setDate(birthdayDate.getDate() + 30);

      const testRecipient = {
        user_id: user.id,
        name: 'Test Person',
        email: 'test@example.com',
        birthday: birthdayDate.toISOString().split('T')[0],
        interests: ['cooking', 'reading'],
        street: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94102',
        country: 'US',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('recipients')
        .insert(testRecipient)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: '✅ Test Recipient Added',
        description: `Added "Test Person" with birthday in 30 days. You should now see the automation toggle!`,
      });

      // Refresh the page to show the new recipient
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Error adding test recipient:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add test recipient',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="w-5 h-5 text-green-600" />
        <h3 className="font-medium text-green-900">Quick Test Setup</h3>
      </div>

      <p className="text-sm text-green-700 mb-4">
        Add a test recipient with an upcoming birthday to test automation
      </p>

      <Button
        onClick={addTestRecipient}
        disabled={isLoading}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Test Recipient
          </>
        )}
      </Button>

      <p className="text-xs text-green-600 mt-2">
        Creates "Test Person" with birthday in 30 days
      </p>
    </Card>
  );
};
