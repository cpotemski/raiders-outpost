import { useCallback, useEffect, useState } from "react";

export type AdminUser = {
  id: string;
  name: string;
  createdAt: string;
  community: { id: string; name: string } | null;
};

type AdminUsersResponse = {
  users: AdminUser[];
};

const buildUrl = (path: string, password: string) =>
  `/api/admin/users${path}?password=${encodeURIComponent(password)}`;

export const useAdminUsers = (password: string) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl("", password));
      if (!res.ok) {
        throw new Error("Failed to load users");
      }
      const payload = (await res.json()) as AdminUsersResponse;
      setUsers(payload.users ?? []);
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
        `/api/admin/users/${id}?password=${encodeURIComponent(password)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        setError("Delete failed");
        return false;
      }
      setUsers((prev) => prev.filter((user) => user.id !== id));
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
    setUsers([]);
    return true;
  }, [password]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { users, loading, error, refresh, remove, clearAll };
};
