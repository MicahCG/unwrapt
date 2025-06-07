import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Heart, ArrowDown, Plus, Calendar } from 'lucide-react';

interface InterestsStepProps {
  onNext: (data: any) => void;
  importedDates?: any[];
}

const InterestsStep: React.FC<InterestsStepProps> = ({ onNext, importedDates = [] }) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any>(null);

  // Expanded interests to include more categories
  const predefinedInterests = [
    'Coffee', 'Tea', 'Wine', 'Craft Beer', 'Cooking', 'Baking',
    'Fitness', 'Yoga', 'Reading', 'Gaming', 'Music', 'Art',
    'Photography', 'Travel', 'Gardening', 'Technology', 'Fashion',
    'Skincare', 'Jewelry', 'Home Decor', 'Outdoor Activities', 'Sports'
  ];

  // Auto-select the first person from calendar if available
  useEffect(() => {
    if (importedDates && importedDates.length > 0) {
      const firstPersonWithName = importedDates.find(date => date.personName);
      if (firstPersonWithName) {
        setSelectedPerson(firstPersonWithName);
      }
    }
  }, [importedDates]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const addCustomInterest = () => {
    const trimmedInterest = customInterest.trim();
    
    if (trimmedInterest && 
        !selectedInterests.some(interest => interest.toLowerCase() === trimmedInterest.toLowerCase())) {
      setSelectedInterests(prev => [...prev, trimmedInterest]);
      setCustomInterest('');
    }
  };

  const handleContinue = () => {
    onNext({ 
      interests: selectedInterests,
      selectedPersonForGift: selectedPerson
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
          {selectedPerson ? `What are ${selectedPerson.personName}'s interests?` : "What are their interests?"}
        </CardTitle>
        <p className="text-brand-charcoal/70">
          Select interests that will help us find the perfect gifts
          {selectedPerson && (
            <span className="block mt-2 text-brand-gold font-medium">
              For {selectedPerson.personName}'s {selectedPerson.type} on {formatDate(selectedPerson.date)}
            </span>
          )}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Show person selection if multiple people found */}
        {importedDates && importedDates.length > 1 && (
          <div className="space-y-3">
            <h4 className="font-medium text-brand-charcoal">Choose who you'd like to schedule a gift for:</h4>
            <div className="grid gap-2">
              {importedDates.filter(date => date.personName).map((date, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPerson?.summary === date.summary 
                      ? 'border-brand-charcoal bg-brand-cream' 
                      : 'border-brand-cream hover:border-brand-charcoal/50'
                  }`}
                  onClick={() => setSelectedPerson(date)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-brand-charcoal">{date.personName}</span>
                      <div className="text-sm text-brand-charcoal/70 flex items-center mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        {date.type} on {formatDate(date.date)}
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedPerson?.summary === date.summary 
                        ? 'bg-brand-charcoal border-brand-charcoal' 
                        : 'border-brand-charcoal/30'
                    }`}>
                      {selectedPerson?.summary === date.summary && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
              placeholder="e.g., Rock climbing, Pottery, Board games..."
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
          disabled={selectedInterests.length === 0 || (!selectedPerson && importedDates.length > 0)}
        >
          Continue with {selectedInterests.length} interest{selectedInterests.length !== 1 ? 's' : ''}
          <ArrowDown className="h-4 w-4 ml-2" />
        </Button>

        {importedDates.length > 0 && !selectedPerson && (
          <p className="text-center text-sm text-brand-charcoal/70">
            Please select a person to schedule a gift for
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default InterestsStep;