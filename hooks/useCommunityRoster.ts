"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import type { Community, CommunityMember } from "@/types/community";

type Status = "idle" | "loading" | "saving" | "joining";

export const useCommunityRoster = () => {
  const { identity, ready, clearIdentity } = useLocalIdentity();
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteCode = searchParams.get("invite")?.trim() ?? "";
  const [community, setCommunity] = useState<Community | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmMember, setConfirmMember] = useState<CommunityMember | null>(
    null
  );
  const [origin, setOrigin] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!ready || inviteCode) return;
    if (!identity) {
      setCommunity(null);
      return;
    }

    let active = true;
    setStatus("loading");
    fetch("/api/community", {
      headers: { "x-arc-token": identity.token },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 404) {
          clearIdentity();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((payload) => {
        if (!active) return;
        setCommunity(payload?.community ?? null);
        setStatus("idle");
      })
      .catch(() => {
        if (!active) return;
        setStatus("idle");
      });

    return () => {
      active = false;
    };
  }, [clearIdentity, identity, inviteCode, ready]);

  useEffect(() => {
    if (!inviteCode || !identity || community || !ready) return;
    let active = true;
    setStatus("joining");
    fetch("/api/community/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-arc-token": identity.token,
      },
      body: JSON.stringify({ code: inviteCode }),
    })
      .then((res) => res.json().then((payload) => ({ res, payload })))
      .then(({ res, payload }) => {
        if (!active) return;
        if (!res.ok) {
          setError("Invite link invalid");
          setStatus("idle");
          return;
        }
        setCommunity(payload?.community ?? null);
        setStatus("idle");
        router.replace("/community");
      })
      .catch(() => {
        if (!active) return;
        setError("Invite link invalid");
        setStatus("idle");
      });

    return () => {
      active = false;
    };
  }, [community, identity, inviteCode, ready, router]);

  const inviteUrl = useMemo(() => {
    if (!community || !origin) return "";
    return `${origin}/community?invite=${community.inviteCode}`;
  }, [community, origin]);

  const onCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identity || status === "saving") return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name required");
      return;
    }
    setError("");
    setStatus("saving");
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-arc-token": identity.token,
        },
        body: JSON.stringify({ name: trimmed }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError("Creation failed");
        setStatus("idle");
        return;
      }
      setCommunity(payload?.community ?? null);
      setName("");
      setStatus("idle");
    } catch {
      setError("Creation failed");
      setStatus("idle");
    }
  };

  const onRemove = async (memberId: string) => {
    if (!identity || !community || removingId) return false;
    setRemoveError("");
    setRemovingId(memberId);
    try {
      const res = await fetch("/api/community/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-arc-token": identity.token,
        },
        body: JSON.stringify({ memberId }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setRemoveError(payload?.error ?? "Removal failed");
        setRemovingId(null);
        return false;
      }
      setCommunity(payload?.community ?? null);
      setRemovingId(null);
      return true;
    } catch {
      setRemoveError("Removal failed");
      setRemovingId(null);
      return false;
    }
  };

  const onNameChange = (value: string) => {
    setName(value);
    if (error) setError("");
  };

  const renameCommunity = async (newName: string) => {
    if (!identity || !community) {
      return { success: false, error: "Not linked" };
    }

    try {
      const res = await fetch("/api/community/name", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-arc-token": identity.token,
        },
        body: JSON.stringify({ name: newName }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          success: false,
          error: payload?.error ?? "Rename failed",
        };
      }
      if (payload?.community) {
        setCommunity(payload.community);
      }
      return { success: true, error: "" };
    } catch {
      return { success: false, error: "Rename failed" };
    }
  };

  const resetRemoveError = () => setRemoveError("");

  return {
    ready,
    identityName: identity?.name ?? null,
    inviteCode,
    community,
    status,
    error,
    removeError,
    removingId,
    confirmMember,
    inviteUrl,
    name,
    setConfirmMember,
    onNameChange,
    onCreate,
    onRemove,
    resetRemoveError,
    renameCommunity,
  };
};
