"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import type { Community } from "@/types/community";

type Status = "idle" | "loading" | "saving" | "joining";

type CommunityResponse = {
  communities?: Community[];
  communityId?: string;
};

const communityIdSet = (communities: Community[]) =>
  new Set(communities.map((community) => community.id));

export const useCommunityRoster = () => {
  const { identity, ready, clearIdentity } = useLocalIdentity();
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteCode = searchParams.get("invite")?.trim() ?? "";
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<Set<string>>(
    () => new Set<string>()
  );
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const hasInitializedSelectionRef = useRef(false);
  const lastJoinAttemptKeyRef = useRef("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const syncSelection = (
    nextCommunities: Community[],
    preferredCommunityId?: string
  ) => {
    const validIds = communityIdSet(nextCommunities);
    setSelectedCommunityIds((prev) => {
      if (!hasInitializedSelectionRef.current) {
        hasInitializedSelectionRef.current = true;
        const initial = new Set(nextCommunities.map((community) => community.id));
        if (preferredCommunityId && validIds.has(preferredCommunityId)) {
          initial.add(preferredCommunityId);
        }
        return initial;
      }

      const next = new Set(
        Array.from(prev).filter((communityId) => validIds.has(communityId))
      );
      if (preferredCommunityId && validIds.has(preferredCommunityId)) {
        next.add(preferredCommunityId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!ready) return;
    if (!identity) {
      setCommunities([]);
      setSelectedCommunityIds(new Set());
      hasInitializedSelectionRef.current = false;
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
      .then((payload: CommunityResponse | null) => {
        if (!active) return;
        const nextCommunities = payload?.communities ?? [];
        setCommunities(nextCommunities);
        syncSelection(nextCommunities);
        setStatus("idle");
      })
      .catch(() => {
        if (!active) return;
        setStatus("idle");
      });

    return () => {
      active = false;
    };
  }, [clearIdentity, identity, ready]);

  useEffect(() => {
    if (!inviteCode || !identity || !ready) return;

    const joinKey = `${identity.token}::${inviteCode}`;
    if (lastJoinAttemptKeyRef.current === joinKey) return;
    lastJoinAttemptKeyRef.current = joinKey;

    let active = true;
    setStatus("joining");
    setError("");

    fetch("/api/community/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-arc-token": identity.token,
      },
      body: JSON.stringify({ code: inviteCode }),
    })
      .then((res) => res.json().then((payload) => ({ res, payload })))
      .then(({ res, payload }: { res: Response; payload: CommunityResponse & { error?: string } }) => {
        if (!active) return;
        if (!res.ok) {
          lastJoinAttemptKeyRef.current = "";
          setError(payload?.error ?? "Invite link invalid");
          setStatus("idle");
          return;
        }

        const nextCommunities = payload?.communities ?? [];
        setCommunities(nextCommunities);
        syncSelection(nextCommunities, payload?.communityId);
        setStatus("idle");
        router.replace("/community");
      })
      .catch(() => {
        if (!active) return;
        lastJoinAttemptKeyRef.current = "";
        setError("Invite link invalid");
        setStatus("idle");
      });

    return () => {
      active = false;
    };
  }, [identity, inviteCode, ready, router]);

  const selectedCommunities = useMemo(() => {
    return communities.filter((community) => selectedCommunityIds.has(community.id));
  }, [communities, selectedCommunityIds]);

  const getInviteUrl = (community: Community) => {
    if (!origin) return "";
    return `${origin}/community?invite=${community.inviteCode}`;
  };

  const toggleCommunity = (communityId: string) => {
    setSelectedCommunityIds((prev) => {
      const next = new Set(prev);
      if (next.has(communityId)) {
        next.delete(communityId);
      } else {
        next.add(communityId);
      }
      return next;
    });
  };

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
      const payload = (await res.json().catch(() => null)) as
        | (CommunityResponse & { error?: string })
        | null;
      if (!res.ok) {
        setError(payload?.error ?? "Creation failed");
        setStatus("idle");
        return;
      }
      const nextCommunities = payload?.communities ?? [];
      setCommunities(nextCommunities);
      syncSelection(nextCommunities, payload?.communityId);
      setName("");
      setStatus("idle");
    } catch {
      setError("Creation failed");
      setStatus("idle");
    }
  };

  const onRemove = async (communityId: string, memberId: string) => {
    if (!identity || removingId) return false;
    setRemoveError("");
    setRemovingId(memberId);
    try {
      const res = await fetch("/api/community/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-arc-token": identity.token,
        },
        body: JSON.stringify({ memberId, communityId }),
      });
      const payload = (await res.json().catch(() => null)) as
        | (CommunityResponse & { error?: string })
        | null;
      if (!res.ok) {
        setRemoveError(payload?.error ?? "Removal failed");
        setRemovingId(null);
        return false;
      }

      const nextCommunities = payload?.communities ?? [];
      setCommunities(nextCommunities);
      syncSelection(nextCommunities);
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

  const renameCommunity = async (communityId: string, newName: string) => {
    if (!identity) {
      return { success: false, error: "Not linked" };
    }

    try {
      const res = await fetch("/api/community/name", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-arc-token": identity.token,
        },
        body: JSON.stringify({ name: newName, communityId }),
      });
      const payload = (await res.json().catch(() => null)) as
        | (CommunityResponse & { error?: string })
        | null;
      if (!res.ok) {
        return {
          success: false,
          error: payload?.error ?? "Rename failed",
        };
      }
      const nextCommunities = payload?.communities ?? [];
      setCommunities(nextCommunities);
      syncSelection(nextCommunities);
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
    communities,
    selectedCommunityIds,
    selectedCommunities,
    status,
    error,
    removeError,
    removingId,
    name,
    toggleCommunity,
    getInviteUrl,
    onNameChange,
    onCreate,
    onRemove,
    resetRemoveError,
    renameCommunity,
  };
};
