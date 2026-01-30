"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type HoldToggleOptions = {
  onTrigger: (name: string) => void;
  durationMs?: number;
  blockMs?: number;
};

export const useHoldToggle = ({
  onTrigger,
  durationMs = 700,
  blockMs = 900,
}: HoldToggleOptions) => {
  const [holdItem, setHoldItem] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdRafRef = useRef<number | null>(null);
  const holdSuppressClickRef = useRef(false);
  const holdBlockUntilRef = useRef(0);
  const holdStartRef = useRef(0);

  const cancelHold = useCallback(() => {
    if (holdRafRef.current) {
      cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    holdStartRef.current = 0;
    setHoldItem(null);
    setHoldProgress(0);
  }, []);

  const startHold = useCallback(
    (name: string) => {
      cancelHold();
      holdStartRef.current = performance.now();
      setHoldItem(name);
      setHoldProgress(0);

      const tick = (now: number) => {
        const elapsed = now - holdStartRef.current;
        const progress = Math.min(elapsed / durationMs, 1);
        setHoldProgress(progress);
        if (progress >= 1) {
          holdSuppressClickRef.current = true;
          holdBlockUntilRef.current = Date.now() + blockMs;
          onTrigger(name);
          cancelHold();
          window.setTimeout(() => {
            holdSuppressClickRef.current = false;
          }, blockMs);
          return;
        }
        holdRafRef.current = requestAnimationFrame(tick);
      };

      holdRafRef.current = requestAnimationFrame(tick);
    },
    [blockMs, cancelHold, durationMs, onTrigger]
  );

  const shouldSuppressClick = useCallback(() => {
    return (
      holdSuppressClickRef.current || Date.now() < holdBlockUntilRef.current
    );
  }, []);

  useEffect(() => {
    return () => cancelHold();
  }, [cancelHold]);

  return {
    holdItem,
    holdProgress,
    startHold,
    cancelHold,
    shouldSuppressClick,
  };
};
