
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Calendar, Gift, Heart, Star, Sparkles, TreePine, Ghost, Clover } from 'lucide-react';
import RecipientSelectionModal from './RecipientSelectionModal';
import ScheduleGiftModal from './ScheduleGiftModal';

interface Holiday {
  name: string;
  date: string;
  callToAction: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  giftType?: string;
  priceRange?: string;
}

const holidays: Holiday[] = [
  {
    name: "Mother's Day",
    date: "May 12, 2025",
    callToAction: "Give Mom something that says 'thanks for not selling me to the circus'",
    description: "Show Mom some love",
    icon: Heart,
    color: "text-brand-gold",
    giftType: "Bath & Body",
    priceRange: "$50-$100"
  },
  {
    name: "Father's Day",
    date: "June 15, 2025",
    callToAction: "Get Dad something better than another tie he'll never wear",
    description: "Dad deserves the best",
    icon: Star,
    color: "text-brand-gold",
    giftType: "Coffee",
    priceRange: "$25-$50"
  },
  {
    name: "Valentine's Day",
    date: "February 14, 2025",
    callToAction: "Love is in the air... and on your calendar",
    description: "Spread the love",
    icon: Heart,
    color: "text-brand-gold",
    giftType: "Candles",
    priceRange: "$25-$50"
  },
  {
    name: "Christmas",
    date: "December 25, 2025",
    callToAction: "Get on the nice list with the perfect gift",
    description: "Ho ho ho-ly amazing gifts",
    icon: TreePine,
    color: "text-brand-gold",
    giftType: "Candles",
    priceRange: "$50-$100"
  },
  {
    name: "Halloween",
    date: "October 31, 2025",
    callToAction: "No tricks, just treats... and great gifts",
    description: "Spook-tacular surprises",
    icon: Ghost,
    color: "text-brand-gold",
    giftType: "Candles",
    priceRange: "$25-$50"
  },
  {
    name: "Easter",
    date: "April 20, 2025",
    callToAction: "Some bunny is going to love this",
    description: "Hop into gift-giving",
    icon: Sparkles,
    color: "text-brand-gold",
    giftType: "Bath & Body",
    priceRange: "$25-$50"
  },
  {
    name: "Thanksgiving",
    date: "November 27, 2025",
    callToAction: "Turkey's temporary, great gifts are forever",
    description: "Give thanks with gifts",
    icon: Star,
    color: "text-brand-gold",
    giftType: "Candles",
    priceRange: "$50-$100"
  },
  {
    name: "Fourth of July",
    date: "July 4, 2025",
    callToAction: "Declare independence from boring gifts",
    description: "Celebrate freedom and friendship",
    icon: Star,
    color: "text-brand-gold",
    giftType: "Bath & Body",
    priceRange: "$25-$50"
  },
  {
    name: "New Year's",
    date: "January 1, 2025",
    callToAction: "Resolution: be an amazing gift-giver",
    description: "Start the year right",
    icon: Sparkles,
    color: "text-brand-gold",
    giftType: "Candles",
    priceRange: "$50-$100"
  },
  {
    name: "St. Patrick's Day",
    date: "March 17, 2025",
    callToAction: "Make them feel lucky with the perfect gift",
    description: "Lucky gifts for lucky people",
    icon: Clover,
    color: "text-brand-gold",
    giftType: "Coffee",
    priceRange: "$25-$50"
  },
  {
    name: "Back to School",
    date: "August 15, 2025",
    callToAction: "School supplies are basic - be brilliant instead",
    description: "Smart gifts for smart cookies",
    icon: Star,
    color: "text-brand-gold",
    giftType: "Coffee",
    priceRange: "$25-$50"
  },
  {
    name: "Graduation Season",
    date: "June 1, 2025",
    callToAction: "Give them something smarter than student loans",
    description: "Celebrate their achievement",
    icon: Star,
    color: "text-brand-gold",
    giftType: "Candles",
    priceRange: "$50-$100"
  }
];

const HolidayCarousel: React.FC = () => {
  const [showRecipientSelection, setShowRecipientSelection] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState(null);

  const handleScheduleGift = (holiday: Holiday) => {
    console.log(`Scheduling gift for ${holiday.name}`);
    setSelectedHoliday(holiday);
    setShowRecipientSelection(true);
  };

  const handleRecipientSelected = (recipient: any) => {
    setSelectedRecipient(recipient);
    setShowRecipientSelection(false);
  };

  const handleCloseScheduleModal = () => {
    setSelectedRecipient(null);
    setSelectedHoliday(null);
  };

  // Filter holidays to show only upcoming ones for the current year
  const getUpcomingHolidays = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    return holidays
      .map(holiday => {
        // Parse the date correctly - extract month and day from the original date
        const [monthDay, year] = holiday.date.split(', ');
        const holidayThisYear = new Date(`${monthDay}, ${currentYear}`);
        
        return {
          ...holiday,
          parsedDate: holidayThisYear
        };
      })
      .filter(holiday => holiday.parsedDate >= today)
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  };

  const upcomingHolidays = getUpcomingHolidays();

  if (upcomingHolidays.length === 0) {
    return null; // Don't show the section if no upcoming holidays
  }

  const formatDate = (dateString: string) => {
    const [monthDay] = dateString.split(', ');
    return monthDay;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Calendar className="h-5 w-5 text-brand-gold" />
        <div>
          <h3 className="text-xl font-semibold text-brand-charcoal">
            Upcoming Holidays & Celebrations
          </h3>
          <p className="text-brand-charcoal/60 text-sm">
            Never miss a special moment - pre-schedule gifts for upcoming holidays
          </p>
        </div>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {upcomingHolidays.map((holiday, index) => {
            const IconComponent = holiday.icon;
            return (
              <CarouselItem key={index} className="pl-3 basis-full md:basis-1/2 lg:basis-1/3">
                <Card className="bg-white border border-gray-100 hover:border-brand-gold/20 transition-all duration-200 shadow-sm hover:shadow-md group">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header with icon and title */}
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-brand-gold" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-brand-charcoal text-lg leading-tight">
                            {holiday.name}
                          </h4>
                          <p className="text-sm text-brand-gold font-medium">
                            {formatDate(holiday.date)}
                          </p>
                        </div>
                      </div>

                      {/* Call to action */}
                      <div className="bg-brand-cream/30 rounded-lg p-3">
                        <p className="text-sm text-brand-charcoal/80 leading-relaxed">
                          {holiday.callToAction}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          onClick={() => handleScheduleGift(holiday)}
                          className="w-full bg-brand-charcoal text-white hover:bg-brand-charcoal/90 transition-colors h-9"
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          Choose Person & Schedule Gift
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-4 border-brand-charcoal/10 text-brand-charcoal hover:bg-brand-cream/50" />
        <CarouselNext className="hidden md:flex -right-4 border-brand-charcoal/10 text-brand-charcoal hover:bg-brand-cream/50" />
      </Carousel>

      {/* Recipient Selection Modal */}
      {showRecipientSelection && selectedHoliday && (
        <RecipientSelectionModal
          isOpen={showRecipientSelection}
          onClose={() => {
            setShowRecipientSelection(false);
            setSelectedHoliday(null);
          }}
          onRecipientSelected={handleRecipientSelected}
        />
      )}

      {/* Schedule Gift Modal with Holiday Prepopulation */}
      {selectedRecipient && selectedHoliday && (
        <HolidayScheduleGiftModal
          recipient={selectedRecipient}
          holiday={selectedHoliday}
          isOpen={!!selectedRecipient}
          onClose={handleCloseScheduleModal}
        />
      )}
    </div>
  );
};

// Create a wrapper component for ScheduleGiftModal that prepopulates holiday data
const HolidayScheduleGiftModal: React.FC<{
  recipient: any;
  holiday: Holiday;
  isOpen: boolean;
  onClose: () => void;
}> = ({ recipient, holiday, isOpen, onClose }) => {
  const [formData, setFormData] = React.useState({
    occasion: holiday.name,
    occasion_date: holiday.date.replace(', 2025', ', ' + new Date().getFullYear()),
    gift_type: holiday.giftType || '',
    price_range: holiday.priceRange || '',
    gift_description: `Perfect ${holiday.name.toLowerCase()} gift`,
    delivery_date: ''
  });

  // Use the existing ScheduleGiftModal but with prepopulated data
  return (
    <ScheduleGiftModal
      recipient={{
        ...recipient,
        _holidayPreset: formData
      }}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};

export default HolidayCarousel;
