"use client";

import { useEffect, useState } from "react";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import type {
  BlueprintCommunityMember,
  BlueprintOwnershipPayload,
} from "@/types/blueprints";

const getIdentityHeaders = (token: string, name: string) => ({
  "x-arc-token": token,
  "x-arc-name": name,
});

export const useBlueprintOwnership = () => {
  const { identity, ready, clearIdentity } = useLocalIdentity();
  const [owned, setOwned] = useState<Set<string>>(() => new Set());
  const [communityMembers, setCommunityMembers] = useState<
    BlueprintCommunityMember[]
  >([]);
  const [ownershipByItem, setOwnershipByItem] = useState<
    Record<string, string[]>
  >({});
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !identity) return;

    const controller = new AbortController();

    fetch("/api/blueprints", {
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
      .then((payload: BlueprintOwnershipPayload | null) => {
        if (!payload?.ownedBlueprints) return;
        setOwned(new Set(payload.ownedBlueprints));
        setViewerId(payload.viewerId ?? null);
        setCommunityMembers(payload.community?.members ?? []);
        setOwnershipByItem(payload.ownershipByItem ?? {});
      })
      .catch(() => null);

    return () => controller.abort();
  }, [clearIdentity, identity, ready]);

  const persistOwned = (next: Set<string>) => {
    if (!identity) return;
    fetch("/api/blueprints", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getIdentityHeaders(identity.token, identity.name),
      },
      body: JSON.stringify({ ownedBlueprints: Array.from(next) }),
    })
      .then((res) => {
        if (res.status === 401 || res.status === 404) {
          clearIdentity();
        }
      })
      .catch(() => null);
  };

  const toggleOwned = (name: string) => {
    setOwned((prev) => {
      const next = new Set(prev);
      const willOwn = !next.has(name);
      if (willOwn) {
        next.add(name);
      } else {
        next.delete(name);
      }
      if (viewerId) {
        setOwnershipByItem((prevOwnership) => {
          const current = new Set(prevOwnership[name] ?? []);
          if (willOwn) {
            current.add(viewerId);
          } else {
            current.delete(viewerId);
          }
          return { ...prevOwnership, [name]: Array.from(current) };
        });
      }
      persistOwned(next);
      return next;
    });
  };

  return {
    owned,
    communityMembers,
    ownershipByItem,
    viewerId,
    toggleOwned,
  };
};
