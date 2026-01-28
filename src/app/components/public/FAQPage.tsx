import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, HelpCircle, ChevronDown } from "lucide-react";
import { useState } from "react";

interface FAQPageProps {
  onNavigate: (view: string) => void;
}

const faqCategories = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What is KLINEO?",
        a: "KLINEO is a professional copy trading terminal for centralized cryptocurrency exchanges. It allows you to automatically replicate trades from verified Master Traders while maintaining full control over risk management and position sizing."
      },
      {
        q: "How does copy trading work?",
        a: "You connect your exchange account via API keys, select Master Traders to copy, set your risk parameters (position size, daily loss limits, etc.), and KLINEO automatically replicates their trades in real-time on your account. You maintain full ownership of your funds—they stay on your exchange."
      },
      {
        q: "Which exchanges are supported?",
        a: "KLINEO currently supports major centralized exchanges including Binance, Bybit, OKX, and Kraken. We continuously evaluate adding support for additional exchanges based on user demand."
      },
      {
        q: "Is my capital safe? Can KLINEO withdraw my funds?",
        a: "Your funds remain on your exchange account at all times. KLINEO requires API keys with trading permissions ONLY—never withdrawal permissions. We cannot access or withdraw your funds. You can revoke API access at any time."
      }
    ]
  },
  {
    category: "Pricing & Fees",
    questions: [
      {
        q: "What are the packages and joining fee?",
        a: "A one-time $100 Joining Fee is required to create your profile and enable CEX API connection. Then you buy a package and trade until you make the profit: Starter $100 → $300 profit (3x), Booster $200 → $1,000 profit (5x), Establish $500 → $5,000 profit (10x). Then top up or upgrade to continue."
      },
      {
        q: "How does the profit allowance work?",
        a: "Buy a package (e.g. $100) and trade until you make the profit shown (e.g. $300 for the $100 package, 3x). Then top up or upgrade to continue. There is no per-trade fee."
      },
      {
        q: "How is allowance used?",
        a: "Profit from your copied trades counts toward your allowance. Example: buy the $100 package and trade until you make $300 profit (3x). Then top up or upgrade to continue copying."
      },
      {
        q: "What payment methods do you accept?",
        a: "Joining fee and package purchases are paid via cryptocurrency through CoinPayments. We accept Bitcoin (BTC), Ethereum (ETH), USDT, USDC, and other major cryptocurrencies."
      },
      {
        q: "Are there any refunds?",
        a: "Joining fee and package purchases are non-refundable except as required by law. Your profit allowance is consumed as you earn; unused allowance does not expire until you hit the cap."
      }
    ]
  },
  {
    category: "Master Traders",
    questions: [
      {
        q: "How are Master Traders verified?",
        a: "Master Traders must submit verified trading history, maintain consistent activity, and comply with platform standards. KLINEO reviews performance data, trading patterns, and ethics before approval. We continuously monitor for market manipulation or unethical behavior."
      },
      {
        q: "Can I become a Master Trader?",
        a: "Yes! Qualified traders can apply via the Master Trader Application page. You'll need to provide verified trading history, demonstrate consistent performance, and pass our approval process. There are no fees to apply."
      },
      {
        q: "Do Master Traders earn from copiers?",
        a: "Master Traders share in KLINEO's platform fees based on the number and performance of their copiers. This creates alignment—Master Traders succeed when their copiers succeed."
      },
      {
        q: "What if a Master Trader's strategy changes?",
        a: "Master Traders may adjust their strategies over time. We recommend regularly reviewing trader performance and diversifying across multiple traders. You can pause or stop copying any trader instantly."
      }
    ]
  },
  {
    category: "Risk Management",
    questions: [
      {
        q: "What risk controls does KLINEO offer?",
        a: "KLINEO provides: Max Daily Loss (auto-pause if daily loss exceeds threshold), Max Position Size (limit per-trade allocation), Max Total Allocation (cap exposure per trader), Trailing Stop Loss, and manual pause/stop controls."
      },
      {
        q: "Can I lose more than I invest?",
        a: "If you or the Master Traders use leverage (margin trading), losses can theoretically exceed your investment. We strongly recommend understanding leverage risks and using conservative position sizing. Avoid high leverage unless experienced."
      },
      {
        q: "Will my trades execute at the same price as the Master Trader?",
        a: "There may be slight differences due to network latency, slippage, and order execution timing. KLINEO uses optimized infrastructure to minimize delays, but exact price matching is not guaranteed—especially during high volatility."
      },
      {
        q: "Can I stop copying at any time?",
        a: "Yes! You can pause or stop copying any Master Trader instantly from your dashboard. Existing open positions can be closed manually or allowed to run based on the trader's strategy."
      }
    ]
  },
  {
    category: "Referral Program",
    questions: [
      {
        q: "How does the referral program work?",
        a: "From every onboarding fee and package (credit) purchase, 70% goes to a 7-level referral rewards pool (L1 30%, L2 20%, L3 10%, L4 8%, L5 6%, L6 4%, L7 2% of that pool), 20% to platform revenue, and 10% to marketing. Rewards are based only on purchases—not on trading PnL or balances."
      },
      {
        q: "How do I get my referral link?",
        a: "Navigate to the Referrals page in your dashboard to access your unique referral link and tracking code. Share this link with friends, on social media, or via your website."
      },
      {
        q: "When do I receive referral rewards?",
        a: "Referral rewards from the 70% pool are paid out according to your referral level when referred users complete onboarding or buy packages. Minimum payout threshold is $50."
      },
      {
        q: "Is there a limit to how much I can earn?",
        a: "No. There is no cap on referral earnings. You can have unlimited direct referrals, and each eligible purchase allocates 70% across up to 7 levels."
      }
    ]
  },
  {
    category: "Security & Privacy",
    questions: [
      {
        q: "How are API keys stored?",
        a: "All API keys are encrypted using AES-256 encryption and stored in secure, isolated databases. Our infrastructure is regularly audited for security vulnerabilities."
      },
      {
        q: "What data does KLINEO collect?",
        a: "We collect email, trading activity, performance data, and technical information needed to operate the platform. See our Privacy Policy for complete details. We never sell your data."
      },
      {
        q: "Is two-factor authentication (2FA) available?",
        a: "Yes! We strongly recommend enabling 2FA on your KLINEO account for enhanced security. You can activate it in Settings > Security."
      },
      {
        q: "What happens if KLINEO is hacked?",
        a: "While we implement industry-leading security measures, your funds remain on your exchange (not with KLINEO). In a worst-case breach, attackers could only access trading permissions—not withdraw your funds. You can revoke API keys instantly."
      }
    ]
  },
  {
    category: "Technical & Support",
    questions: [
      {
        q: "What if the platform goes down during trading?",
        a: "KLINEO uses redundant infrastructure to minimize downtime. If the platform experiences an outage, your existing open positions remain on the exchange. Once service is restored, copying resumes. We cannot guarantee 100% uptime."
      },
      {
        q: "How do I contact support?",
        a: "You can reach support via: Email (support@klineo.xyz), the Support page in your dashboard, or our community Discord. Support hours are 9 AM - 9 PM UTC, Monday-Friday, with limited weekend coverage."
      },
      {
        q: "Can I use KLINEO on mobile?",
        a: "Yes! KLINEO is fully responsive and works on mobile browsers (iOS Safari, Android Chrome). We're developing native mobile apps for release in Q2 2026."
      },
      {
        q: "What if I have multiple exchange accounts?",
        a: "You can connect multiple exchange accounts to a single KLINEO account and manage them separately. Each exchange connection can copy different Master Traders with unique risk settings."
      }
    ]
  },
  {
    category: "Legal & Compliance",
    questions: [
      {
        q: "Is KLINEO regulated?",
        a: "KLINEO operates as a technology platform connecting users to exchanges. We comply with applicable laws, but we are not a regulated financial institution. Cryptocurrency regulations vary by jurisdiction."
      },
      {
        q: "Can I use KLINEO from my country?",
        a: "KLINEO is available globally except in restricted jurisdictions (including but not limited to: US, North Korea, Iran, Syria). Check your local laws regarding cryptocurrency trading before using the platform."
      },
      {
        q: "Do I need to pay taxes on trading profits?",
        a: "Tax obligations vary by country. In most jurisdictions, cryptocurrency trading profits are taxable. You are solely responsible for understanding and complying with tax laws. Consult a tax professional."
      },
      {
        q: "Where can I read the full terms and policies?",
        a: "Complete legal documents are available: Terms of Service, Privacy Policy, and Risk Disclosure Statement. These outline your rights, our responsibilities, and important risk information."
      }
    ]
  }
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start justify-between gap-4 py-4 px-6 hover:bg-secondary/30 transition-colors text-left"
      >
        <span className="font-medium text-sm">{question}</span>
        <ChevronDown className={`size-5 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export function FAQPage({ onNavigate }: FAQPageProps) {
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
                <HelpCircle className="size-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold">Frequently Asked Questions</h1>
                  <p className="text-xs text-muted-foreground">Everything you need to know about KLINEO</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-5xl">
        <div className="space-y-8">
          {faqCategories.map((category, idx) => (
            <Card key={idx} className="overflow-hidden">
              <div className="p-6 border-b border-border bg-secondary/20">
                <h2 className="text-lg font-semibold">{category.category}</h2>
              </div>
              <div>
                {category.questions.map((item, qIdx) => (
                  <FAQItem key={qIdx} question={item.q} answer={item.a} />
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Contact Support */}
        <Card className="mt-12 p-8 text-center">
          <HelpCircle className="size-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Still have questions?</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Our support team is here to help. Reach out and we'll get back to you as soon as possible.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline">
              Email Support
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              Go to Support Center
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}