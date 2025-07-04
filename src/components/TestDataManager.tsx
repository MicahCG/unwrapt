
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { createTestData, clearTestData, testRecipients } from '@/utils/testDataGenerator';
import { Database, TestTube2, Trash2, Users, Gift, AlertTriangle } from 'lucide-react';

const TestDataManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleCreateTestData = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create test data",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await createTestData(user.id);
      
      // Refresh all relevant queries
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
      
      toast({
        title: "Test Data Created",
        description: `Created ${testRecipients.length} test recipients with addresses and 2 scheduled gifts`,
      });
    } catch (error) {
      console.error('Error creating test data:', error);
      toast({
        title: "Error Creating Test Data",
        description: error.message || "Failed to create test data",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClearTestData = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to clear test data",
        variant: "destructive",
      });
      return;
    }

    setIsClearing(true);
    try {
      await clearTestData(user.id);
      
      // Refresh all relevant queries
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
      
      toast({
        title: "Test Data Cleared",
        description: "All test recipients and gifts have been removed",
      });
    } catch (error) {
      console.error('Error clearing test data:', error);
      toast({
        title: "Error Clearing Test Data",
        description: error.message || "Failed to clear test data",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="alert-warning">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-slate-700">
          <TestTube2 className="h-5 w-5" />
          Test Data Manager
          <Badge variant="outline" className="status-warning">
            Development Only
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-3 alert-warning rounded-lg">
          <AlertTriangle className="h-4 w-4 text-slate-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-slate-700">Testing Environment</p>
            <p className="text-slate-600 mt-1">
              Use these controls to set up realistic test data for Shopify integration testing.
              Test recipients include complete shipping addresses required for orders.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Create Test Data
            </h4>
            <p className="text-sm text-gray-600">
              Creates {testRecipients.length} test recipients with complete addresses and 2 sample scheduled gifts
            </p>
            <Button
              onClick={handleCreateTestData}
              disabled={isCreating}
              className="w-full btn-success"
            >
              {isCreating ? 'Creating...' : 'Create Test Data'}
              <Users className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-800 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Clear Test Data
            </h4>
            <p className="text-sm text-gray-600">
              Removes all test recipients and scheduled gifts to start fresh
            </p>
            <Button
              onClick={handleClearTestData}
              disabled={isClearing}
              variant="outline"
              className="w-full btn-danger"
            >
              {isClearing ? 'Clearing...' : 'Clear Test Data'}
              <Trash2 className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-slate-200">
          <h5 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Test Data Preview
          </h5>
          <div className="space-y-2 text-sm text-gray-600">
            {testRecipients.map((recipient, index) => (
              <div key={index} className="flex justify-between items-center">
                <span>{recipient.name} ({recipient.relationship})</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {recipient.address.city}, {recipient.address.state}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestDataManager;
