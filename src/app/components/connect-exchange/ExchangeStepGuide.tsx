/**
 * Exchange step-by-step guide — right column of Connect Exchange modal.
 */

import { ExternalLink } from "lucide-react";
import type { ExchangeStep } from "@/app/config/exchangeSteps";

interface ExchangeStepGuideProps {
  steps: ExchangeStep[];
}

export function ExchangeStepGuide({ steps }: ExchangeStepGuideProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 relative"
        >
          <span className="absolute top-4 right-4 inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            {step.label}
          </span>
          <div className="pr-20">
            <p className="text-sm text-slate-300 leading-relaxed">{step.text}</p>
            {(step.linkText && step.linkHref) || (step.linkTextSecondary && step.linkHrefSecondary) ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {step.linkText && step.linkHref && (
                  <a
                    href={step.linkHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 hover:border-primary/60 transition-colors"
                  >
                    {step.linkText}
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
                {step.linkTextSecondary && step.linkHrefSecondary && (
                  <a
                    href={step.linkHrefSecondary}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    {step.linkTextSecondary}
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            ) : null}
            {step.checklist && step.checklist.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                {step.checklist.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
                {step.checklistDoNot && (
                  <li className="flex items-start gap-2 text-amber-400">
                    <span className="mt-0.5">✗</span>
                    {step.checklistDoNot}
                  </li>
                )}
              </ul>
            )}
            {step.showScreenshot && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                {step.screenshotSrc ? (
                  <img
                    src={step.screenshotSrc}
                    alt=""
                    className="w-full h-auto max-h-[220px] object-contain object-top"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-28 flex items-center justify-center text-slate-500 text-xs">
                    Screenshot placeholder
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
