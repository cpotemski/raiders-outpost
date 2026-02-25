"use client";

import Link from "next/link";
import { FileText, ListChecks, Radar, Users, Wrench } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLabels } from "@/components/locale/useLabels";
import { Panel } from "@/components/ui/Panel";

const navItems = [
  {
    href: "/blueprints",
    titleKey: "navBlueprints",
    subtitleKey: "navBlueprintsSubtitle",
    Icon: FileText,
  },
  {
    href: "/hideout",
    titleKey: "navHideout",
    subtitleKey: "navHideoutSubtitle",
    Icon: Wrench,
  },
  {
    href: "/projects",
    titleKey: "navProjects",
    subtitleKey: "navProjectsSubtitle",
    Icon: ListChecks,
  },
  {
    href: "/community",
    titleKey: "navCommunity",
    subtitleKey: "navCommunitySubtitle",
    Icon: Users,
  },
  {
    href: "/operator",
    titleKey: "navOperator",
    subtitleKey: "navOperatorSubtitle",
    Icon: Radar,
  },
] as const;

export function MainNavigationPanel() {
  const labels = useLabels();

  return (
    <Panel className="overflow-hidden">
      <div className="arc-panel-header">
        <p className="hud-label text-sm font-semibold tracking-[0.14em]">
          {labels.mainNavigation}
        </p>
      </div>
      <div className="border-t border-frame2 bg-panel/70 px-2 py-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-full flex-col gap-2 rounded-[8px] border border-frame2/70 bg-panel2/40 px-3 py-3 transition",
                "hover:border-accent/70 hover:bg-panel2/60"
              )}
            >
              <div className="flex items-center gap-2">
                <item.Icon
                  className="h-4 w-4 text-muted"
                  aria-hidden="true"
                />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text">
                  {labels[item.titleKey]}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted">
                {labels[item.subtitleKey]}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Panel>
  );
}
