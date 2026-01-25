import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, Sparkles, Bug, Zap, Shield, TrendingUp } from "lucide-react";

interface ChangelogPageProps {
  onNavigate: (view: string) => void;
}

const updates = [
  {
    version: "2.4.0",
    date: "January 23, 2026",
    type: "major",
    changes: [
      {
        type: "feature",
        title: "Enhanced Copy Trading Monitoring Dashboard",
        description: "Real-time P&L tracking with granular execution analytics and performance attribution by trader."
      },
      {
        type: "feature",
        title: "Advanced Risk Controls",
        description: "New trailing stop-loss options and per-trader allocation limits for better risk management."
      },
      {
        type: "improvement",
        title: "Execution Speed Optimization",
        description: "Reduced average copy delay from 250ms to 85ms through infrastructure upgrades."
      },
      {
        type: "fix",
        title: "Position Sync Issues",
        description: "Fixed rare edge cases where positions wouldn't sync correctly during high volatility."
      }
    ]
  },
  {
    version: "2.3.1",
    date: "January 15, 2026",
    type: "minor",
    changes: [
      {
        type: "improvement",
        title: "Master Trader Discovery",
        description: "Improved search and filtering in Marketplace with new performance metrics."
      },
      {
        type: "fix",
        title: "Mobile Responsiveness",
        description: "Fixed layout issues on mobile devices for Portfolio and Positions screens."
      },
      {
        type: "fix",
        title: "Notification Delays",
        description: "Resolved WebSocket reconnection issues causing delayed trade notifications."
      }
    ]
  },
  {
    version: "2.3.0",
    date: "January 8, 2026",
    type: "major",
    changes: [
      {
        type: "feature",
        title: "Referral Program Launch",
        description: "2-tier referral system with 10% and 5% commission structure now live."
      },
      {
        type: "feature",
        title: "Subscription Discounts",
        description: "Introduced 6-month subscription plans with 10% discount."
      },
      {
        type: "improvement",
        title: "Admin Panel Enhancements",
        description: "Comprehensive user management, payment tracking, and audit log system."
      },
      {
        type: "security",
        title: "API Key Encryption Upgrade",
        description: "Migrated to AES-256 encryption for all stored API credentials."
      }
    ]
  },
  {
    version: "2.2.0",
    date: "December 28, 2025",
    type: "major",
    changes: [
      {
        type: "feature",
        title: "OKX Exchange Integration",
        description: "Added support for OKX exchange with full copy trading capabilities."
      },
      {
        type: "feature",
        title: "Trade History Export",
        description: "Export complete trading history to CSV for tax reporting and analysis."
      },
      {
        type: "improvement",
        title: "Performance Metrics Expansion",
        description: "Added Sharpe Ratio, Sortino Ratio, and Max Drawdown to trader profiles."
      }
    ]
  },
  {
    version: "2.1.2",
    date: "December 20, 2025",
    type: "patch",
    changes: [
      {
        type: "fix",
        title: "Fee Calculation Edge Cases",
        description: "Corrected performance fee calculations for partial position closes."
      },
      {
        type: "fix",
        title: "Chart Rendering",
        description: "Fixed performance chart rendering issues on Safari browsers."
      },
      {
        type: "improvement",
        title: "Error Messages",
        description: "More descriptive error messages for API connection failures."
      }
    ]
  },
  {
    version: "2.1.0",
    date: "December 15, 2025",
    type: "major",
    changes: [
      {
        type: "feature",
        title: "Kraken Exchange Support",
        description: "Full integration with Kraken exchange for copy trading."
      },
      {
        type: "feature",
        title: "Portfolio Analytics",
        description: "Comprehensive portfolio view with allocation breakdowns and correlation analysis."
      },
      {
        type: "security",
        title: "Two-Factor Authentication",
        description: "Added optional 2FA for enhanced account security."
      }
    ]
  },
  {
    version: "2.0.0",
    date: "December 1, 2025",
    type: "major",
    changes: [
      {
        type: "feature",
        title: "Platform Redesign",
        description: "Complete UI overhaul with late-1990s terminal aesthetic and improved UX."
      },
      {
        type: "feature",
        title: "Master Trader Verification",
        description: "Launched comprehensive trader verification and approval system."
      },
      {
        type: "feature",
        title: "Risk Control Suite",
        description: "Max daily loss, position size limits, and emergency stop controls."
      },
      {
        type: "improvement",
        title: "Infrastructure Upgrade",
        description: "Migrated to multi-region deployment for 99.9% uptime SLA."
      }
    ]
  }
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case "feature":
      return <Sparkles className="size-4 text-primary" />;
    case "improvement":
      return <Zap className="size-4 text-[#10B981]" />;
    case "fix":
      return <Bug className="size-4 text-[#F59E0B]" />;
    case "security":
      return <Shield className="size-4 text-[#8B5CF6]" />;
    default:
      return <TrendingUp className="size-4 text-muted-foreground" />;
  }
};

const getTypeBadge = (type: string) => {
  switch (type) {
    case "major":
      return <Badge className="bg-primary text-background">Major Update</Badge>;
    case "minor":
      return <Badge variant="outline" className="border-[#10B981] text-[#10B981]">Minor Update</Badge>;
    case "patch":
      return <Badge variant="outline">Patch</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
};

export function ChangelogPage({ onNavigate }: ChangelogPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => onNavigate("landing")}>
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-3">
                <Sparkles className="size-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold">Changelog</h1>
                  <p className="text-xs text-muted-foreground">Platform updates and version history</p>
                </div>
              </div>
            </div>
            <Badge className="bg-primary text-background">v{updates[0].version}</Badge>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="border-b border-border bg-gradient-to-b from-secondary/20 to-background">
        <div className="container mx-auto px-6 py-12 max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-4">Continuous Improvement</h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            We're constantly evolving KLINEO based on user feedback and market needs. Here's what's new, 
            what's improved, and what we've fixed.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="space-y-8">
          {updates.map((update, idx) => (
            <Card key={idx} className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold">Version {update.version}</h2>
                    {getTypeBadge(update.type)}
                  </div>
                  <p className="text-sm text-muted-foreground">{update.date}</p>
                </div>
              </div>

              <div className="space-y-4">
                {update.changes.map((change, changeIdx) => (
                  <div key={changeIdx} className="flex gap-4 p-4 bg-secondary/20 rounded border border-border">
                    <div className="flex-shrink-0 mt-0.5">
                      {getTypeIcon(change.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1 text-sm">{change.title}</h3>
                      <p className="text-sm text-muted-foreground">{change.description}</p>
                    </div>
                    <Badge variant="outline" className="h-fit text-xs">{change.type}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Subscribe to Updates */}
        <Card className="mt-12 p-8 text-center bg-gradient-to-br from-secondary/20 to-background">
          <Sparkles className="size-12 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Stay in the Loop</h3>
          <p className="text-muted-foreground mb-6">
            Get notified about major platform updates and new features.
          </p>
          <Button className="bg-primary hover:bg-primary/90">
            Subscribe to Updates
          </Button>
        </Card>

        {/* Roadmap Teaser */}
        <Card className="mt-8 p-8">
          <h3 className="text-lg font-bold mb-4">Coming Soon</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="size-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Mobile Apps (iOS & Android)</span>
              <Badge variant="outline" className="ml-auto">Q2 2026</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="size-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Automated Strategy Builder</span>
              <Badge variant="outline" className="ml-auto">Q2 2026</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="size-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Social Trading Features</span>
              <Badge variant="outline" className="ml-auto">Q3 2026</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="size-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Additional Exchange Integrations</span>
              <Badge variant="outline" className="ml-auto">Ongoing</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
