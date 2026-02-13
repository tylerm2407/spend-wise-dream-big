import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 pt-6 pb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Terms of Service</h1>
      </header>

      <main className="px-6 pb-12 max-w-2xl mx-auto prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground text-sm">Last updated: February 7, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Cost Clarity ("the App"), you agree to be bound by these Terms of
          Service. If you do not agree to these terms, do not use the App.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Cost Clarity is a personal finance tracking application that helps users understand the
          real cost of their purchases through spending analysis, alternative suggestions, and
          goal tracking.
        </p>

        <h2>3. Account Registration</h2>
        <p>
          You must create an account to use Cost Clarity. You are responsible for maintaining the
          confidentiality of your account credentials and for all activities under your account.
          You must provide accurate and complete information.
        </p>

        <h2>4. Subscription & Payments</h2>
        <ul>
          <li>Cost Clarity offers a free 7-day trial period.</li>
          <li>After the trial, a premium subscription ($5/month) is required for continued access to all features.</li>
          <li>Subscriptions are billed monthly through Stripe.</li>
          <li>You may cancel your subscription at any time through the Settings page.</li>
          <li>Refunds are handled in accordance with applicable laws.</li>
        </ul>

        <h2>5. User Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the App for any unlawful purpose</li>
          <li>Attempt to gain unauthorized access to any part of the App</li>
          <li>Interfere with the proper working of the App</li>
          <li>Upload malicious content or viruses</li>
        </ul>

        <h2>6. Intellectual Property</h2>
        <p>
          The App and its original content, features, and functionality are owned by Cost Clarity
          and are protected by international copyright, trademark, and other intellectual property
          laws.
        </p>

        <h2>7. Disclaimer of Warranties</h2>
        <p>
          The App is provided "as is" without warranties of any kind. Cost Clarity does not guarantee
          that the App will be error-free or uninterrupted. Financial information provided by the
          App is for informational purposes only and should not be considered financial advice.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          Cost Clarity shall not be liable for any indirect, incidental, special, consequential, or
          punitive damages resulting from your use of the App, including any financial decisions
          made based on information provided by the App.
        </p>

        <h2>9. Account Deletion</h2>
        <p>
          You may delete your account at any time through the Settings page. Upon deletion, all
          your data will be permanently removed. Active subscriptions will be cancelled.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Continued use of the App after
          changes constitutes acceptance of the new terms.
        </p>

        <h2>11. Governing Law</h2>
        <p>
          These terms shall be governed by and construed in accordance with applicable laws,
          without regard to conflict of law principles.
        </p>

        <h2>12. Contact</h2>
        <p>
          For questions about these Terms of Service, please contact us through the app's
          Settings page.
        </p>
      </main>
    </div>
  );
}
