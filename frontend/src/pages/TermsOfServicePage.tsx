/**
 * Terms of Service Page - Legal terms and conditions for using StudyHub.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react';

export function TermsOfServicePage() {
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
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
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
              Welcome to StudyHub. By accessing or using our educational platform, you agree
              to be bound by these Terms of Service. Please read them carefully before using
              our services.
            </p>
          </section>

          {/* Acceptance */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700">
              By creating an account or using StudyHub, you acknowledge that you have read,
              understood, and agree to be bound by these Terms. If you are a parent or
              guardian creating an account for a child, you accept these Terms on behalf of
              your child and take responsibility for their use of the platform.
            </p>
          </section>

          {/* Eligibility */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Eligibility</h2>
            <ul className="list-inside list-disc space-y-2 text-gray-700">
              <li>
                <strong>Parent Accounts:</strong> You must be at least 18 years old to create
                a parent account.
              </li>
              <li>
                <strong>Student Accounts:</strong> Student profiles can only be created by a
                parent or legal guardian. Students under 13 require verifiable parental consent.
              </li>
              <li>
                <strong>Australian Focus:</strong> StudyHub is designed for Australian curriculum
                frameworks. Users from other regions may use the platform but should verify
                curriculum alignment.
              </li>
            </ul>
          </section>

          {/* Account Responsibilities */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Account Responsibilities</h2>
            <p className="text-gray-700 mb-4">As an account holder, you agree to:</p>
            <ul className="list-inside list-disc space-y-2 text-gray-700">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorised access</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Supervise your child&apos;s use of the platform as appropriate</li>
            </ul>
          </section>

          {/* Acceptable Use */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-700 mb-4">You agree not to:</p>
            <ul className="list-inside list-disc space-y-2 text-gray-700">
              <li>Use the platform for any unlawful purpose</li>
              <li>Attempt to circumvent security measures</li>
              <li>Upload malicious content or attempt to compromise the platform</li>
              <li>Share account credentials with others</li>
              <li>Use the AI tutor to generate inappropriate or harmful content</li>
              <li>Misrepresent your identity or relationship to a student</li>
              <li>Use automated systems to access the platform without permission</li>
            </ul>
          </section>

          {/* AI Tutoring */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. AI Tutoring Services</h2>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <p className="text-gray-700">
                  <strong>Important:</strong> AI tutoring is a supplementary educational tool
                  and should not replace professional teaching or tutoring. The AI follows
                  the Socratic method and is designed to guide learning, not provide direct answers.
                </p>
              </div>
            </div>
            <ul className="list-inside list-disc space-y-2 text-gray-700">
              <li>AI responses are generated automatically and may contain errors</li>
              <li>We do not guarantee the accuracy of AI-generated educational content</li>
              <li>Parents should review AI interactions for appropriateness</li>
              <li>The AI is designed to be curriculum-aligned but may not cover all topics</li>
            </ul>
          </section>

          {/* Content */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. User Content</h2>
            <p className="text-gray-700 mb-4">
              You retain ownership of content you upload (study notes, flashcards). By
              uploading content, you grant us a licence to:
            </p>
            <ul className="list-inside list-disc space-y-2 text-gray-700">
              <li>Process content for OCR and AI tutoring purposes</li>
              <li>Store content securely on our servers</li>
              <li>Display content back to you and authorised family members</li>
            </ul>
            <p className="mt-4 text-gray-700">
              You are responsible for ensuring you have the right to upload any content and
              that it does not infringe on third-party rights.
            </p>
          </section>

          {/* Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Intellectual Property</h2>
            <p className="text-gray-700">
              StudyHub and its original content, features, and functionality are owned by
              StudyHub and are protected by copyright, trademark, and other intellectual
              property laws. Curriculum content is sourced from public education standards
              and attributed accordingly.
            </p>
          </section>

          {/* Subscription */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Subscription and Payment</h2>
            <ul className="list-inside list-disc space-y-2 text-gray-700">
              <li>Free tier includes basic features with usage limits</li>
              <li>Premium subscriptions are billed monthly or annually</li>
              <li>Refunds are available within 14 days of initial subscription</li>
              <li>We may modify pricing with 30 days notice to existing subscribers</li>
            </ul>
          </section>

          {/* Termination */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Termination</h2>
            <p className="text-gray-700 mb-4">
              We may suspend or terminate your account if you violate these Terms. You may
              delete your account at any time through account settings:
            </p>
            <ul className="list-inside list-disc space-y-2 text-gray-700">
              <li>A 7-day grace period allows you to cancel deletion</li>
              <li>After deletion, all data is permanently removed</li>
              <li>You may export your data before deletion</li>
            </ul>
          </section>

          {/* Disclaimers */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Disclaimers</h2>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-gray-700 uppercase text-sm font-medium mb-2">
                Disclaimer of Warranties
              </p>
              <p className="text-gray-700 text-sm">
                STUDYHUB IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT
                GUARANTEE THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT
                EDUCATIONAL OUTCOMES WILL BE ACHIEVED. THE PLATFORM IS A SUPPLEMENTARY
                EDUCATIONAL TOOL AND DOES NOT REPLACE FORMAL EDUCATION.
              </p>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Limitation of Liability</h2>
            <p className="text-gray-700">
              To the maximum extent permitted by law, StudyHub shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising from
              your use of the platform. Our total liability shall not exceed the amount you
              paid us in the 12 months preceding the claim.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Governing Law</h2>
            <p className="text-gray-700">
              These Terms are governed by the laws of New South Wales, Australia. Any
              disputes shall be resolved in the courts of New South Wales, and you consent
              to the exclusive jurisdiction of those courts.
            </p>
          </section>

          {/* Changes */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Changes to Terms</h2>
            <p className="text-gray-700">
              We may update these Terms from time to time. We will notify you of material
              changes via email or through the platform. Your continued use after changes
              take effect constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Contact</h2>
            <p className="text-gray-700">
              For questions about these Terms, please contact us at{' '}
              <a href="mailto:legal@studyhub.edu.au" className="text-blue-600 hover:underline">
                legal@studyhub.edu.au
              </a>
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-8 flex justify-center gap-6 text-sm">
          <Link to="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          <Link to="/" className="text-blue-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
