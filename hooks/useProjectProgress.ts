"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import type { ProjectProgressPayload } from "@/types/projects";
import type { AppLocale } from "@/lib/locale";

const getIdentityHeaders = (token: string, name: string) => ({
  "x-arc-token": token,
  "x-arc-name": name,
});

export const useProjectProgress = (
  locale: AppLocale,
  localeReady: boolean
) => {
  const { identity, ready, clearIdentity } = useLocalIdentity();
  const [payload, setPayload] = useState<ProjectProgressPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const pendingUpdates = useRef<Map<string, number>>(new Map());
  const flushTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (!ready || !identity || !localeReady) return;
    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/projects?locale=${locale}`, {
      method: "GET",
      headers: getIdentityHeaders(identity.token, identity.name),
      signal: controller.signal,
    })
      .then((res) => {
        if (res.status === 401 || res.status === 404) {
          clearIdentity();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data: ProjectProgressPayload | null) => {
        if (!data) return;
        setPayload(data);
      })
      .catch(() => null)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [clearIdentity, identity, locale, localeReady, ready, refreshIndex]);

  const flushUpdates = useCallback(() => {
    if (!identity) return;
    if (!pendingUpdates.current.size) return;
    const updates = Array.from(pendingUpdates.current.entries()).map(
      ([projectItemId, quantityOwned]) => ({
        projectItemId,
        quantityOwned,
      })
    );
    pendingUpdates.current.clear();

    fetch("/api/projects", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getIdentityHeaders(identity.token, identity.name),
      },
      body: JSON.stringify({ updates }),
    })
      .then((res) => {
        if (res.status === 401 || res.status === 404) {
          clearIdentity();
        }
      })
      .catch(() => null);
  }, [clearIdentity, identity]);

  const scheduleFlush = useCallback(() => {
    if (flushTimeout.current) {
      window.clearTimeout(flushTimeout.current);
    }
    flushTimeout.current = window.setTimeout(() => {
      flushTimeout.current = null;
      flushUpdates();
    }, 300);
  }, [flushUpdates]);

  useEffect(() => {
    return () => {
      if (flushTimeout.current) {
        window.clearTimeout(flushTimeout.current);
      }
      flushUpdates();
    };
  }, [flushUpdates]);

  const updateItemQuantity = useCallback(
    (projectItemId: string, nextQuantity: number) => {
      if (!identity) return;
      setPayload((prev) => {
        if (!prev) return prev;
        const targetItem = prev.projects
          .flatMap((project) => project.stages)
          .flatMap((stage) => stage.items)
          .find((item) => item.projectItemId === projectItemId);
        const currentOwned = targetItem?.quantityOwned ?? 0;
        const required = targetItem?.quantityRequired ?? 0;
        const boundedQuantity =
          required > 0 ? Math.max(0, Math.min(required, nextQuantity)) : 0;

        return {
          ...prev,
          projects: prev.projects.map((project) => ({
            ...project,
            stages: project.stages.map((stage) => ({
              ...stage,
              items: stage.items.map((item) => {
                if (item.projectItemId !== projectItemId) return item;
                return { ...item, quantityOwned: boundedQuantity };
              }),
            })),
          })),
        };
      });

      const persistedQuantity = Math.max(0, nextQuantity);
      pendingUpdates.current.set(projectItemId, persistedQuantity);
      scheduleFlush();
    },
    [identity, scheduleFlush]
  );

  const allProjects = useMemo(() => payload?.projects ?? [], [payload]);
  const refresh = useCallback(() => {
    setRefreshIndex((prev) => prev + 1);
  }, []);

  return {
    loading,
    payload,
    projects: allProjects,
    activeExpeditionSlug: payload?.activeExpeditionSlug ?? null,
    expeditionReset: payload?.expeditionReset ?? null,
    updateItemQuantity,
    refresh,
  };
};
