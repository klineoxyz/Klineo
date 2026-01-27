import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

interface TermsOfServiceProps {
  onNavigate: (view: string) => void;
}

export function TermsOfService({ onNavigate }: TermsOfServiceProps) {
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
                <FileText className="size-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold">Terms of Service</h1>
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
            <h2 className="text-xl font-semibold text-primary">1. Agreement to Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing or using KLINEO ("Platform", "Service"), you agree to be bound by these Terms of Service ("Terms"). 
              If you disagree with any part of these terms, you may not access the service.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO is a professional copy trading terminal that enables users to copy trades from verified Master Traders 
              on supported centralized cryptocurrency exchanges.               The Platform uses a credit-based profit allowance and requires a joining fee plus package purchases.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">2. Eligibility</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You must be at least 18 years old and legally capable of entering into binding contracts to use this Service. 
              By using KLINEO, you represent and warrant that:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• You are of legal age in your jurisdiction</li>
              <li className="text-sm text-muted-foreground">• You have the legal capacity to enter into these Terms</li>
              <li className="text-sm text-muted-foreground">• You are not prohibited from using the Service under applicable laws</li>
              <li className="text-sm text-muted-foreground">• You will comply with all local, state, national, and international laws</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">3. Account Registration</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To use KLINEO, you must create an account and provide accurate, complete information. You are responsible for:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Maintaining the confidentiality of your account credentials</li>
              <li className="text-sm text-muted-foreground">• All activities that occur under your account</li>
              <li className="text-sm text-muted-foreground">• Notifying us immediately of any unauthorized access</li>
              <li className="text-sm text-muted-foreground">• Ensuring your API keys from exchanges are properly secured</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">4. Joining Fee & Trading Packages</h2>
            
            <h3 className="text-base font-semibold">4.1 Joining Fee</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A one-time $100 Joining Fee is required to create your profile and enable CEX API connection. 
              All prices are in USD and payable via cryptocurrency through CoinPayments.
            </p>

            <h3 className="text-base font-semibold mt-4">4.2 Trading Packages (Credit-Based Allowance)</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO uses a credit-based profit allowance. You buy packages to unlock a profit cap:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Entry: $100 → trade until you earn up to $300 profit</li>
              <li className="text-sm text-muted-foreground">• Level 2: $200 → trade until you earn up to $1,000 profit</li>
              <li className="text-sm text-muted-foreground">• Level 3: $500 → trade until you earn up to $5,000 profit</li>
              <li className="text-sm text-muted-foreground">• When you hit the cap, buy another package to continue. No per-trade fee.</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">4.3 Payment & Refunds</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Joining fee and package purchases are non-refundable except as required by law. 
              Your profit allowance is consumed as you earn from copied trades; unused allowance remains until you hit the cap.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">5. Copy Trading Service</h2>
            
            <h3 className="text-base font-semibold">5.1 How It Works</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO connects to your exchange account via API keys to automatically replicate trades from selected 
              Master Traders. You maintain full control over:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Which traders to copy</li>
              <li className="text-sm text-muted-foreground">• Position sizing and allocation percentages</li>
              <li className="text-sm text-muted-foreground">• Risk controls (max daily loss, max position size, etc.)</li>
              <li className="text-sm text-muted-foreground">• Ability to pause or stop copying at any time</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">5.2 API Key Security</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You must provide read-only API keys with trading permissions (but NOT withdrawal permissions) from your 
              supported exchange. KLINEO will never request withdrawal permissions. You acknowledge that:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• API keys are encrypted and stored securely</li>
              <li className="text-sm text-muted-foreground">• You can revoke API access at any time</li>
              <li className="text-sm text-muted-foreground">• KLINEO cannot withdraw funds from your exchange account</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">5.3 No Guarantees</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO does not guarantee profits or specific performance outcomes. Past performance of Master Traders 
              is not indicative of future results. All trading involves substantial risk of loss.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">6. Master Trader Program</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Qualified traders may apply to become Master Traders whose strategies can be copied by other users. 
              Master Traders must:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Provide verified trading history and performance data</li>
              <li className="text-sm text-muted-foreground">• Maintain consistent trading activity</li>
              <li className="text-sm text-muted-foreground">• Comply with all platform rules and ethical trading practices</li>
              <li className="text-sm text-muted-foreground">• Not engage in market manipulation or wash trading</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-4">
              KLINEO reserves the right to approve, suspend, or remove Master Trader status at any time.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">7. Referral Program</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO operates a 2-tier referral commission system:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Tier 1 (Direct Referrals): 10% of platform fees from referred users</li>
              <li className="text-sm text-muted-foreground">• Tier 2 (Sub-Referrals): 5% of platform fees from users referred by your referrals</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-4">
              Referral commissions are calculated on performance fees collected by KLINEO. Fraudulent referral activity 
              will result in immediate account termination and forfeiture of all commissions.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">8. Risk Disclosure</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cryptocurrency trading carries substantial risk of loss. By using KLINEO, you acknowledge:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• You may lose your entire investment</li>
              <li className="text-sm text-muted-foreground">• Past performance does not guarantee future results</li>
              <li className="text-sm text-muted-foreground">• Market conditions can change rapidly</li>
              <li className="text-sm text-muted-foreground">• Copy trading does not eliminate risk</li>
              <li className="text-sm text-muted-foreground">• You are solely responsible for your trading decisions</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-4">
              For complete risk information, please review our <a href="/risk-disclosure" className="text-primary hover:underline">Risk Disclosure Statement</a>.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">9. Prohibited Activities</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You agree not to:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Use the Service for illegal activities or money laundering</li>
              <li className="text-sm text-muted-foreground">• Attempt to manipulate or exploit the platform</li>
              <li className="text-sm text-muted-foreground">• Reverse engineer or copy any platform technology</li>
              <li className="text-sm text-muted-foreground">• Share your account credentials with others</li>
              <li className="text-sm text-muted-foreground">• Scrape or harvest data from the platform</li>
              <li className="text-sm text-muted-foreground">• Interfere with platform operations or other users</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">10. Intellectual Property</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All content, features, and functionality of KLINEO, including but not limited to software, algorithms, 
              text, graphics, logos, and trademarks, are owned by KLINEO and protected by intellectual property laws. 
              You are granted a limited, non-exclusive, non-transferable license to use the Service for personal trading purposes only.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">11. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, KLINEO AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, 
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER 
              INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO's total liability shall not exceed the amount you paid to KLINEO in the 12 months prior to the 
              event giving rise to liability.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">12. Disclaimer of Warranties</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR 
              IMPLIED. KLINEO DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">13. Account Termination</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO reserves the right to suspend or terminate your account at any time for:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Violation of these Terms</li>
              <li className="text-sm text-muted-foreground">• Fraudulent or illegal activity</li>
              <li className="text-sm text-muted-foreground">• Non-payment of fees</li>
              <li className="text-sm text-muted-foreground">• Any reason, with or without cause</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-4">
              Upon termination, your access will cease immediately. Joining fee and package purchases already paid are non-refundable.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">14. Modifications to Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO reserves the right to modify these Terms at any time. Changes will be effective immediately upon 
              posting to the Platform. Your continued use of the Service after changes constitutes acceptance of the 
              modified Terms. We will notify users of material changes via email or platform notification.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">15. Governing Law & Dispute Resolution</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable international laws. Any 
              disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration, 
              except where prohibited by law.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">16. Contact Information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For questions about these Terms, please contact us at:
            </p>
            <div className="p-4 bg-secondary/30 rounded mt-2">
              <p className="text-sm font-mono">legal@klineo.xyz</p>
              <p className="text-sm font-mono mt-1">support@klineo.xyz</p>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">
              By using KLINEO, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}