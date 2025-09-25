import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LegalDialogsProps {
  showTerms: boolean;
  showPrivacy: boolean;
  onOpenChange: (type: 'terms' | 'privacy', open: boolean) => void;
}

export default function LegalDialogs({ showTerms, showPrivacy, onOpenChange }: LegalDialogsProps) {
  return (
    <>
      {/* Terms of Service Dialog */}
      <Dialog open={showTerms} onOpenChange={(open) => onOpenChange('terms', open)}>
        <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="dialog-terms">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Terms of Service</DialogTitle>
            <DialogDescription className="text-gray-600">
              Please read our Terms of Service carefully
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96 pr-4" data-testid="scroll-terms">
            <div className="space-y-4 text-sm text-gray-800">
              <section>
                <h3 className="font-semibold text-lg mb-2">1. Acceptance of Terms</h3>
                <p>
                  By accessing and using ForeScore ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">2. Service Description</h3>
                <p>
                  ForeScore is a golf companion application that provides digital tools for managing golf penalty games, including card games and points-based games like 2/9/16 and Bingo Bango Bongo. The Service includes features for score tracking, payout calculations, and group management.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">3. User Accounts and Registration</h3>
                <p>
                  To access certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
                </p>
                <p className="mt-2">
                  You are responsible for safeguarding the password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">4. Subscription and Payment Terms</h3>
                <p>
                  ForeScore operates on a subscription model with the following terms:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Monthly subscription: $1.99/month</li>
                  <li>Annual subscription: $16.99/year</li>
                  <li>7-day free trial included with all new subscriptions</li>
                  <li>Automatic renewal unless cancelled before the next billing cycle</li>
                  <li>No refunds for partial billing periods</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">5. Acceptable Use</h3>
                <p>
                  You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Use the Service for any unlawful purpose or to solicit unlawful activity</li>
                  <li>Attempt to gain unauthorized access to the Service or related systems</li>
                  <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                  <li>Use automated scripts or bots to access the Service</li>
                  <li>Share your account credentials with others</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">6. Intellectual Property</h3>
                <p>
                  The Service and its original content, features, and functionality are and will remain the exclusive property of ForeScore and its licensors. The Service is protected by copyright, trademark, and other laws.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">7. Privacy and Data Protection</h3>
                <p>
                  Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">8. Limitation of Liability</h3>
                <p>
                  In no event shall ForeScore, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">9. Termination</h3>
                <p>
                  We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">10. Changes to Terms</h3>
                <p>
                  We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">11. Contact Information</h3>
                <p>
                  For questions about these Terms of Service, please contact us at support@forescore.xyz
                </p>
              </section>

              <div className="text-xs text-gray-500 mt-6 pt-4 border-t">
                <p>Last updated: September 25, 2025</p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={(open) => onOpenChange('privacy', open)}>
        <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="dialog-privacy">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Privacy Policy</DialogTitle>
            <DialogDescription className="text-gray-600">
              Learn how we collect, use, and protect your information
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96 pr-4" data-testid="scroll-privacy">
            <div className="space-y-4 text-sm text-gray-800">
              <section>
                <h3 className="font-semibold text-lg mb-2">1. Information We Collect</h3>
                <p>We may collect the following types of information:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Account Information:</strong> Name, email address, login credentials, and any identifiers you provide when creating an account or signing in via third-party services (e.g., Google, Apple).</li>
                  <li><strong>Usage Data:</strong> Information about how you use the Service, such as games played, scores entered, groups joined, and device/browser information.</li>
                  <li><strong>Communications:</strong> Emails or messages you send to us, and your preferences regarding marketing or notifications.</li>
                  <li><strong>Cookies & Tracking:</strong> We use cookies, local storage, and similar technologies to remember preferences and improve the Service.</li>
                </ul>
                <p className="mt-2">
                  We do not knowingly collect personal data from children under 13 (or under the digital age of consent in your jurisdiction).
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">2. How We Use Information</h3>
                <p>We use the information we collect to:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Provide and improve the Service, including gameplay tracking and group features.</li>
                  <li>Personalize your experience and suggest features.</li>
                  <li>Send marketing and promotional communications, where permitted by law. You can opt out at any time (see Section 6).</li>
                  <li>Communicate about account issues, security alerts, and updates to our Terms or Privacy Policy.</li>
                  <li>Comply with legal obligations and enforce our Terms of Service.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">3. Sharing of Information</h3>
                <p>We do not sell your personal data. We may share information with:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Service Providers:</strong> Vendors who help us with hosting, analytics, payments, or communications.</li>
                  <li><strong>Legal & Safety:</strong> If required by law, regulation, or legal process, or to protect the rights, property, or safety of ForeScore, our users, or others.</li>
                  <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may transfer as part of that transaction.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">4. Google Analytics</h3>
                <p>We use Google Analytics to understand how users find and use ForeScore. This helps us study traffic sources and improve the Service.</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Google Analytics collects data such as device type, pages visited, and general traffic patterns.</li>
                  <li>We configure Google Analytics so that data is reported in aggregate and is not used to personally identify you.</li>
                  <li>You can opt out of Google Analytics tracking at any time by installing the Google Analytics Opt-out Browser Add-on.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">5. Payments</h3>
                <p>If you make a purchase, payment information is collected and processed directly by our third-party payment providers (e.g., Stripe, PayPal). We do not store full payment card details.</p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">6. Data Retention</h3>
                <p>We retain information as long as necessary to provide the Service, comply with legal obligations, and resolve disputes. You may request deletion of your data (see Section 7).</p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">7. Your Rights & Choices</h3>
                <p>Depending on your location, you may have the right to:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Access or request a copy of your data.</li>
                  <li>Correct or delete personal data.</li>
                  <li>Restrict or object to our processing of your data.</li>
                  <li>Withdraw consent for marketing communications at any time by clicking "unsubscribe" in an email or adjusting settings in your account.</li>
                </ul>
                <p className="mt-2">To exercise rights, email us at support@forescore.xyz.</p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">8. Security</h3>
                <p>We use reasonable safeguards (technical, administrative, and organizational) to protect your information. However, no system is completely secure, and we cannot guarantee absolute security of your data.</p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">9. International Users</h3>
                <p>If you access the Service from outside the United States, your information may be processed and stored in the U.S., where privacy laws may differ from those in your jurisdiction. We rely on user consent and other legal mechanisms to transfer data lawfully.</p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">10. Changes to this Policy</h3>
                <p>We may update this Privacy Policy from time to time. If changes are material, we will notify you via the Service or email. Continued use after updates means you accept the revised Policy.</p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">12. Contact Us</h3>
                <p>Questions or requests about this Privacy Policy can be directed to:</p>
                <p className="mt-2">danoNano, LLC dba ForeScore<br />
                Email: support@forescore.xyz</p>
              </section>

              <div className="text-xs text-gray-500 mt-6 pt-4 border-t">
                <p>Last updated: September 25, 2025</p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}