import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 23, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <p className="text-muted-foreground">We collect information you provide directly, including:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Account information:</strong> Email address and authentication details when you sign up</li>
              <li><strong>Portfolio data:</strong> Card collection data you upload (CSV files, manual entries)</li>
              <li><strong>Watchlist data:</strong> Cards and products you choose to track</li>
              <li><strong>Usage data:</strong> How you interact with the Service (pages visited, features used)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">We use your information to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Provide and improve the Service</li>
              <li>Generate portfolio analytics and personalized insights</li>
              <li>Match your collection against market price data</li>
              <li>Send service-related communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Data Storage & Security</h2>
            <p className="text-muted-foreground">Your data is stored securely using industry-standard encryption and access controls. We use Row Level Security to ensure your portfolio data is only accessible to you. We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Third-Party Services</h2>
            <p className="text-muted-foreground">We use third-party services to operate the platform:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Authentication providers:</strong> Google Sign-In (subject to Google's Privacy Policy)</li>
              <li><strong>Market data providers:</strong> For card pricing and market information</li>
              <li><strong>Hosting and infrastructure:</strong> For running and scaling the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Cookies & Local Storage</h2>
            <p className="text-muted-foreground">We use browser local storage to maintain your authentication session and store app preferences. We do not use third-party tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Your Rights</h2>
            <p className="text-muted-foreground">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Access and download your portfolio data</li>
              <li>Delete your account and all associated data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Data Retention</h2>
            <p className="text-muted-foreground">We retain your data for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, except where we are required to retain it by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Children's Privacy</h2>
            <p className="text-muted-foreground">The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Changes to This Policy</h2>
            <p className="text-muted-foreground">We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Contact</h2>
            <p className="text-muted-foreground">If you have questions about this Privacy Policy or your data, please reach out through our in-app feedback form.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
