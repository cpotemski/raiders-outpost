"use client";

import { useEffect, useMemo, useState } from "react";

type UsePublicProfileLinkOptions = {
  token: string | null;
  onInvalid: () => void;
};

export const usePublicProfileLink = ({
  token,
  onInvalid,
}: UsePublicProfileLinkOptions) => {
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setSlug("");
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch("/api/user/public-profile", {
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
      .then((payload: { slug?: string } | null) => {
        if (!payload?.slug) return;
        setSlug(payload.slug);
      })
      .catch(() => null)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [onInvalid, token]);

  const publicUrl = useMemo(() => {
    if (!slug) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/public/${slug}`;
  }, [slug]);

  return { slug, publicUrl, loading };
};
