"use client";

import { useCallback, useEffect, useState } from "react";
import { sanitizeCompletedExpeditionSlugs } from "@/lib/expeditions";

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
  const [completedExpeditionSlugs, setCompletedExpeditionSlugs] = useState<
    string[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<"updateFailed" | "">("");

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setErrorKey("");

    fetch("/api/user/expedition/progress", {
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
      .then(
        (
          payload:
            | {
                activeExpeditionSlug?: string | null;
                completedExpeditionSlugs?: string[];
              }
            | null
        ) => {
        if (!payload) return;
        setActiveExpeditionSlug(payload.activeExpeditionSlug ?? null);
        setCompletedExpeditionSlugs(
          Array.isArray(payload.completedExpeditionSlugs)
            ? payload.completedExpeditionSlugs
            : []
        );
      }
      )
      .catch(() => null)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [onInvalid, token]);

  const setCompletedExpeditions = useCallback(
    async (nextCompletedExpeditionSlugs: string[]) => {
      if (!token) return;
      if (saving) return;
      const normalizedInput = sanitizeCompletedExpeditionSlugs(
        nextCompletedExpeditionSlugs,
        nextCompletedExpeditionSlugs
      );
      if (
        normalizedInput.length === completedExpeditionSlugs.length &&
        normalizedInput.every((slug, index) => slug === completedExpeditionSlugs[index])
      ) {
        return;
      }
      setSaving(true);
      setErrorKey("");
      try {
        const res = await fetch("/api/user/expedition/progress", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-arc-token": token,
          },
          body: JSON.stringify({
            completedExpeditionSlugs: nextCompletedExpeditionSlugs,
          }),
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
        const nextCompleted = Array.isArray(payload.completedExpeditionSlugs)
          ? payload.completedExpeditionSlugs
          : [];
        setActiveExpeditionSlug(nextValue);
        setCompletedExpeditionSlugs(nextCompleted);
        onUpdated?.(nextValue);
      } catch {
        setErrorKey("updateFailed");
      } finally {
        setSaving(false);
      }
    },
    [completedExpeditionSlugs, onInvalid, onUpdated, saving, token]
  );

  return {
    activeExpeditionSlug,
    completedExpeditionSlugs,
    loading,
    saving,
    errorKey,
    setCompletedExpeditions,
  };
};
