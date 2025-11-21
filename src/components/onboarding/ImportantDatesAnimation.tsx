import { useState, useEffect } from "react";
import { Calendar, Cake } from "lucide-react";
import { format } from "date-fns";

interface DateEvent {
  personName: string;
  type: "birthday" | "anniversary";
  date: string;
}

interface ImportantDatesAnimationProps {
  events: DateEvent[];
  onComplete: () => void;
}

export const ImportantDatesAnimation = ({ events, onComplete }: ImportantDatesAnimationProps) => {
  const [visibleCount, setVisibleCount] = useState(0);
  const displayedEvents = events.slice(0, 3); // Show first 3 events
  const remainingCount = Math.max(0, events.length - 3);

  useEffect(() => {
    // Animate events appearing one by one
    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= displayedEvents.length) {
          clearInterval(interval);
          // Wait 2 seconds after all are visible, then complete
          setTimeout(() => onComplete(), 2000);
          return prev;
        }
        return prev + 1;
      });
    }, 300); // Show each event 300ms apart

    return () => clearInterval(interval);
  }, [displayedEvents.length, onComplete]);

  return (
    <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="text-center mb-8">
          <p className="text-[#1A1A1A]/60 font-medium">Step 1 of 3</p>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-[#E4DCD2]">
          {/* Icon and title */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-[#EFE7DD] rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-[#1A1A1A]" />
            </div>
            <h1 className="font-display text-4xl text-[#1A1A1A] mb-2">
              We Found {events.length} Important Dates!
            </h1>
            <p className="text-[#1A1A1A]/60">Who should we start with?</p>
          </div>

          {/* Animated event list */}
          <div className="space-y-4">
            {displayedEvents.map((event, index) => (
              <div
                key={index}
                className={`
                  bg-[#FAF8F3] border-2 border-[#E4DCD2] rounded-xl p-4
                  flex items-center justify-between
                  transition-all duration-500 ease-out
                  ${
                    index < visibleCount
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }
                `}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <Cake className="w-5 h-5 text-[#D2B887]" />
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">
                      {event.personName}'s
                    </p>
                    <p className="text-sm text-[#1A1A1A]/70 capitalize">
                      {event.type}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#1A1A1A]">
                    {format(new Date(event.date), "MMM d")}
                  </p>
                  <p className="text-sm text-[#1A1A1A]/70">
                    {format(new Date(event.date), "yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Remaining count */}
          {remainingCount > 0 && visibleCount >= displayedEvents.length && (
            <p className="text-center mt-6 text-[#1A1A1A]/60 animate-fade-in">
              ...and {remainingCount} more dates in your calendar
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
