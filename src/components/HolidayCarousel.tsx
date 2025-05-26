import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Calendar, Gift, Heart, Star, Sparkles, TreePine, Ghost, Clover } from 'lucide-react';

interface Holiday {
  name: string;
  date: string;
  callToAction: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgGradient: string;
}

const holidays: Holiday[] = [
  {
    name: "Mother's Day",
    date: "May 12, 2025",
    callToAction: "Give Mom something that says 'thanks for not selling me to the circus'",
    description: "Show Mom some love",
    icon: Heart,
    color: "text-pink-600",
    bgGradient: "from-pink-50 to-rose-50"
  },
  {
    name: "Father's Day",
    date: "June 15, 2025",
    callToAction: "Get Dad something better than another tie he'll never wear",
    description: "Dad deserves the best",
    icon: Star,
    color: "text-blue-600",
    bgGradient: "from-blue-50 to-indigo-50"
  },
  {
    name: "Valentine's Day",
    date: "February 14, 2025",
    callToAction: "Love is in the air... and on your calendar",
    description: "Spread the love",
    icon: Heart,
    color: "text-red-600",
    bgGradient: "from-red-50 to-pink-50"
  },
  {
    name: "Christmas",
    date: "December 25, 2025",
    callToAction: "Get on the nice list with the perfect gift",
    description: "Ho ho ho-ly amazing gifts",
    icon: TreePine,
    color: "text-green-600",
    bgGradient: "from-green-50 to-emerald-50"
  },
  {
    name: "Halloween",
    date: "October 31, 2025",
    callToAction: "No tricks, just treats... and great gifts",
    description: "Spook-tacular surprises",
    icon: Ghost,
    color: "text-orange-600",
    bgGradient: "from-orange-50 to-amber-50"
  },
  {
    name: "Easter",
    date: "April 20, 2025",
    callToAction: "Some bunny is going to love this",
    description: "Hop into gift-giving",
    icon: Sparkles,
    color: "text-purple-600",
    bgGradient: "from-purple-50 to-violet-50"
  },
  {
    name: "Thanksgiving",
    date: "November 27, 2025",
    callToAction: "Turkey's temporary, great gifts are forever",
    description: "Give thanks with gifts",
    icon: Star,
    color: "text-amber-600",
    bgGradient: "from-amber-50 to-yellow-50"
  },
  {
    name: "Fourth of July",
    date: "July 4, 2025",
    callToAction: "Declare independence from boring gifts",
    description: "Celebrate freedom and friendship",
    icon: Star,
    color: "text-blue-700",
    bgGradient: "from-blue-50 to-red-50"
  },
  {
    name: "New Year's",
    date: "January 1, 2025",
    callToAction: "Resolution: be an amazing gift-giver",
    description: "Start the year right",
    icon: Sparkles,
    color: "text-gold-600",
    bgGradient: "from-yellow-50 to-gold-50"
  },
  {
    name: "St. Patrick's Day",
    date: "March 17, 2025",
    callToAction: "Make them feel lucky with the perfect gift",
    description: "Lucky gifts for lucky people",
    icon: Clover,
    color: "text-green-700",
    bgGradient: "from-green-50 to-lime-50"
  },
  {
    name: "Back to School",
    date: "August 15, 2025",
    callToAction: "School supplies are basic - be brilliant instead",
    description: "Smart gifts for smart cookies",
    icon: Star,
    color: "text-indigo-600",
    bgGradient: "from-indigo-50 to-blue-50"
  },
  {
    name: "Graduation Season",
    date: "June 1, 2025",
    callToAction: "Give them something smarter than student loans",
    description: "Celebrate their achievement",
    icon: Star,
    color: "text-purple-700",
    bgGradient: "from-purple-50 to-pink-50"
  }
];

const HolidayCarousel: React.FC = () => {
  const handleScheduleGift = (holiday: Holiday) => {
    // This would open a modal to schedule a gift for this holiday
    console.log(`Scheduling gift for ${holiday.name}`);
    // TODO: Implement gift scheduling modal
  };

  const handleAddRecipient = (holiday: Holiday) => {
    // This would open a modal to add a recipient for this holiday
    console.log(`Adding recipient for ${holiday.name}`);
    // TODO: Implement add recipient modal
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-brand-charcoal flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-brand-gold" />
            Upcoming Holidays & Celebrations
          </h3>
          <p className="text-brand-charcoal/70 text-sm">
            Never miss a special moment - pre-schedule gifts for upcoming holidays
          </p>
        </div>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {holidays.map((holiday, index) => {
            const IconComponent = holiday.icon;
            return (
              <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                <Card className={`bg-gradient-to-br ${holiday.bgGradient} border-none shadow-md hover:shadow-lg transition-shadow`}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <IconComponent className={`h-6 w-6 ${holiday.color}`} />
                          <h4 className="font-semibold text-brand-charcoal">{holiday.name}</h4>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {holiday.date}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm text-brand-charcoal/80 font-medium italic">
                          "{holiday.callToAction}"
                        </p>
                        <p className="text-xs text-brand-charcoal/60">
                          {holiday.description}
                        </p>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <Button
                          size="sm"
                          onClick={() => handleScheduleGift(holiday)}
                          className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90 text-xs"
                        >
                          <Gift className="h-3 w-3 mr-1" />
                          Schedule Gift
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddRecipient(holiday)}
                          className="border-brand-charcoal/20 text-brand-charcoal hover:bg-brand-cream-light text-xs"
                        >
                          Add Recipient
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </div>
  );
};

export default HolidayCarousel;
