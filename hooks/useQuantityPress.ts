"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { PointerEvent } from "react";

type UseQuantityPressParams = {
  value: number;
  min: number;
  max: number;
  repeatStep: number;
  enabled?: boolean;
  onChange: (nextValue: number) => void;
};

type PressHandlers = {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
};

export const useQuantityPress = ({
  value,
  min,
  max,
  repeatStep,
  enabled = true,
  onChange,
}: UseQuantityPressParams) => {
  const valueRef = useRef(value);
  const holdTimeout = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);
  const minusPress = useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    holdStarted: false,
    pressTimeout: null as number | null,
  });
  const plusPress = useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    holdStarted: false,
    pressTimeout: null as number | null,
  });

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const clearHold = useCallback(() => {
    if (holdTimeout.current) {
      window.clearTimeout(holdTimeout.current);
      holdTimeout.current = null;
    }
    if (holdInterval.current) {
      window.clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
  }, []);

  useEffect(() => {
    const minusPressRef = minusPress;
    const plusPressRef = plusPress;
    return () => {
      clearHold();
      if (minusPressRef.current.pressTimeout) {
        window.clearTimeout(minusPressRef.current.pressTimeout);
      }
      if (plusPressRef.current.pressTimeout) {
        window.clearTimeout(plusPressRef.current.pressTimeout);
      }
    };
  }, [clearHold]);

  const applyDelta = useCallback(
    (delta: number) => {
      if (!enabled) return;
      const next = Math.max(min, Math.min(max, valueRef.current + delta));
      if (next === valueRef.current) return;
      valueRef.current = next;
      onChange(next);
    },
    [enabled, max, min, onChange]
  );

  const holdStartDelay = 280;
  const holdIntervalDelay = 180;
  const pressDelayMs = 110;
  const moveThreshold = 8;

  const startHold = useCallback(
    (delta: number, initialDelta = delta) => {
      if (!enabled) return;
      if (delta < 0 && valueRef.current <= min) return;
      if (delta > 0 && valueRef.current >= max) return;
      applyDelta(initialDelta);
      clearHold();
      holdTimeout.current = window.setTimeout(() => {
        holdInterval.current = window.setInterval(() => {
          applyDelta(delta < 0 ? -repeatStep : repeatStep);
        }, holdIntervalDelay);
      }, holdStartDelay);
    },
    [applyDelta, clearHold, enabled, max, min, repeatStep]
  );

  const minusHandlers = useMemo<PressHandlers>(() => {
    const pressRef = minusPress;
    const resetPressState = () => {
      if (pressRef.current.pressTimeout) {
        window.clearTimeout(pressRef.current.pressTimeout);
      }
      pressRef.current.pressTimeout = null;
      pressRef.current.pointerId = null;
      pressRef.current.holdStarted = false;
    };

    const cancelPress = () => {
      resetPressState();
      clearHold();
    };

    return {
      onPointerDown: (event) => {
        if (!enabled) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        if (event.pointerType === "mouse") {
          event.preventDefault();
          startHold(-1);
          return;
        }

        pressRef.current.pointerId = event.pointerId;
        pressRef.current.startX = event.clientX;
        pressRef.current.startY = event.clientY;
        pressRef.current.holdStarted = false;
        if (pressRef.current.pressTimeout) {
          window.clearTimeout(pressRef.current.pressTimeout);
        }
        pressRef.current.pressTimeout = window.setTimeout(() => {
          pressRef.current.holdStarted = true;
          startHold(-1, -repeatStep);
        }, pressDelayMs);
        event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove: (event) => {
        if (pressRef.current.pointerId !== event.pointerId) return;
        const dx = event.clientX - pressRef.current.startX;
        const dy = event.clientY - pressRef.current.startY;
        if (Math.hypot(dx, dy) > moveThreshold) {
          cancelPress();
        }
      },
      onPointerUp: (event) => {
        if (pressRef.current.pointerId !== event.pointerId) {
          clearHold();
          return;
        }

        if (pressRef.current.pressTimeout) {
          window.clearTimeout(pressRef.current.pressTimeout);
          pressRef.current.pressTimeout = null;
          if (!pressRef.current.holdStarted) {
            applyDelta(-1);
          }
        }
        resetPressState();
        clearHold();
      },
      onPointerLeave: cancelPress,
      onPointerCancel: cancelPress,
    };
  }, [applyDelta, clearHold, enabled, repeatStep, startHold]);

  const plusHandlers = useMemo<PressHandlers>(() => {
    const pressRef = plusPress;
    const resetPressState = () => {
      if (pressRef.current.pressTimeout) {
        window.clearTimeout(pressRef.current.pressTimeout);
      }
      pressRef.current.pressTimeout = null;
      pressRef.current.pointerId = null;
      pressRef.current.holdStarted = false;
    };

    const cancelPress = () => {
      resetPressState();
      clearHold();
    };

    return {
      onPointerDown: (event) => {
        if (!enabled) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        if (event.pointerType === "mouse") {
          event.preventDefault();
          startHold(1);
          return;
        }

        pressRef.current.pointerId = event.pointerId;
        pressRef.current.startX = event.clientX;
        pressRef.current.startY = event.clientY;
        pressRef.current.holdStarted = false;
        if (pressRef.current.pressTimeout) {
          window.clearTimeout(pressRef.current.pressTimeout);
        }
        pressRef.current.pressTimeout = window.setTimeout(() => {
          pressRef.current.holdStarted = true;
          startHold(1, repeatStep);
        }, pressDelayMs);
        event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove: (event) => {
        if (pressRef.current.pointerId !== event.pointerId) return;
        const dx = event.clientX - pressRef.current.startX;
        const dy = event.clientY - pressRef.current.startY;
        if (Math.hypot(dx, dy) > moveThreshold) {
          cancelPress();
        }
      },
      onPointerUp: (event) => {
        if (pressRef.current.pointerId !== event.pointerId) {
          clearHold();
          return;
        }

        if (pressRef.current.pressTimeout) {
          window.clearTimeout(pressRef.current.pressTimeout);
          pressRef.current.pressTimeout = null;
          if (!pressRef.current.holdStarted) {
            applyDelta(1);
          }
        }
        resetPressState();
        clearHold();
      },
      onPointerLeave: cancelPress,
      onPointerCancel: cancelPress,
    };
  }, [applyDelta, clearHold, enabled, repeatStep, startHold]);

  return {
    applyDelta,
    minusHandlers,
    plusHandlers,
  };
};
