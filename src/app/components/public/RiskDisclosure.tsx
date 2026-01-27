import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

interface RiskDisclosureProps {
  onNavigate: (view: string) => void;
}

export function RiskDisclosure({ onNavigate }: RiskDisclosureProps) {
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
                <AlertTriangle className="size-6 text-[#EF4444]" />
                <div>
                  <h1 className="text-xl font-semibold">Risk Disclosure Statement</h1>
                  <p className="text-xs text-muted-foreground">Last updated: January 23, 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-[#EF4444]/10 border-y border-[#EF4444]/30">
        <div className="container mx-auto px-6 py-6">
          <div className="flex gap-4 items-start">
            <AlertTriangle className="size-6 text-[#EF4444] flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-[#EF4444]">IMPORTANT: Read Carefully Before Using KLINEO</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cryptocurrency trading and copy trading involve substantial risk of loss. This disclosure statement 
                outlines critical risks you must understand before using KLINEO's copy trading platform. Only invest 
                funds you can afford to lose.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Card className="p-8 space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">1. General Trading Risks</h2>
            
            <h3 className="text-base font-semibold">1.1 Risk of Total Loss</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cryptocurrency trading is extremely volatile and carries a high risk of loss. You may lose your entire 
              investment. The value of cryptocurrencies can fluctuate significantly in short periods, and prices may 
              fall below purchase levels unexpectedly.
            </p>

            <h3 className="text-base font-semibold mt-4">1.2 Market Volatility</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cryptocurrency markets operate 24/7/365 and are subject to extreme price volatility driven by:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Sudden market sentiment shifts</li>
              <li className="text-sm text-muted-foreground">• Regulatory announcements and legal changes</li>
              <li className="text-sm text-muted-foreground">• Large holder ("whale") activities</li>
              <li className="text-sm text-muted-foreground">• Exchange technical issues or outages</li>
              <li className="text-sm text-muted-foreground">• Liquidity shocks and cascading liquidations</li>
              <li className="text-sm text-muted-foreground">• Macroeconomic events and geopolitical factors</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">1.3 Leverage & Margin Trading</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you or the Master Traders you copy use leverage (margin trading), losses can exceed your initial 
              investment. Leveraged positions can be liquidated rapidly during volatile market conditions, resulting 
              in total position loss.
            </p>
            <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded mt-2">
              <p className="text-sm text-[#EF4444] font-semibold">
                WARNING: Leverage amplifies both gains AND losses. A 10x leveraged position can be wiped out by a 
                10% adverse price movement.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">2. Copy Trading Specific Risks</h2>
            
            <h3 className="text-base font-semibold">2.1 Past Performance Does Not Guarantee Future Results</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Historical performance data of Master Traders is NOT indicative of future results. A trader's past 
              success does not mean they will continue to be profitable. Market conditions change, strategies that 
              worked previously may fail, and trader performance can deteriorate.
            </p>

            <h3 className="text-base font-semibold mt-4">2.2 No Control Over Master Trader Decisions</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you copy a Master Trader, they make all trading decisions. You cannot control:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• What assets they trade</li>
              <li className="text-sm text-muted-foreground">• When they enter or exit positions</li>
              <li className="text-sm text-muted-foreground">• Their risk management approach</li>
              <li className="text-sm text-muted-foreground">• Changes in their trading strategy</li>
              <li className="text-sm text-muted-foreground">• Their use of leverage</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">2.3 Execution Delays & Slippage</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Copied trades may not execute at the same price as the Master Trader's original trade due to:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Network latency and API delays</li>
              <li className="text-sm text-muted-foreground">• Market liquidity differences</li>
              <li className="text-sm text-muted-foreground">• Order size variations</li>
              <li className="text-sm text-muted-foreground">• Exchange execution speed differences</li>
              <li className="text-sm text-muted-foreground">• High-volatility periods causing slippage</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              This can result in worse entry/exit prices and reduced profitability compared to the Master Trader.
            </p>

            <h3 className="text-base font-semibold mt-4">2.4 Different Results Despite Copying</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your results will differ from the Master Trader due to:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Different account sizes and position scaling</li>
              <li className="text-sm text-muted-foreground">• Timing differences in copying start date</li>
              <li className="text-sm text-muted-foreground">• Platform fees reducing your net returns</li>
              <li className="text-sm text-muted-foreground">• Your custom risk control settings</li>
              <li className="text-sm text-muted-foreground">• Exchange fees and spreads varying by user</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">2.5 Master Trader Behavior Changes</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Master Traders may:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Alter their trading strategy without notice</li>
              <li className="text-sm text-muted-foreground">• Increase risk-taking or use more leverage</li>
              <li className="text-sm text-muted-foreground">• Stop trading or reduce activity</li>
              <li className="text-sm text-muted-foreground">• Experience personal issues affecting judgment</li>
              <li className="text-sm text-muted-foreground">• Close their account, leaving you without notice</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">2.6 Drawdowns & Losing Streaks</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Even successful traders experience significant drawdowns (peak-to-trough declines). During losing 
              streaks, your account value may decline substantially before (or if) it recovers. You must have 
              sufficient risk tolerance and capital to withstand these periods.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">3. Platform & Technical Risks</h2>
            
            <h3 className="text-base font-semibold">3.1 System Failures & Downtime</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO relies on complex technology infrastructure. Potential failures include:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Server outages preventing trade execution</li>
              <li className="text-sm text-muted-foreground">• Internet connectivity issues</li>
              <li className="text-sm text-muted-foreground">• Exchange API downtime or rate limits</li>
              <li className="text-sm text-muted-foreground">• Software bugs causing incorrect trade execution</li>
              <li className="text-sm text-muted-foreground">• Database failures or data corruption</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Technical failures may result in missed trades, delayed exits, or incorrect position sizing, 
              potentially causing losses.
            </p>

            <h3 className="text-base font-semibold mt-4">3.2 Exchange Risks</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cryptocurrency exchanges themselves carry risks:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Exchange hacks or security breaches</li>
              <li className="text-sm text-muted-foreground">• Exchange insolvency or bankruptcy</li>
              <li className="text-sm text-muted-foreground">• Regulatory shutdowns or restrictions</li>
              <li className="text-sm text-muted-foreground">• Withdrawal freezes or delays</li>
              <li className="text-sm text-muted-foreground">• Margin call liquidations during market stress</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              KLINEO is not responsible for exchange failures. Your funds are held on exchanges, not by KLINEO.
            </p>

            <h3 className="text-base font-semibold mt-4">3.3 API Key Security</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              While KLINEO encrypts API keys and never requests withdrawal permissions, risks include:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Potential unauthorized access if platform is compromised</li>
              <li className="text-sm text-muted-foreground">• User error in API key configuration</li>
              <li className="text-sm text-muted-foreground">• Phishing attacks targeting your credentials</li>
            </ul>
            <div className="p-4 bg-secondary/30 rounded mt-2">
              <p className="text-sm text-muted-foreground">
                <strong>Best Practice:</strong> Always use API keys WITHOUT withdrawal permissions. Regularly rotate 
                your API keys and monitor exchange activity.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">4. Regulatory & Legal Risks</h2>
            
            <h3 className="text-base font-semibold">4.1 Regulatory Uncertainty</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cryptocurrency regulation is evolving globally. Changes in laws or regulations may:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Restrict or prohibit cryptocurrency trading in your jurisdiction</li>
              <li className="text-sm text-muted-foreground">• Impose new taxes or reporting requirements</li>
              <li className="text-sm text-muted-foreground">• Ban or limit copy trading services</li>
              <li className="text-sm text-muted-foreground">• Require KLINEO to cease operations in certain regions</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">4.2 Tax Obligations</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You are solely responsible for understanding and complying with tax obligations in your jurisdiction. 
              Cryptocurrency trading may trigger capital gains taxes, income taxes, or other tax liabilities. 
              Consult a tax professional.
            </p>

            <h3 className="text-base font-semibold mt-4">4.3 No Investment Advice</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO does not provide investment advice, financial planning, or recommendations. Displaying Master 
              Trader performance is for informational purposes only and should not be construed as investment advice 
              or endorsement.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">5. Financial Risk Considerations</h2>
            
            <h3 className="text-base font-semibold">5.1 Only Invest What You Can Afford to Lose</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Never invest money you cannot afford to lose entirely. Do not use funds needed for:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Living expenses, rent, or bills</li>
              <li className="text-sm text-muted-foreground">• Retirement savings</li>
              <li className="text-sm text-muted-foreground">• Emergency funds</li>
              <li className="text-sm text-muted-foreground">• Debt repayment</li>
              <li className="text-sm text-muted-foreground">• Children's education or essential expenses</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">5.2 Borrowed Funds</h3>
            <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded">
              <p className="text-sm text-[#EF4444] font-semibold">
                NEVER trade with borrowed money, loans, credit cards, or mortgages. This can lead to devastating 
                financial consequences if losses occur.
              </p>
            </div>

            <h3 className="text-base font-semibold mt-4">5.3 Diversification</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Do not allocate all your funds to a single Master Trader or trading strategy. Diversify across:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Multiple Master Traders with different strategies</li>
              <li className="text-sm text-muted-foreground">• Different asset classes beyond crypto</li>
              <li className="text-sm text-muted-foreground">• Traditional investments (stocks, bonds, real estate)</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">5.4 Risk Management</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO provides risk control tools (max daily loss, max position size, etc.), but these do NOT 
              eliminate risk. Markets can gap beyond stop-loss levels, and risk controls may fail during extreme 
              volatility or technical issues.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">6. Psychological Risks</h2>
            
            <h3 className="text-base font-semibold">6.1 Emotional Trading Decisions</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Copy trading can create false confidence or panic. Common psychological pitfalls include:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Stopping copy during drawdowns (crystallizing losses)</li>
              <li className="text-sm text-muted-foreground">• Increasing position sizes after wins (overconfidence)</li>
              <li className="text-sm text-muted-foreground">• Chasing "hot" traders with recent gains</li>
              <li className="text-sm text-muted-foreground">• Ignoring risk controls when winning</li>
              <li className="text-sm text-muted-foreground">• Revenge trading after losses</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">6.2 Stress & Mental Health</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Trading losses can cause significant stress, anxiety, and impact mental health. If trading causes 
              emotional distress, interferes with daily life, or leads to addictive behavior, stop immediately 
              and seek professional help.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">7. KLINEO Disclaimers</h2>
            
            <h3 className="text-base font-semibold">7.1 No Liability for Losses</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KLINEO is a technology platform connecting users to exchanges and Master Traders. We are NOT 
              responsible for:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• Trading losses incurred by copied trades</li>
              <li className="text-sm text-muted-foreground">• Master Trader performance or decisions</li>
              <li className="text-sm text-muted-foreground">• Exchange failures, hacks, or insolvencies</li>
              <li className="text-sm text-muted-foreground">• Technical issues preventing trade execution</li>
              <li className="text-sm text-muted-foreground">• Market movements or cryptocurrency volatility</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">7.2 No Verification of Master Trader Claims</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              While KLINEO displays Master Trader performance data, we do not independently verify all historical 
              claims. Performance data relies on exchange APIs and self-reported information. Past statistics may 
              be incomplete or inaccurate.
            </p>

            <h3 className="text-base font-semibold mt-4">7.3 Credit-Based Allowance</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You pay a joining fee and buy packages to unlock a profit allowance. Your profit from copied 
              trades counts toward that allowance until you hit the cap; then you buy another package to continue. 
              There is no per-trade fee deducted from individual trades.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">8. Your Responsibilities</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By using KLINEO, you acknowledge and accept that:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• You have read and understood this Risk Disclosure in full</li>
              <li className="text-sm text-muted-foreground">• You understand cryptocurrency trading and its risks</li>
              <li className="text-sm text-muted-foreground">• You can afford to lose your entire investment</li>
              <li className="text-sm text-muted-foreground">• You are solely responsible for trading decisions, even when copying</li>
              <li className="text-sm text-muted-foreground">• You will conduct independent research on Master Traders</li>
              <li className="text-sm text-muted-foreground">• You will monitor your account and risk exposure regularly</li>
              <li className="text-sm text-muted-foreground">• You will not rely solely on historical performance data</li>
              <li className="text-sm text-muted-foreground">• You understand KLINEO provides no guarantees of profit</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">9. Recommendation: Seek Professional Advice</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Before using KLINEO or trading cryptocurrencies, consult with:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="text-sm text-muted-foreground">• A licensed financial advisor about investment suitability</li>
              <li className="text-sm text-muted-foreground">• A tax professional about tax implications</li>
              <li className="text-sm text-muted-foreground">• A legal advisor about regulatory compliance in your jurisdiction</li>
            </ul>
          </div>

          <div className="pt-6 border-t border-border">
            <div className="p-6 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded">
              <h3 className="text-base font-semibold text-[#EF4444] mb-3">Final Warning</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Cryptocurrency copy trading is extremely risky and not suitable for everyone. You may lose your 
                entire investment. Only proceed if you fully understand and accept these risks.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                By clicking "I Understand" or using KLINEO's copy trading services, you acknowledge that you have 
                read, understood, and accept all risks outlined in this disclosure.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <p className="text-xs text-muted-foreground">
              Questions about these risks? Contact us at risk@klineo.xyz or support@klineo.xyz
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}