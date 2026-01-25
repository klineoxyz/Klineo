import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

interface PrivacyPolicyProps {
  onNavigate: (view: string) => void;
}

export function PrivacyPolicy({ onNavigate }: PrivacyPolicyProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => onNavigate("home")}>
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-3">
                <Shield className="size-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold">Privacy Policy</h1>
                  <p className="text-xs text-muted-foreground">Last updated: January 23, 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Card className="p-8 space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">1. Introduction</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we 
              collect, use, disclose, and safeguard your information when you use our copy trading platform.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By using KLINEO, you consent to the data practices described in this policy. If you do not agree with 
              this policy, please do not use our Service.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">2. Information We Collect</h2>
            
            <h3 className="text-base font-semibold">2.1 Personal Information</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We collect information you provide directly to us:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Email address (for account creation and communication)</li>
              <li className="text-sm text-muted-foreground">• Username and password (encrypted)</li>
              <li className="text-sm text-muted-foreground">• Payment information (cryptocurrency wallet addresses via CoinPayments)</li>
              <li className="text-sm text-muted-foreground">• Trading preferences and risk parameters</li>
              <li className="text-sm text-muted-foreground">• Communication preferences</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">2.2 Exchange API Information</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To provide copy trading services, we collect:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Exchange API keys (encrypted and stored securely)</li>
              <li className="text-sm text-muted-foreground">• API secrets (encrypted with AES-256)</li>
              <li className="text-sm text-muted-foreground">• Exchange account balances and positions</li>
              <li className="text-sm text-muted-foreground">• Trade execution data</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              <strong>Important:</strong> KLINEO NEVER requests or stores API keys with withdrawal permissions. 
              We can only execute trades on your behalf, not withdraw funds.
            </p>

            <h3 className="text-base font-semibold mt-4">2.3 Trading Activity Data</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We automatically collect:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Copied trades and performance metrics</li>
              <li className="text-sm text-muted-foreground">• Platform fees and referral commissions</li>
              <li className="text-sm text-muted-foreground">• Risk control triggers and events</li>
              <li className="text-sm text-muted-foreground">• Master Trader following/unfollowing activity</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">2.4 Technical & Usage Data</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We collect technical information:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• IP address and device information</li>
              <li className="text-sm text-muted-foreground">• Browser type and operating system</li>
              <li className="text-sm text-muted-foreground">• Login timestamps and session duration</li>
              <li className="text-sm text-muted-foreground">• Platform feature usage and navigation patterns</li>
              <li className="text-sm text-muted-foreground">• Error logs and diagnostic data</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">3. How We Use Your Information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use collected information for the following purposes:
            </p>

            <h3 className="text-base font-semibold mt-4">3.1 Service Provision</h3>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Execute copy trading based on your selected Master Traders</li>
              <li className="text-sm text-muted-foreground">• Apply risk controls and position sizing</li>
              <li className="text-sm text-muted-foreground">• Calculate and collect platform fees</li>
              <li className="text-sm text-muted-foreground">• Process referral commissions</li>
              <li className="text-sm text-muted-foreground">• Manage subscription billing</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">3.2 Account Management</h3>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Create and maintain your account</li>
              <li className="text-sm text-muted-foreground">• Authenticate users and prevent fraud</li>
              <li className="text-sm text-muted-foreground">• Send important account notifications</li>
              <li className="text-sm text-muted-foreground">• Provide customer support</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">3.3 Platform Improvement</h3>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Analyze usage patterns to improve features</li>
              <li className="text-sm text-muted-foreground">• Monitor platform performance and reliability</li>
              <li className="text-sm text-muted-foreground">• Develop new trading tools and capabilities</li>
              <li className="text-sm text-muted-foreground">• Conduct security audits and prevent abuse</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">3.4 Communication</h3>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Send platform updates and feature announcements</li>
              <li className="text-sm text-muted-foreground">• Notify about risk events (daily loss limits, etc.)</li>
              <li className="text-sm text-muted-foreground">• Share educational content (if opted in)</li>
              <li className="text-sm text-muted-foreground">• Respond to support inquiries</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">4. Data Sharing & Disclosure</h2>
            
            <h3 className="text-base font-semibold">4.1 We DO NOT Sell Your Data</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO does not sell, rent, or trade your personal information to third parties for marketing purposes.
            </p>

            <h3 className="text-base font-semibold mt-4">4.2 Service Providers</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may share information with trusted service providers who assist us:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Payment processing (CoinPayments for crypto payments)</li>
              <li className="text-sm text-muted-foreground">• Cloud hosting and infrastructure (encrypted storage)</li>
              <li className="text-sm text-muted-foreground">• Email delivery services</li>
              <li className="text-sm text-muted-foreground">• Analytics and monitoring tools</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              All service providers are contractually obligated to protect your data and use it only for specified purposes.
            </p>

            <h3 className="text-base font-semibold mt-4">4.3 Exchange Platforms</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We connect to supported cryptocurrency exchanges via your API keys to execute trades. Exchanges may 
              have their own privacy policies governing how they handle trading data.
            </p>

            <h3 className="text-base font-semibold mt-4">4.4 Legal Requirements</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may disclose your information if required by law or in good faith belief that such action is necessary to:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Comply with legal obligations or court orders</li>
              <li className="text-sm text-muted-foreground">• Protect the rights and safety of KLINEO and users</li>
              <li className="text-sm text-muted-foreground">• Investigate fraud, abuse, or security issues</li>
              <li className="text-sm text-muted-foreground">• Cooperate with law enforcement investigations</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">4.5 Aggregated Data</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may share anonymized, aggregated data (platform statistics, trading volume, etc.) that does not 
              personally identify you.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">5. Data Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your information:
            </p>

            <h3 className="text-base font-semibold mt-4">5.1 Encryption</h3>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• All data transmitted via HTTPS/TLS encryption</li>
              <li className="text-sm text-muted-foreground">• API keys encrypted at rest using AES-256</li>
              <li className="text-sm text-muted-foreground">• Passwords hashed with bcrypt</li>
              <li className="text-sm text-muted-foreground">• Database encryption for sensitive information</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">5.2 Access Controls</h3>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Multi-factor authentication available</li>
              <li className="text-sm text-muted-foreground">• Role-based access for internal systems</li>
              <li className="text-sm text-muted-foreground">• Regular security audits and penetration testing</li>
              <li className="text-sm text-muted-foreground">• Limited employee access to personal data</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">5.3 Limitations</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              While we take extensive precautions, no system is 100% secure. You acknowledge that you provide 
              information at your own risk. We cannot guarantee absolute security against unauthorized access, 
              hacking, or data breaches.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">6. Data Retention</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We retain your information for as long as necessary to provide services and comply with legal obligations:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Account data: While your account is active plus 7 years for legal compliance</li>
              <li className="text-sm text-muted-foreground">• Trading history: Retained indefinitely for tax and audit purposes</li>
              <li className="text-sm text-muted-foreground">• API keys: Deleted immediately upon disconnecting exchange or account closure</li>
              <li className="text-sm text-muted-foreground">• Communication logs: Retained for 3 years</li>
              <li className="text-sm text-muted-foreground">• Technical logs: Retained for 90 days</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">7. Your Privacy Rights</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You have the following rights regarding your personal data:
            </p>

            <h3 className="text-base font-semibold mt-4">7.1 Access & Portability</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can request a copy of your personal data in a machine-readable format.
            </p>

            <h3 className="text-base font-semibold mt-4">7.2 Correction</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can update or correct your account information at any time via Settings.
            </p>

            <h3 className="text-base font-semibold mt-4">7.3 Deletion</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can request deletion of your account and personal data, subject to legal retention requirements 
              for financial records.
            </p>

            <h3 className="text-base font-semibold mt-4">7.4 Opt-Out</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can opt out of non-essential communications (marketing, newsletters) while still receiving 
              critical account notifications.
            </p>

            <h3 className="text-base font-semibold mt-4">7.5 Exercising Your Rights</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To exercise any of these rights, contact us at privacy@klineo.xyz. We will respond within 30 days.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">8. Cookies & Tracking</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO uses minimal cookies and tracking technologies:
            </p>

            <h3 className="text-base font-semibold mt-4">8.1 Essential Cookies</h3>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Session management and authentication</li>
              <li className="text-sm text-muted-foreground">• Security and fraud prevention</li>
              <li className="text-sm text-muted-foreground">• Load balancing and performance</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">8.2 Analytics</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use privacy-focused analytics to understand platform usage and improve features. No personal 
              identifiers are shared with analytics providers.
            </p>

            <h3 className="text-base font-semibold mt-4">8.3 No Third-Party Advertising</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO does not use advertising cookies or allow third-party ad networks to track you.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">9. International Data Transfers</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO operates globally and may transfer data across borders. We use standard contractual clauses 
              and encryption to protect data during international transfers. By using KLINEO, you consent to such transfers.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">10. Children's Privacy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO is not intended for users under 18 years of age. We do not knowingly collect information from 
              minors. If you believe a minor has provided us with personal information, please contact us immediately.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">11. Changes to This Policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update this Privacy Policy periodically. Changes will be posted on this page with an updated 
              "Last Updated" date. Material changes will be communicated via email or platform notification. 
              Your continued use after changes constitutes acceptance.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">12. Contact Us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For privacy-related questions or to exercise your data rights:
            </p>
            <div className="p-4 bg-secondary/30 rounded mt-2">
              <p className="text-sm font-mono">privacy@klineo.xyz</p>
              <p className="text-sm font-mono mt-1">support@klineo.xyz</p>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">
              By using KLINEO, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}