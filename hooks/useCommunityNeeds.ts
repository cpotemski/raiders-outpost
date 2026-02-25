"use client";

import { useEffect, useState } from "react";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import { useLocale } from "@/components/locale/LocaleProvider";
import type { CommunityNeedsPayload } from "@/types/community";

export const useCommunityNeeds = (
  enabled: boolean,
  communityIds: string[]
) => {
  const { identity, ready, clearIdentity } = useLocalIdentity();
  const { locale, ready: localeReady } = useLocale();
  const [payload, setPayload] = useState<CommunityNeedsPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !communityIds.length) {
      setPayload(null);
      return;
    }
    if (!ready || !identity || !localeReady) return;
    const controller = new AbortController();
    setLoading(true);

    const idsParam = communityIds.join(",");
    fetch(
      `/api/community/needs?locale=${locale}&communityIds=${encodeURIComponent(
        idsParam
      )}`,
      {
      method: "GET",
      headers: { "x-arc-token": identity.token },
      signal: controller.signal,
      }
    )
      .then((res) => {
        if (res.status === 401 || res.status === 404) {
          clearIdentity();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data: CommunityNeedsPayload | null) => {
        if (!data) return;
        setPayload(data);
      })
      .catch(() => null)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [
    clearIdentity,
    communityIds,
    enabled,
    identity,
    locale,
    localeReady,
    ready,
  ]);

  return { payload, loading };
};
