"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [holdItem, setHoldItem] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdRafRef = useRef<number | null>(null);
  const holdSuppressClickRef = useRef(false);
  const holdBlockUntilRef = useRef(0);
  const holdStartRef = useRef(0);
  const HOLD_DURATION_MS = 700;
  const HOLD_RING_RADIUS = 18;
  const HOLD_RING_STROKE = 2;
  const HOLD_RING_CIRC = 2 * Math.PI * HOLD_RING_RADIUS;

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

  const cancelHold = () => {
    if (holdRafRef.current) {
      cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    holdStartRef.current = 0;
    setHoldItem(null);
    setHoldProgress(0);
  };

  const startHold = (name: string) => {
    cancelHold();
    holdStartRef.current = performance.now();
    setHoldItem(name);
    setHoldProgress(0);

    const tick = (now: number) => {
      const elapsed = now - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setHoldProgress(progress);
      if (progress >= 1) {
        holdSuppressClickRef.current = true;
        holdBlockUntilRef.current = Date.now() + 900;
        toggleOwned(name);
        cancelHold();
        window.setTimeout(() => {
          holdSuppressClickRef.current = false;
        }, 900);
        return;
      }
      holdRafRef.current = requestAnimationFrame(tick);
    };

    holdRafRef.current = requestAnimationFrame(tick);
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
              const memberCount = communityMembers.length;
              const ownerCount = ownershipByItem[item.name]?.length ?? 0;
              const progressRatio = memberCount ? ownerCount / memberCount : 0;
              const progressPercent = Math.round(progressRatio * 100);
              const ringRadius = 6;
              const ringStroke = 2;
              const ringCircumference = 2 * Math.PI * ringRadius;
              const ringDash = progressRatio * ringCircumference;
              return (
                <button
                  key={item.name}
                  type="button"
                  aria-pressed={isOwned}
                  title={item.name}
                  onClick={(event) => {
                    if (
                      holdSuppressClickRef.current ||
                      Date.now() < holdBlockUntilRef.current
                    ) {
                      event.preventDefault();
                      return;
                    }
                    setActiveItem(item);
                  }}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    startHold(item.name);
                  }}
                  onPointerUp={() => {
                    if (holdItem === item.name) cancelHold();
                  }}
                  onPointerLeave={() => {
                    if (holdItem === item.name) cancelHold();
                  }}
                  onPointerCancel={() => {
                    if (holdItem === item.name) cancelHold();
                  }}
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
                  {memberCount ? (
                    <svg
                      aria-hidden="true"
                      data-community-progress={progressPercent}
                      viewBox="0 0 16 16"
                      className="absolute right-2 top-2 h-4 w-4"
                    >
                      <circle
                        cx="8"
                        cy="8"
                        r={ringRadius}
                        fill="none"
                        stroke="rgba(160, 180, 190, 0.35)"
                        strokeWidth={ringStroke}
                      />
                      <circle
                        cx="8"
                        cy="8"
                        r={ringRadius}
                        fill="none"
                        stroke="rgba(72, 199, 214, 0.75)"
                        strokeWidth={ringStroke}
                        strokeLinecap="square"
                        strokeDasharray={`${ringDash} ${ringCircumference}`}
                        transform="rotate(-90 8 8)"
                      />
                    </svg>
                  ) : (
                    <span
                      className={cn(
                        "absolute right-2 top-2 h-2 w-2 rounded-full",
                        isOwned ? "bg-accent" : "bg-frame"
                      )}
                    />
                  )}
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
                  {holdItem === item.name ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <svg viewBox="0 0 48 48" className="h-12 w-12">
                        <circle
                          cx="24"
                          cy="24"
                          r={HOLD_RING_RADIUS}
                          fill="none"
                          stroke="rgba(160, 180, 190, 0.35)"
                          strokeWidth={HOLD_RING_STROKE}
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r={HOLD_RING_RADIUS}
                          fill="none"
                          stroke="rgba(72, 199, 214, 0.75)"
                          strokeWidth={HOLD_RING_STROKE}
                          strokeLinecap="square"
                          strokeDasharray={`${holdProgress * HOLD_RING_CIRC} ${HOLD_RING_CIRC}`}
                          transform="rotate(-90 24 24)"
                        />
                      </svg>
                    </div>
                  ) : null}
                  <span className="line-clamp-2 absolute bottom-2 left-2 right-2 text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-text/90">
                    {label}
                  </span>
                  {memberCount ? (
                    <span className="sr-only">
                      Community owned {ownerCount} of {memberCount}
                    </span>
                  ) : null}
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
                    <div className="mt-2 space-y-2">
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
                            <div className="border border-frame2/70 bg-panel2/40 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-muted">
                              All synced
                            </div>
                          );
                        }
                        return members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 rounded-[6px] border border-frame2 bg-panel2/60 px-3 py-2"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-frame2/80 bg-panel text-[10px] font-semibold uppercase tracking-[0.14em] text-text">
                              {getInitials(member.name)}
                            </span>
                            <div className="leading-tight">
                              <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text">
                                {member.name}
                              </div>
                              <div className="text-[10px] uppercase tracking-[0.18em] text-muted">
                                Needs
                              </div>
                            </div>
                          </div>
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
