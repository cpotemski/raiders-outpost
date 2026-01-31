"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ProjectDashboard } from "@/components/projects/ProjectDashboard";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { cn } from "@/lib/cn";

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { projects, loading } = useProjectContext();
  const [query, setQuery] = useState("");
  const [neededOnly, setNeededOnly] = useState(false);

  const project = useMemo(() => {
    return projects.find((entry) => entry.slug === slug) ?? null;
  }, [projects, slug]);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-40" data-testid="project-control-bar">
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
          <div className="arc-panel arc-panel-bottomless arc-corners px-4 py-2 sm:px-6 [--arc-corner-offset:6px]">
            <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-3 px-4 sm:px-6 lg:px-8">
              <Link
                href="/"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:text-text"
              >
                &lt; zurück zur Projektauswahl
              </Link>
              <label className="relative">
                <span className="sr-only">Quicksearch</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="SEARCH..."
                  className="h-8 w-36 border-b border-frame2 bg-transparent px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text placeholder:text-muted/70 focus:border-accent/60 focus:outline-none"
                />
              </label>
              <button
                type="button"
                aria-pressed={neededOnly}
                aria-label="Filter needed only"
                onClick={() => setNeededOnly((prev) => !prev)}
                className={cn(
                  "h-8 border px-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                  neededOnly
                    ? "border-accent/70 text-text"
                    : "border-frame2 text-muted hover:border-accent/60"
                )}
              >
                Needed Only
              </button>
            </div>
          </div>
        </div>
      </div>
      {loading && !project ? (
        <div className="border-t border-frame2 px-4 py-5 text-sm uppercase tracking-[0.08em] text-muted">
          Scanning project cache...
        </div>
      ) : project ? (
        <ProjectDashboard
          project={project}
          query={query}
          neededOnly={neededOnly}
        />
      ) : (
        <div className="border border-frame2/70 bg-panel2/40 px-4 py-4 text-[11px] uppercase tracking-[0.12em] text-muted">
          No signal. Project data not found.
        </div>
      )}
    </div>
  );
}
