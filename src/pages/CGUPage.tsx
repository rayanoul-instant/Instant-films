import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function CGUPage() {
  usePageMeta('Terms of Use - Instant Films');
  return (
    <Layout>
      <div className="container max-w-2xl px-4 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="font-display text-3xl font-bold mb-2">Terms of use</h1>
        <p className="text-xs text-muted-foreground mb-8">Effective January 1, 2025</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">1. Purpose</h2>
            <p>
              These Terms of Use govern access to and use of the Instant Films service, a short film
              streaming platform accessible at <span className="text-primary">instant-films.com</span>.
            </p>
            <p>
              By accessing the website, users unconditionally accept these Terms of Use.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">2. Access to the service</h2>
            <p>
              Access to the service is free. Certain features (reviews, lists, messaging) require
              creating a user account. Users agree to provide accurate information upon registration
              and to keep their credentials confidential.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">3. Use of the service</h2>
            <p>Users agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Not publish illegal, offensive, defamatory, or third-party rights-infringing content;</li>
              <li>Not attempt to circumvent the website's security measures;</li>
              <li>Not use the service for commercial purposes without prior authorization;</li>
              <li>Respect the copyrights of the works made available.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">4. User-generated content</h2>
            <p>
              Reviews and comments posted by users are their sole responsibility. Instant Films reserves
              the right to remove any content that violates these Terms or applicable law, without notice.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">5. Intellectual property</h2>
            <p>
              Films available on the platform are the property of their respective authors.
              Any unauthorized reproduction, downloading, or distribution is strictly prohibited.
              The interface, design, and graphic elements of the site are the property of Instant Films.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">6. Suspension and termination</h2>
            <p>
              Instant Films reserves the right to suspend or delete a user account in the event of
              non-compliance with these Terms, without compensation or prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">7. Limitation of liability</h2>
            <p>
              Instant Films does not guarantee permanent availability of the service. Instant Films
              cannot be held liable for any service interruption, data loss, or indirect damages
              arising from use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">8. Amendments</h2>
            <p>
              Instant Films reserves the right to modify these Terms at any time. Users will be notified
              of any material changes. Continued use of the service constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">9. Applicable law</h2>
            <p>
              These Terms are governed by French law. In the event of a dispute, the parties will
              first seek an amicable resolution before resorting to legal proceedings before the
              competent courts of France.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">10. Contact</h2>
            <p>
              For any questions regarding these Terms:{' '}
              <a href="mailto:contact@instant-films.com" className="text-primary hover:underline">
                contact@instant-films.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
