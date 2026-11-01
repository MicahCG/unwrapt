import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';

const Privacy = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Force immediate scroll to top
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-primary">
      <SEOHead title="Privacy Policy" description="Unwrapt privacy policy. Learn how we protect your data and handle personal information." canonical="https://unwrapt.io/privacy" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-elegant p-8 md:p-12">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-4 text-brand-charcoal hover:bg-brand-cream-light"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <h1 className="text-4xl font-bold text-brand-charcoal mb-2">
              Privacy Policy
            </h1>
            <p className="text-brand-charcoal/60">
              Effective Date: 10/16/26
            </p>
          </div>

          <div className="prose prose-lg max-w-none text-brand-charcoal">
            <p className="text-lg leading-relaxed mb-6">
              Unwrapt is operated by KinGira LLC, a Texas limited liability company ("Unwrapt," "Company,"
              "we," "us," or "our"). We respect your privacy and are committed to protecting your personal
              information. This Privacy Policy explains how we collect, use, and protect data when you use
              our application and services, including our AI gifting assistant, Thea.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                1. Information We Collect
              </h2>
              <p className="mb-4">
                <strong>Information about you.</strong> When you sign in to Unwrapt with your Google account, we collect:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>Basic profile information (name, email address, profile picture) through Google Sign-In.</li>
                <li>Google Calendar event data via the calendar.readonly scope, if you connect it. This includes event titles, dates, times, and descriptions. We do not request access to modify, delete, or create events in your Google Calendar.</li>
                <li>Account preferences you set in the app, such as your default gift budget, how much Thea can spend without asking you first, and your notification preferences.</li>
                <li>Payment information when you subscribe to VIP or add funds to your gift wallet. We do not store your full card number - this is handled directly by our payment processor, Stripe. We do store a reference to your saved payment method so we can process wallet reloads and subscription renewals you've authorized.</li>
              </ul>
              <p className="mb-4">
                <strong>Birthdays and anniversaries from your phone (optional).</strong> If you choose to, you can let Thea find birthdays and anniversaries from your iPhone Contacts or Apple Calendar, or by uploading a contacts (.vcf) or calendar (.ics) file. This is read-only - we never create, edit, or delete anything in your contacts or calendar - and only the person's name and the date of the birthday or anniversary are read; we do not read phone numbers, emails, addresses, or other contact details. This reading and matching happens on your device, not on our servers, and nothing is sent to us or stored until you review the people found and choose which ones to save as recipients.
              </p>
              <p className="mb-4">
                <strong>Information about the people you're gifting to.</strong> To schedule and send a gift, we collect information you provide about your gift recipients, which may include their name, shipping address, birthday or anniversary, relationship to you, interests, and (optionally) their email or phone number. This information is provided by you, not collected directly from the recipient, and is used solely to plan, personalize, and deliver their gift.
              </p>
              <p>
                <strong>Usage information.</strong> We collect basic product-usage data (such as which features you use and when) to understand how the app is used and to improve it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                2. How We Use Your Information
              </h2>
              <p className="mb-4">
                We use your information to provide and improve our services, specifically to:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>Authenticate you and create your account in the app.</li>
                <li>Display your Google Calendar events inside the app to help sync schedules, and highlight important dates such as birthdays and anniversaries.</li>
                <li>If you choose to use it, read birthdays and anniversaries from your iPhone Contacts, Apple Calendar, or an uploaded contacts/calendar file, so you can quickly add the people you want Thea to help you gift for.</li>
                <li>Curate, personalize, and recommend gifts for the recipients you tell us about.</li>
                <li>Process payments, manage your subscription, and process gift wallet transactions.</li>
                <li>Source, order, and ship gifts through our fulfillment partner.</li>
                <li>Send you service emails (such as order and payment confirmations) and, if you leave them on in Settings, optional emails like occasion reminders and gift idea tips.</li>
                <li>Improve and troubleshoot the app.</li>
              </ul>
              <p>
                We do not sell your personal data. We do not share it with third parties for their own marketing purposes. We do share limited information with service providers where it's necessary to provide the service - for example, sharing a recipient's name and shipping address with our gift-fulfillment partner so your gift can be delivered. Section 4 below lists these providers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                3. Thea, Our AI Assistant, and Automated Gift Selection
              </h2>
              <p className="mb-4">
                Thea is an AI-powered assistant built on a third-party large language model. When you chat with Thea or ask her to find a gift, relevant information - such as the recipient's interests, occasion, and your budget - is sent to our AI provider to generate a response or a gift recommendation. We do not use your conversations with Thea to train the underlying AI model.
              </p>
              <p className="mb-4">
                <strong>Automated purchases.</strong> If you turn on automation for a recipient and set an auto-approval amount ("How much Thea can approve alone" in Settings), Thea may select a specific gift and complete the purchase on your behalf - using your saved payment method or gift wallet and the recipient's address - without asking you first, as long as the gift's cost is at or under the amount you set. Gifts above that amount, or if you've set Thea to always ask first, will wait for your approval before anything is purchased or charged. You can change this setting, or turn automation off entirely, at any time in Settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                4. Data Storage, Security, and Service Providers
              </h2>
              <p className="mb-4">
                Account, recipient, gift, and payment-related data you provide is stored in our database for as long as your account is active, so we can keep your gift plans, history, and preferences available to you. Google Calendar data is accessed in real time via the Google API and is not separately stored beyond what's needed to display it in the app. Your iPhone Contacts and Apple Calendar are read and processed only on your device - this data is never transmitted to or stored on our servers, except for the specific names and dates of the recipients you choose to save, which are then stored like any other recipient information.
              </p>
              <p className="mb-4">We work with the following service providers, each of which only receives the data needed to perform its function for us:</p>
              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>
                  <strong>Google</strong> - sign-in and, if connected, calendar data. By using Google Sign-In, you also agree to{' '}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-gold hover:text-brand-gold/80 underline"
                  >
                    Google's Privacy Policy
                  </a>.
                </li>
                <li><strong>Stripe</strong> - payment processing for subscriptions and wallet funding. Stripe handles your card details directly; we never see or store your full card number.</li>
                <li><strong>Goody</strong> (our gift-fulfillment partner) - receives the recipient's name and shipping address, and the gift selected, in order to source and ship the gift.</li>
                <li>Our AI provider - receives the information described in Section 3 to power Thea.</li>
                <li>Our transactional email provider - sends account, order, and (if enabled) reminder/tip emails on our behalf.</li>
                <li>Our cloud database and hosting infrastructure - stores app data securely and runs the application.</li>
              </ul>
              <p>
                We use reasonable administrative, technical, and physical security measures to protect your data from unauthorized access, disclosure, or misuse. No method of storage or transmission is 100% secure, and we can't guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                5. User Control and Choices
              </h2>
              <p className="mb-4">You can:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Turn off optional emails (occasion reminders, gift tips, savings alerts) at any time in Settings.</li>
                <li>Turn off gift automation, or change how much Thea can approve without asking, at any time in Settings.</li>
                <li>Revoke the app's access to your iPhone Contacts or Calendar at any time in your iPhone's Settings app, under Settings &gt; Unwrapt.</li>
                <li>
                  Revoke the app's access to your Google Account at any time via your Google Account Permissions:
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-gold hover:text-brand-gold/80 underline ml-1"
                  >
                    https://myaccount.google.com/permissions
                  </a>
                </li>
                <li>Request deletion of your account and associated data at any time from Settings. Once requested, we permanently delete your account data, including your recipient records, gift history, and payment references, within 24 hours (any active subscription is also cancelled as part of this process).</li>
                <li>Stop using the app, in which case no new data will be collected.</li>
                <li>Contact us (below) with any other request regarding your data.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                6. Children's Privacy
              </h2>
              <p>
                Our services are not directed toward individuals under the age of 13, and we do not knowingly
                allow anyone under 13 to create an account or use the app. A gift recipient you tell us about
                (for example, a child you're buying a birthday gift for) may be a minor - that information is
                provided by you, the adult account holder, solely to plan and deliver a gift, and is not collected
                from or directed at the child.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                7. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. Any changes will be posted at
                this URL with an updated effective date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                8. Contact Us
              </h2>
              <p className="mb-2">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p>
                Email: <a 
                  href="mailto:team@unwrapt.io" 
                  className="text-brand-gold hover:text-brand-gold/80 underline"
                >
                  team@unwrapt.io
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;