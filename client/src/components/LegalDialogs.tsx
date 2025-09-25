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
                <h4 className="font-medium mb-1">Personal Information</h4>
                <p>
                  When you register for ForeScore, we collect:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Name (first and last name)</li>
                  <li>Email address</li>
                  <li>Password (encrypted and never stored in plain text)</li>
                  <li>Subscription and billing information</li>
                </ul>

                <h4 className="font-medium mb-1 mt-3">Usage Information</h4>
                <p>
                  We automatically collect information about how you use our Service:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Game data (scores, player groups, game history)</li>
                  <li>Device information and browser type</li>
                  <li>IP address and approximate location</li>
                  <li>App usage patterns and feature interactions</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">2. How We Use Your Information</h3>
                <p>
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Provide, maintain, and improve our Service</li>
                  <li>Process your subscription and payments</li>
                  <li>Send you service-related communications</li>
                  <li>Provide customer support and respond to your requests</li>
                  <li>Send marketing communications (only with your consent)</li>
                  <li>Analyze usage patterns to improve our Service</li>
                  <li>Prevent fraud and ensure security</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">3. Information Sharing and Disclosure</h3>
                <p>
                  We do not sell, trade, or otherwise transfer your personal information to third parties, except as described in this policy:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Service providers who assist in operating our Service (payment processing, hosting, analytics)</li>
                  <li>Legal requirements or to protect our rights and safety</li>
                  <li>Business transfers (merger, acquisition, or sale of assets)</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">4. Marketing Communications</h3>
                <p>
                  During registration, you may choose to receive marketing communications from us. You can:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Opt-in to marketing communications during account registration</li>
                  <li>Update your preferences anytime in your account settings</li>
                  <li>Unsubscribe from marketing emails using the link in any email</li>
                  <li>Contact us directly to change your preferences</li>
                </ul>
                <p className="mt-2">
                  Note: You will continue to receive essential service-related communications regardless of your marketing preferences.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">5. Data Security</h3>
                <p>
                  We implement appropriate security measures to protect your personal information:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Encryption of sensitive data in transit and at rest</li>
                  <li>Secure password hashing using industry-standard methods</li>
                  <li>Regular security assessments and updates</li>
                  <li>Limited access to personal information on a need-to-know basis</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">6. Data Retention</h3>
                <p>
                  We retain your personal information for as long as necessary to provide our Service and fulfill the purposes outlined in this policy. Game data is automatically cleaned up after 61 days to manage storage efficiently while preserving recent activity.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">7. Third-Party Services</h3>
                <p>
                  Our Service uses third-party services that may collect information:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Stripe:</strong> Payment processing (subject to Stripe's privacy policy)</li>
                  <li><strong>SendGrid:</strong> Email delivery (subject to SendGrid's privacy policy)</li>
                  <li><strong>Meta Pixel:</strong> Website analytics and advertising optimization</li>
                  <li><strong>Neon Database:</strong> Secure data storage (subject to Neon's privacy policy)</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">8. Your Rights</h3>
                <p>
                  You have the right to:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Access and review your personal information</li>
                  <li>Correct or update your information</li>
                  <li>Delete your account and associated data</li>
                  <li>Export your data in a portable format</li>
                  <li>Withdraw consent for marketing communications</li>
                  <li>File a complaint with relevant data protection authorities</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">9. Children's Privacy</h3>
                <p>
                  Our Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">10. Changes to This Privacy Policy</h3>
                <p>
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "last updated" date.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">11. Contact Us</h3>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at support@forescore.xyz
                </p>
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