"use client";

import { useEffect, useMemo, useState } from "react";
import blueprintBg from "../../blueprint-bg.webp";
import { cn } from "../../lib/cn";
import { useLocalIdentity } from "../auth/useLocalIdentity";

type BlueprintItem = {
  name: string;
  rarity: string;
  itemType: string;
  imageFile: string;
};

type CommunityMember = {
  id: string;
  name: string;
};

type BlueprintGridProps = {
  items: BlueprintItem[];
};

export function BlueprintGrid({ items }: BlueprintGridProps) {
  const { identity, ready, clearIdentity } = useLocalIdentity();
  const [owned, setOwned] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [communityMembers, setCommunityMembers] = useState<CommunityMember[]>(
    []
  );
  const [ownershipByItem, setOwnershipByItem] = useState<
    Record<string, string[]>
  >({});
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<BlueprintItem | null>(null);

  const ordered = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((item) => item.name.toLowerCase().includes(q));
  }, [ordered, query]);

  useEffect(() => {
    if (!ready || !identity) return;

    const controller = new AbortController();

    fetch("/api/blueprints", {
      method: "GET",
      headers: { "x-arc-token": identity.token, "x-arc-name": identity.name },
      signal: controller.signal,
    })
      .then((res) => {
        if (res.status === 401 || res.status === 404) {
          clearIdentity();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((payload) => {
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
        "x-arc-token": identity.token,
        "x-arc-name": identity.name,
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

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "??";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const renderRosterRow = (
    members: CommunityMember[],
    variant: "has" | "needs"
  ) => {
    if (!members.length) {
      return (
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted/70">
          NONE
        </span>
      );
    }
    const visible = members.slice(0, 4);
    const extra = members.length - visible.length;
    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        {visible.map((member) => (
          <span
            key={member.id}
            className={cn(
              "flex h-4 w-4 items-center justify-center border text-[9px] font-semibold uppercase tracking-[0.12em]",
              variant === "has"
                ? "border-accent/70 text-accent"
                : "border-frame2 text-muted"
            )}
          >
            {getInitials(member.name)}
          </span>
        ))}
        {extra > 0 ? (
          <span className="flex h-4 items-center border border-frame2 px-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
            +{extra}
          </span>
        ) : null}
      </div>
    );
  };

  const buildMemberList = (memberIds: string[]) => {
    if (!communityMembers.length) return [];
    return communityMembers.filter((member) => memberIds.includes(member.id));
  };

  return (
    <>
      <div className="arc-panel-header flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="hud-label">Blueprints</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          <label className="relative">
            <span className="sr-only">Quicksearch</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="SEARCH..."
              className="h-8 w-28 border-b border-frame2 bg-transparent px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text placeholder:text-muted/70 focus:border-accent/60 focus:outline-none sm:w-44"
            />
          </label>
          <span className="hud-label">
            {owned.size}/{ordered.length}
          </span>
        </div>
      </div>

      <div className="relative arc-noise">
        <div className="border-t border-frame2 bg-panel/80 px-4 py-5">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
            {filtered.map((item) => {
              const isOwned = owned.has(item.name);
              const label = item.name.replace(/\s*Blueprint\s*$/i, "");
              return (
                <button
                  key={item.name}
                  type="button"
                  aria-pressed={isOwned}
                  title={item.name}
                  onClick={() => setActiveItem(item)}
                  className={cn(
                    "group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[8px] border bg-panel2/80 transition",
                    "hover:border-accent/70 hover:bg-panel2/90",
                    isOwned ? "border-accent/80 shadow-arcHover" : "border-frame2"
                  )}
                  style={{
                    backgroundImage: `url(${blueprintBg.src})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0",
                      isOwned ? "opacity-100" : "opacity-90"
                    )}
                  >
                    <div className="absolute inset-0 bg-panel/40" />
                  </div>
                  <span
                    className={cn(
                      "absolute left-2 top-2 text-[10px] font-semibold uppercase tracking-[0.12em]",
                      isOwned ? "text-accent" : "text-muted"
                    )}
                  >
                    {isOwned ? "Owned" : "Needed"}
                  </span>
                  <span
                    className={cn(
                      "absolute right-2 top-2 h-2 w-2 rounded-full",
                      isOwned ? "bg-accent" : "bg-frame"
                    )}
                  />
                  <img
                    src={`/api/arc-items/image?file=${encodeURIComponent(
                      item.imageFile
                    )}`}
                    alt=""
                    loading="lazy"
                    className={cn(
                      "h-16 w-16 object-contain transition sm:h-20 sm:w-20",
                      isOwned
                        ? "opacity-100 drop-shadow-[0_0_6px_rgba(72,199,214,0.35)]"
                        : "opacity-80 group-hover:opacity-100"
                    )}
                  />
                  <span className="line-clamp-2 absolute bottom-2 left-2 right-2 text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-text/90">
                    {label}
                  </span>
                  <span className="sr-only">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <button
            type="button"
            aria-label="Close overlay"
            className="absolute inset-0 cursor-default"
            onClick={() => setActiveItem(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-sm"
          >
            <div className="arc-panel arc-corners overflow-hidden">
              <div className="arc-panel-header">
                <div>
                  <p className="hud-label">Blueprint</p>
                  <h3 className="text-base font-semibold uppercase tracking-[0.12em]">
                    {activeItem.name.replace(/\s*Blueprint\s*$/i, "")}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hud-label">
                    {owned.has(activeItem.name) ? "Owned" : "Needed"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveItem(null)}
                    className="h-6 w-6 border border-frame2 text-xs font-semibold uppercase tracking-[0.12em] text-muted"
                  >
                    X
                  </button>
                </div>
              </div>
              <div className="border-t border-frame2 bg-panel/80 px-4 py-4">
                {communityMembers.length ? (
                  <div>
                    <div className="hud-label">Needs Item</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(() => {
                        const ownedIds = new Set(
                          ownershipByItem[activeItem.name] ?? []
                        );
                        const members = communityMembers.filter((member) => {
                          if (viewerId && member.id === viewerId) return false;
                          return !ownedIds.has(member.id);
                        });
                        if (!members.length) {
                          return (
                            <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
                              All synced
                            </span>
                          );
                        }
                        return members.map((member) => (
                          <span
                            key={member.id}
                            className="border border-frame2 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"
                          >
                            {member.name}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted">
                    No crew link. Join a community to sync ownership.
                  </div>
                )}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      toggleOwned(activeItem.name);
                      setActiveItem(null);
                    }}
                    className={cn(
                      "h-9 flex-1 border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition",
                      owned.has(activeItem.name)
                        ? "border-frame2 text-muted hover:border-accent/60"
                        : "border-accent/70 text-text hover:border-accent"
                    )}
                  >
                    {owned.has(activeItem.name) ? "Need" : "Found"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
