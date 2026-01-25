/**
 * KLINEO Tooltip & Help System
 * 
 * Info tooltips for trading terms and advanced features.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { HelpCircle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/app/components/ui/utils";

interface HelpTooltipProps {
  term: string;
  definition: string;
  example?: string;
  icon?: "help" | "info" | "warning";
  className?: string;
}

export function HelpTooltip({
  term,
  definition,
  example,
  icon = "help",
  className,
}: HelpTooltipProps) {
  const Icon =
    icon === "help"
      ? HelpCircle
      : icon === "info"
      ? Info
      : AlertCircle;

  const iconColor =
    icon === "warning" ? "text-[#FFB000]" : "text-muted-foreground";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center justify-center",
              iconColor,
              "hover:text-foreground transition-colors",
              className
            )}
          >
            <Icon className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          <div className="space-y-2">
            <div className="font-semibold text-accent">{term}</div>
            <div className="text-xs leading-relaxed text-muted-foreground">
              {definition}
            </div>
            {example && (
              <div className="text-xs leading-relaxed text-muted-foreground/70 pt-2 border-t border-border">
                <span className="font-medium">Example:</span> {example}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Pre-configured tooltips for common trading terms
 */

export function ROITooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      term="ROI (Return on Investment)"
      definition="The percentage gain or loss on your investment over a specific time period. KLINEO calculates this as (Current Value - Initial Investment) / Initial Investment × 100."
      example="If you invested $1,000 and now have $1,500, your ROI is 50%."
      className={className}
    />
  );
}

export function WinRateTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      term="Win Rate"
      definition="The percentage of profitable trades out of total trades. A higher win rate indicates more consistent profits, but doesn't guarantee overall profitability."
      example="If a trader has 70 winning trades out of 100 total trades, their win rate is 70%."
      className={className}
    />
  );
}

export function MaxDrawdownTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      term="Max Drawdown"
      definition="The largest peak-to-trough decline in portfolio value. This measures the maximum loss experienced from a high point. Lower drawdown indicates better risk management."
      example="If your portfolio grew from $10k to $15k, then dropped to $12k, the max drawdown is 20% ($15k to $12k)."
      icon="warning"
      className={className}
    />
  );
}

export function SharpeRatioTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      term="Sharpe Ratio"
      definition="A measure of risk-adjusted return. It shows how much excess return you receive for the extra volatility you endure. Higher is better. Above 1 is good, above 2 is very good."
      example="A Sharpe ratio of 1.5 means you're getting 1.5 units of return for every unit of risk taken."
      className={className}
    />
  );
}

export function LeverageTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      term="Leverage"
      definition="Borrowing capital to amplify potential returns (and losses). 5x leverage means you can control $5,000 worth of assets with only $1,000 of your own capital."
      example="With 5x leverage, a 2% price move results in a 10% gain or loss on your capital. Higher leverage increases both profit potential and liquidation risk."
      icon="warning"
      className={className}
    />
  );
}

export function PnLTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      term="PnL (Profit and Loss)"
      definition="The net profit or loss on your positions. Unrealized PnL is for open positions, Realized PnL is for closed positions."
      example="If you bought BTC at $40k and it's now $42k, your unrealized PnL is +$2k. When you sell, it becomes realized PnL."
      className={className}
    />
  );
}

export function CopyRatioTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      term="Copy Ratio"
      definition="The percentage of the master trader's position size that you copy. 100% means you match their exact position size (adjusted for your portfolio). Lower percentages provide more conservative copying."
      example="At 50% copy ratio, if the master trader opens a $1,000 position, you'll open a $500 position (assuming portfolio size allows)."
      className={className}
    />
  );
}

export function FollowersTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      term="Followers"
      definition="The number of users actively copying this trader. Higher follower counts can indicate trust and proven performance, but verify performance metrics independently."
      example="A trader with 1,000+ followers has established a track record, but always check their recent performance and risk metrics."
      icon="info"
      className={className}
    />
  );
}

export function RiskScoreTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      term="Risk Score"
      definition="KLINEO's proprietary risk rating from 1-10, based on drawdown, volatility, leverage usage, and win rate consistency. Lower scores indicate safer traders."
      example="Risk Score 3 = Conservative. Risk Score 7 = Aggressive. Choose based on your risk tolerance."
      icon="warning"
      className={className}
    />
  );
}

export function DailyLossLimitTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      term="Daily Loss Limit"
      definition="Maximum percentage loss allowed in a single day. When this limit is hit, copy trading automatically pauses for the rest of the day to protect your capital."
      example="With a 5% daily loss limit on a $10,000 portfolio, trading stops after losing $500 in one day."
      icon="warning"
      className={className}
    />
  );
}

export function PositionSizeTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      term="Max Position Size"
      definition="Maximum percentage of your portfolio allocated to a single position. This prevents overconcentration in any one trade and manages risk exposure."
      example="With a 10% max position size and $10,000 portfolio, no single position will exceed $1,000."
      className={className}
    />
  );
}

/**
 * Inline help text with optional tooltip
 */
interface InlineHelpProps {
  text: string;
  tooltip?: {
    term: string;
    definition: string;
    example?: string;
  };
}

export function InlineHelp({ text, tooltip }: InlineHelpProps) {
  if (!tooltip) {
    return <span className="text-xs text-muted-foreground">{text}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {text}
      <HelpTooltip
        term={tooltip.term}
        definition={tooltip.definition}
        example={tooltip.example}
      />
    </span>
  );
}

/**
 * Feature explanation card
 */
interface FeatureExplainerProps {
  title: string;
  description: string;
  steps?: string[];
  icon?: React.ReactNode;
}

export function FeatureExplainer({
  title,
  description,
  steps,
  icon,
}: FeatureExplainerProps) {
  return (
    <div className="p-4 bg-secondary/30 rounded-lg border border-border">
      <div className="flex items-start gap-3">
        {icon && <div className="flex-shrink-0 text-accent">{icon}</div>}
        <div className="flex-1">
          <div className="font-medium mb-2">{title}</div>
          <div className="text-sm text-muted-foreground leading-relaxed mb-3">
            {description}
          </div>
          {steps && steps.length > 0 && (
            <ol className="space-y-1 text-xs text-muted-foreground">
              {steps.map((step, index) => (
                <li key={index} className="flex gap-2">
                  <span className="font-medium text-accent">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Context-sensitive help section
 */
interface HelpSectionProps {
  title: string;
  articles: Array<{
    question: string;
    answer: string;
  }>;
}

export function HelpSection({ title, articles }: HelpSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="space-y-3">
        {articles.map((article, index) => (
          <details
            key={index}
            className="group p-4 bg-secondary/30 rounded-lg border border-border"
          >
            <summary className="cursor-pointer font-medium flex items-center justify-between">
              {article.question}
              <span className="text-muted-foreground group-open:rotate-90 transition-transform">
                ›
              </span>
            </summary>
            <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {article.answer}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
