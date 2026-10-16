import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';

const TermsOfService = () => {
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
      <SEOHead title="Terms of Service" description="Unwrapt terms of service. Review our terms and conditions for using the automatic gift scheduling platform." canonical="https://unwrapt.io/terms" />
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
              Terms of Service
            </h1>
            <p className="text-brand-charcoal/60">
              Effective Date: 10/16/26
            </p>
          </div>

          <div className="prose prose-lg max-w-none text-brand-charcoal">
            <p className="text-lg leading-relaxed mb-6">
              Welcome to Unwrapt. By accessing or using our application and services, you agree to be bound by 
              these Terms of Service. Please read them carefully. If you do not agree to these terms, you may 
              not use our services.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                1. Use of Services
              </h2>
              <ul className="list-disc list-inside space-y-2">
                <li>You may use our services only for lawful purposes and in accordance with these Terms of Service.</li>
                <li>You agree not to misuse the services or help anyone else to do so.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                2. User Accounts
              </h2>
              <ul className="list-disc list-inside space-y-2">
                <li>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</li>
                <li>You agree to provide accurate and complete information when creating an account with us.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                3. Data Access
              </h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Our application may request access to your Google account information, including profile details and Google Calendar event data (read-only).</li>
                <li>To schedule and send gifts, you will provide us with information about your gift recipients (such as name, address, and occasion dates). You confirm you have the right to share this information with us for the purpose of sending them a gift.</li>
                <li>We will only use this information as described in our Privacy Policy.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                4. AI-Assisted Recommendations and Automated Gift Purchases
              </h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Unwrapt's assistant, Thea, uses artificial intelligence to suggest and, where you enable it, select gifts based on information you provide. AI-generated suggestions are not guaranteed to be accurate, available, or appropriate for every recipient, and you're responsible for reviewing recipient details, delivery dates, and budgets before a gift ships.</li>
                <li>If you enable gift automation and set an auto-approval amount, Thea is authorized to select a gift and complete the purchase on your behalf - charging your saved payment method or gift wallet - without further confirmation from you, for any gift at or under that amount. You can change or disable this at any time in Settings; it does not apply retroactively to gifts already purchased.</li>
                <li>You are responsible for keeping your auto-approval settings, budget, and payment method up to date and for reviewing gifts flagged as needing your approval in a timely manner.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                5. Payments, Subscriptions, and Gift Wallet
              </h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Paid plans (e.g. VIP) are billed on a recurring basis through our payment processor, Stripe, until you cancel. You can manage or cancel your subscription at any time from Settings; cancellation takes effect at the end of the current billing period unless stated otherwise.</li>
                <li>If you add funds to your gift wallet or enable auto-reload, you authorize us to charge your saved payment method for the amounts and thresholds you set. Wallet funds are used solely to pay for gifts you schedule and are non-transferable.</li>
                <li>Gift prices reflect the actual cost of the item; we do not mark up the price of gifts purchased through the app.</li>
                <li>Refunds, where applicable, are issued at our discretion or as required by law. Contact us (below) if you believe a charge was made in error.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                6. Gift Sourcing and Fulfillment
              </h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Gifts purchased through Unwrapt are sourced, packaged, and shipped through third-party fulfillment partners. Delivery timing, packaging, and item availability are subject to that partner's processes and shipping carriers.</li>
                <li>We'll do our best to help resolve delivery issues, but we're not responsible for delays, damage, or losses caused by a shipping carrier or fulfillment partner once an order has been placed.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                7. Intellectual Property
              </h2>
              <ul className="list-disc list-inside space-y-2">
                <li>All content, trademarks, and other intellectual property related to our services remain the property of Unwrapt or its licensors.</li>
                <li>You may not copy, modify, distribute, or create derivative works based on our content without prior written consent.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                8. Termination
              </h2>
              <p>
                We reserve the right to suspend or terminate your access to our services at any time if you 
                violate these Terms of Service or engage in harmful behavior.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                9. Disclaimer of Warranties
              </h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Our services are provided 'as is' and 'as available' without warranties of any kind, either express or implied.</li>
                <li>We do not guarantee that the services will be uninterrupted, error-free, or secure.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                10. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, Unwrapt and its affiliates shall not be liable for any
                indirect, incidental, or consequential damages arising from your use of our services, including
                damages arising from an AI-generated recommendation, an automated gift purchase made under
                settings you configured, or a third-party fulfillment or shipping issue.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                11. Changes to These Terms
              </h2>
              <p>
                We may update these Terms of Service from time to time. Any changes will be posted at this URL 
                with an updated effective date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                12. Governing Law
              </h2>
              <p>
                These Terms of Service shall be governed by and construed in accordance with the laws of 
                [Insert Jurisdiction], without regard to conflict of law principles.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                13. Contact Us
              </h2>
              <p className="mb-2">
                If you have questions about these Terms of Service, please contact us at:
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

export default TermsOfService;