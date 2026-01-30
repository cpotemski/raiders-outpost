"use client";

import { useEffect, useRef } from "react";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";

export function IdentitySync() {
  const { identity, ready, clearIdentity, saveIdentity } = useLocalIdentity();
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !identity) return;
    if (lastTokenRef.current === identity.token) return;

    lastTokenRef.current = identity.token;
    const controller = new AbortController();

    fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: identity.name,
        token: identity.token,
        create: false,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 404) {
          clearIdentity();
          return;
        }
        if (!res.ok) return;
        const payload = await res.json().catch(() => null);
        if (!payload?.user?.token || !payload?.user?.name) return;
        if (
          payload.user.token !== identity.token ||
          payload.user.name !== identity.name
        ) {
          saveIdentity(payload.user.name, payload.user.token);
        }
      })
      .catch(() => null);

    return () => controller.abort();
  }, [clearIdentity, identity, ready, saveIdentity]);

  return null;
}
