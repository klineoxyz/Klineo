/**
 * Exchange selector row — horizontal row of exchange chips.
 * Binance and Bybit enabled; others show (soon) and are disabled.
 */

import { cn } from "@/app/components/ui/utils";
import {
  EXCHANGE_NAMES,
  EXCHANGE_SELECTOR_ORDER,
  isSupported,
  type ExchangeId,
} from "@/app/config/exchangeSteps";

interface ExchangeSelectorRowProps {
  selected: ExchangeId;
  onSelect: (id: ExchangeId) => void;
}

export function ExchangeSelectorRow({ selected, onSelect }: ExchangeSelectorRowProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center overflow-x-auto pb-1">
      {EXCHANGE_SELECTOR_ORDER.map((id) => {
        const enabled = isSupported(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => enabled && onSelect(id)}
            disabled={!enabled}
            className={cn(
              "px-4 py-2.5 rounded-full text-sm font-medium transition-all shrink-0 touch-manipulation",
              selected === id
                ? "text-white bg-white/10 border-b-2 border-primary shadow-sm"
                : enabled
                  ? "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                  : "text-slate-500/70 cursor-not-allowed opacity-60 border border-transparent"
            )}
          >
            {EXCHANGE_NAMES[id]}
            {!enabled && <span className="ml-1.5 opacity-80">(soon)</span>}
          </button>
        );
      })}
    </div>
  );
}
