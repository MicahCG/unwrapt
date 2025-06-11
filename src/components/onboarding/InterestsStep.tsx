
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, ArrowDown } from 'lucide-react';

interface InterestsStepProps {
  onNext: (data: any) => void;
  selectedPersonForGift?: any;
}

const InterestsStep: React.FC<InterestsStepProps> = ({ onNext, selectedPersonForGift }) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Updated interests to include the 5 specified options
  const predefinedInterests = [
    'Coffee', 'Tea', 'Wine', 'Sweet Treats', 'Self Care'
  ];

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleContinue = () => {
    onNext({ 
      interests: selectedInterests,
      selectedPersonForGift
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
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
          {selectedPersonForGift ? `What are ${selectedPersonForGift.personName}'s interests?` : "What are their interests?"}
        </CardTitle>
        <p className="text-brand-charcoal/70">
          Select interests that will help us find the perfect gifts
          {selectedPersonForGift && (
            <span className="block mt-2 text-brand-gold font-medium">
              For {selectedPersonForGift.personName}'s {selectedPersonForGift.type} on {formatDate(selectedPersonForGift.date)}
            </span>
          )}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-medium mb-3 text-brand-charcoal">Select interests:</h4>
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
