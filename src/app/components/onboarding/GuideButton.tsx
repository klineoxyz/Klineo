import { BookOpen, ChevronDown, Rocket, CreditCard, Copy, Sparkles } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import type { TourFlowId } from "./tourSteps";

interface GuideButtonProps {
  onStartFlow: (flowId: TourFlowId) => void;
  onRestartWizard: () => void;
}

export function GuideButton({ onStartFlow, onRestartWizard }: GuideButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          title="Product guide"
          data-onboarding="topbar-guide"
        >
          <BookOpen className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onStartFlow("getting-started")}>
          <Rocket className="size-4 mr-2" />
          Getting Started
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStartFlow("payment-activation")}>
          <CreditCard className="size-4 mr-2" />
          Payment & Activation
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStartFlow("start-copy-trading")}>
          <Copy className="size-4 mr-2" />
          Start Copy Trading
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onRestartWizard}>
          <Sparkles className="size-4 mr-2" />
          Restart Wizard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
