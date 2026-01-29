"use client";

import { useState } from "react";
import { Panel } from "../../components/ui/Panel";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/cn";

const items = [
  "Pulse Cell",
  "Fiber Weave",
  "Signal Relay",
  "Arc Glue",
  "Field Rations",
  "Carbon Slats",
  "Servo Coupler",
  "Med Patch",
  "Copper Coil",
  "Coolant Core",
  "Tracking Chip",
  "Flux Lens",
  "Field Battery",
  "Armor Plate",
  "Circuit Loom",
];

type ItemStatus = "need" | "have" | null;

export default function ItemsPage() {
  const [status, setStatus] = useState<Record<string, ItemStatus>>({});

  const toggleStatus = (item: string, next: Exclude<ItemStatus, null>) => {
    setStatus((prev) => ({
      ...prev,
      [item]: prev[item] === next ? null : next,
    }));
  };

  return (
    <Panel>
      <div className="arc-panel-header">
        <div>
          <p className="hud-label">Inventory</p>
          <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
            My Items
          </h2>
        </div>
        <div className="w-56">
          <Input placeholder="Search items" aria-label="Search items" />
        </div>
      </div>
      <div className="grid gap-4 px-4 py-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const value = status[item] ?? null;
          return (
            <div
              key={item}
              className="flex flex-col gap-3 rounded-[10px] border border-frame2 bg-panel2/60 p-3"
            >
              <div className="text-sm font-semibold uppercase tracking-[0.06em]">
                {item}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className={cn(
                    "flex-1",
                    value === "need" && "border-warn text-warn"
                  )}
                  onClick={() => toggleStatus(item, "need")}
                >
                  Need
                </Button>
                <Button
                  type="button"
                  className={cn(
                    "flex-1",
                    value === "have" && "border-good text-good"
                  )}
                  onClick={() => toggleStatus(item, "have")}
                >
                  Have
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
