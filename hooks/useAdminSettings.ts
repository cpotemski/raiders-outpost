import { useCallback, useEffect, useMemo, useState } from "react";

export type AdminProjectSetting = {
  slug: string;
  name: string;
  kind: "workshop" | "project" | "blueprints";
  inactive: boolean;
};

export type AdminItemSetting = {
  id: string;
  name: string;
  itemType: string;
  rarity: string;
  inactive: boolean;
};

type AdminSettingsResponse = {
  disabledProjectSlugs: string[];
  disabledItemIds: string[];
  projects: AdminProjectSetting[];
  items: AdminItemSetting[];
};

const buildUrl = (password: string, locale: string) =>
  `/api/admin/settings?password=${encodeURIComponent(
    password
  )}&locale=${encodeURIComponent(locale)}`;

export const useAdminSettings = (password: string, locale: string) => {
  const [projects, setProjects] = useState<AdminProjectSetting[]>([]);
  const [items, setItems] = useState<AdminItemSetting[]>([]);
  const [disabledProjectSlugs, setDisabledProjectSlugs] = useState<string[]>(
    []
  );
  const [disabledItemIds, setDisabledItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl(password, locale));
      if (!res.ok) {
        throw new Error("Failed to load settings");
      }
      const payload = (await res.json()) as AdminSettingsResponse;
      setProjects(payload.projects ?? []);
      setItems(payload.items ?? []);
      setDisabledProjectSlugs(payload.disabledProjectSlugs ?? []);
      setDisabledItemIds(payload.disabledItemIds ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [locale, password]);

  const updateSettings = useCallback(
    async (nextProjectSlugs: string[], nextItemIds: string[]) => {
      if (!password) return false;
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/settings?password=" + encodeURIComponent(password), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            disabledProjectSlugs: nextProjectSlugs,
            disabledItemIds: nextItemIds,
          }),
        });
        if (!res.ok) {
          throw new Error("Failed to save settings");
        }
        const payload = (await res.json()) as Pick<
          AdminSettingsResponse,
          "disabledProjectSlugs" | "disabledItemIds"
        >;
        setDisabledProjectSlugs(payload.disabledProjectSlugs ?? []);
        setDisabledItemIds(payload.disabledItemIds ?? []);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [password]
  );

  const toggleProject = useCallback(
    async (slug: string) => {
      const next = new Set(disabledProjectSlugs);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      const result = await updateSettings(Array.from(next), disabledItemIds);
      if (result) {
        setProjects((prev) =>
          prev.map((project) =>
            project.slug === slug
              ? { ...project, inactive: !project.inactive }
              : project
          )
        );
      }
    },
    [disabledItemIds, disabledProjectSlugs, updateSettings]
  );

  const toggleItem = useCallback(
    async (id: string) => {
      const next = new Set(disabledItemIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      const result = await updateSettings(disabledProjectSlugs, Array.from(next));
      if (result) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, inactive: !item.inactive } : item
          )
        );
      }
    },
    [disabledItemIds, disabledProjectSlugs, updateSettings]
  );

  const activeProjectCount = useMemo(
    () => projects.filter((project) => !project.inactive).length,
    [projects]
  );
  const activeItemCount = useMemo(
    () => items.filter((item) => !item.inactive).length,
    [items]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    projects,
    items,
    disabledProjectSlugs,
    disabledItemIds,
    loading,
    saving,
    error,
    refresh,
    toggleProject,
    toggleItem,
    activeProjectCount,
    activeItemCount,
  };
};
