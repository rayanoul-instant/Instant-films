import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function PolitiqueConfidentialitePage() {
  usePageMeta('Privacy Policy - Instant Films');
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

        <h1 className="font-display text-3xl font-bold mb-2">Privacy policy</h1>
        <p className="text-xs text-muted-foreground mb-8">Last updated: January 1, 2025</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">1. Data controller</h2>
            <p>
              The controller responsible for personal data collected on Instant Films is Rayan Oulmidi.
              Contact:{' '}
              <a href="mailto:contact@instant-films.com" className="text-primary hover:underline">
                contact@instant-films.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">2. Data collected</h2>
            <p>We collect the following data:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Account data</strong>: email address, username (upon registration);</li>
              <li><strong className="text-foreground">Usage data</strong>: films watched, reviews posted, lists created;</li>
              <li><strong className="text-foreground">Technical cookies</strong>: strictly necessary for the service to function.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">3. Purposes</h2>
            <p>Your data is used to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Manage your account and authentication;</li>
              <li>Personalise your experience on the platform;</li>
              <li>Enable communication between users (internal messaging);</li>
              <li>Improve the service and its features;</li>
              <li>Comply with our legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">4. Legal basis</h2>
            <p>
              Processing of your data is based on your consent (Art. 6.1.a GDPR) and on the performance
              of the contract established when you create your account (Art. 6.1.b GDPR).
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">5. Retention</h2>
            <p>
              Your data is retained for the duration of your account. Upon account deletion, your
              personal data is removed within 30 days, unless a longer retention period is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">6. Data sharing</h2>
            <p>
              Your data is never sold to third parties. It may be shared with our technical sub-processors
              (Vercel for hosting, Supabase for the database) solely for the purpose of providing the service,
              under contractual guarantees compliant with GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">7. Cookies</h2>
            <p>
              We only use technical cookies strictly necessary for the service to operate
              (authentication, session preferences). These cookies are not used for advertising
              or tracking purposes.
            </p>
            <p>
              You can refuse or delete cookies at any time through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">8. Your rights</h2>
            <p>Under GDPR, you have the following rights:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Right of access</strong>: obtain a copy of your data;</li>
              <li><strong className="text-foreground">Right of rectification</strong>: correct inaccurate data;</li>
              <li><strong className="text-foreground">Right to erasure</strong>: request deletion of your data;</li>
              <li><strong className="text-foreground">Right to object</strong>: object to certain processing;</li>
              <li><strong className="text-foreground">Right to portability</strong>: receive your data in a structured format.</li>
            </ul>
            <p>
              To exercise these rights, contact us at{' '}
              <a href="mailto:contact@instant-films.com" className="text-primary hover:underline">
                contact@instant-films.com
              </a>.
              You also have the right to lodge a complaint with your local data protection authority.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">9. Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your data
              against unauthorised access, loss, or disclosure (encryption, restricted access,
              secure authentication).
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">10. Changes</h2>
            <p>
              We may update this policy at any time. The date of the last update is shown at the top
              of this page. We will notify you of any significant changes by email or in-app notification.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
