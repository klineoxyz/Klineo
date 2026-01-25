/**
 * KLINEO Onboarding Wizard
 * 
 * 5-step guided onboarding for new users:
 * 1. Welcome
 * 2. Select Exchange
 * 3. Connect API Key
 * 4. Set Risk Controls
 * 5. Choose First Trader
 */

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import { Separator } from "@/app/components/ui/separator";
import { ValidatedInput, ValidatedNumberInput } from "@/app/components/ui/validated-input";
import {
  validateAPIKey,
  validateAPISecret,
  validateLeverage,
  validatePercentage,
} from "@/app/lib/form-validation";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Rocket,
  Shield,
  Key,
  TrendingUp,
  Users,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/app/lib/toast";

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

const exchanges = [
  { id: "binance", name: "Binance", logo: "🟡", popular: true },
  { id: "bybit", name: "Bybit", logo: "🟠", popular: true },
  { id: "okx", name: "OKX", logo: "⚫", popular: false },
  { id: "bitget", name: "Bitget", logo: "🔵", popular: false },
];

const mockTraders = [
  {
    id: "1",
    name: "CryptoMaster Pro",
    roi: 156.3,
    winRate: 68,
    followers: 1243,
    risk: "medium" as const,
  },
  {
    id: "2",
    name: "SafeTrade Elite",
    roi: 89.2,
    winRate: 74,
    followers: 892,
    risk: "low" as const,
  },
  {
    id: "3",
    name: "Momentum Trader",
    roi: 234.1,
    winRate: 61,
    followers: 2156,
    risk: "high" as const,
  },
];

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [selectedExchange, setSelectedExchange] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [leverage, setLeverage] = useState("5");
  const [maxPositionSize, setMaxPositionSize] = useState("10");
  const [dailyLossLimit, setDailyLossLimit] = useState("5");
  const [selectedTrader, setSelectedTrader] = useState("");
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [isApiSecretValid, setIsApiSecretValid] = useState(false);

  const progress = (currentStep / 5) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // Welcome screen, always can proceed
      case 2:
        return selectedExchange !== "";
      case 3:
        return isApiKeyValid && isApiSecretValid;
      case 4:
        return leverage && maxPositionSize && dailyLossLimit;
      case 5:
        return selectedTrader !== "";
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as OnboardingStep);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as OnboardingStep);
    }
  };

  const handleComplete = () => {
    toast.success("Onboarding complete!", {
      description: "You're ready to start copy trading",
    });
    onComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep />;
      case 2:
        return (
          <ExchangeSelectionStep
            selectedExchange={selectedExchange}
            onSelect={setSelectedExchange}
          />
        );
      case 3:
        return (
          <APIKeyStep
            apiKey={apiKey}
            setApiKey={setApiKey}
            apiSecret={apiSecret}
            setApiSecret={setApiSecret}
            exchangeName={exchanges.find((e) => e.id === selectedExchange)?.name || "Exchange"}
            onApiKeyValidation={(result) => setIsApiKeyValid(result.valid)}
            onApiSecretValidation={(result) => setIsApiSecretValid(result.valid)}
          />
        );
      case 4:
        return (
          <RiskControlsStep
            leverage={leverage}
            setLeverage={setLeverage}
            maxPositionSize={maxPositionSize}
            setMaxPositionSize={setMaxPositionSize}
            dailyLossLimit={dailyLossLimit}
            setDailyLossLimit={setDailyLossLimit}
          />
        );
      case 5:
        return (
          <TraderSelectionStep
            selectedTrader={selectedTrader}
            onSelect={setSelectedTrader}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="size-10 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-background">K</span>
            </div>
            <h1 className="text-2xl font-bold">KLINEO</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Get started in 5 simple steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStep} of 5
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex flex-col items-center">
              <div
                className={`size-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step < currentStep
                    ? "bg-[#10B981] text-white"
                    : step === currentStep
                    ? "bg-accent text-background"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {step < currentStep ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  step
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 hidden sm:block">
                {step === 1 && "Welcome"}
                {step === 2 && "Exchange"}
                {step === 3 && "API Key"}
                {step === 4 && "Risk"}
                {step === 5 && "Trader"}
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <Card className="p-8 mb-6">{renderStep()}</Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onSkip}>
            Skip Setup
          </Button>
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-accent text-background hover:bg-accent/90"
            >
              {currentStep === 5 ? (
                <>
                  Complete Setup
                  <Rocket className="size-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="size-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 1: Welcome
function WelcomeStep() {
  return (
    <div className="text-center space-y-6">
      <div className="size-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
        <Rocket className="size-10 text-accent" />
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-3">Welcome to KLINEO</h2>
        <p className="text-muted-foreground leading-relaxed max-w-lg mx-auto">
          The professional copy trading terminal for centralized exchanges. We'll help you set
          up your account, connect your exchange, and start copying profitable traders in under
          5 minutes.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 pt-4">
        <div className="p-4 bg-secondary/30 rounded-lg">
          <Shield className="size-6 text-accent mx-auto mb-2" />
          <div className="text-xs font-medium">Your Keys</div>
          <div className="text-[10px] text-muted-foreground">Remain in your control</div>
        </div>
        <div className="p-4 bg-secondary/30 rounded-lg">
          <Key className="size-6 text-accent mx-auto mb-2" />
          <div className="text-xs font-medium">Read-Only</div>
          <div className="text-[10px] text-muted-foreground">No withdrawals possible</div>
        </div>
        <div className="p-4 bg-secondary/30 rounded-lg">
          <TrendingUp className="size-6 text-accent mx-auto mb-2" />
          <div className="text-xs font-medium">Fee on Profit</div>
          <div className="text-[10px] text-muted-foreground">Only when you win</div>
        </div>
      </div>
    </div>
  );
}

// Step 2: Exchange Selection
function ExchangeSelectionStep({
  selectedExchange,
  onSelect,
}: {
  selectedExchange: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Select Your Exchange</h2>
        <p className="text-sm text-muted-foreground">
          Choose the exchange where you want to copy trade
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {exchanges.map((exchange) => (
          <button
            key={exchange.id}
            onClick={() => onSelect(exchange.id)}
            className={`p-6 rounded-lg border-2 transition-all hover:border-accent/50 ${
              selectedExchange === exchange.id
                ? "border-accent bg-accent/10"
                : "border-border"
            }`}
          >
            <div className="text-4xl mb-3">{exchange.logo}</div>
            <div className="text-base font-semibold mb-1">{exchange.name}</div>
            {exchange.popular && (
              <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30">
                Popular
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 3: API Key Connection
function APIKeyStep({
  apiKey,
  setApiKey,
  apiSecret,
  setApiSecret,
  exchangeName,
  onApiKeyValidation,
  onApiSecretValidation,
}: {
  apiKey: string;
  setApiKey: (value: string) => void;
  apiSecret: string;
  setApiSecret: (value: string) => void;
  exchangeName: string;
  onApiKeyValidation: (result: { valid: boolean }) => void;
  onApiSecretValidation: (result: { valid: boolean }) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Connect {exchangeName}</h2>
        <p className="text-sm text-muted-foreground">
          Create a read-only API key from your exchange
        </p>
      </div>

      <div className="p-4 bg-[#FFB000]/10 border border-[#FFB000]/20 rounded-lg">
        <div className="flex gap-3">
          <AlertTriangle className="size-5 text-[#FFB000] flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-[#FFB000] mb-1">Important Security Note</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              Do NOT enable withdrawal permissions on your API key. KLINEO only needs read and
              trade permissions to function.
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <ValidatedInput
          label="API Key"
          name="apiKey"
          placeholder="Enter your API key"
          value={apiKey}
          onChange={setApiKey}
          validator={validateAPIKey}
          onValidation={onApiKeyValidation}
          required
          helpText="Create this in your exchange's API settings"
        />
        <ValidatedInput
          label="API Secret"
          name="apiSecret"
          type="password"
          placeholder="Enter your API secret"
          value={apiSecret}
          onChange={setApiSecret}
          validator={validateAPISecret}
          onValidation={onApiSecretValidation}
          required
          helpText="Keep this secret - never share it"
        />
      </div>

      <div className="text-center">
        <a
          href={`https://www.${exchangeName.toLowerCase()}.com/api-management`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline"
        >
          How do I create an API key on {exchangeName}? →
        </a>
      </div>
    </div>
  );
}

// Step 4: Risk Controls
function RiskControlsStep({
  leverage,
  setLeverage,
  maxPositionSize,
  setMaxPositionSize,
  dailyLossLimit,
  setDailyLossLimit,
}: {
  leverage: string;
  setLeverage: (value: string) => void;
  maxPositionSize: string;
  setMaxPositionSize: (value: string) => void;
  dailyLossLimit: string;
  setDailyLossLimit: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Set Risk Controls</h2>
        <p className="text-sm text-muted-foreground">
          Protect your capital with automatic risk limits
        </p>
      </div>

      <div className="space-y-4">
        <ValidatedNumberInput
          label="Maximum Leverage"
          name="leverage"
          placeholder="5"
          value={leverage}
          onChange={setLeverage}
          validator={validateLeverage}
          min={1}
          max={125}
          step={1}
          unit="x"
          required
          helpText="Lower leverage = safer trading"
        />
        <ValidatedNumberInput
          label="Max Position Size"
          name="maxPositionSize"
          placeholder="10"
          value={maxPositionSize}
          onChange={setMaxPositionSize}
          validator={(val) => validatePercentage(val, 1, 100, "Position size")}
          min={1}
          max={100}
          step={1}
          unit="%"
          required
          helpText="Maximum % of portfolio per position"
        />
        <ValidatedNumberInput
          label="Daily Loss Limit"
          name="dailyLossLimit"
          placeholder="5"
          value={dailyLossLimit}
          onChange={setDailyLossLimit}
          validator={(val) => validatePercentage(val, 1, 100, "Daily loss limit")}
          min={1}
          max={100}
          step={1}
          unit="%"
          required
          helpText="Stop trading if daily loss exceeds this"
        />
      </div>

      <div className="p-4 bg-secondary/30 rounded-lg">
        <div className="text-xs font-medium mb-2">💡 Recommended Settings</div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          For beginners: 5x leverage, 10% position size, 5% daily loss limit. You can adjust
          these anytime in Settings.
        </div>
      </div>
    </div>
  );
}

// Step 5: Trader Selection
function TraderSelectionStep({
  selectedTrader,
  onSelect,
}: {
  selectedTrader: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Choose Your First Trader</h2>
        <p className="text-sm text-muted-foreground">
          Start copying a verified master trader (you can add more later)
        </p>
      </div>

      <div className="space-y-3">
        {mockTraders.map((trader) => (
          <button
            key={trader.id}
            onClick={() => onSelect(trader.id)}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              selectedTrader === trader.id
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent/50"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold mb-1">{trader.name}</div>
                <Badge
                  variant="outline"
                  className={
                    trader.risk === "low"
                      ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30"
                      : trader.risk === "medium"
                      ? "bg-[#FFB000]/20 text-[#FFB000] border-[#FFB000]/30"
                      : "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30"
                  }
                >
                  {trader.risk} risk
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-sm text-[#10B981] font-medium">+{trader.roi}%</div>
                <div className="text-xs text-muted-foreground">ROI</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-muted-foreground">Win Rate</div>
                <div className="font-medium">{trader.winRate}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Followers</div>
                <div className="font-medium">{trader.followers.toLocaleString()}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
