"use client";

import { useMemo, useState } from "react";
import blueprintBg from "../../blueprint-bg.webp";
import { cn } from "../../lib/cn";

type BlueprintItem = {
  name: string;
  rarity: string;
  itemType: string;
  imageFile: string;
};

type BlueprintGridProps = {
  items: BlueprintItem[];
};

export function BlueprintGrid({ items }: BlueprintGridProps) {
  const [owned, setOwned] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");

  const ordered = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((item) => item.name.toLowerCase().includes(q));
  }, [ordered, query]);

  const toggleOwned = (name: string) => {
    setOwned((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <>
      <div className="arc-panel-header">
        <div>
          <p className="hud-label">Blueprints</p>
          <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
            Found
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <label className="relative">
            <span className="sr-only">Quicksearch</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="SEARCH..."
              className="h-8 w-44 border-b border-frame2 bg-transparent px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text placeholder:text-muted/70 focus:border-accent/60 focus:outline-none"
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
                  onClick={() => toggleOwned(item.name)}
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
    </>
  );
}
