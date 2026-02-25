"use client";

import { useCallback, useState } from "react";

type UseExpeditionResetParams = {
  token: string | null | undefined;
  locale: string;
  onInvalid: () => void;
  onUpdated: () => void;
};

export const useExpeditionReset = ({
  token,
  locale,
  onInvalid,
  onUpdated,
}: UseExpeditionResetParams) => {
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<"updateFailed" | "">("");

  const dismissNotice = useCallback(async () => {
    if (!token || saving) return false;
    setSaving(true);
    setErrorKey("");

    try {
      const res = await fetch("/api/user/expedition/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-arc-token": token,
        },
        body: JSON.stringify({ mode: "dismiss", locale }),
      });

      if (res.status === 401 || res.status === 404) {
        onInvalid();
        return false;
      }

      if (!res.ok) {
        setErrorKey("updateFailed");
        return false;
      }

      onUpdated();
      return true;
    } catch {
      setErrorKey("updateFailed");
      return false;
    } finally {
      setSaving(false);
    }
  }, [locale, onInvalid, onUpdated, saving, token]);

  const resetProgress = useCallback(
    async () => {
      if (!token || saving) return false;
      setSaving(true);
      setErrorKey("");

      try {
        const res = await fetch("/api/user/expedition/reset", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-arc-token": token,
          },
          body: JSON.stringify({
            mode: "reset",
            locale,
          }),
        });

        if (res.status === 401 || res.status === 404) {
          onInvalid();
          return false;
        }

        if (!res.ok) {
          setErrorKey("updateFailed");
          return false;
        }

        onUpdated();
        if (typeof window !== "undefined" && window.location.pathname !== "/") {
          window.location.assign("/");
        }
        return true;
      } catch {
        setErrorKey("updateFailed");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [locale, onInvalid, onUpdated, saving, token]
  );

  return {
    saving,
    errorKey,
    dismissNotice,
    resetProgress,
  };
};
