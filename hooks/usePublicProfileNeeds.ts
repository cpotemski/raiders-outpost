"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale/LocaleProvider";
import type { CommunityNeedsPayload } from "@/types/community";

type PublicProfileNeedsPayload = CommunityNeedsPayload & {
  name: string;
};

export const usePublicProfileNeeds = (slug: string) => {
  const { locale, ready: localeReady } = useLocale();
  const [payload, setPayload] = useState<PublicProfileNeedsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!localeReady || !slug) return;

    const controller = new AbortController();
    setLoading(true);
    setNotFound(false);
    setPayload(null);

    fetch(`/api/public/${encodeURIComponent(slug)}?locale=${locale}`, {
      method: "GET",
      signal: controller.signal,
    })
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          setPayload(null);
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data: PublicProfileNeedsPayload | null) => {
        if (!data) return;
        setPayload(data);
      })
      .catch(() => null)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [locale, localeReady, slug]);

  return { payload, loading, notFound };
};
