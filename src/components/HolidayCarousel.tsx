
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
}

const holidays: Holiday[] = [
  {
    name: "Mother's Day",
    date: "May 12, 2025",
    callToAction: "Give Mom something that says 'thanks for not selling me to the circus'",
    description: "Show Mom some love",
    icon: Heart,
    color: "text-brand-gold"
  },
  {
    name: "Father's Day",
    date: "June 15, 2025",
    callToAction: "Get Dad something better than another tie he'll never wear",
    description: "Dad deserves the best",
    icon: Star,
    color: "text-brand-gold"
  },
  {
    name: "Valentine's Day",
    date: "February 14, 2025",
    callToAction: "Love is in the air... and on your calendar",
    description: "Spread the love",
    icon: Heart,
    color: "text-brand-gold"
  },
  {
    name: "Christmas",
    date: "December 25, 2025",
    callToAction: "Get on the nice list with the perfect gift",
    description: "Ho ho ho-ly amazing gifts",
    icon: TreePine,
    color: "text-brand-gold"
  },
  {
    name: "Halloween",
    date: "October 31, 2025",
    callToAction: "No tricks, just treats... and great gifts",
    description: "Spook-tacular surprises",
    icon: Ghost,
    color: "text-brand-gold"
  },
  {
    name: "Easter",
    date: "April 20, 2025",
    callToAction: "Some bunny is going to love this",
    description: "Hop into gift-giving",
    icon: Sparkles,
    color: "text-brand-gold"
  },
  {
    name: "Thanksgiving",
    date: "November 27, 2025",
    callToAction: "Turkey's temporary, great gifts are forever",
    description: "Give thanks with gifts",
    icon: Star,
    color: "text-brand-gold"
  },
  {
    name: "Fourth of July",
    date: "July 4, 2025",
    callToAction: "Declare independence from boring gifts",
    description: "Celebrate freedom and friendship",
    icon: Star,
    color: "text-brand-gold"
  },
  {
    name: "New Year's",
    date: "January 1, 2025",
    callToAction: "Resolution: be an amazing gift-giver",
    description: "Start the year right",
    icon: Sparkles,
    color: "text-brand-gold"
  },
  {
    name: "St. Patrick's Day",
    date: "March 17, 2025",
    callToAction: "Make them feel lucky with the perfect gift",
    description: "Lucky gifts for lucky people",
    icon: Clover,
    color: "text-brand-gold"
  },
  {
    name: "Back to School",
    date: "August 15, 2025",
    callToAction: "School supplies are basic - be brilliant instead",
    description: "Smart gifts for smart cookies",
    icon: Star,
    color: "text-brand-gold"
  },
  {
    name: "Graduation Season",
    date: "June 1, 2025",
    callToAction: "Give them something smarter than student loans",
    description: "Celebrate their achievement",
    icon: Star,
    color: "text-brand-gold"
  }
];

const HolidayCarousel: React.FC = () => {
  const handleScheduleGift = (holiday: Holiday) => {
    console.log(`Scheduling gift for ${holiday.name}`);
    // TODO: Implement gift scheduling modal
  };

  const handleAddRecipient = (holiday: Holiday) => {
    console.log(`Adding recipient for ${holiday.name}`);
    // TODO: Implement add recipient modal
  };

  // Filter holidays to show only upcoming ones for this year
  const getUpcomingHolidays = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    return holidays
      .map(holiday => ({
        ...holiday,
        // Parse the date and set to current year for comparison
        parsedDate: new Date(`${holiday.date.split(',')[0]}, ${currentYear}`)
      }))
      .filter(holiday => holiday.parsedDate >= today)
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  };

  const upcomingHolidays = getUpcomingHolidays();

  if (upcomingHolidays.length === 0) {
    return null; // Don't show the section if no upcoming holidays
  }

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
          {upcomingHolidays.map((holiday, index) => {
            const IconComponent = holiday.icon;
            return (
              <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                <Card className="bg-white border border-brand-cream-light hover:border-brand-gold/30 transition-all duration-200 shadow-sm hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-brand-cream rounded-lg">
                            <IconComponent className={`h-5 w-5 ${holiday.color}`} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-brand-charcoal text-lg">{holiday.name}</h4>
                            <Badge variant="outline" className="text-xs border-brand-gold/30 text-brand-charcoal/70 mt-1">
                              {holiday.date}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm text-brand-charcoal/80 font-medium leading-relaxed">
                          "{holiday.callToAction}"
                        </p>
                      </div>

                      <div className="flex flex-col space-y-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleScheduleGift(holiday)}
                          className="bg-brand-charcoal text-white hover:bg-brand-charcoal/90 transition-colors"
                        >
                          <Gift className="h-3 w-3 mr-2" />
                          Schedule Gift
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddRecipient(holiday)}
                          className="border-brand-charcoal/20 text-brand-charcoal hover:bg-brand-cream transition-colors"
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
        <CarouselPrevious className="hidden md:flex border-brand-charcoal/20 text-brand-charcoal hover:bg-brand-cream" />
        <CarouselNext className="hidden md:flex border-brand-charcoal/20 text-brand-charcoal hover:bg-brand-cream" />
      </Carousel>
    </div>
  );
};

export default HolidayCarousel;
