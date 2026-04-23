import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 23, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">By accessing or using PokeIQ ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p className="text-muted-foreground">PokeIQ provides portfolio analytics, market data, and educational tools for Pokémon Trading Card Game collectors. The Service is for informational purposes only and does not constitute financial advice.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. User Accounts</h2>
            <p className="text-muted-foreground">You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate information when creating an account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
            <p className="text-muted-foreground">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Scrape, crawl, or use automated tools to extract data from the Service</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Resell or redistribute data obtained from the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Intellectual Property</h2>
            <p className="text-muted-foreground">All content, features, and functionality of the Service are owned by PokeIQ and are protected by copyright and other intellectual property laws. Pokémon and related marks are trademarks of Nintendo, Creatures Inc., and GAME FREAK inc.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Data & Pricing Disclaimer</h2>
            <p className="text-muted-foreground">Market prices, analytics, and recommendations provided by PokeIQ are sourced from third-party providers and are for informational purposes only. We do not guarantee the accuracy, completeness, or timeliness of any data. Buying and selling decisions are made at your own risk.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">To the maximum extent permitted by law, PokeIQ shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the Service, including but not limited to financial losses from trading decisions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Termination</h2>
            <p className="text-muted-foreground">We reserve the right to suspend or terminate your access to the Service at any time, with or without cause, and with or without notice.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Changes to Terms</h2>
            <p className="text-muted-foreground">We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Contact</h2>
            <p className="text-muted-foreground">If you have questions about these Terms, please reach out through our in-app feedback form.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
