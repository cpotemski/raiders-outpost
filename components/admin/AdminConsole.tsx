"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAdminCommunities } from "@/hooks/useAdminCommunities";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useLocale } from "@/components/locale/LocaleProvider";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/Input";

type AdminConsoleProps = {
  password: string;
};

const listWrapperClasses =
  "h-[240px] overflow-y-auto pr-1 border border-frame2 rounded-[10px] bg-panel2/30";

export function AdminConsole({ password }: AdminConsoleProps) {
  const { locale } = useLocale();
  const {
    users,
    loading: usersLoading,
    error: usersError,
    remove: removeUser,
    clearAll: clearAllUsers,
  } = useAdminUsers(password);
  const {
    communities,
    loading: communitiesLoading,
    error: communitiesError,
    remove: removeCommunity,
    clearAll: clearAllCommunities,
  } = useAdminCommunities(password);
  const {
    projects,
    items,
    loading: settingsLoading,
    saving: settingsSaving,
    error: settingsError,
    toggleProject,
    toggleItem,
    activeProjectCount,
    activeItemCount,
  } = useAdminSettings(password, locale);

  const totalProjects = projects.length;
  const totalItems = items.length;
  const [userFilter, setUserFilter] = useState("");
  const [communityFilter, setCommunityFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [itemFilter, setItemFilter] = useState("");

  const filteredUsers = useMemo(() => {
    if (!userFilter.trim()) return users;
    const needle = userFilter.toLowerCase();
    return users.filter((user) => {
      const name = user.name.toLowerCase();
      const community = user.community?.name.toLowerCase() ?? "";
      const id = user.id.toLowerCase();
      return (
        name.includes(needle) ||
        community.includes(needle) ||
        id.includes(needle)
      );
    });
  }, [userFilter, users]);

  const filteredCommunities = useMemo(() => {
    if (!communityFilter.trim()) return communities;
    const needle = communityFilter.toLowerCase();
    return communities.filter((community) => {
      return (
        community.name.toLowerCase().includes(needle) ||
        community.inviteCode.toLowerCase().includes(needle)
      );
    });
  }, [communityFilter, communities]);

  const filteredProjects = useMemo(() => {
    if (!projectFilter.trim()) return projects;
    const needle = projectFilter.toLowerCase();
    return projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(needle) ||
        project.slug.toLowerCase().includes(needle) ||
        project.kind.toLowerCase().includes(needle)
      );
    });
  }, [projectFilter, projects]);

  const filteredItems = useMemo(() => {
    if (!itemFilter.trim()) return items;
    const needle = itemFilter.toLowerCase();
    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(needle) ||
        item.itemType.toLowerCase().includes(needle) ||
        item.rarity.toLowerCase().includes(needle)
      );
    });
  }, [itemFilter, items]);

  const headerSubtitle = useMemo(() => {
    if (settingsLoading) return "Scanning project cache...";
    return `${activeProjectCount}/${totalProjects} Projekte aktiv · ${activeItemCount}/${totalItems} Items aktiv`;
  }, [activeItemCount, activeProjectCount, settingsLoading, totalItems, totalProjects]);

  return (
    <div className="space-y-4">
      <Panel className="arc-corners">
        <div className="arc-panel-header">
          <div>
            <p className="hud-label">Admin</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              System Console
            </h1>
          </div>
          <div className="text-right">
            <div className="hud-label">Status</div>
            <div className="text-xs text-muted">{headerSubtitle}</div>
            {settingsSaving ? (
              <div className="text-[10px] uppercase tracking-[0.12em] text-warn">
                Saving…
              </div>
            ) : null}
          </div>
        </div>
        <div className="px-5 py-4 text-xs text-muted">
          Kompakte Admin-Tools für Cleanup und Content-Steuerung. Passwort bleibt
          Pflicht (per Query-Parameter).
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Panel className="arc-corners">
            <div className="arc-panel-header">
              <div>
                <p className="hud-label">Users</p>
                <h2 className="text-base font-semibold tracking-tight">
                  User Cleanup
                </h2>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <div className="text-xs text-muted">
                  {usersLoading ? "Loading…" : `${users.length} total`}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={usersLoading}
                  className="h-7 px-2 text-[10px] border-bad/60 text-bad hover:border-bad"
                  onClick={async () => {
                    if (!clearAllUsers) return;
                    const ok = window.confirm(
                      "Alle Users (und dazugehörige Daten) löschen?"
                    );
                    if (!ok) return;
                    await clearAllUsers();
                  }}
                >
                  Delete all
                </Button>
              </div>
            </div>
            <div className="px-4 pb-3">
              <Input
                placeholder="Filter users..."
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
                className="text-xs bg-panel2/40"
              />
            </div>
            <div className="p-4">
              <div className={listWrapperClasses}>
                <div className="divide-y divide-frame2">
                  {usersLoading ? (
                    <div className="px-3 py-3 text-xs text-muted">Loading…</div>
                  ) : filteredUsers.length ? (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-text">
                            {user.name}
                          </div>
                          <div className="truncate text-[10px] text-muted">
                            {user.community?.name ?? "No community"} ·{" "}
                            {user.id.slice(0, 8)}
                          </div>
                        </div>
                        <Button
                          type="button"
                          className="h-7 px-2 text-[10px] border-bad/60 text-bad hover:border-bad"
                          onClick={async () => {
                            const ok = window.confirm(
                              `User ${user.name} wirklich löschen?`
                            );
                            if (ok) {
                              await removeUser(user.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-muted">
                      Keine User.
                    </div>
                  )}
                </div>
              </div>
              {usersError ? (
                <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-bad">
                  {usersError}
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel className="arc-corners">
              <div className="arc-panel-header">
              <div>
                <p className="hud-label">Communities</p>
                <h2 className="text-base font-semibold tracking-tight">
                  Community Cleanup
                </h2>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <div className="text-xs text-muted">
                  {communitiesLoading
                    ? "Loading…"
                    : `${communities.length} total`}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={communitiesLoading}
                  className="h-7 px-2 text-[10px] border-bad/60 text-bad hover:border-bad"
                  onClick={async () => {
                    if (!clearAllCommunities) return;
                    const ok = window.confirm(
                      "Alle Communities löschen?"
                    );
                    if (!ok) return;
                    await clearAllCommunities();
                  }}
                >
                  Delete all
                </Button>
              </div>
            </div>
            <div className="px-4 pb-3">
              <Input
                placeholder="Filter communities..."
                value={communityFilter}
                onChange={(event) => setCommunityFilter(event.target.value)}
                className="text-xs bg-panel2/40"
              />
            </div>
            <div className="p-4">
              <div className={listWrapperClasses}>
                <div className="divide-y divide-frame2">
                  {communitiesLoading ? (
                    <div className="px-3 py-3 text-xs text-muted">Loading…</div>
                  ) : filteredCommunities.length ? (
                    filteredCommunities.map((community) => (
                      <div
                        key={community.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-text">
                            {community.name}
                          </div>
                          <div className="truncate text-[10px] text-muted">
                            {community.memberCount} members ·{" "}
                            {community.inviteCode}
                          </div>
                        </div>
                        <Button
                          type="button"
                          className="h-7 px-2 text-[10px] border-bad/60 text-bad hover:border-bad"
                          onClick={async () => {
                            const ok = window.confirm(
                              `Community ${community.name} wirklich löschen?`
                            );
                            if (ok) {
                              await removeCommunity(community.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-muted">
                      Keine Communities.
                    </div>
                  )}
                </div>
              </div>
              {communitiesError ? (
                <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-bad">
                  {communitiesError}
                </div>
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel className="arc-corners">
            <div className="arc-panel-header">
              <div>
                <p className="hud-label">Projects</p>
                <h2 className="text-base font-semibold tracking-tight">
                  Inaktive Projekte
                </h2>
              </div>
              <div className="text-xs text-muted">
                {settingsLoading ? "Loading…" : `${totalProjects} total`}
              </div>
            </div>
            <div className="px-4 pb-3">
              <Input
                placeholder="Filter projects..."
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className="text-xs bg-panel2/40"
              />
            </div>
            <div className="p-4">
              <div className={listWrapperClasses}>
                <div className="divide-y divide-frame2">
                  {settingsLoading ? (
                    <div className="px-3 py-3 text-xs text-muted">Loading…</div>
                  ) : filteredProjects.length ? (
                    filteredProjects.map((project) => (
                      <div
                        key={project.slug}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-text">
                            {project.name}
                          </div>
                          <div className="truncate text-[10px] text-muted">
                            {project.slug} · {project.kind}
                          </div>
                        </div>
                        <Button
                          type="button"
                          className={cn(
                            "h-7 px-2 text-[10px]",
                            project.inactive
                              ? "border-bad/60 text-bad hover:border-bad"
                              : "border-good/60 text-good hover:border-good"
                          )}
                          onClick={() => toggleProject(project.slug)}
                        >
                          {project.inactive ? "Inactive" : "Active"}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-muted">
                      Keine Projekte.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="arc-corners">
            <div className="arc-panel-header">
              <div>
                <p className="hud-label">Items</p>
                <h2 className="text-base font-semibold tracking-tight">
                  Inaktive Items
                </h2>
              </div>
              <div className="text-xs text-muted">
                {settingsLoading ? "Loading…" : `${totalItems} total`}
              </div>
            </div>
            <div className="px-4 pb-3">
              <Input
                placeholder="Filter items..."
                value={itemFilter}
                onChange={(event) => setItemFilter(event.target.value)}
                className="text-xs bg-panel2/40"
              />
            </div>
            <div className="p-4">
              <div className={listWrapperClasses}>
                <div className="divide-y divide-frame2">
                  {settingsLoading ? (
                    <div className="px-3 py-3 text-xs text-muted">Loading…</div>
                  ) : filteredItems.length ? (
                    filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-text">
                            {item.name}
                          </div>
                          <div className="truncate text-[10px] text-muted">
                            {item.itemType} · {item.rarity}
                          </div>
                        </div>
                        <Button
                          type="button"
                          className={cn(
                            "h-7 px-2 text-[10px]",
                            item.inactive
                              ? "border-bad/60 text-bad hover:border-bad"
                              : "border-good/60 text-good hover:border-good"
                          )}
                          onClick={() => toggleItem(item.id)}
                        >
                          {item.inactive ? "Inactive" : "Active"}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-muted">
                      Keine Items.
                    </div>
                  )}
                </div>
              </div>
              {settingsError ? (
                <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-bad">
                  {settingsError}
                </div>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
