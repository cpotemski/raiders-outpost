"use client";

import { useCallback, useEffect, useState } from "react";

type Identity = {
  name: string;
  token: string;
};

const NAME_KEY = "arc:identity:name";
const TOKEN_KEY = "arc:identity:token";
const UPDATE_EVENT = "arc-identity-update";

const readIdentity = (): Identity | null => {
  if (typeof window === "undefined") return null;
  const name = localStorage.getItem(NAME_KEY)?.trim() ?? "";
  const token = localStorage.getItem(TOKEN_KEY)?.trim() ?? "";
  if (!name || !token) return null;
  return { name, token };
};

const generateToken = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `arc-${Math.random().toString(36).slice(2, 10)}-${Date.now()
    .toString(36)
    .slice(-6)}`;
};

export function useLocalIdentity() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setIdentity(readIdentity());

    sync();
    setReady(true);

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === NAME_KEY || event.key === TOKEN_KEY) {
        sync();
      }
    };

    const handleCustom = () => sync();

    window.addEventListener("storage", handleStorage);
    window.addEventListener(UPDATE_EVENT, handleCustom);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(UPDATE_EVENT, handleCustom);
    };
  }, []);

  const saveIdentity = useCallback((nameInput: string, tokenInput?: string) => {
    if (typeof window === "undefined") return null;
    const name = nameInput.trim();
    if (!name) return null;
    const token = tokenInput?.trim() || localStorage.getItem(TOKEN_KEY) || generateToken();
    localStorage.setItem(NAME_KEY, name);
    localStorage.setItem(TOKEN_KEY, token);
    window.dispatchEvent(new Event(UPDATE_EVENT));
    const next = { name, token };
    setIdentity(next);
    return next;
  }, []);

  const clearIdentity = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event(UPDATE_EVENT));
    setIdentity(null);
  }, []);

  return { identity, ready, saveIdentity, clearIdentity };
}
