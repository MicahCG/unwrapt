export type Faq = {
  question: string;
  answer: string;
};

/**
 * Public answers checked against the app and the published Terms and Privacy Policy.
 * Do not add a FAQPage JSON-LD block from this list. Google limits that rich result,
 * and these answers are ordinary page content.
 */
export const FAQS: Faq[] = [
  {
    question: "Is there a service that remembers birthdays and helps send gifts?",
    answer:
      "Yes. Unwrapt is a personal gifting service from KinGira LLC. You save the people and dates you care about. Thea, the assistant, suggests a gift. By default you approve it before anything is purchased, and the gift ships to a street address in the United States.",
  },
  {
    question: "How much does a personal gifting service cost?",
    answer:
      "Unwrapt VIP is $4.99 per month on the web. That charge is the membership, not the gift. Each gift has its own price, and that price is shown before you approve the purchase. The Terms say gift prices are the cost of the item and are not marked up. The iOS app shows Apple's price before you subscribe, and that price can differ from the web price.",
  },
  {
    question: "Where do you deliver?",
    answer:
      "Gifts ship within the United States to a street address you save for that person. Unwrapt does not offer address-free gifting, and it does not publish an international delivery service. A gift is not sent until the street, city, state, and ZIP code are on file.",
  },
  {
    question: "Do I approve the gift before it is purchased?",
    answer:
      "Yes, by default. New accounts are set to ask first: Thea recommends a gift and waits for your approval. In Settings you can instead let her approve gifts under $100, or under $250. You see the price before that purchase. This is not a promise that a carrier will deliver on the morning of the occasion.",
  },
  {
    question: "What does Thea actually do?",
    answer:
      "Thea keeps the occasions you save and suggests gifts from the catalog. Orders are placed through Goody, the fulfillment partner named in the Privacy Policy. A suggestion can be unavailable or not quite right, and you can skip it. Thea does not guarantee that a recommendation will suit every person.",
  },
  {
    question: "Can I use Unwrapt without a paid membership?",
    answer:
      "You can sign in and introduce people during setup. The gift inbox opens after you subscribe to VIP. There is not a separate free plan that keeps that inbox available. Older pages and emails that describe a free plan for three recipients, or a $24.99 price, do not match the membership in the app today.",
  },
  {
    question: "Can I cancel VIP?",
    answer:
      "You can cancel from Settings. The Terms say a web subscription keeps running until you cancel, and cancellation takes effect at the end of the current billing period. If you subscribed in the iOS app, Apple bills it and you manage or cancel it with your Apple ID. Refunds, where they apply, are described in the Terms rather than promised here.",
  },
  {
    question: "Do you read my calendar or contacts?",
    answer:
      "Only if you choose that option. You can type dates in yourself. If you connect Google Calendar, access is read-only and, as the Privacy Policy describes, can include event titles, dates, times, and descriptions. On iPhone, contacts or Apple Calendar can be read on your device; only the names and dates you choose to save are stored.",
  },
  {
    question: "What if I do not have someone's address yet?",
    answer:
      "Save the person and the date anyway. You can add the street address later. Unwrapt still needs that address before a gift can ship, so add it before you approve the send.",
  },
];
