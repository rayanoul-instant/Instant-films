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
        <p className="text-xs text-muted-foreground mb-8">Last updated: July 25, 2026</p>

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
              <li><strong className="text-foreground">Cookies</strong>: see Section 7 for details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">3. Purposes</h2>
            <p>Your data is used to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Manage your account and authentication;</li>
              <li>Personalise your experience on the platform;</li>
              <li>Enable communication between users (internal messaging);</li>
              <li>Improve the service and its features (analytics, subject to your consent);</li>
              <li>Comply with our legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">4. Legal basis</h2>
            <p>We rely on different legal bases depending on the purpose of processing:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-foreground">Performance of a contract (Art. 6.1.b GDPR):</strong>{' '}
                the processing necessary to create and manage your account, authenticate you, and enable
                internal messaging is based on the performance of the contract entered into when you
                register on Instant Films.
              </li>
              <li>
                <strong className="text-foreground">Consent (Art. 6.1.a GDPR):</strong>{' '}
                the use of non-essential analytics cookies (Google Analytics 4) is based solely on your
                prior, freely given consent. You may withdraw this consent at any time without affecting
                the lawfulness of prior processing.
              </li>
            </ul>
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
            <p>
              Vercel and Supabase are companies headquartered in the United States. Your data may therefore
              be processed on servers located outside the European Union or European Economic Area. In such
              cases, transfers are governed by Standard Contractual Clauses (SCC) approved by the European
              Commission, ensuring an adequate level of protection for your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">7. Cookies</h2>
            <p>We use two categories of cookies:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-foreground">Strictly necessary cookies:</strong>{' '}
                required for the service to function (authentication, session preferences). These cookies
                cannot be refused without affecting your ability to use the platform.
              </li>
              <li>
                <strong className="text-foreground">Analytics cookies — Google Analytics 4:</strong>{' '}
                we use Google Analytics 4 to understand how the platform is used and improve our service.
                This is not a strictly necessary cookie. Its use is subject to your{' '}
                <strong className="text-foreground">prior consent</strong>, which you can give or refuse
                via the cookie banner displayed on your first visit. You may change your choice at any
                time through the cookie settings accessible on the site.
              </li>
            </ul>
            <p>
              You can also manage or delete cookies at any time through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">8. Minimum age</h2>
            <p>
              Instant Films is intended for users aged <strong className="text-foreground">16 or older</strong>.
              In countries where national law sets a lower age for consent to information society services
              (minimum 13 years under Art. 8 GDPR), the use of the platform by a minor below the age of 16
              requires verifiable parental or guardian authorisation. By creating an account, you confirm
              that you meet this age requirement.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">9. Your rights</h2>
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
            <h2 className="text-foreground font-semibold text-lg mb-2">10. Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your data
              against unauthorised access, loss, or disclosure (encryption, restricted access,
              secure authentication).
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">11. Changes</h2>
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
