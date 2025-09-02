import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Ensure we scroll to top after the component mounts and renders
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-primary">
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
              Effective Date: 08/23/25
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
                <li>We will only use this information as described in our Privacy Policy.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                4. Intellectual Property
              </h2>
              <ul className="list-disc list-inside space-y-2">
                <li>All content, trademarks, and other intellectual property related to our services remain the property of Unwrapt or its licensors.</li>
                <li>You may not copy, modify, distribute, or create derivative works based on our content without prior written consent.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                5. Termination
              </h2>
              <p>
                We reserve the right to suspend or terminate your access to our services at any time if you 
                violate these Terms of Service or engage in harmful behavior.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                6. Disclaimer of Warranties
              </h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Our services are provided 'as is' and 'as available' without warranties of any kind, either express or implied.</li>
                <li>We do not guarantee that the services will be uninterrupted, error-free, or secure.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                7. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, Unwrapt and its affiliates shall not be liable for any 
                indirect, incidental, or consequential damages arising from your use of our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                8. Changes to These Terms
              </h2>
              <p>
                We may update these Terms of Service from time to time. Any changes will be posted at this URL 
                with an updated effective date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                9. Governing Law
              </h2>
              <p>
                These Terms of Service shall be governed by and construed in accordance with the laws of 
                [Insert Jurisdiction], without regard to conflict of law principles.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                10. Contact Us
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