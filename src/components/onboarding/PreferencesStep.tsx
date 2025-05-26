
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Settings, ArrowDown } from 'lucide-react';

interface PreferencesStepProps {
  onNext: (data: any) => void;
}

const PreferencesStep: React.FC<PreferencesStepProps> = ({ onNext }) => {
  const [preferences, setPreferences] = useState({
    budgetRange: '',
    giftStyle: '',
    deliveryTiming: '',
    specialRequests: ''
  });

  const handlePreferenceChange = (key: string, value: string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleContinue = () => {
    onNext({ preferences });
  };

  const isComplete = preferences.budgetRange && preferences.giftStyle && preferences.deliveryTiming;

  return (
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-gold/20 p-4 rounded-full">
            <Settings className="h-12 w-12 text-brand-gold" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2 text-brand-charcoal">Set your gift preferences</CardTitle>
        <p className="text-brand-charcoal/70">
          Help us customize the perfect gifting experience for you
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-brand-charcoal font-medium">Typical budget range per gift *</Label>
            <Select onValueChange={(value) => handlePreferenceChange('budgetRange', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select budget range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="under-25">Under $25</SelectItem>
                <SelectItem value="25-50">$25 - $50</SelectItem>
                <SelectItem value="50-100">$50 - $100</SelectItem>
                <SelectItem value="100-200">$100 - $200</SelectItem>
                <SelectItem value="200-500">$200 - $500</SelectItem>
                <SelectItem value="over-500">Over $500</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-brand-charcoal font-medium">Gift style preference *</Label>
            <Select onValueChange={(value) => handlePreferenceChange('giftStyle', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gift style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="practical">Practical & Useful</SelectItem>
                <SelectItem value="luxury">Luxury & Premium</SelectItem>
                <SelectItem value="experiential">Experiences & Activities</SelectItem>
                <SelectItem value="sentimental">Sentimental & Personal</SelectItem>
                <SelectItem value="trendy">Trendy & Modern</SelectItem>
                <SelectItem value="handmade">Handmade & Artisanal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-brand-charcoal font-medium">Delivery timing *</Label>
            <Select onValueChange={(value) => handlePreferenceChange('deliveryTiming', value)}>
              <SelectTrigger>
                <SelectValue placeholder="When should gifts arrive?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week-before">1 week before the date</SelectItem>
                <SelectItem value="few-days-before">2-3 days before the date</SelectItem>
                <SelectItem value="day-before">Day before the date</SelectItem>
                <SelectItem value="on-date">On the exact date</SelectItem>
                <SelectItem value="flexible">I'm flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-brand-cream-light p-4 rounded-lg">
          <h4 className="font-medium mb-2 text-brand-charcoal">What happens next?</h4>
          <ul className="text-sm text-brand-charcoal/70 space-y-1">
            <li>• We'll create a personalized gift schedule</li>
            <li>• You'll get recommendations before each occasion</li>
            <li>• You can approve, modify, or change gifts anytime</li>
            <li>• We handle ordering and delivery automatically</li>
          </ul>
        </div>

        <Button 
          size="lg" 
          className="w-full text-lg py-6 bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
          onClick={handleContinue}
          disabled={!isComplete}
        >
          Complete Setup
          <ArrowDown className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default PreferencesStep;
