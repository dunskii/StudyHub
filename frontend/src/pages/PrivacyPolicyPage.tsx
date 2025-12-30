/**
 * Privacy Policy Page - Legal information about data collection and privacy.
 *
 * Covers COPPA compliance, Australian Privacy Act requirements, and
 * third-party service disclosures.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, UserCheck, Database, Globe, Mail } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg bg-white p-8 shadow-sm">
          {/* Title */}
          <div className="mb-8 border-b border-gray-200 pb-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString('en-AU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* Introduction */}
          <section className="mb-8">
            <p className="text-gray-700">
              StudyHub (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting the privacy of
              our users, especially children. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our educational
              platform.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Children&apos;s Privacy</h2>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-gray-700">
                StudyHub is designed for use by students, including children under 13.
                We are committed to complying with the Children&apos;s Online Privacy
                Protection Act (COPPA) and the Australian Privacy Act.
              </p>
              <ul className="mt-4 list-inside list-disc space-y-2 text-gray-700">
                <li>
                  <strong>Parental Consent:</strong> All student accounts must be created
                  and managed by a parent or guardian. Children cannot create accounts
                  independently.
                </li>
                <li>
                  <strong>Minimal Data Collection:</strong> We only collect information
                  necessary to provide educational services. We do not collect sensitive
                  personal information from children.
                </li>
                <li>
                  <strong>No Advertising:</strong> We do not display targeted advertising
                  to children or share children&apos;s data with advertisers.
                </li>
                <li>
                  <strong>Parental Controls:</strong> Parents have full visibility into
                  their children&apos;s learning activities and can delete their child&apos;s
                  account at any time.
                </li>
              </ul>
            </div>
          </section>

          {/* Data Collection */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Information We Collect</h2>
            </div>

            <h3 className="mt-4 font-medium text-gray-900">From Parents:</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-700">
              <li>Email address (for account management and communication)</li>
              <li>Display name</li>
              <li>Phone number (optional, for account recovery)</li>
              <li>Notification preferences</li>
            </ul>

            <h3 className="mt-4 font-medium text-gray-900">From Students:</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-700">
              <li>Display name (can be a nickname)</li>
              <li>Grade level and curriculum framework</li>
              <li>Subject enrolments and learning preferences</li>
              <li>Study notes and flashcards created by the student</li>
              <li>Learning progress and session data</li>
              <li>AI tutor conversation history (for educational continuity)</li>
            </ul>

            <h3 className="mt-4 font-medium text-gray-900">Automatically Collected:</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-700">
              <li>Device information (browser type, operating system)</li>
              <li>Usage analytics (pages visited, features used)</li>
              <li>Error logs (for troubleshooting)</li>
            </ul>
          </section>

          {/* AI Disclosure */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Tutoring Disclosure</h2>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-gray-700">
                StudyHub uses AI technology (powered by Anthropic&apos;s Claude) to provide
                personalised tutoring. When students interact with the AI tutor:
              </p>
              <ul className="mt-4 list-inside list-disc space-y-2 text-gray-700">
                <li>Conversations are processed by Anthropic&apos;s servers to generate responses</li>
                <li>We retain conversation history to provide contextual learning support</li>
                <li>Parents can review AI interactions through the parent dashboard</li>
                <li>We monitor conversations for safety and appropriate content</li>
                <li>AI responses follow the Socratic method and never provide direct answers</li>
              </ul>
            </div>
          </section>

          {/* Third-Party Services */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Third-Party Services</h2>
            </div>
            <p className="text-gray-700 mb-4">
              We use the following third-party services to provide our platform:
            </p>
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900">Supabase (Authentication & Database)</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Handles user authentication and stores user data securely.
                  <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900">Anthropic (AI Tutoring)</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Provides AI-powered tutoring through Claude.
                  <a href="https://www.anthropic.com/privacy" className="text-blue-600 hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900">Google Cloud Vision (OCR)</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Processes uploaded study notes to extract text for AI tutoring.
                  <a href="https://cloud.google.com/terms/cloud-privacy-notice" className="text-blue-600 hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                    Privacy Notice
                  </a>
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900">Digital Ocean (Hosting & Storage)</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Hosts our application and stores uploaded files securely.
                  <a href="https://www.digitalocean.com/legal/privacy-policy" className="text-blue-600 hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Data Retention */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Retention</h2>
            <ul className="list-inside list-disc space-y-2 text-gray-700">
              <li>Active account data is retained while the account is active</li>
              <li>AI conversation history is retained for 12 months to support learning continuity</li>
              <li>When you delete your account, all data is permanently removed within 7 days (grace period)</li>
              <li>Some anonymised, aggregated data may be retained for service improvement</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Rights</h2>
            <p className="text-gray-700 mb-4">
              Under the Australian Privacy Act and COPPA, you have the right to:
            </p>
            <ul className="list-inside list-disc space-y-2 text-gray-700">
              <li>
                <strong>Access:</strong> Request a copy of the personal information we hold about you or your child
              </li>
              <li>
                <strong>Correction:</strong> Request correction of inaccurate personal information
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your account and all associated data
              </li>
              <li>
                <strong>Data Export:</strong> Export your data in a portable format
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Withdraw consent for data processing at any time
              </li>
            </ul>
            <p className="mt-4 text-gray-700">
              To exercise these rights, please visit your account settings or contact us using
              the details below.
            </p>
          </section>

          {/* Security */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Measures</h2>
            <p className="text-gray-700">
              We implement appropriate technical and organisational measures to protect
              personal information, including:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-gray-700">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication with multi-factor authentication support</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and audit logging</li>
              <li>Employee training on data protection</li>
            </ul>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Contact Us</h2>
            </div>
            <p className="text-gray-700">
              If you have questions about this Privacy Policy or wish to exercise your
              rights, please contact us:
            </p>
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-gray-700">
                <strong>Email:</strong>{' '}
                <a href="mailto:privacy@studyhub.edu.au" className="text-blue-600 hover:underline">
                  privacy@studyhub.edu.au
                </a>
              </p>
              <p className="mt-2 text-gray-700">
                <strong>Privacy Officer:</strong> StudyHub Privacy Team
              </p>
              <p className="mt-2 text-gray-700">
                <strong>Response Time:</strong> We aim to respond within 30 days
              </p>
            </div>
          </section>

          {/* Updates */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Policy Updates</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of
              any material changes by email and/or by posting a notice on our platform.
              Your continued use of StudyHub after such modifications constitutes your
              acknowledgement of the modified Privacy Policy.
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-8 flex justify-center gap-6 text-sm">
          <Link to="/terms" className="text-blue-600 hover:underline">
            Terms of Service
          </Link>
          <Link to="/" className="text-blue-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
