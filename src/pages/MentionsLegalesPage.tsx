import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';

export default function MentionsLegalesPage() {
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

        <h1 className="font-display text-3xl font-bold mb-8">Legal notices</h1>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">Publisher</h2>
            <p>
              The website <strong className="text-foreground">Instant Films</strong> is published by Rayan Oulmidi,
              based in France.
            </p>
            <p>Contact: <a href="mailto:contact@instant-films.com" className="text-primary hover:underline">contact@instant-films.com</a></p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">Hosting</h2>
            <p>
              The website is hosted by <strong className="text-foreground">Vercel Inc.</strong><br />
              340 Pine Street, Suite 701, San Francisco, CA 94104, United States.<br />
              Website: <span className="text-primary">vercel.com</span>
            </p>
            <p>
              The database is managed by <strong className="text-foreground">Supabase Inc.</strong><br />
              Website: <span className="text-primary">supabase.com</span>
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">Intellectual property</h2>
            <p>
              All content on this website (text, images, videos, graphic elements) is the exclusive
              property of Instant Films or their respective authors, unless otherwise stated.
              Any reproduction, distribution, or use without prior written authorization is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">Liability</h2>
            <p>
              Instant Films strives to ensure the accuracy of the information published on this website.
              However, Instant Films cannot be held liable for any errors or omissions in the published content.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">Personal data</h2>
            <p>
              For information on how we collect and process your personal data, please read our{' '}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy policy
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold text-lg mb-2">Applicable law</h2>
            <p>
              This website is governed by French law. Any dispute related to its use falls under
              the exclusive jurisdiction of French courts.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
