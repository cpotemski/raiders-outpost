"use client";

import { useCallback, useEffect, useState } from "react";

type UseExpeditionSelectionParams = {
  token: string | null | undefined;
  onInvalid: () => void;
  onUpdated?: (nextSlug: string | null) => void;
};

export const useExpeditionSelection = ({
  token,
  onInvalid,
  onUpdated,
}: UseExpeditionSelectionParams) => {
  const [activeExpeditionSlug, setActiveExpeditionSlug] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<"updateFailed" | "">("");

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setErrorKey("");

    fetch("/api/user/expedition", {
      method: "GET",
      headers: { "x-arc-token": token },
      signal: controller.signal,
    })
      .then((res) => {
        if (res.status === 401 || res.status === 404) {
          onInvalid();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((payload: { activeExpeditionSlug?: string | null } | null) => {
        if (!payload) return;
        setActiveExpeditionSlug(payload.activeExpeditionSlug ?? null);
      })
      .catch(() => null)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [onInvalid, token]);

  const setExpedition = useCallback(
    async (nextSlug: string | null) => {
      if (!token) return;
      if (saving) return;
      if (nextSlug === activeExpeditionSlug) return;
      setSaving(true);
      setErrorKey("");
      try {
        const res = await fetch("/api/user/expedition", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-arc-token": token,
          },
          body: JSON.stringify({ expeditionSlug: nextSlug }),
        });
        if (res.status === 401 || res.status === 404) {
          onInvalid();
          return;
        }
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload) {
          setErrorKey("updateFailed");
          return;
        }
        const nextValue = payload.activeExpeditionSlug ?? null;
        setActiveExpeditionSlug(nextValue);
        onUpdated?.(nextValue);
      } catch {
        setErrorKey("updateFailed");
      } finally {
        setSaving(false);
      }
    },
    [activeExpeditionSlug, onInvalid, onUpdated, saving, token]
  );

  return {
    activeExpeditionSlug,
    loading,
    saving,
    errorKey,
    setExpedition,
  };
};
