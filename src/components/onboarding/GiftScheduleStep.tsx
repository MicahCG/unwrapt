
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Gift, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface GiftScheduleStepProps {
  onNext: (data: any) => void;
  recipientName?: string;
}

const GiftScheduleStep: React.FC<GiftScheduleStepProps> = ({ onNext, recipientName }) => {
  const [occasion, setOccasion] = useState('');
  const [occasionDate, setOccasionDate] = useState<Date>();
  const [giftType, setGiftType] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [isValid, setIsValid] = useState(false);

  React.useEffect(() => {
    const formValid = occasion && occasionDate && giftType && priceRange;
    setIsValid(!!formValid);
  }, [occasion, occasionDate, giftType, priceRange]);

  const handleContinue = () => {
    onNext({ 
      firstGift: {
        occasion,
        occasionDate: occasionDate?.toISOString().split('T')[0],
        giftType,
        priceRange
      }
    });
  };

  const handleSkip = () => {
    onNext({ firstGift: null });
  };

  return (
    <Card className="animate-fadeInUp border-brand-cream shadow-lg">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-gold/20 p-4 rounded-full">
            <Gift className="h-12 w-12 text-brand-gold" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2 text-brand-charcoal">
          Let's schedule {recipientName ? `${recipientName}'s` : 'your'} first gift
        </CardTitle>
        <p className="text-brand-charcoal/70">
          We'll help you pick the perfect gift and deliver it at just the right time
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Occasion */}
          <div className="space-y-2">
            <Label htmlFor="occasion">What's the occasion? *</Label>
            <Select onValueChange={setOccasion}>
              <SelectTrigger>
                <SelectValue placeholder="Select an occasion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="birthday">Birthday</SelectItem>
                <SelectItem value="anniversary">Anniversary</SelectItem>
                <SelectItem value="holiday">Holiday</SelectItem>
                <SelectItem value="just-because">Just Because</SelectItem>
                <SelectItem value="congratulations">Congratulations</SelectItem>
                <SelectItem value="sympathy">Sympathy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>When is this occasion? *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !occasionDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {occasionDate ? format(occasionDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={occasionDate}
                  onSelect={setOccasionDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Gift Type */}
          <div className="space-y-2">
            <Label htmlFor="giftType">What type of gift? *</Label>
            <Select onValueChange={setGiftType}>
              <SelectTrigger>
                <SelectValue placeholder="Select gift type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flowers">Flowers</SelectItem>
                <SelectItem value="chocolate">Chocolate & Sweets</SelectItem>
                <SelectItem value="jewelry">Jewelry</SelectItem>
                <SelectItem value="book">Books</SelectItem>
                <SelectItem value="tech">Tech & Gadgets</SelectItem>
                <SelectItem value="home">Home & Garden</SelectItem>
                <SelectItem value="experience">Experience Gift</SelectItem>
                <SelectItem value="custom">Custom/Personalized</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <Label htmlFor="priceRange">What's your budget? *</Label>
            <Select onValueChange={setPriceRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select price range" />
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
        </div>

        {/* Emotional Copy */}
        <div className="bg-brand-gold/10 p-4 rounded-lg text-center">
          <p className="text-sm text-brand-charcoal">
            🎁 We'll curate the perfect gift and handle everything from selection to delivery
          </p>
        </div>

        {/* Continue Button */}
        <Button 
          size="lg" 
          className="w-full text-lg py-6 bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
          onClick={handleContinue}
          disabled={!isValid}
        >
          Schedule This Gift
          <ArrowDown className="h-4 w-4 ml-2" />
        </Button>

        <div className="text-center">
          <Button variant="ghost" onClick={handleSkip} className="text-brand-charcoal hover:bg-brand-cream-light">
            I'll schedule gifts later
          </Button>
        </div>

        <p className="text-center text-xs text-brand-charcoal/60">
          * Required fields
        </p>
      </CardContent>
    </Card>
  );
};

export default GiftScheduleStep;
