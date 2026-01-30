"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import type { ProjectProgressPayload } from "@/types/projects";

const getIdentityHeaders = (token: string, name: string) => ({
  "x-arc-token": token,
  "x-arc-name": name,
});

export const useProjectProgress = () => {
  const { identity, ready, clearIdentity } = useLocalIdentity();
  const [payload, setPayload] = useState<ProjectProgressPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready || !identity) return;
    const controller = new AbortController();
    setLoading(true);

    fetch("/api/projects", {
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
  }, [clearIdentity, identity, ready]);

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
        const wasComplete = required > 0 && currentOwned >= required;
        const nextComplete = required > 0 && nextQuantity >= required;

        const nextCount =
          prev.memberCount > 0
            ? (() => {
                const currentCount =
                  prev.communityCountsByItemId[projectItemId] ?? 0;
                if (!wasComplete && nextComplete) {
                  return currentCount + 1;
                }
                if (wasComplete && !nextComplete) {
                  return Math.max(0, currentCount - 1);
                }
                return currentCount;
              })()
            : undefined;

        return {
          ...prev,
          communityCountsByItemId:
            nextCount !== undefined
              ? {
                  ...prev.communityCountsByItemId,
                  [projectItemId]: nextCount,
                }
              : prev.communityCountsByItemId,
          projects: prev.projects.map((project) => ({
            ...project,
            stages: project.stages.map((stage) => ({
              ...stage,
              items: stage.items.map((item) => {
                if (item.projectItemId !== projectItemId) return item;
                return { ...item, quantityOwned: nextQuantity };
              }),
            })),
          })),
        };
      });

      fetch("/api/projects", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getIdentityHeaders(identity.token, identity.name),
        },
        body: JSON.stringify({
          updates: [{ projectItemId, quantityOwned: nextQuantity }],
        }),
      })
        .then((res) => {
          if (res.status === 401 || res.status === 404) {
            clearIdentity();
          }
        })
        .catch(() => null);
    },
    [clearIdentity, identity]
  );

  const allProjects = useMemo(() => payload?.projects ?? [], [payload]);

  return {
    loading,
    payload,
    projects: allProjects,
    memberCount: payload?.memberCount ?? 0,
    communityCountsByItemId: payload?.communityCountsByItemId ?? {},
    updateItemQuantity,
  };
};
