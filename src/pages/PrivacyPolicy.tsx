import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 pt-6 pb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Privacy Policy</h1>
      </header>

      <main className="px-6 pb-12 max-w-2xl mx-auto prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground text-sm">Last updated: February 7, 2026</p>

        <h2>1. Information We Collect</h2>
        <p>
          Cost Clarity collects the following information to provide our services:
        </p>
        <ul>
          <li><strong>Account Information:</strong> Email address and display name when you create an account.</li>
          <li><strong>Financial Data:</strong> Purchase amounts, categories, and item names that you manually enter or import.</li>
          <li><strong>Profile Preferences:</strong> Income, hourly wage, zip code, and budget settings you configure.</li>
          <li><strong>Usage Data:</strong> App interaction data to improve our services.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide spending insights and alternative suggestions</li>
          <li>Track your financial goals and progress</li>
          <li>Send budget alerts and notifications you've opted into</li>
          <li>Process subscription payments</li>
          <li>Improve our services</li>
        </ul>

        <h2>3. Data Storage & Security</h2>
        <p>
          Your data is stored securely using industry-standard encryption. We use Supabase for our
          backend infrastructure, which provides enterprise-grade security including Row Level
          Security (RLS) to ensure you can only access your own data.
        </p>

        <h2>4. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul>
          <li><strong>Stripe:</strong> For payment processing. Stripe's privacy policy applies to payment data.</li>
          <li><strong>Google:</strong> For optional Google Sign-In authentication.</li>
          <li><strong>Apple:</strong> For optional Sign in with Apple authentication.</li>
        </ul>

        <h2>5. Data Sharing</h2>
        <p>
          We do not sell, rent, or share your personal financial data with third parties for
          marketing purposes. Data is only shared with service providers necessary to operate
          the app (payment processing, authentication).
        </p>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Export all your data at any time (available in Settings)</li>
          <li>Delete your account and all associated data</li>
          <li>Update or correct your personal information</li>
          <li>Opt out of non-essential notifications</li>
        </ul>

        <h2>7. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active. When you delete your account,
          all associated data is permanently removed within 30 days.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          Cost Clarity is not intended for children under 13. We do not knowingly collect personal
          information from children under 13.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes
          by posting the new policy on this page and updating the "Last updated" date.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us through the app's
          Settings page.
        </p>
      </main>
    </div>
  );
}
