import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Where do you deliver?",
    answer:
      "We currently deliver to all 50 US states. International shipping is on our roadmap for later this year.",
  },
  {
    question: "How do you match gifts to interests?",
    answer:
      "When you add a recipient, you select their interests (coffee, tea, wine, sweet treats, self care). We map those interests to curated product categories from our catalog of artisan-made goods. No algorithms, no Amazon. Every item is hand-selected by our team.",
  },
  {
    question: "What data do you access from my calendar?",
    answer:
      "We only read event titles and dates to detect birthdays, anniversaries, and special occasions. We never read email content, attendee lists, or event details. You can disconnect your calendar at any time from Settings.",
  },
  {
    question: "Can I preview gifts before they're sent?",
    answer:
      "Yes. VIP members receive a gift preview 14 days before each occasion. You can approve, swap, or skip any gift before it ships.",
  },
  {
    question: "What if I don't set any interests for a recipient?",
    answer:
      "We'll select from our 'universal favorites' collection: crowd-pleasing items like artisan candles, gourmet treats, and handcrafted goods that work for anyone. Adding interests helps us personalize further.",
  },
  {
    question: "Can I cancel my VIP subscription?",
    answer:
      "Absolutely. Cancel anytime from your Settings page. You'll keep VIP benefits until the end of your billing period. No questions asked.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-28 px-6 scroll-mt-20" style={{ backgroundColor: "#F8F1E6" }}>
      <div className="max-w-2xl mx-auto">
        <h2
          className="font-serif text-4xl md:text-5xl text-center mb-4 tracking-tight"
          style={{ color: "#8B7355" }}
        >
          Common Questions
        </h2>
        <p
          className="text-center text-lg mb-16 max-w-xl mx-auto"
          style={{ color: "#8B7355", opacity: 0.8 }}
        >
          Everything you need to know before getting started.
        </p>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-xl px-6 data-[state=open]:shadow-sm transition-shadow"
            >
              <AccordionTrigger
                className="text-left font-medium text-sm py-5 hover:no-underline"
                style={{ color: "#8B7355" }}
              >
                {faq.question}
              </AccordionTrigger>
              <AccordionContent
                className="text-sm leading-relaxed pb-5"
                style={{ color: "#8B7355", opacity: 0.8 }}
              >
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
