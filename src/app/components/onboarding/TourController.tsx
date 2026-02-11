import { useState, useEffect, useCallback, useRef } from "react";
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS } from "react-joyride";
import { useLocation, useNavigate } from "react-router-dom";
import { useDemo } from "@/app/contexts/DemoContext";
import { useOnboardingStatus } from "@/app/hooks/useOnboardingStatus";
import { api } from "@/lib/api";
import type { TourFlowId, TourStepConfig } from "./tourSteps";
import { getStepsForFlow, toJoyrideSteps } from "./tourSteps";
import type { EntitlementResponse } from "@/lib/api";

const WAIT_FOR_TARGET_MS = 8000;
const POLL_INTERVAL_MS = 250;

interface TourControllerProps {
  /** Which flow to run; null = not running */
  flowId: TourFlowId | null;
  onFinish: () => void;
  onSkip: () => void;
  /** Entitlement for conditional steps */
  entitlement: EntitlementResponse | null;
}

export function TourController({ flowId, onFinish, onSkip, entitlement }: TourControllerProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { markCompleted, markSkipped } = useOnboardingStatus();
  const [stepIndex, setStepIndex] = useState(0);
  const [run, setRun] = useState(false);
  const [pendingStep, setPendingStep] = useState<number | null>(null);
  const [steps, setSteps] = useState<TourStepConfig[]>([]);
  const joyrideSteps = steps.length ? toJoyrideSteps(steps) : [];
  const configsRef = useRef<TourStepConfig[]>([]);

  const ctx = {
    isDemoMode,
    joiningFeePaid: entitlement?.joiningFeePaid ?? false,
    activePackageId: entitlement?.activePackageId ?? null,
    remainingUsd: entitlement?.remainingUsd ?? 0,
    status: entitlement?.status ?? "inactive",
  };

  /** Normalize path for comparison (no trailing slash) */
  const currentPath = pathname.replace(/\/$/, "") || "/";

  const isSameRoute = useCallback((route: string | undefined) => {
    if (!route) return true;
    const r = route.replace(/\/$/, "") || "/";
    return currentPath === r;
  }, [currentPath]);

  // When flowId is set, build steps and start
  useEffect(() => {
    if (!flowId) {
      setRun(false);
      setStepIndex(0);
      setPendingStep(null);
      setSteps([]);
      configsRef.current = [];
      return;
    }
    const configs = getStepsForFlow(flowId, ctx);
    configsRef.current = configs;
    setSteps(configs);
    if (configs.length === 0) {
      onFinish();
      return;
    }
    const first = configs[0];
    const needRoute = first.route && currentPath !== (first.route.replace(/\/$/, "") || "/");
    if (needRoute) {
      navigate(first.route!);
      setPendingStep(0);
      setStepIndex(0);
      setRun(false);
    } else {
      setStepIndex(0);
      setRun(true);
      setPendingStep(null);
    }
  }, [flowId, currentPath]); // eslint-disable-line react-hooks/exhaustive-deps -- init once per flowId; use currentPath for first-step route

  // Wait for target when pendingStep is set (after navigation to show step on correct page)
  useEffect(() => {
    if (pendingStep === null || configsRef.current.length === 0) return;
    const config = configsRef.current[pendingStep];
    const targetSelector = config.target;
    const start = Date.now();
    const id = setInterval(() => {
      const el = document.querySelector(targetSelector);
      if (el) {
        clearInterval(id);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setStepIndex(pendingStep);
        setPendingStep(null);
        setRun(true);
        return;
      }
      if (Date.now() - start >= WAIT_FOR_TARGET_MS) {
        clearInterval(id);
        if (pendingStep + 1 >= configsRef.current.length) {
          onFinish();
          return;
        }
        setPendingStep(pendingStep + 1);
        const next = configsRef.current[pendingStep + 1];
        if (next.route && !isSameRoute(next.route)) {
          navigate(next.route);
        }
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pendingStep, isSameRoute, navigate, onFinish]);

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { action, index, status, type } = data;
      if (status === STATUS.SKIPPED || status === STATUS.CLOSED || action === ACTIONS.CLOSE) {
        markSkipped();
        onSkip();
        return;
      }
      if (status === STATUS.FINISHED || status === STATUS.COMPLETE) {
        markCompleted();
        onFinish();
        return;
      }
      if (type === EVENTS.STEP_AFTER) {
        const nextIndex = index + 1;
        if (nextIndex >= configsRef.current.length) {
          markCompleted();
          onFinish();
          return;
        }
        const nextConfig = configsRef.current[nextIndex];
        if (nextConfig.route && !isSameRoute(nextConfig.route)) {
          navigate(nextConfig.route);
          setRun(false);
          setPendingStep(nextIndex);
        } else {
          setStepIndex(nextIndex);
        }
      } else if (type === EVENTS.STEP_BEFORE) {
        setStepIndex(index);
      }
    },
    [isSameRoute, navigate, onFinish, onSkip, markCompleted, markSkipped]
  );

  if (!flowId || joyrideSteps.length === 0) return null;

  return (
    <Joyride
      steps={joyrideSteps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      scrollDuration={300}
      spotlightClicks={false}
      disableOverlayClose={false}
      callback={handleCallback}
      floaterProps={{
        disableAnimation: false,
        styles: {
          floater: { filter: "none" },
        },
      }}
      tooltipComponent={(props) => {
        const { index, isLastStep, step, backProps, primaryProps, skipProps, tooltipProps } = props;
        const total = joyrideSteps.length;
        return (
          <div
            {...tooltipProps}
            className="rounded-lg border border-border bg-card text-foreground shadow-xl max-w-[260px]"
            style={{
              padding: "10px 12px",
              ...(tooltipProps.style || {}),
            }}
          >
            {total > 1 && (
              <div className="text-[10px] text-muted-foreground/80 mb-1.5">
                {index + 1} of {total}
              </div>
            )}
            {step.title && (
              <div className="text-sm font-semibold mb-1 leading-tight">{step.title}</div>
            )}
            <div className="text-xs text-muted-foreground leading-snug mb-2.5">{step.content}</div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                {...skipProps}
                className="text-xs text-muted-foreground hover:text-foreground transition"
              >
                Skip
              </button>
              <div className="flex items-center gap-1.5">
                {index > 0 && (
                  <button
                    type="button"
                    {...backProps}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  {...primaryProps}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
                >
                  {isLastStep ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </div>
        );
      }}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--card))",
          overlayColor: "rgba(0,0,0,0.5)",
          arrowColor: "hsl(var(--card))",
        },
        tooltip: {
          borderRadius: 8,
          padding: 0,
        },
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipTitle: {
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 4,
        },
        tooltipContent: {
          fontSize: 12,
          lineHeight: 1.4,
        },
        buttonNext: {
          fontSize: 12,
          padding: "6px 12px",
        },
        buttonBack: {
          fontSize: 12,
          padding: "6px 12px",
        },
        buttonSkip: {
          fontSize: 12,
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip",
      }}
    />
  );
}
