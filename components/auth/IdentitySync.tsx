"use client";

import { useEffect, useRef } from "react";
import { useLocalIdentity } from "./useLocalIdentity";

export function IdentitySync() {
  const { identity, ready } = useLocalIdentity();
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !identity) return;
    if (lastTokenRef.current === identity.token) return;

    lastTokenRef.current = identity.token;

    fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: identity.name, token: identity.token }),
    }).catch(() => null);
  }, [identity, ready]);

  return null;
}
