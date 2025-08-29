import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
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
              Privacy Policy
            </h1>
            <p className="text-brand-charcoal/60">
              Effective Date: 08/23/25
            </p>
          </div>

          <div className="prose prose-lg max-w-none text-brand-charcoal">
            <p className="text-lg leading-relaxed mb-6">
              Unwrapt respects your privacy and is committed to protecting your personal information. 
              This Privacy Policy explains how we collect, use, and protect data when you use our 
              application and services.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                1. Information We Collect
              </h2>
              <p className="mb-4">
                When you sign in to Unwrapt with your Google account, we may collect the following information:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>Basic profile information (name, email address, profile picture) through Google Sign-In.</li>
                <li>Google Calendar event data via the calendar.readonly scope. This includes event titles, dates, times, and descriptions.</li>
              </ul>
              <p>
                We do not request access to modify, delete, or create events in your Google Calendar.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                2. How We Use Your Information
              </h2>
              <p className="mb-4">
                We use your information only to provide and improve our services, specifically to:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>Authenticate you and create your account in the app.</li>
                <li>Display your Google Calendar events inside the app to help sync schedules.</li>
                <li>Highlight important dates such as birthdays, anniversaries, and other events you have added to your calendar.</li>
              </ul>
              <p>
                We do not sell, rent, or share your personal data with third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                3. Data Storage and Security
              </h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Calendar data is accessed in real time via the Google API and is not permanently stored on our servers unless explicitly needed to provide the service.</li>
                <li>We implement reasonable security measures to protect your data from unauthorized access, disclosure, or misuse.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                4. Third-Party Services
              </h2>
              <p className="mb-4">
                Our application integrates with Google APIs for authentication and calendar access. 
                By using our app, you also agree to Google's Privacy Policy, available at:
              </p>
              <a 
                href="https://policies.google.com/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand-gold hover:text-brand-gold/80 underline"
              >
                https://policies.google.com/privacy
              </a>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                5. User Control and Choices
              </h2>
              <p className="mb-4">You can:</p>
              <ul className="list-disc list-inside space-y-2">
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
                <li>Stop using the app, in which case no new data will be accessed.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-charcoal mb-4">
                6. Children's Privacy
              </h2>
              <p>
                Our services are not directed toward individuals under the age of 13, and we do not 
                knowingly collect information from children.
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