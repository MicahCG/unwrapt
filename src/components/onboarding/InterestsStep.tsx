
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Heart, ArrowDown, Plus } from 'lucide-react';

interface InterestsStepProps {
  onNext: (data: any) => void;
  recipientName?: string;
}

const InterestsStep: React.FC<InterestsStepProps> = ({ onNext, recipientName }) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');

  const predefinedInterests = [
    'Books', 'Movies', 'Music', 'Sports', 'Cooking', 'Travel', 'Art', 'Photography',
    'Gaming', 'Fitness', 'Fashion', 'Technology', 'Gardening', 'Coffee', 'Wine',
    'Jewelry', 'Home Decor', 'Outdoor Activities', 'Crafts', 'Beauty Products'
  ];

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !selectedInterests.includes(customInterest.trim())) {
      setSelectedInterests(prev => [...prev, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const handleContinue = () => {
    onNext({ 
      interests: selectedInterests
    });
  };

  return (
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-charcoal/10 p-4 rounded-full">
            <Heart className="h-12 w-12 text-brand-charcoal" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2 text-brand-charcoal">
          What does {recipientName || 'your special person'} love?
        </CardTitle>
        <p className="text-brand-charcoal/70">
          Select their interests so we can find the perfect gifts
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-medium mb-3 text-brand-charcoal">Popular interests:</h4>
          <div className="flex flex-wrap gap-2">
            {predefinedInterests.map((interest) => (
              <Badge
                key={interest}
                variant={selectedInterests.includes(interest) ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  selectedInterests.includes(interest)
                    ? 'bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90'
                    : 'border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light'
                }`}
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3 text-brand-charcoal">Add custom interest:</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Type a custom interest..."
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
            />
            <Button 
              variant="outline" 
              onClick={addCustomInterest}
              className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {selectedInterests.length > 0 && (
          <div className="bg-brand-cream-light p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-brand-charcoal">Selected interests:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedInterests.map((interest) => (
                <Badge
                  key={interest}
                  className="bg-brand-charcoal text-brand-cream"
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button 
          size="lg" 
          className="w-full text-lg py-6 bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
          onClick={handleContinue}
          disabled={selectedInterests.length === 0}
        >
          Continue with {selectedInterests.length} interest{selectedInterests.length !== 1 ? 's' : ''}
          <ArrowDown className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default InterestsStep;
