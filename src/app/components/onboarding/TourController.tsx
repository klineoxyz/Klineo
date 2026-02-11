import { useState, useEffect, useCallback, useRef } from "react";
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS } from "react-joyride";
import { useLocation, useNavigate } from "react-router-dom";
import { useDemo } from "@/app/contexts/DemoContext";
import { useOnboardingStatus } from "@/app/hooks/useOnboardingStatus";
import { api } from "@/lib/api";
import type { TourFlowId, TourStepConfig } from "./tourSteps";
import { getStepsForFlow, toJoyrideSteps } from "./tourSteps";
import type { EntitlementResponse } from "@/lib/api";

const WAIT_FOR_TARGET_MS = 5000;
const POLL_INTERVAL_MS = 200;

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
    if (first.route && pathname !== first.route) {
      navigate(first.route);
      setPendingStep(0);
      setStepIndex(0);
      setRun(false);
    } else {
      setStepIndex(0);
      setRun(true);
      setPendingStep(null);
    }
  }, [flowId, pathname]); // eslint-disable-line react-hooks/exhaustive-deps -- we only want to init when flowId changes

  // Wait for target when pendingStep is set
  useEffect(() => {
    if (pendingStep === null || configsRef.current.length === 0) return;
    const config = configsRef.current[pendingStep];
    const targetSelector = config.target;
    const start = Date.now();
    const id = setInterval(() => {
      const el = document.querySelector(targetSelector);
      if (el) {
        clearInterval(id);
        setStepIndex(pendingStep);
        setPendingStep(null);
        setRun(true);
        return;
      }
      if (Date.now() - start >= WAIT_FOR_TARGET_MS) {
        clearInterval(id);
        // Skip this step
        if (pendingStep + 1 >= configsRef.current.length) {
          onFinish();
          return;
        }
        setPendingStep(pendingStep + 1);
        const next = configsRef.current[pendingStep + 1];
        if (next.route && pathname !== next.route) {
          navigate(next.route);
        }
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pendingStep, pathname, navigate, onFinish]);

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
        if (nextConfig.route && pathname !== nextConfig.route) {
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
    [pathname, navigate, onFinish, onSkip, markCompleted, markSkipped]
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
      spotlightClicks={false}
      disableOverlayClose={false}
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--card))",
          overlayColor: "rgba(0,0,0,0.6)",
          arrowColor: "hsl(var(--card))",
        },
        tooltip: {
          borderRadius: 12,
          padding: 16,
        },
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipTitle: {
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 8,
        },
        tooltipContent: {
          fontSize: 14,
          lineHeight: 1.5,
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
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
