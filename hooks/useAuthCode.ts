"use client";

import { useCallback, useEffect, useState } from "react";

export const useAuthCode = (token: string | null | undefined) => {
  const [authCode, setAuthCode] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (!token || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/code", {
        method: "POST",
        headers: { "x-arc-token": token },
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.code) {
        setAuthCode(payload.code);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, token]);

  useEffect(() => {
    setAuthCode("");
  }, [token]);

  useEffect(() => {
    if (!token || authCode || loading) return;
    generate();
  }, [authCode, generate, loading, token]);

  return {
    authCode,
    loading,
    generate,
  };
};
