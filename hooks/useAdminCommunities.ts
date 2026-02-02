import { useCallback, useEffect, useState } from "react";

export type AdminCommunity = {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
  memberCount: number;
};

type AdminCommunitiesResponse = {
  communities: AdminCommunity[];
};

const buildUrl = (path: string, password: string) =>
  `/api/admin/communities${path}?password=${encodeURIComponent(password)}`;

export const useAdminCommunities = (password: string) => {
  const [communities, setCommunities] = useState<AdminCommunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl("", password));
      if (!res.ok) {
        throw new Error("Failed to load communities");
      }
      const payload = (await res.json()) as AdminCommunitiesResponse;
      setCommunities(payload.communities ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [password]);

  const remove = useCallback(
    async (id: string) => {
      if (!password) return false;
      setError(null);
      const res = await fetch(
        `/api/admin/communities/${id}?password=${encodeURIComponent(password)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        setError("Delete failed");
        return false;
      }
      setCommunities((prev) =>
        prev.filter((community) => community.id !== id)
      );
      return true;
    },
    [password]
  );

  const clearAll = useCallback(async () => {
    if (!password) return false;
    setError(null);
    const res = await fetch(buildUrl("/clear", password), {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Clear failed");
      return false;
    }
    setCommunities([]);
    return true;
  }, [password]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { communities, loading, error, refresh, remove, clearAll };
};
