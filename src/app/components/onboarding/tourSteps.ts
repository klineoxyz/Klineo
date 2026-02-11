/**
 * Tour step definitions for Joyride. Each step uses a stable selector [data-onboarding="key"].
 * Steps can optionally specify a route to navigate to before showing.
 */
import type { Step } from "react-joyride";
import { ROUTES } from "@/app/config/routes";

export type TourFlowId = "getting-started" | "payment-activation" | "start-copy-trading";

export interface TourStepConfig {
  target: string;
  content: React.ReactNode;
  title?: string;
  placement?: Step["placement"];
  /** Route to be on when showing this step; controller will navigate if needed */
  route?: string;
}

export interface TourContext {
  isDemoMode: boolean;
  joiningFeePaid: boolean;
  activePackageId: string | null;
  remainingUsd: number;
  status: string;
}

function step(target: string, title: string, content: React.ReactNode, options?: { route?: string; placement?: Step["placement"] }): TourStepConfig {
  return {
    target: `[data-onboarding="${target}"]`,
    title,
    content,
    placement: options?.placement ?? "auto",
    route: options?.route,
  };
}

/** Flow A: Getting Started */
export function getGettingStartedSteps(ctx: TourContext): TourStepConfig[] {
  const steps: TourStepConfig[] = [];

  if (ctx.isDemoMode) {
    steps.push(
      step(
        "topbar-demo-toggle",
        "You're in Demo mode",
        "Demo uses simulated data so you can explore safely. Switch to Live when you're ready to connect a real exchange and trade.",
        { route: ROUTES.dashboard }
      )
    );
  }

  steps.push(
    step(
      "dashboard-header",
      "Your command center",
      "Dashboard shows your equity, copy setups, and DCA bots. Key features are in the sidebar: Marketplace, Copy Trading, Packages, and Settings.",
      { route: ROUTES.dashboard }
    ),
    step(
      "topbar-demo-toggle",
      "Demo vs Live",
      "Toggle between Demo (safe, simulated data) and Live (real exchange connection and trades). Use Demo to explore before going live.",
      { route: ROUTES.dashboard }
    ),
    step(
      "nav-packages",
      "Packages",
      "Pay the one-time joining fee and choose a package to unlock your profit allowance. Packages determine how much you can earn from copy trading.",
      { route: ROUTES.dashboard }
    ),
    step(
      "nav-settings",
      "Settings",
      "Connect your Binance or Bybit API key here. You need a connected exchange to copy trade in Live mode.",
      { route: ROUTES.dashboard }
    ),
    step(
      "nav-marketplace",
      "Marketplace",
      "Browse Master Traders and their listed strategies. Pick a trader and start copying their trades.",
      { route: ROUTES.dashboard }
    ),
    step(
      "nav-copy-trading",
      "Copy Trading",
      "See all your active copy setups here. Pause, resume, or stop copying anytime.",
      { route: ROUTES.dashboard }
    ),
    step(
      "nav-referrals",
      "Referrals",
      "Share your link and earn when referred users pay. Request payout when you hit the minimum.",
      { route: ROUTES.dashboard }
    )
  );

  return steps;
}

/** Flow B: Payment & Activation */
export function getPaymentActivationSteps(ctx: TourContext): TourStepConfig[] {
  const steps: TourStepConfig[] = [];

  steps.push(
    step(
      "packages-joining-fee",
      "Joining fee",
      "Pay the one-time joining fee to activate your account. Then you can buy packages and start copy trading.",
      { route: ROUTES.packages }
    ),
    step(
      "packages-pay-joining",
      "Pay joining fee",
      "Click here to create a payment. You'll send USDT (BEP20) to the Safe address and submit your transaction hash.",
      { route: ROUTES.packages }
    ),
    step(
      "packages-entry",
      "Entry package",
      "Starter package with a profit allowance to earn from copy trading. Often shown with a 50% promo.",
      { route: ROUTES.packages }
    ),
    step(
      "payments-safe-address",
      "Safe address",
      "Send USDT (BEP20) to this address for the exact amount shown. Use the same network to avoid loss.",
      { route: ROUTES.payments }
    ),
    step(
      "payments-submit-tx",
      "Submit your payment",
      "After sending, paste your transaction hash and the wallet you sent from. Admin will approve and your account will activate.",
      { route: ROUTES.payments }
    ),
    step(
      "payments-amount",
      "Check status",
      "Your payment intents appear here. Once approved, you can buy packages and start copy trading.",
      { route: ROUTES.payments }
    )
  );

  return steps;
}

/** Flow C: Start Copy Trading */
export function getStartCopyTradingSteps(ctx: TourContext): TourStepConfig[] {
  const steps: TourStepConfig[] = [];

  if (!ctx.joiningFeePaid) {
    steps.push(
      step(
        "nav-packages",
        "Copy trading is locked",
        "Pay the joining fee and activate your account first. Then you can browse traders and start copying.",
        { route: ROUTES.dashboard }
      )
    );
    steps.push(
      step(
        "dashboard-cta-packages",
        "Go to Packages",
        "Click here to pay the joining fee and unlock copy trading.",
        { route: ROUTES.dashboard }
      )
    );
    return steps;
  }

  if (ctx.status === "exhausted" || (ctx.status === "active" && ctx.remainingUsd <= 0)) {
    steps.push(
      step(
        "nav-packages",
        "Allowance exhausted",
        "You've used your profit allowance. Buy another package to keep earning from copy trading.",
        { route: ROUTES.packages }
      )
    );
    return steps;
  }

  steps.push(
    step(
      "marketplace-tabs",
      "Traders & Strategies",
      "Browse Master Traders or strategies they've listed. Each strategy is run by a trader—copy the trader to follow their trades.",
      { route: ROUTES.marketplace }
    ),
    step(
      "marketplace-tab-traders",
      "Traders",
      "These are approved Master Traders. View their profile and performance, then start copying.",
      { route: ROUTES.marketplace }
    ),
    step(
      "marketplace-view-copy",
      "View & Copy",
      "Click this on a trader or strategy card to open their profile and set up copying.",
      { route: ROUTES.marketplace }
    ),
    step(
      "traderprofile-copy",
      "Copy this trader",
      "Set your allocation and risk limits. Click Copy Trader to open the setup form.",
      { route: ROUTES.marketplace }
    ),
    step(
      "copysetup-allocation",
      "Allocation",
      "Choose what % of your balance to allocate to this trader. You can run multiple copy setups.",
      { route: ROUTES.marketplace }
    ),
    step(
      "copysetup-submit",
      "Start copying",
      "Submit to start copying this trader's trades. You can pause or stop anytime from Copy Trading.",
      { route: ROUTES.marketplace }
    ),
    step(
      "copytrading-table",
      "Your copy setups",
      "All your active and paused copies appear here. Use the actions to pause, resume, or stop.",
      { route: ROUTES.copyTrading }
    ),
    step(
      "copytrading-actions",
      "Pause / Resume",
      "Control each copy setup individually. Pausing stops new trades; your open positions stay as they are.",
      { route: ROUTES.copyTrading }
    )
  );

  return steps;
}

export function getStepsForFlow(flowId: TourFlowId, ctx: TourContext): TourStepConfig[] {
  switch (flowId) {
    case "getting-started":
      return getGettingStartedSteps(ctx);
    case "payment-activation":
      return getPaymentActivationSteps(ctx);
    case "start-copy-trading":
      return getStartCopyTradingSteps(ctx);
    default:
      return [];
  }
}

/** Convert our config to Joyride Step (content as ReactNode is ok) */
export function toJoyrideSteps(configs: TourStepConfig[]): Step[] {
  return configs.map((c) => ({
    target: c.target,
    content: c.content,
    title: c.title,
    placement: c.placement ?? "auto",
    disableBeacon: true,
  }));
}
