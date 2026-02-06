import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="max-w-4xl max-h-[80vh]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Privacy Policy</DialogTitle>
            <DialogDescription className="text-gray-600">
              Learn how we collect, use, and protect your information
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96 pr-4">
            <div className="space-y-4 text-sm text-gray-800">
              <p>
                This Privacy Policy explains how ForeScore, a service of danoNano, LLC (dba ForeScore) ("ForeScore," "we," "our," or "us"), collects, uses, and shares information when you use our websites, web apps, mobile apps, and related services (collectively, the "Service"). By using the Service, you agree to the practices described in this Privacy Policy.
              </p>

              <section>
                <h3 className="font-semibold text-lg mb-2">1. Information We Collect</h3>
                <p>We may collect the following types of information:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Account Information:</strong> Name, email address, password or other login credentials, and any identifiers you provide when creating an account or signing in via third-party services (such as Google or Apple).</li>
                  <li><strong>Profile & Gameplay Data:</strong> Information you add to your profile, your groups and games, game configurations, scores entered, and related in-app activity.</li>
                  <li><strong>Device & Usage Data:</strong> Technical information such as IP address, device type, operating system, app version, language, time zone, and information about how you interact with the Service (e.g., screens viewed, features used, session duration).</li>
                  <li><strong>Cookies & Similar Technologies:</strong> We use cookies, local storage, and similar technologies to remember your preferences, keep you signed in, and help us understand how the Service is used.</li>
                  <li><strong>Communications:</strong> Information you provide when you contact us for support, respond to surveys, or participate in promotions, including the content of messages and your contact details.</li>
                </ul>
                <p className="mt-2">
                  We do not knowingly collect personal data from children under 13 (or under the digital age of consent in your jurisdiction). If we learn that we have collected such data, we will take steps to delete it.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">2. How We Use Information</h3>
                <p>We use the information we collect for the following purposes:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Provide the Service:</strong> To create and manage accounts, enable gameplay tracking and group features, and operate core functionality of the Service.</li>
                  <li><strong>Improve & Personalize:</strong> To understand how the Service is used, fix bugs, develop new features, and personalize content, settings, and recommendations.</li>
                  <li><strong>Communications:</strong> To send you service-related messages (such as account notices, security alerts, and changes to our terms or policies) and, where permitted by law, marketing or promotional messages about ForeScore. You can opt out of marketing at any time (see Section 7).</li>
                  <li><strong>Security & Fraud Prevention:</strong> To protect the Service and our users, detect and prevent abuse, fraud, or other harmful activity, and enforce our Terms of Service.</li>
                  <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, legal processes, and law enforcement requests.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">3. Sharing of Information</h3>
                <p>We do not sell your personal data. We may share information in the following situations:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Service Providers:</strong> With trusted third-party vendors who perform services on our behalf, such as hosting, analytics, email delivery, customer support, or payment processing. These providers are permitted to use your information only as needed to provide services to us.</li>
                  <li><strong>Legal & Safety:</strong> When we believe in good faith that disclosure is reasonably necessary to comply with a law, regulation, legal process, or governmental request, or to protect the rights, property, or safety of ForeScore, our users, or others.</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, financing, reorganization, or sale of all or part of our business or assets. In such cases, we will take reasonable steps to ensure your privacy rights are respected.</li>
                  <li><strong>With Your Consent:</strong> We may share information for other purposes when you explicitly direct or consent to that sharing.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">4. Analytics & Cookies (including Google Analytics)</h3>
                <p>We use analytics tools (such as Google Analytics) to help us understand how users find and use ForeScore, measure the performance of the Service, and improve user experience.</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Analytics tools may collect information such as device type, approximate location (based on IP address), pages or screens viewed, time spent in the app, and interactions with features.</li>
                  <li>We configure analytics tools so that data is reported in aggregate and is not used by us to directly identify you as an individual.</li>
                  <li>You can manage cookies and similar technologies through your browser or device settings. Components such as the Google Analytics Opt-out Browser Add-on may allow you to limit certain tracking in web contexts.</li>
                </ul>
                <p className="mt-2">
                  Where required by law, we will obtain your consent before using non-essential cookies or similar technologies.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">5. Payments</h3>
                <p>
                  If you make a purchase or subscribe to paid features, payment information (such as card details and billing information) is collected and processed directly by third-party payment providers (for example, Stripe, PayPal, or the relevant app store provider). We do not store full payment card numbers on our servers.
                </p>
                <p className="mt-2">
                  Your use of those payment services is governed by their own terms and privacy policies in addition to this Privacy Policy.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">6. Data Retention</h3>
                <p>We retain personal information for as long as reasonably necessary to:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Provide and maintain the Service.</li>
                  <li>Comply with our legal obligations.</li>
                  <li>Resolve disputes and enforce our agreements.</li>
                </ul>
                <p className="mt-2">
                  We may anonymize or aggregate information so that it can no longer be associated with you. We may retain such aggregated or anonymized information indefinitely for analytics, troubleshooting, or business planning.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">7. Your Rights & Choices</h3>
                <p>Depending on your location and applicable law, you may have some or all of the following rights regarding your personal data:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Access:</strong> Request confirmation of whether we process your personal data and request a copy of that data.</li>
                  <li><strong>Correction:</strong> Request that we correct inaccurate or incomplete personal data.</li>
                  <li><strong>Deletion:</strong> Request that we delete certain personal data, subject to legal or legitimate business requirements to retain it.</li>
                  <li><strong>Restriction/Objection:</strong> Request that we limit or stop certain processing of your data, including for direct marketing.</li>
                  <li><strong>Portability:</strong> Request a copy of your personal data in a structured, commonly used, and machine-readable format, where technically feasible.</li>
                </ul>
                <p className="mt-2">You can also:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Marketing Preferences:</strong> Opt out of marketing communications at any time by clicking "unsubscribe" in an email, changing your notification settings in the app, or contacting us at the email below.</li>
                  <li><strong>Account & Data Deletion:</strong> You may request that we delete your account and associated personal data by contacting us at the email below or, where available, using in-app account deletion tools.</li>
                </ul>
                <p className="mt-2">To exercise any of these rights, email us at support@forescore.xyz. We may request additional information to verify your identity before fulfilling your request. We will respond within a reasonable period, consistent with applicable law.</p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">8. Security</h3>
                <p>We use reasonable technical, administrative, and organizational safeguards designed to protect your information from unauthorized access, use, alteration, or destruction. However, no system is completely secure, and we cannot guarantee the absolute security of your data. You are responsible for maintaining the confidentiality of your account credentials and for any activity under your account.</p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">9. Children's Privacy</h3>
                <p>The Service is not directed to children under 13, and we do not knowingly collect personal data from children under 13 (or under the minimum digital age of consent in your jurisdiction). If you believe a child has provided us with personal data in violation of this Policy, please contact us so we can take appropriate steps to delete such information.</p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">10. International Users</h3>
                <p>ForeScore is based in the United States, and your information may be processed and stored in the U.S. and other countries where our service providers operate. These countries may have data protection laws that differ from those in your jurisdiction.</p>
                <p className="mt-2">Where required, we rely on appropriate legal bases and safeguards for transferring personal data, such as your consent, performance of a contract, or other mechanisms recognized under applicable data protection laws.</p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">11. Changes to this Policy</h3>
                <p>We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, or legal requirements. If changes are material, we will notify you via the Service, email, or other reasonable means. The updated Policy will have an updated "Last updated" date. Your continued use of the Service after the Policy becomes effective means you accept the updated terms. If you do not agree, you should stop using the Service.</p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">12. Contact Us</h3>
                <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, you can contact us at:</p>
                <p className="mt-2">
                  danoNano, LLC dba ForeScore<br />
                  Email: support@forescore.xyz<br />
                  Postal: 2447 E Fremont Rd, Phoenix, AZ 85042, USA
                </p>
              </section>

              <div className="text-xs text-gray-500 mt-6 pt-4 border-t">
                <p>Last updated: September 25, 2025</p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
